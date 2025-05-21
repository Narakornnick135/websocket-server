"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../utils/logger");
class RedisService {
    constructor() {
        // สร้างการเชื่อมต่อ Redis 3 ตัว (แยกกันเพื่อประสิทธิภาพ)
        this.publisher = new ioredis_1.default();
        this.subscriber = new ioredis_1.default();
        this.client = new ioredis_1.default();
        this.processId = process.pid.toString();
        // ตั้งค่าการจัดการข้อผิดพลาด
        this.handleErrors(this.publisher);
        this.handleErrors(this.subscriber);
        this.handleErrors(this.client);
        logger_1.logger.info('Redis Service เริ่มต้นแล้ว');
    }
    // จัดการ Error Events
    handleErrors(redisClient) {
        redisClient.on('error', (error) => {
            logger_1.logger.error(`Redis error: ${error.message}`);
        });
    }
    // บันทึกข้อมูลว่าผู้ใช้ ID นี้เชื่อมต่ออยู่ที่ process นี้
    async registerUser(userId) {
        try {
            // บันทึกข้อมูลใน Redis
            await this.client.hset('user_processes', userId, this.processId);
            // บันทึกรายการผู้ใช้ของ process นี้
            await this.client.sadd(`process:${this.processId}:users`, userId);
            logger_1.logger.debug(`ลงทะเบียน userId ${userId} กับ processId ${this.processId} ใน Redis`);
        }
        catch (error) {
            logger_1.logger.error(`Redis registerUser error: ${error}`);
            throw error;
        }
    }
    // ลบข้อมูลผู้ใช้ออกจาก Redis เมื่อตัดการเชื่อมต่อ
    async removeUser(userId) {
        try {
            // ลบข้อมูลการเชื่อมต่อ
            await this.client.hdel('user_processes', userId);
            // ลบจากรายการผู้ใช้ของ process นี้
            await this.client.srem(`process:${this.processId}:users`, userId);
            logger_1.logger.debug(`ลบ userId ${userId} ออกจาก Redis`);
        }
        catch (error) {
            logger_1.logger.error(`Redis removeUser error: ${error}`);
        }
    }
    // ค้นหาว่าผู้ใช้ ID นี้เชื่อมต่ออยู่ที่ process ไหน
    async getUserProcess(userId) {
        try {
            return await this.client.hget('user_processes', userId);
        }
        catch (error) {
            logger_1.logger.error(`Redis getUserProcess error: ${error}`);
            return null;
        }
    }
    // ส่งข้อความไปยัง process ที่เฉพาะเจาะจง
    async publishToProcess(processId, message) {
        try {
            const messageStr = JSON.stringify(message);
            await this.publisher.publish(`process:${processId}:messages`, messageStr);
            logger_1.logger.debug(`ส่งข้อความไปยัง process ${processId}`);
        }
        catch (error) {
            logger_1.logger.error(`Redis publishToProcess error: ${error}`);
            throw error;
        }
    }
    // สมัครรับข้อความสำหรับ process นี้
    subscribeToProcessMessages(callback) {
        const channel = `process:${this.processId}:messages`;
        this.subscriber.subscribe(channel, (err) => {
            if (err) {
                logger_1.logger.error(`Error subscribing to ${channel}: ${err}`);
                return;
            }
            logger_1.logger.info(`กำลังฟังข้อความบนช่อง ${channel}`);
        });
        this.subscriber.on('message', (receivedChannel, message) => {
            if (receivedChannel === channel) {
                try {
                    const parsedMessage = JSON.parse(message);
                    callback(parsedMessage);
                }
                catch (error) {
                    logger_1.logger.error(`ไม่สามารถแปลงข้อความ Redis: ${error}`);
                }
            }
        });
    }
    // เมื่อปิดการทำงาน
    async close() {
        // ลบรายการผู้ใช้ของ process นี้
        await this.client.del(`process:${this.processId}:users`);
        // ปิดการเชื่อมต่อ Redis
        this.publisher.disconnect();
        this.subscriber.disconnect();
        this.client.disconnect();
        logger_1.logger.info('Redis Service ปิดการทำงานแล้ว');
    }
}
exports.RedisService = RedisService;
