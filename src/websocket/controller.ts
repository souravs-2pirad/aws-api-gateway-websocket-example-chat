import { ApiGatewayManagementApi, DynamoDB } from "aws-sdk";

export class WebSocketController
{
	constructor() { }

	async onConnect(event: any, context: any)
	{
		let msg = 'Web Socket onConnect Event Fired';
		console.log(msg);
	}

	async onDisconnect(event: any, context: any)
	{
		let msg = 'Web Socket onDisconnect Event Fired';
		console.log(msg);
	}

	async onHeartbeat(event: any, context: any)
	{
		try
		{
			let msg = 'Web Socket "heartbeat" Event Fired';
			console.log(msg);

			// Client Side ==> socket.send(obj);  ==> obj = {"action": "test", "msg": "Client Says Hi"}
			// event.body will be equal to obj
			// let msg = event.body.msg;
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

	async onNotify(event: any, context: any)
	{
		try
		{
			let msg = 'Web Socket "notify" Event Fired';
			console.log(msg);

			let clientPayload = JSON.parse(event.body);
			console.log('messageFromClient : ', clientPayload);

			let recipientKeys = clientPayload.recipients.map((r: string) => ({ "email": { S: r } }));

			let connectionId = event.requestContext.connectionId;
			var ddb = new DynamoDB({ apiVersion: '2012-08-10' });

			var params = {
				RequestItems: {
					'connectedClientsTable': {
						Keys: recipientKeys,
						ProjectionExpression: 'email, connectionId'
					}
				}
			};

			let ddbResult = await ddb.batchGetItem(params).promise();
			console.log('ddbResult : ', ddbResult);

			// let messageToClient = JSON.stringify({ clientMessage: email, connectionId: connectionId });
			const domain = event.requestContext.domainName;
			const stage = event.requestContext.stage;
			const callbackUrlForAWS = `https://${domain}/${stage}`;
			// await this.sendMessageToClient(callbackUrlForAWS, connectionId, messageToClient);
		}
		catch (error)
		{
			console.error('Error Occurred While Posting Message Back to Client : ', error);
		}
	}

	async sendMessageToClient(url: string, connectionId: string, msg: any)
	{
		const apigatewaymanagementapi = new ApiGatewayManagementApi({
			apiVersion: '2018-11-29',
			endpoint: url,
			region: 'ap-south-1'
		});
		return await apigatewaymanagementapi.postToConnection({
			ConnectionId: connectionId, // connectionId of the receiving ws-client
			Data: Buffer.from(msg),
		}).promise();
	}
}