import { WebSocketController } from "./controller";

export async function handler(event: any, context: any)
{
	console.log('Reached route.ts file');
	console.log(event);
	console.log(context);

	let wsController = new WebSocketController();
	let successResponse: any = { statusCode: 200 };
	let errorResponse: any = { statusCode: 500 };

	try
	{
		let routeKey = event.requestContext.routeKey;
		switch (routeKey)
		{
			case '$connect':
				await wsController.onConnect(event, context);
				break;

			case '$disconnect':
				await wsController.onDisconnect(event, context);
				break;

			case 'test':
				await wsController.onTest(event, context);
				break;

			case '$default':
				return { statusCode: 200, body: 'WS_WebSocketMirrorSuccessful' };
		}

		// Return a 200 status to tell API Gateway the message was processed
		// successfully.
		// Otherwise, API Gateway will return a 500 to the client.
		console.log('Websocket Success Response 200');
		return successResponse;
	}
	catch (error)
	{
		console.log('Websocket Error Occurred 500', error);
		return errorResponse;
	}
}