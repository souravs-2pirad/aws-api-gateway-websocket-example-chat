var socket;
var serverMessagesDiv = document.getElementById('server_messages');
console.log(serverMessagesDiv);

function connect()
{
	// Create WebSocket connection.
	let url = 'wss://ypo1jbvgpd.execute-api.ap-south-1.amazonaws.com/dev';
	console.log('Creating Socket ...');
	socket = new WebSocket(url);

	// Connection opened
	socket.onopen = function (event)
	{
		let msg = `[${new Date().toISOString()}] Socket Opened`;
		serverMessagesDiv.innerText = serverMessagesDiv.innerText + '\n' + msg;
		let pingButton = document.getElementById('ping');
		pingButton.disabled = false;
	};

	// Errors
	socket.onerror = function (event)
	{
		console.log('Some socket error ', event);
	};

	// Listen for messages
	socket.onmessage = function (event)
	{
		let msg = `[${new Date().toISOString()}] Message from server : ${JSON.stringify(JSON.parse(event.data))}`;
		serverMessagesDiv.innerText = serverMessagesDiv.innerText + '\n' + msg;
		let type = JSON.parse(event.data).type;
		if (type == "heartbeat")
		{
			let apiButton = document.getElementById('api');
			apiButton.disabled = false;
		}
	};
}

function disconnect()
{
	socket.close();
	let msg = `[${new Date().toISOString()}] Disconnected`;
	serverMessagesDiv.innerText = serverMessagesDiv.innerText + '\n' + msg;
}

function ping()
{
	let pingMessage = document.getElementById('pingInput').value;
	let payload = {
		"action": "heartbeat",
		"message": pingMessage
	};
	console.log('Ping button Clicked : ', payload);
	socket.send(JSON.stringify(payload));
}

function api()
{
	let apiMessage = document.getElementById('apiInput').value;

	let payload = {
		"action": "notify",
		"sender": "arca_api",
		"recipients": ["ops1@gmail.com", "ops2@gmail.com", "adimn@gmail.com"],
		"message": apiMessage
	};
	console.log('Api button Clicked : ', payload);
	socket.send(JSON.stringify(payload));
}
