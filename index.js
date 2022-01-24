var socket;

function connect()
{
	// Create WebSocket connection.
	let url = 'wss://33k2co1ow4.execute-api.ap-south-1.amazonaws.com/dev';
	console.log('Creating Socket ...');
	socket = new WebSocket(url);

	// Connection opened
	socket.onopen = function (event)
	{
		console.log('Socket Opened', new Date().toISOString());
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
		console.log('Message from server ', JSON.parse(event.data), new Date().toISOString());
		let type = JSON.parse(event.data).type;
		if (type == "heartbeat")
		{
			let apiButton = document.getElementById('api');
			apiButton.disabled = false;
		}
	};
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
