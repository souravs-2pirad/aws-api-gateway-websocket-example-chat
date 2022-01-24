// Create WebSocket connection.
console.log('Creating Socket ...');
const socket = new WebSocket('wss://nahia4nij0.execute-api.ap-south-1.amazonaws.com/dev');

// Connection opened
socket.onopen = function(event) {
	console.log('Socket Opened', new Date().toISOString());
	payload = {
		"action": "test",
		"message": "Client says ping"
	};
    socket.send(JSON.stringify(payload));
};

// Errors
socket.onerror = function(event) {
    console.log('Some socket error ', event);
};

// Listen for messages
socket.onmessage = function(event) {
    console.log('Message from server ', event.data, new Date().toISOString());
};
