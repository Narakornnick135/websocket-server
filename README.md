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

###Running the Application
##Development Mode
For development with hot reloading:
```bash
# Start in development mode with auto-reload
npm run dev

# Or directly with ts-node-dev
npx ts-node-dev --respawn src/index.ts
```


Production Mode
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

###Running with PM2 (Recommended for Production)
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


###PM2 Ecosystem Configuration
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

###Configuration
Environment Variables


```bash
```
```bash
```

```bash
```
```bash
```


```bash
```
```bash
```


