import { ApiGatewayManagementApi, DynamoDB } from "aws-sdk";
import { ScanInput } from "aws-sdk/clients/dynamodb";

export class WebSocketController
{
	MAX_RETRIES = 3;
	DELAY_DURATION = 3000;
	constructor() { }

	async delay(ms: number)
	{
		new Promise(resolve => setTimeout(resolve, ms));
	}

	async onConnect(event: any, context: any)
	{
		let msg = 'Web Socket onConnect Event Fired';
		console.log(msg);
	}

	// Close The Socket From The Client Side (UI side)
	async onDisconnect(event: any, context: any)
	{
		try
		{
			let msg = 'Web Socket onDisconnect Event Fired';
			console.log(msg);

			let connectionId = event.requestContext.connectionId;

			var ddb = new DynamoDB({ apiVersion: '2012-08-10' });
			var params = {
				TableName: 'connectedClientsTable',
				Key: {
					"connectionId": {
						S: connectionId,
					},
				},
			};
			await ddb.deleteItem(params).promise();
		}
		catch (error)
		{
			console.error('Error Occurred While Disconnecting Client', error);
		}
	}

	// Arca User will test the socket from UI
	/* Payload Expected :
	{
		"action": "heartbeat",
		"message": "ops1@gmail.com"
	};
	*/
	async onHeartbeat(event: any, context: any)
	{
		try
		{
			let msg = 'Web Socket "heartbeat" Event Fired';
			console.log(msg);

			// Client Side ==> socket.send(obj);  ==> obj = {"action": "test", "message": "ops1@gmail.com"}
			// event.body will be equal to obj
			// let message = event.body.message;
			let email = JSON.parse(event.body).message;
			let connectionId = event.requestContext.connectionId;

			var ddb = new DynamoDB({ apiVersion: '2012-08-10' });
			console.log('messageFromClient : ', email);

			var params = {
				TableName: 'connectedClientsTable',
				Item: {
					'email': { S: email },
					'connectionId': { S: connectionId }
				}
			};
			await ddb.putItem(params).promise();

			let messageToClient = JSON.stringify({ clientMessage: email, connectionId: connectionId, type: "heartbeat" });
			const domain = event.requestContext.domainName;
			const stage = event.requestContext.stage;
			const callbackUrlForAWS = `https://${domain}/${stage}`;
			await this.sendMessageToClient(callbackUrlForAWS, connectionId, messageToClient);
		}
		catch (error)
		{
			console.error('Error Occurred While Posting Message Back to Client : ', error);
		}
	}

	// Arca Api will notify Arca UI users via this method
	/* Payload Expected :
	{
		"action": "notify",
		"sender": "arca_api",
		"recipients": ["ops1@gmail.com", "ops2@gmail.com", "adimn@gmail.com"],
		"message": "Certification 1 Updated"
	}
	*/
	async onNotify(event: any, context: any)
	{
		try
		{
			let msg = 'Web Socket "notify" Event Fired';
			console.log(msg);

			let clientPayload = JSON.parse(event.body);
			console.log('payload From Sender : ', clientPayload);

			var ddb = new DynamoDB({ apiVersion: '2012-08-10' });

			let recipients = clientPayload.recipients;
			let recipientExpressionAttributeValues: any = {};
			let recipientFilterExpression: string[] = [];
			for (let i = 0; i < recipients.length; i++)
			{
				const r = recipients[i];
				let eavKey = `:email${i}`;
				recipientExpressionAttributeValues[eavKey] = { S: r };
				recipientFilterExpression.push(`email = ${eavKey}`);
			}

			var ddb = new DynamoDB({ apiVersion: '2012-08-10' });
			let params: ScanInput = {
				TableName: 'connectedClientsTable',
				ProjectionExpression: "connectionId",
				ExpressionAttributeValues: recipientExpressionAttributeValues,
				FilterExpression: recipientFilterExpression.join(' or '),
			};

			console.log('Time before Dynamodb read : ', new Date().toISOString());
			let ddbResult = await ddb.scan(params).promise();
			console.log('Time after Dynamodb read : ', new Date().toISOString());

			console.log('ddbResult : ', JSON.stringify(ddbResult));

			if ('Items' in ddbResult && ddbResult.Items)
			{
				let connectedClients: string[] = ddbResult.Items.map(i => i.connectionId.S || '');
				console.log('connectedClients : ', connectedClients);

				// let messageToClient = JSON.stringify({ clientMessage: email, connectionId: connectionId });
				const domain = event.requestContext.domainName;
				const stage = event.requestContext.stage;
				const callbackUrlForAWS = `https://${domain}/${stage}`;

				// Send Message to All Desired Recipients
				let messageToClient = JSON.stringify({ type: "notify", message: clientPayload.message }); // IMP : it has to be a stringified object
				let messageSentPromises = connectedClients.map(c => this.sendMessageToClient(callbackUrlForAWS, c, messageToClient));
				await Promise.allSettled(messageSentPromises);
			}
		}
		catch (error)
		{
			console.error('Error Occurred While Posting Message Back to Client : ', error);
		}
	}

	async sendMessageToClient(url: string, connectionId: string, msg: any)
	{
		let retriesAvailable = this.MAX_RETRIES;
		while (retriesAvailable > 0)
		{
			try
			{
				const apigatewaymanagementapi = new ApiGatewayManagementApi({
					apiVersion: '2018-11-29',
					endpoint: url,
					region: 'ap-south-1'
				});
				let msgSentStatus = await apigatewaymanagementapi.postToConnection({
					ConnectionId: connectionId, // connectionId of the receiving ws-client
					Data: Buffer.from(msg),
				}).promise();

				return msgSentStatus;
			}
			catch (error)
			{
				console.log(`Send Message To Client Failed. Attempt ${retriesAvailable}`, error);
				retriesAvailable = retriesAvailable - 1;
				await this.delay(this.DELAY_DURATION);
			}
		}

		return false;
	}
}