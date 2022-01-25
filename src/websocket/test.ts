import AWS, { ApiGatewayManagementApi, DynamoDB } from "aws-sdk";
import { ScanInput } from "aws-sdk/clients/dynamodb";
import { Console } from "console";

var MAX_RETRIES = 3;
var DELAY_DURATION = 3000;

async function delay(ms: number)
{
	new Promise(resolve => setTimeout(resolve, ms));
}

async function sendMessageToClient(url: string, connectionId: string, msg: any)
{
	let retriesAvailable = MAX_RETRIES;
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
			await delay(DELAY_DURATION);
		}
	}

	return false;
}

async function main()
{
	try
	{
		console.log('Sending Message To Clients From Websocket ...');

		let cred = new AWS.SharedIniFileCredentials(
			{
				profile: 'personal'
			}
		);
		AWS.config.credentials = cred;
		AWS.config.region = 'ap-south-1';

		let connectedClients = ['MfbxleaVBcwCEPQ=', 'Mfb1Of-DhcwCGMg='];
		let callbackUrlForAWS = `https://ypo1jbvgpd.execute-api.ap-south-1.amazonaws.com/dev`;
		let messageToClient = JSON.stringify({ type: "notify", message: "cert 2 updated" });

		for (const c of connectedClients)
		{
			let result = await sendMessageToClient(callbackUrlForAWS, c, messageToClient);
			console.log(`Connection ${c} result : `, result);
		}
	}
	catch (error)
	{
		console.log('Some Error While Sending Messages', error);
	}

}

main();