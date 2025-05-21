import { WebSocketServer, WebSocket, RawData } from 'ws';
import { IncomingMessage } from 'http';
import { logger } from './utils/logger';
import { ConnectionManager, ExtendedWebSocket } from './services/connectionManager';
import { MessageHandler } from './services/messageHandler';
import { RedisService } from './services/redisService';
import { Server } from 'http';

// แก้ไข interface เพื่อรวม redisService
export interface WebSocketResult {
  wss: WebSocketServer;
  connectionManager: ConnectionManager;
  redisService: RedisService; // เพิ่ม redisService เพื่อให้เข้าถึงได้จากภายนอก
}

export function setupWebSocketServer(server: Server): WebSocketResult {
  // สร้าง RedisService
  const redisService = new RedisService();
  
  // สร้าง ConnectionManager และส่ง RedisService
  const connectionManager = new ConnectionManager(
    parseInt(process.env.MAX_CONNECTIONS || '4000', 10),
    redisService
  );
  
  // สร้าง WebSocket server
  const wss = new WebSocketServer({ 
    server,
    perMessageDeflate: {
      zlibDeflateOptions: { level: 6, memLevel: 8 }
    },
    maxPayload: 1024 * 1024 // 1 MB
  });
  
  // สร้าง MessageHandler
  const messageHandler = new MessageHandler(connectionManager);
  
  // ตั้งค่า heartbeat interval
  const heartbeatInterval = setInterval(() => {
    connectionManager.checkConnections();
  }, 30000);
  
  // จัดการเมื่อ server ปิด
  wss.on('close', () => {
    clearInterval(heartbeatInterval);
    redisService.close().catch(err => logger.error(`Error closing Redis: ${err}`));
    logger.info('WebSocket server ปิดตัวลง');
  });
  
  // จัดการ process termination
  process.on('SIGTERM', async () => {
    clearInterval(heartbeatInterval);
    await redisService.close();
    logger.info('WebSocket server ปิดตัวลงเนื่องจาก SIGTERM');
  });
  
  // จัดการการเชื่อมต่อใหม่
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const extWs = ws as ExtendedWebSocket;
    
    // สร้าง ID สำหรับการเชื่อมต่อนี้
    extWs.id = connectionManager.generateConnectionId();
    extWs.isAlive = true;
    
    // ตรวจสอบว่ามีการเชื่อมต่อมากเกินไปหรือไม่
    if (!connectionManager.addConnection(extWs.id, extWs)) {
      logger.warn('จำนวนการเชื่อมต่อเกินขีดจำกัดแล้ว ปฏิเสธการเชื่อมต่อใหม่');
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Server is at capacity, please try again later'
      }));
      return ws.terminate();
    }
    
    const ip = req.socket.remoteAddress;
    logger.info(`Client เชื่อมต่อใหม่: ${extWs.id} จาก IP: ${ip}`);
    logger.info(`จำนวนการเชื่อมต่อที่ใช้งานอยู่: ${connectionManager.getConnectionCount()}`);
    
    // ส่งข้อความต้อนรับ
    ws.send(JSON.stringify({
      type: 'welcome',
      message: 'เชื่อมต่อกับ WebSocket server สำเร็จแล้ว',
      connectionId: extWs.id,
      processId: process.pid,
      timestamp: Date.now()
    }));
    
    // จัดการกับ heartbeat
    ws.on('pong', () => {
      extWs.isAlive = true;
    });
    
    // จัดการกับข้อความที่ได้รับ
    ws.on('message', async (data: RawData) => {
      try {
        const message = data.toString();
        logger.debug(`ได้รับข้อความจาก ${extWs.id}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
        
        // ประมวลผลข้อความ
        const response = await messageHandler.processMessage(message, extWs.id);
        
        // ส่งการตอบกลับ
        if (response) {
          ws.send(JSON.stringify(response));
        }
      } catch (error) {
        logger.error(`เกิดข้อผิดพลาดในการประมวลผลข้อความ: ${error}`);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Error processing your message'
        }));
      }
    });
    
    // จัดการเมื่อปิดการเชื่อมต่อ
    ws.on('close', async () => {
      logger.info(`การเชื่อมต่อปิดลงสำหรับ ${extWs.id}`);
      await connectionManager.removeConnection(extWs.id);
      logger.info(`จำนวนการเชื่อมต่อที่เหลืออยู่: ${connectionManager.getConnectionCount()}`);
    });
    
    // จัดการข้อผิดพลาด
    ws.on('error', async (err) => {
      logger.error(`เกิดข้อผิดพลาดกับการเชื่อมต่อ ${extWs.id}: ${err.message}`);
      await connectionManager.removeConnection(extWs.id);
    });
  });
  
  logger.info('WebSocket server ติดตั้งเรียบร้อยแล้ว');
  
  // ส่งคืนทั้ง wss, connectionManager และ redisService เพื่อใช้งานในไฟล์อื่น
  return { wss, connectionManager, redisService };
}