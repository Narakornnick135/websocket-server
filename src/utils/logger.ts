import pino from 'pino';
import dotenv from 'dotenv';

// โหลด .env เพื่อให้แน่ใจว่าเราอ่าน LOG_LEVEL ได้
dotenv.config();

export const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  },
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
});