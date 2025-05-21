import dotenv from 'dotenv';
import { logger } from '../utils/logger';

// Load .env file
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  maxConnections: parseInt(process.env.MAX_CONNECTIONS || '4000', 10),
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
};

logger.info(
  `Server Configuration Loaded: 
  PORT: ${config.port}
  NODE_ENV: ${config.nodeEnv}
  MAX_CONNECTIONS: ${config.maxConnections}`
);