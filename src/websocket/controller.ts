import { ApiGatewayManagementApi } from "aws-sdk";

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

	async onTest(event: any, context: any)
	{
		try
		{
			let msg = 'Web Socket "test" Event Fired';
			console.log(msg);

			// Client Side ==> socket.send(obj);  ==> obj = {"action": "test", "msg": "Client Says Hi"}
			// event.body will be equal to obj
			// let msg = event.body.msg;
			let messageFromClient = JSON.parse(event.body).message;
			console.log('messageFromClient : ', messageFromClient);

			let messageToClient = 'Server Says Pong';

			const domain = event.requestContext.domainName;
			const stage = event.requestContext.stage;
			const callbackUrlForAWS = `https://${domain}/${stage}`; //construct the needed url
			const connectionId = event.requestContext.connectionId;

			console.log('callbackUrlForAWS : ', callbackUrlForAWS);
			console.log('connectionId : ', connectionId);
			let msgSentStatus = await this.sendMessageToClient(callbackUrlForAWS, connectionId, messageToClient);

			console.log('msgSentStatus : ', msgSentStatus);
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