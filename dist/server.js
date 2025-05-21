"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const express_1 = __importStar(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const logger_1 = require("./utils/logger");
const env_1 = require("./config/env");
const websocket_1 = require("./websocket");
function createServer() {
    // สร้าง Express application
    const app = (0, express_1.default)();
    const router = (0, express_1.Router)();
    // Middleware
    app.use((0, helmet_1.default)());
    app.use((0, compression_1.default)());
    app.use((0, cors_1.default)());
    app.use(express_1.default.json({ limit: '1mb' }));
    // สร้าง HTTP server
    const server = http_1.default.createServer(app);
    // ตั้งค่า WebSocket server
    const { wss, connectionManager } = (0, websocket_1.setupWebSocketServer)(server);
    // กำหนดประเภทข้อมูลให้ชัดเจนด้วย RequestHandler ที่รองรับ async
    const healthHandler = (req, res) => {
        res.status(200).json({
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date(),
            activeConnections: connectionManager.getConnectionCount(),
            maxConnections: connectionManager.getMaxConnections()
        });
    };
    const connectionsHandler = (req, res) => {
        res.status(200).json({
            activeConnections: connectionManager.getConnectionCount(),
            maxConnections: connectionManager.getMaxConnections()
        });
    };
    // แก้ไขให้เป็น async RequestHandler
    const sendToUserHandler = async (req, res) => {
        const { userId, message, type } = req.body;
        if (!userId || !message) {
            res.status(400).json({
                error: 'userId และ message จำเป็นต้องระบุ'
            });
            return;
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
        }
        catch (error) {
            logger_1.logger.error(`เกิดข้อผิดพลาด: ${error}`);
            res.status(500).json({ error: 'เกิดข้อผิดพลาดในการส่งข้อความ' });
        }
    };
    // กำหนด routes
    router.get('/api/health', healthHandler);
    router.get('/api/connections', connectionsHandler);
    router.post('/api/send-to-user', sendToUserHandler);
    // นำ router มาใช้กับ app
    app.use(router);
    // เริ่มต้น server
    server.listen(env_1.config.port, () => {
        logger_1.logger.info(`Server กำลังทำงานที่ http://localhost:${env_1.config.port} (pid: ${process.pid})`);
        logger_1.logger.info(`WebSocket server พร้อมใช้งานแล้ว`);
    });
    // จัดการกับ process signals
    process.on('SIGTERM', () => {
        logger_1.logger.info(`Process ${process.pid} ได้รับ SIGTERM - กำลังปิดอย่างสง่างาม...`);
        server.close(() => {
            logger_1.logger.info('HTTP server ปิดแล้ว');
            process.exit(0);
        });
    });
    server.on('error', (err) => {
        logger_1.logger.error(`Server error: ${err.message}`);
    });
    return server;
}
