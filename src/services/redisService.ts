import Redis from 'ioredis';
import { logger } from '../utils/logger';

export class RedisService {
  // เปลี่ยนเป็น public เพื่อให้เข้าถึงจากภายนอกได้
  public publisher: Redis;  // สำหรับส่งข้อความ
  public subscriber: Redis; // สำหรับรับข้อความ
  public client: Redis;     // สำหรับจัดเก็บข้อมูล
  private processId: string;

  constructor() {
    // สร้างการเชื่อมต่อ Redis 3 ตัว (แยกกันเพื่อประสิทธิภาพ)
    this.publisher = new Redis();
    this.subscriber = new Redis();
    this.client = new Redis();
    this.processId = process.pid.toString();
    
    // ตั้งค่าการจัดการข้อผิดพลาด
    this.handleErrors(this.publisher);
    this.handleErrors(this.subscriber);
    this.handleErrors(this.client);
    
    logger.info('Redis Service เริ่มต้นแล้ว');
  }

  // จัดการ Error Events
  private handleErrors(redisClient: Redis): void {
    redisClient.on('error', (error) => {
      logger.error(`Redis error: ${error.message}`);
    });
  }

  // เมธอดใหม่เพื่อดึงข้อมูล Redis ในรูปแบบที่เป็นระเบียบ
  async getRedisInfo(): Promise<{
    userProcesses: Record<string, string>;
    processUsers: Record<string, string[]>;
  }> {
    try {
      // ดึงข้อมูลจาก Redis
      const userProcesses = await this.client.hgetall('user_processes');
      const processUsers: Record<string, string[]> = {};
      
      // ดึงข้อมูลผู้ใช้ในแต่ละ process
      for (const processId of new Set(Object.values(userProcesses))) {
        const users = await this.client.smembers(`process:${processId}:users`);
        processUsers[processId] = users;
      }
      
      return { userProcesses, processUsers };
    } catch (error) {
      logger.error(`Error getting Redis info: ${error}`);
      throw error;
    }
  }

  // บันทึกข้อมูลว่าผู้ใช้ ID นี้เชื่อมต่ออยู่ที่ process นี้
  async registerUser(userId: string): Promise<void> {
    try {
      // บันทึกข้อมูลใน Redis
      await this.client.hset('user_processes', userId, this.processId);
      
      // บันทึกรายการผู้ใช้ของ process นี้
      await this.client.sadd(`process:${this.processId}:users`, userId);
      
      logger.debug(`ลงทะเบียน userId ${userId} กับ processId ${this.processId} ใน Redis`);
    } catch (error) {
      logger.error(`Redis registerUser error: ${error}`);
      throw error;
    }
  }

  // ลบข้อมูลผู้ใช้ออกจาก Redis เมื่อตัดการเชื่อมต่อ
  async removeUser(userId: string): Promise<void> {
    try {
      // ลบข้อมูลการเชื่อมต่อ
      await this.client.hdel('user_processes', userId);
      
      // ลบจากรายการผู้ใช้ของ process นี้
      await this.client.srem(`process:${this.processId}:users`, userId);
      
      logger.debug(`ลบ userId ${userId} ออกจาก Redis`);
    } catch (error) {
      logger.error(`Redis removeUser error: ${error}`);
    }
  }

  // ค้นหาว่าผู้ใช้ ID นี้เชื่อมต่ออยู่ที่ process ไหน
  async getUserProcess(userId: string): Promise<string | null> {
    try {
      return await this.client.hget('user_processes', userId);
    } catch (error) {
      logger.error(`Redis getUserProcess error: ${error}`);
      return null;
    }
  }

  // ส่งข้อความไปยัง process ที่เฉพาะเจาะจง
  async publishToProcess(processId: string, message: any): Promise<void> {
    try {
      const messageStr = JSON.stringify(message);
      await this.publisher.publish(`process:${processId}:messages`, messageStr);
      logger.debug(`ส่งข้อความไปยัง process ${processId}`);
    } catch (error) {
      logger.error(`Redis publishToProcess error: ${error}`);
      throw error;
    }
  }

  // สมัครรับข้อความสำหรับ process นี้
  subscribeToProcessMessages(callback: (message: any) => void): void {
    const channel = `process:${this.processId}:messages`;
    
    this.subscriber.subscribe(channel, (err) => {
      if (err) {
        logger.error(`Error subscribing to ${channel}: ${err}`);
        return;
      }
      logger.info(`กำลังฟังข้อความบนช่อง ${channel}`);
    });

    this.subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          logger.error(`ไม่สามารถแปลงข้อความ Redis: ${error}`);
        }
      }
    });
  }

  // เมื่อปิดการทำงาน
  async close(): Promise<void> {
    try {
      // ลบรายการผู้ใช้ของ process นี้
      await this.client.del(`process:${this.processId}:users`);
      
      // ปิดการเชื่อมต่อ Redis
      this.publisher.disconnect();
      this.subscriber.disconnect();
      this.client.disconnect();
      logger.info('Redis Service ปิดการทำงานแล้ว');
    } catch (error) {
      logger.error(`Error closing Redis: ${error}`);
    }
  }

  // ดึงข้อมูล Redis สำหรับการ debug
  async dumpRedisInfo(): Promise<void> {
    try {
      // ดึงข้อมูล user_processes
      const userProcesses = await this.client.hgetall('user_processes');
      logger.info(`Redis - users mapped to processes: ${JSON.stringify(userProcesses)}`);
      
      // ดึงข้อมูล users ใน process นี้
      const usersInThisProcess = await this.client.smembers(`process:${this.processId}:users`);
      logger.info(`Redis - users in this process (${this.processId}): ${JSON.stringify(usersInThisProcess)}`);
      
      // ดึงข้อมูล keys ทั้งหมดในระบบ
      const keys = await this.client.keys('*');
      logger.info(`Redis - all keys: ${JSON.stringify(keys)}`);
    } catch (error) {
      logger.error(`Redis - error dumping info: ${error}`);
    }
  }
}