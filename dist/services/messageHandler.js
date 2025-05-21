"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageHandler = void 0;
const logger_1 = require("../utils/logger");
class MessageHandler {
    constructor(connectionManager) {
        this.connectionManager = connectionManager;
        logger_1.logger.info('MessageHandler สร้างขึ้นแล้ว');
    }
    async processMessage(message, connectionId) {
        try {
            const payload = JSON.parse(message);
            // จัดการกับประเภทข้อความต่างๆ
            switch (payload.type) {
                case 'ping':
                    return {
                        type: 'pong',
                        timestamp: Date.now()
                    };
                case 'register':
                    if (!payload.userId) {
                        return {
                            type: 'error',
                            message: 'Missing userId in register message'
                        };
                    }
                    // เปลี่ยนเป็น async
                    const success = await this.connectionManager.registerUserId(connectionId, payload.userId);
                    return {
                        type: 'register',
                        status: success ? 'success' : 'failed',
                        userId: payload.userId,
                        timestamp: Date.now()
                    };
                case 'notification':
                    if (!payload.targetUserId) {
                        return {
                            type: 'error',
                            message: 'Missing targetUserId in notification message'
                        };
                    }
                    // เปลี่ยนเป็น async
                    const sentCount = await this.connectionManager.sendToUserById(payload.targetUserId, {
                        type: 'notification',
                        action: payload.action || 'general',
                        data: payload.data || {},
                        sender: payload.sender || connectionId,
                        timestamp: Date.now()
                    });
                    return {
                        type: 'notification_result',
                        targetUserId: payload.targetUserId,
                        delivered: sentCount > 0,
                        connections: sentCount,
                        timestamp: Date.now()
                    };
                case 'chat':
                    logger_1.logger.info(`ข้อความแชทจาก ${connectionId}: ${payload.text}`);
                    if (payload.targetUserId) {
                        const chatMessage = {
                            type: 'chat',
                            text: payload.text,
                            sender: payload.sender || connectionId,
                            timestamp: Date.now()
                        };
                        // เปลี่ยนเป็น async
                        const chatSentCount = await this.connectionManager.sendToUserById(payload.targetUserId, chatMessage);
                        return {
                            type: 'chat_delivered',
                            targetUserId: payload.targetUserId,
                            delivered: chatSentCount > 0,
                            timestamp: Date.now()
                        };
                    }
                    else {
                        return {
                            type: 'chat',
                            text: payload.text,
                            sender: connectionId,
                            timestamp: Date.now()
                        };
                    }
                default:
                    logger_1.logger.warn(`ได้รับประเภทข้อความที่ไม่รู้จัก: ${payload.type}`);
                    return {
                        type: 'error',
                        message: `Unsupported message type: ${payload.type}`
                    };
            }
        }
        catch (error) {
            logger_1.logger.error(`ไม่สามารถแยกวิเคราะห์ข้อความ: ${error}`);
            return {
                type: 'error',
                message: 'Invalid message format'
            };
        }
    }
}
exports.MessageHandler = MessageHandler;
