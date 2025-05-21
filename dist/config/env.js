"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("../utils/logger");
// Load .env file
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    maxConnections: parseInt(process.env.MAX_CONNECTIONS || '4000', 10),
    logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
};
logger_1.logger.info(`Server Configuration Loaded: 
  PORT: ${exports.config.port}
  NODE_ENV: ${exports.config.nodeEnv}
  MAX_CONNECTIONS: ${exports.config.maxConnections}`);
