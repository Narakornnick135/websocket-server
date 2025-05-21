WebSocket Server

A scalable WebSocket server implementation using Node.js, TypeScript, and Redis for cross-process communication. This server is designed to handle real-time bi-directional communication with support for multiple processes.

Features

- Real-time WebSocket communication
- Scalable architecture using Redis for cross-process messaging
- User tracking and connection management
- Support for private messaging between users
- Heartbeat mechanism to detect and clean up dead connections
- HTTP API endpoints for monitoring and management
- Clustering support with PM2

Prerequisites

- Node.js (v18 or higher)
- Redis server
- TypeScript
- PM2 (for production)

Installation

1. Clone the repository:

git clone <repository-url>
cd websocket-server

2. Install dependencies:

npm install

3. Set up environment variables (create a .env file):

PORT=3000
NODE_ENV=development
MAX_CONNECTIONS=4000
LOG_LEVEL=debug
REDIS_HOST=localhost
REDIS_PORT=6379

Building and Running

Development mode:

npm run dev

Production mode:

1. Build the TypeScript code:

npm run build

2. Start with Node.js:

npm start

Running with PM2 (recommended for production):

npm run start:pm2

Other PM2 commands:

npm run stop:pm2     # Stop the service
npm run logs:pm2     # View logs
npm run monit:pm2    # Monitor the service

Configuration

Environment Variables:

Variable | Default | Description
----------|---------|-------------
PORT | 3000 | The port on which the server will listen
NODE_ENV | development | Environment (development/production)
MAX_CONNECTIONS | 4000 | Maximum number of WebSocket connections per process
LOG_LEVEL | debug (dev) / info (prod) | Logging level
REDIS_HOST | localhost | Redis server host
REDIS_PORT | 6379 | Redis server port

PM2 Configuration:

The project includes a ecosystem.config.js file for PM2 configuration. By default, it runs 5 instances in cluster mode. You can modify this file to adjust the number of instances based on your server's capabilities.

API Endpoints

The server exposes several HTTP endpoints:

GET /api/health

Returns the server's health status.

Response:
{
  "status": "ok",
  "uptime": 1234,
  "timestamp": "2023-09-01T12:00:00Z",
  "activeConnections": 42,
  "maxConnections": 4000
}

GET /api/connections

Returns information about the current WebSocket connections.

Response:
{
  "activeConnections": 42,
  "maxConnections": 4000
}

POST /api/send-to-user

Sends a message to a specific user identified by their userId.

Request Body:
{
  "userId": "user123",
  "message": "Hello, world!",
  "type": "notification"
}

Response:
{
  "success": true,
  "delivered": 1,
  "userId": "user123"
}

GET /api/redis-info

Returns information about Redis connections and user distribution across processes.

Response:
{
  "processId": "12345",
  "userProcesses": {
    "user123": "12345",
    "user456": "12346"
  },
  "processUsers": {
    "12345": ["user123"],
    "12346": ["user456"]
  },
  "localConnections": 42
}

WebSocket Communication

Connecting to the WebSocket Server:

const ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => {
  console.log('Connected to WebSocket server');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Message received:', data);
};

Message Types:

1. Registration

Register a user ID with the connection:

ws.send(JSON.stringify({
  type: 'register',
  userId: 'user123'
}));

2. Ping/Pong

Check connection:

ws.send(JSON.stringify({
  type: 'ping'
}));

3. Private Messaging

Send a message to a specific user:

ws.send(JSON.stringify({
  type: 'notification',
  targetUserId: 'user456',
  action: 'new_message',
  data: { content: 'Hello, user456!' }
}));

4. Chat Messages

Send a chat message:

ws.send(JSON.stringify({
  type: 'chat',
  targetUserId: 'user456',
  text: 'Hello, how are you?'
}));

Architecture

Components:

1. WebSocket Server (websocket.ts)
   - Handles WebSocket connections and events
   - Manages heartbeat mechanism

2. Connection Manager (connectionManager.ts)
   - Tracks active connections
   - Associates user IDs with connections
   - Facilitates message delivery

3. Message Handler (messageHandler.ts)
   - Processes different types of WebSocket messages
   - Provides appropriate responses

4. Redis Service (redisService.ts)
   - Enables cross-process communication
   - Tracks user-to-process mapping
   - Provides Redis pub/sub functionality

Scaling with Redis:

The server uses Redis to track which process each user is connected to. When a message needs to be sent to a user on a different process, Redis pub/sub is used to deliver the message to the appropriate process.

Development

Logging:

The server uses Pino for logging. Log levels can be configured using the LOG_LEVEL environment variable:

- debug: Detailed debugging information
- info: General information
- warn: Warning messages
- error: Error messages

Testing WebSocket Connections:

You can use tools like wscat to test WebSocket connections:

# Install wscat
npm install -g wscat

# Connect to the WebSocket server
wscat -c ws://localhost:3000

# Send a message (in the wscat console)
{"type":"ping"}

Troubleshooting

Common Issues:

1. Redis Connection Errors
   - Ensure Redis is running and accessible
   - Check Redis host and port configuration

2. Max Connections Reached
   - Increase MAX_CONNECTIONS if needed
   - Add more processes via PM2 configuration

3. Memory Issues
   - Check for memory leaks using tools like Node.js inspector
   - Consider adjusting the number of PM2 instances

Monitoring:

For production environments, use PM2's monitoring capabilities:

npm run monit:pm2

License

MIT
