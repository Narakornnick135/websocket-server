import { WebSocket } from 'ws';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from './redisService';

export interface ExtendedWebSocket extends WebSocket {
  id: string;
  isAlive: boolean;
  userId?: string;
}

export class ConnectionManager {
  private connections: Map<string, ExtendedWebSocket>;
  private userConnections: Map<string, Set<string>>;
  private maxConnections: number;
  private redisService: RedisService;
  private processId: string;
  
  constructor(maxConnections: number, redisService: RedisService) {
    this.connections = new Map();
    this.userConnections = new Map();
    this.maxConnections = maxConnections;
    this.redisService = redisService;
    this.processId = process.pid.toString();
    
    // รับข้อความจาก processes อื่น
    this.redisService.subscribeToProcessMessages(this.handleRemoteMessage.bind(this));
    
    logger.info(`ConnectionManager สร้างขึ้นแล้วด้วยขีดจำกัดการเชื่อมต่อ ${maxConnections}, processId: ${this.processId}`);
  }
  
  // สร้าง ID สำหรับการเชื่อมต่อใหม่
  public generateConnectionId(): string {
    return uuidv4();
  }
  
  // เพิ่มการเชื่อมต่อใหม่
  public addConnection(id: string, ws: ExtendedWebSocket): boolean {
    if (this.connections.size >= this.maxConnections) {
      logger.warn(`ไม่สามารถเพิ่มการเชื่อมต่อใหม่ได้ เกินขีดจำกัด ${this.maxConnections}`);
      return false;
    }
    
    this.connections.set(id, ws);
    logger.debug(`เพิ่มการเชื่อมต่อใหม่: ${id}, จำนวนการเชื่อมต่อปัจจุบัน: ${this.connections.size}`);
    return true;
  }
  
  // ลงทะเบียน userID กับการเชื่อมต่อ - บันทึกใน Redis ด้วย
  public async registerUserId(connectionId: string, userId: string): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    
    if (!connection) {
      logger.warn(`ไม่พบการเชื่อมต่อ ${connectionId} สำหรับการลงทะเบียน userId`);
      return false;
    }
    
    // อัปเดต userId สำหรับการเชื่อมต่อนี้
    connection.userId = userId;
    
    // เพิ่มการเชื่อมต่อนี้เข้าไปในชุดของการเชื่อมต่อสำหรับ userId นี้
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    
    const userConnectionSet = this.userConnections.get(userId);
    if (userConnectionSet) {
      userConnectionSet.add(connectionId);
    }
    
    // บันทึกใน Redis ว่า userId นี้อยู่ที่ process นี้
    await this.redisService.registerUser(userId);
    
    logger.info(`ลงทะเบียน userId ${userId} สำหรับการเชื่อมต่อ ${connectionId}`);
    return true;
  }
  
  // ลบการเชื่อมต่อ - ลบจาก Redis ด้วย
  public async removeConnection(connectionId: string): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    
    if (connection && connection.userId) {
      const userId = connection.userId;
      const userConnectionSet = this.userConnections.get(userId);
      
      if (userConnectionSet) {
        userConnectionSet.delete(connectionId);
        
        // ถ้าไม่มีการเชื่อมต่อเหลืออยู่สำหรับ userId นี้ ให้ลบออกจาก Map และ Redis
        if (userConnectionSet.size === 0) {
          this.userConnections.delete(userId);
          await this.redisService.removeUser(userId);
        }
      }
    }
    
    return this.connections.delete(connectionId);
  }
  
  // ส่งข้อความไปยังผู้ใช้เฉพาะ - อาจต้องส่งผ่าน Redis ไปยัง process อื่น
  public async sendToUserById(userId: string, message: any): Promise<number> {
    // ตรวจสอบว่ามีการเชื่อมต่อในโปรเซสนี้หรือไม่
    const localConnections = this.userConnections.get(userId);
    let sentCount = 0;
    
    if (localConnections && localConnections.size > 0) {
      // มีการเชื่อมต่อในโปรเซสนี้ ส่งข้อความโดยตรง
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      
      localConnections.forEach(connectionId => {
        const ws = this.connections.get(connectionId);
        
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
          sentCount++;
        }
      });
      
      logger.debug(`ส่งข้อความไปยัง userId ${userId} ภายใน process นี้: ${sentCount} การเชื่อมต่อ`);
    }
    
    // ตรวจสอบว่ามีการเชื่อมต่อใน process อื่นหรือไม่
    const remoteProcessId = await this.redisService.getUserProcess(userId);
    
    if (remoteProcessId && remoteProcessId !== this.processId) {
      // ส่งข้อความผ่าน Redis ไปยัง process ที่เหมาะสม
      await this.redisService.publishToProcess(remoteProcessId, {
        type: 'send_to_user',
        userId,
        message
      });
      
      logger.debug(`ส่งข้อความไปยัง userId ${userId} ผ่าน Redis ไปยัง process ${remoteProcessId}`);
      sentCount = 1; // นับเป็น 1 เพราะส่งสำเร็จไปยังอีก process
    }
    
    if (sentCount === 0) {
      logger.warn(`ไม่พบการเชื่อมต่อสำหรับ userId ${userId}`);
    }
    
    return sentCount;
  }
  
  // จัดการกับข้อความที่มาจาก process อื่นผ่าน Redis
  private async handleRemoteMessage(data: any): Promise<void> {
    if (data.type !== 'send_to_user' || !data.userId || !data.message) {
      return;
    }
    
    const { userId, message } = data;
    const localConnections = this.userConnections.get(userId);
    
    if (!localConnections || localConnections.size === 0) {
      logger.warn(`ได้รับข้อความผ่าน Redis สำหรับ userId ${userId} แต่ไม่พบการเชื่อมต่อในโปรเซสนี้`);
      return;
    }
    
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    let sentCount = 0;
    
    localConnections.forEach(connectionId => {
      const ws = this.connections.get(connectionId);
      
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
        sentCount++;
      }
    });
    
    logger.debug(`ส่งข้อความที่ได้รับผ่าน Redis ไปยัง userId ${userId}: ${sentCount} การเชื่อมต่อ`);
  }
  
  // ฟังก์ชันพื้นฐานอื่นๆ คงเดิม ...
  public getConnection(connectionId: string): ExtendedWebSocket | undefined {
    return this.connections.get(connectionId);
  }
  
  public getConnectionCount(): number {
    return this.connections.size;
  }
  
  public getMaxConnections(): number {
    return this.maxConnections;
  }
  
  // ส่งข้อความแบบ broadcast
  public broadcastMessage(message: any, excludeId?: string): number {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    let sentCount = 0;
    
    this.connections.forEach((ws, id) => {
      if (excludeId && id === excludeId) {
        return;
      }
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
        sentCount++;
      }
    });
    
    logger.debug(`ส่งข้อความ broadcast ไปยัง ${sentCount} การเชื่อมต่อ`);
    return sentCount;
  }
  
  // ตรวจสอบและจัดการกับการเชื่อมต่อที่ไม่ตอบสนอง
  public checkConnections(): void {
    let terminatedCount = 0;
    
    this.connections.forEach((ws, id) => {
      if (ws.isAlive === false) {
        logger.info(`ตัดการเชื่อมต่อกับ client ${id} เนื่องจากไม่มีการตอบสนอง`);
        this.removeConnection(id);
        ws.terminate();
        terminatedCount++;
        return;
      }
      
      ws.isAlive = false;
      ws.ping();
    });
    
    if (terminatedCount > 0) {
      logger.info(`ตัดการเชื่อมต่อที่ไม่ตอบสนองจำนวน ${terminatedCount} การเชื่อมต่อ`);
    }
  }
}