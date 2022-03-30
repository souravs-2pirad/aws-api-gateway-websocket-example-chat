//@ts-check

var serverMessagesDiv = document.getElementById('server_messages');
var socket;
var cognitoId;
var pingTimeout;
var pingInterval;
var notificationsArray = [];

var MAX_RETRY = 10;
var DELAY = 60 * 1000;
var OFFSET_DELAY = 30 * 1000;

async function delay(ms)
{
	new Promise(resolve => setTimeout(resolve, ms));
}

function ping()
{
	socket.send('ping');
	pingTimeout = setTimeout(function ()
	{
		/// ---connection closed ///
		retrySocketConnection();
	}, 5000);
}

function appendToLogs(msg)
{
	let msgWithTime = `[${new Date().toISOString()}] ${msg}`;
	serverMessagesDiv.innerText = serverMessagesDiv.innerText + '\n' + msgWithTime;
}

function connect()
{
	return new Promise(function (resolve, reject)
	{
		// Create WebSocket connection.
		let url = 'wss://5207s42fn4.execute-api.us-east-1.amazonaws.com/anuragr-dev';
		appendToLogs('Creating Socket');
		let token = document.getElementById('tokenInput').value;
		socket = new WebSocket(url, ['arca', token]);

		// Connection opened
		socket.onopen = function (event)
		{
			resolve(socket);
			let msg = 'Socket Opened';
			console.log(msg);
			appendToLogs(msg);

			// Ping Every 9 minutes
			clearInterval(pingInterval);
			pingInterval = setInterval(ping, 9 * 60 * 1000); // AWS Idle Timeout is 9 mins. Ref : https://docs.aws.amazon.com/apigateway/latest/developerguide/limits.html

			let getNotificationsButton = document.getElementById('getNotificationsButton');
			getNotificationsButton.disabled = false;
			let updateNotificationButton = document.getElementById('updateNotificationButton');
			updateNotificationButton.disabled = false;
		};

		// Listen for messages
		socket.onmessage = function (event)
		{
			let msg = `server sent event : ${event?.data}`;
			console.log(msg);
			appendToLogs(msg);

			// ping pong
			if (event?.data == 'pong')
			{
				clearTimeout(pingTimeout);
				return;
			}

			// getNotifications
			let payload = JSON.parse(event.data);
			if (payload.action === 'getNotifications')
			{
				console.log('Notifications : ', payload.data);
				notificationsArray = payload.data;
			}

			// notifyFromUi
			if (payload.action === 'notifyFromUi')
			{
				console.log('Notification Ack Received : ', payload.data);
			}
		};

		// Errors
		socket.onerror = function (event)
		{
			reject(event);
			console.log('Some socket error ', event);
			appendToLogs(`Some socket error ${event}`);
		};

		socket.onclose = function (event)
		{
			console.log('Socket closed by server ', event);
			appendToLogs('Socket closed by server');
		};
	});
}

async function retrySocketConnection()
{
	let retryAvailable = MAX_RETRY;
	while (retryAvailable > 0)
	{
		let offset = (MAX_RETRY - retryAvailable) * OFFSET_DELAY;
		await delay(DELAY + offset);
		try
		{
			await connect();
			retryAvailable = -1;
		}
		catch (error)
		{
			console.log('Socket connection failed', error);
			retryAvailable--;
		}
	}
}

function disconnect()
{
	socket.close();
	let msg = 'Disconnected Button Clicked';
	appendToLogs(msg);
}

function getNotifications()
{
	cognitoId = document.getElementById('cognitoIdInput').value;
	let payload = {
		"action": "getNotifications",
		"sender": "arcaUi",
		"recipient": cognitoId,
		data: [],
	};
	console.log('Get Notifications Button Clicked : ', payload);
	appendToLogs('Get Notifications Button Clicked');
	socket.send(JSON.stringify(payload));
}

function updateNotification()
{
	let index = Number(document.getElementById('notificationIdInput').value);
	let notificationToUpdate = notificationsArray[index];

	let payload = {
		"action": "notifyFromUi",
		"sender": "arcaUi",
		"recipient": cognitoId,
		"data": {
			uuid: notificationToUpdate.uuid,
			createdTime: notificationToUpdate.createdTime,
			isRead: !notificationToUpdate.isRead,
		}
	};
	console.log('notificationToUpdate button Clicked : ', payload);
	appendToLogs('notificationToUpdate Button Clicked');
	socket.send(JSON.stringify(payload));
}

function clearLogs()
{
	serverMessagesDiv.innerText = '';
}

/*

eyJraWQiOiJHS2NqM3lzV1wvcTNUU3U3ZlRzXC93SUE4bXBKTlBTcllGUjl4NGE2Qit4OEU9IiwiYWxnIjoiUlMyNTYifQ.eyJjdXN0b206Y291bnRyeSI6IlVuaXRlZCBTdGF0ZXMiLCJzdWIiOiI0ZTIwNzA0MC1iMzc4LTQ5NGYtOWUxMy1jNTgyZDliZTQ0YTQiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLnVzLWVhc3QtMS5hbWF6b25hd3MuY29tXC91cy1lYXN0LTFfa0F5Q1BjREtBIiwiY29nbml0bzp1c2VybmFtZSI6IjRlMjA3MDQwLWIzNzgtNDk0Zi05ZTEzLWM1ODJkOWJlNDRhNCIsImxvY2FsZSI6ImVuLVVTIiwiY3VzdG9tOmxpdG1vc19pZCI6IlNaS0JabVpRUFZsRWdybXpIUlJRSkEyIiwiY3VzdG9tOmNvbXBhbnlfaWQiOiI0Iiwib3JpZ2luX2p0aSI6IjlmNzEzZTU3LTBkNjktNDVhYi1hZjlhLWQ0MTk2MzU4NzFhYSIsImF1ZCI6IjJhdGVldmRhaDh2aWxsMTU5b3FiN2tvYjlxIiwiY3VzdG9tOmxhc3RfbG9naW5fdGltZSI6IjE2NDg2MzQ5ODU5NzMiLCJldmVudF9pZCI6IjEzNGI5Yjc0LWI3ZmEtNDIwYi04M2VlLTY1ZWE5MzVjZGRiYiIsInRva2VuX3VzZSI6ImlkIiwiYXV0aF90aW1lIjoxNjQ4NDYyMzczLCJuYW1lIjoiQVAgQ3lwcmVzcyIsInBob25lX251bWJlciI6IisxNzY4OTkxMjU0IiwiY3VzdG9tOmpvYl90eXBlIjoiQVAiLCJjdXN0b206c2ZkY191c2VyX2lkIjoiMDAzMXcwMDAwMTR4ZVpTQUFZIiwiZXhwIjoxNjQ4NzE2NjcwLCJpYXQiOjE2NDg2NDQ2NzAsImp0aSI6ImM3MjRhNTZmLTNhNTYtNGM0MS05ZDczLWM2MmVhZDgwNzllMyIsImVtYWlsIjoiYXAxQGN5cHJlc3N3c3AycGlyYWQuY29tIn0.HLyuBgKPZ88rfpmWNGVFNFNtbfX9Y-lutHoHREKCpST6BiiOdgriIb8dOsz6agVh8iALDdWwAxyLcWRRH8S1TbifmaJhdppJTCsmQjAm_JfPIHGCAJSYT6GRXLTiw3Qu8Eg9Os46hfsUOGIPi_Wro3jiV0TueeRnq0F-b0ttiG7VCLGwgvaX02i0czI6D27jFTF3IjzVs5cMmm3zZgJ1PmkS1GM-jjj5tK0ZJeUNcZ02kjPf_jV3pECyh-O-QhLwPsOOzdaC6iZgm9WU0WDRgHTYJIrknAxkP_XSnBPNbybnpCddsmG6GGQkzaMGSeK_8UOOtKCdlNjgPV1kWIS5Qg

4e207040-b378-494f-9e13-c582d9be44a4

*/

