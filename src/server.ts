import express, { Request, Response, Router, RequestHandler } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from './utils/logger';
import { config } from './config/env';
import { setupWebSocketServer } from './websocket';

export function createServer() {
  // สร้าง Express application
  const app = express();
  const router = Router();
  
  // Middleware
  app.use(helmet());
  app.use(compression());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  
  // สร้าง HTTP server
  const server = http.createServer(app);
  
  // ตั้งค่า WebSocket server และรับ redisService
  const { wss, connectionManager, redisService } = setupWebSocketServer(server);
  
  // กำหนดประเภทข้อมูลให้ชัดเจนด้วย RequestHandler
  const healthHandler: RequestHandler = (req, res) => {
    res.status(200).json({ 
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date(),
      activeConnections: connectionManager.getConnectionCount(),
      maxConnections: connectionManager.getMaxConnections()
    });
  };
  
  const connectionsHandler: RequestHandler = (req, res) => {
    res.status(200).json({
      activeConnections: connectionManager.getConnectionCount(),
      maxConnections: connectionManager.getMaxConnections()
    });
  };
  
  // แก้ไขให้เป็น async RequestHandler
  const sendToUserHandler: RequestHandler = async (req, res) => {
    const { userId, message, type } = req.body;
    
    if (!userId || !message) {
      res.status(400).json({
        error: 'userId และ message จำเป็นต้องระบุ'
      });
      return; // ไม่ return ค่าใดๆ
    }
    
    try {
      // เปลี่ยนเป็นรองรับ Promise (await)
      const sentCount = await connectionManager.sendToUserById(userId, {
        type: type || 'notification',
        message,
        sender: 'system',
        timestamp: Date.now()
      });
      
      res.status(200).json({
        success: sentCount > 0,
        delivered: sentCount,
        userId
      });
    } catch (error) {
      logger.error(`เกิดข้อผิดพลาด: ${error}`);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการส่งข้อความ' });
    }
  };
  
  // แก้ไข redisInfoHandler เพื่อใช้ redisService โดยตรง
  const redisInfoHandler: RequestHandler = async (req, res) => {
    try {
      if (!redisService) {
        res.status(500).json({ error: 'Redis service not available' });
        return; // แก้ไข: ใช้ return เปล่าๆ แทน return res.status()
      }
      
      // ใช้เมธอด getRedisInfo() ที่เพิ่มใหม่
      const { userProcesses, processUsers } = await redisService.getRedisInfo();
      
      // ส่งข้อมูลพร้อมกับข้อมูลการเชื่อมต่อ
      res.status(200).json({
        processId: process.pid,
        userProcesses,
        processUsers,
        localConnections: connectionManager.getConnectionCount()
      });
      
      // บันทึกข้อมูล Redis ลง log เพื่อการ debug (optional)
      await redisService.dumpRedisInfo();
      
    } catch (error) {
      logger.error(`Error getting Redis info: ${error}`);
      res.status(500).json({ error: 'Failed to get Redis info' });
    }
  };
  
  // กำหนด routes
  router.get('/api/health', healthHandler);
  router.get('/api/connections', connectionsHandler);
  router.post('/api/send-to-user', sendToUserHandler);
  router.get('/api/redis-info', redisInfoHandler);
  
  // นำ router มาใช้กับ app
  app.use(router);
  
  // เริ่มต้น server
  server.listen(config.port, () => {
    logger.info(`Server กำลังทำงานที่ http://localhost:${config.port} (pid: ${process.pid})`);
    logger.info(`WebSocket server พร้อมใช้งานแล้ว`);
  });
  
  // จัดการกับ process signals
  process.on('SIGTERM', () => {
    logger.info(`Process ${process.pid} ได้รับ SIGTERM - กำลังปิดอย่างสง่างาม...`);
    server.close(() => {
      logger.info('HTTP server ปิดแล้ว');
      process.exit(0);
    });
  });
  
  server.on('error', (err) => {
    logger.error(`Server error: ${err.message}`);
  });
  
  return server;
}