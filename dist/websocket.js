"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebSocketServer = setupWebSocketServer;
const ws_1 = require("ws");
const logger_1 = require("./utils/logger");
const connectionManager_1 = require("./services/connectionManager");
const messageHandler_1 = require("./services/messageHandler");
const redisService_1 = require("./services/redisService");
function setupWebSocketServer(server) {
    // สร้าง RedisService
    const redisService = new redisService_1.RedisService();
    // สร้าง ConnectionManager และส่ง RedisService
    const connectionManager = new connectionManager_1.ConnectionManager(parseInt(process.env.MAX_CONNECTIONS || '4000', 10), redisService);
    // สร้าง WebSocket server
    const wss = new ws_1.WebSocketServer({
        server,
        perMessageDeflate: {
            zlibDeflateOptions: { level: 6, memLevel: 8 }
        },
        maxPayload: 1024 * 1024 // 1 MB
    });
    // สร้าง MessageHandler
    const messageHandler = new messageHandler_1.MessageHandler(connectionManager);
    // ตั้งค่า heartbeat interval
    const heartbeatInterval = setInterval(() => {
        connectionManager.checkConnections();
    }, 30000);
    // จัดการเมื่อ server ปิด
    wss.on('close', () => {
        clearInterval(heartbeatInterval);
        redisService.close().catch(err => logger_1.logger.error(`Error closing Redis: ${err}`));
        logger_1.logger.info('WebSocket server ปิดตัวลง');
    });
    // จัดการ process termination
    process.on('SIGTERM', async () => {
        clearInterval(heartbeatInterval);
        await redisService.close();
        logger_1.logger.info('WebSocket server ปิดตัวลงเนื่องจาก SIGTERM');
    });
    // จัดการการเชื่อมต่อใหม่
    wss.on('connection', (ws, req) => {
        const extWs = ws;
        // สร้าง ID สำหรับการเชื่อมต่อนี้
        extWs.id = connectionManager.generateConnectionId();
        extWs.isAlive = true;
        // ตรวจสอบว่ามีการเชื่อมต่อมากเกินไปหรือไม่
        if (!connectionManager.addConnection(extWs.id, extWs)) {
            logger_1.logger.warn('จำนวนการเชื่อมต่อเกินขีดจำกัดแล้ว ปฏิเสธการเชื่อมต่อใหม่');
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Server is at capacity, please try again later'
            }));
            return ws.terminate();
        }
        const ip = req.socket.remoteAddress;
        logger_1.logger.info(`Client เชื่อมต่อใหม่: ${extWs.id} จาก IP: ${ip}`);
        logger_1.logger.info(`จำนวนการเชื่อมต่อที่ใช้งานอยู่: ${connectionManager.getConnectionCount()}`);
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
        ws.on('message', async (data) => {
            try {
                const message = data.toString();
                logger_1.logger.debug(`ได้รับข้อความจาก ${extWs.id}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
                // ประมวลผลข้อความ
                const response = await messageHandler.processMessage(message, extWs.id);
                // ส่งการตอบกลับ
                if (response) {
                    ws.send(JSON.stringify(response));
                }
            }
            catch (error) {
                logger_1.logger.error(`เกิดข้อผิดพลาดในการประมวลผลข้อความ: ${error}`);
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Error processing your message'
                }));
            }
        });
        // จัดการเมื่อปิดการเชื่อมต่อ
        ws.on('close', async () => {
            logger_1.logger.info(`การเชื่อมต่อปิดลงสำหรับ ${extWs.id}`);
            await connectionManager.removeConnection(extWs.id);
            logger_1.logger.info(`จำนวนการเชื่อมต่อที่เหลืออยู่: ${connectionManager.getConnectionCount()}`);
        });
        // จัดการข้อผิดพลาด
        ws.on('error', async (err) => {
            logger_1.logger.error(`เกิดข้อผิดพลาดกับการเชื่อมต่อ ${extWs.id}: ${err.message}`);
            await connectionManager.removeConnection(extWs.id);
        });
    });
    logger_1.logger.info('WebSocket server ติดตั้งเรียบร้อยแล้ว');
    return { wss, connectionManager };
}
