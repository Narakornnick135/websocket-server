# WebSocket Server

A scalable WebSocket server implementation using Node.js, TypeScript, and Redis for cross-process communication. This server is designed to handle real-time bi-directional communication with support for multiple processes.

## Features

- Real-time WebSocket communication
- Scalable architecture using Redis for cross-process messaging
- User tracking and connection management
- Support for private messaging between users
- Heartbeat mechanism to detect and clean up dead connections
- HTTP API endpoints for monitoring and management
- Clustering support with PM2

## Prerequisites

- Node.js (v18 or higher)
- Redis server
- TypeScript
- PM2 (for production)

## Installation

### 1. Clone the repository

```bash
# Create a new directory for your project
mkdir websocket-server
cd websocket-server

# Initialize git repository
git init

# Copy all project files or clone from repository if you have one
# git clone https://github.com/yourusername/websocket-server.git
```

### 2. Create project files

Create the following project structure and files as shown in the repository:
```bash
websocket-server/
├── .env
├── ecosystem.config.js
├── package.json
├── package-lock.json
├── tsconfig.json
└── src/
    ├── config/
    │   └── env.ts
    ├── services/
    │   ├── connectionManager.ts
    │   ├── messageHandler.ts
    │   └── redisService.ts
    ├── utils/
    │   └── logger.ts
    ├── index.ts
    ├── server.ts
    └── websocket.ts
```


### 3. Install dependencies
```bash
# Install all dependencies
npm install compression cors dotenv express helmet ioredis pino pino-pretty redis uuid ws

# Install development dependencies
npm install --save-dev @types/compression @types/cors @types/express @types/ioredis @types/node @types/redis @types/uuid @types/ws ts-node-dev typescript
```

### 4. Set up environment variables
Create a .env file in the root directory:

```bash
PORT=3000
NODE_ENV=development
MAX_CONNECTIONS=4000
LOG_LEVEL=debug
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Running the Application
## Development Mode
For development with hot reloading:
```bash
# Start in development mode with auto-reload
npm run dev

# Or directly with ts-node-dev
npx ts-node-dev --respawn src/index.ts
```

### Production Mode
Building and running for production:
```bash
# Build the TypeScript code to JavaScript
npm run build
# Or directly with TypeScript compiler
npx tsc

# Start the application
npm start
# Or directly with Node.js
node dist/index.js
```

### Running with PM2 (Recommended for Production)
PM2 allows you to run the application in cluster mode for better performance and reliability:
```bash
# Install PM2 globally if not already installed
npm install -g pm2

# Start with PM2 using the ecosystem configuration
npm run start:pm2
# Or directly with PM2
pm2 start ecosystem.config.js

# Other PM2 commands
npm run stop:pm2     # Stop the service (or: pm2 stop ecosystem.config.js)
npm run logs:pm2     # View logs (or: pm2 logs)
npm run monit:pm2    # Monitor the service (or: pm2 monit)
```


### PM2 Ecosystem Configuration
The ecosystem.config.js file is configured as follows:
```bash
module.exports = {
    apps: [{
      name: "ws-server",
      script: "./dist/index.js",
      instances: 5,           // Use 5 instances
      exec_mode: "cluster",   // Run in cluster mode
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        MAX_CONNECTIONS: 4000,
        LOG_LEVEL: "info",
        REDIS_HOST: "localhost",
        REDIS_PORT: 6379
      }
    }]
};
```
You can adjust the number of instances based on your server's CPU cores and available memory.

### Configuration
Environment Variables
| Variable        | Default     | Description                                         |
|----------------|-------------|-----------------------------------------------------|
| `PORT`         | `3000`      | The port on which the server will listen           |
| `NODE_ENV`     | `development`| Environment (`development` / `production`)         |
| `MAX_CONNECTIONS` | `4000`  | Maximum number of WebSocket connections per process |
| `LOG_LEVEL`    | `debug`     | Logging level: `debug` (dev) / `info` (prod)       |
| `REDIS_HOST`   | `localhost` | Redis server host                                   |
| `REDIS_PORT`   | `6379`      | Redis server port                                   |

### API Endpoints
The server exposes several HTTP endpoints:
GET /api/health

### Returns the server's health status.
## Response:
```bash
{
  "status": "ok",
  "uptime": 1234,
  "timestamp": "2023-09-01T12:00:00Z",
  "activeConnections": 42,
  "maxConnections": 4000
}
```

### GET /api/connections
Returns information about the current WebSocket connections.
## Response:
```bash
{
  "activeConnections": 42,
  "maxConnections": 4000
}
```

### POST /api/send-to-user
Sends a message to a specific user identified by their userId.
## Request Body:
```bash
{
  "userId": "user123",
  "message": "Hello, world!",
  "type": "notification"
}
```
## Response:
```bash
{
  "success": true,
  "delivered": 1,
  "userId": "user123"
}
```

### GET /api/redis-info
Returns information about Redis connections and user distribution across processes.
## Response:
```bash
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
```

### WebSocket Communication
## Connecting to the WebSocket Server
```bash
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => {
  console.log('Connected to WebSocket server');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Message received:', data);
};
```


### Message Types
## 1. Registration
Register a user ID with the c
```bash
ws.send(JSON.stringify({
  type: 'register',
  userId: 'user123'
}));
```

## 2. Ping/Pong
Check connection:
```bash
ws.send(JSON.stringify({
  type: 'ping'
}));
```

## 3. Private Messaging
Send a message to a specific user:
```bash
ws.send(JSON.stringify({
  type: 'notification',
  targetUserId: 'user456',
  action: 'new_message',
  data: { content: 'Hello, user456!' }
}));
```

## 4. Chat Messages
Send a chat message:
```bash
ws.send(JSON.stringify({
  type: 'chat',
  targetUserId: 'user456',
  text: 'Hello, how are you?'
}));
```

### Architecture
## Components

1 WebSocket Server (websocket.ts)
    - Handles WebSocket connections and events
    - Manages heartbeat mechanism

2 Connection Manager (connectionManager.ts)
    - Tracks active connections
    - Associates user IDs with connections
    - Facilitates message delivery


3 Message Handler (messageHandler.ts)
    - Processes different types of WebSocket messages
    - Provides appropriate responses

4 Redis Service (redisService.ts)
    - Enables cross-process communication
    - Tracks user-to-process mapping
    - Provides Redis pub/sub functionality


### Scaling with Redis
    The server uses Redis to track which process each user is connected to. When a message needs to be sent to a user on a different process, Redis pub/sub is used to deliver the message to the appropriate process.

### Development
##Logging
    The server uses Pino for logging. Log levels can be configured using the LOG_LEVEL environment variable:

    - debug: Detailed debugging information
    - info: General information
    - warn: Warning messages
    - error: Error messages

## Testing WebSocket Connections
You can use tools like wscat to test WebSocket connections:
```bash
# Install wscat
npm install -g wscat

# Connect to the WebSocket server
wscat -c ws://localhost:3000

# Send a message (in the wscat console)
{"type":"ping"}
```

### Troubleshooting
## Common Issues

1 Redis Connection Errors
    - Ensure Redis is running and accessible
    - Check Redis host and port configuration
    - Install Redis if not already installed:

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server

# MacOS
brew install redis
brew services start redis
```

```bash
```
```bash
```


