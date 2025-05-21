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
