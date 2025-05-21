import { createServer } from './server';
import { logger } from './utils/logger';

// เริ่มต้นเซิร์ฟเวอร์
const server = createServer();
logger.info(`กระบวนการเซิร์ฟเวอร์กำลังทำงาน, pid: ${process.pid}`);

// จัดการข้อผิดพลาดที่ไม่ได้จัดการ
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  logger.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise);
  logger.error('Reason:', reason);
});

// จัดการกับ process signals
process.on('SIGTERM', () => {
  logger.info(`Process ${process.pid} ได้รับ SIGTERM - กำลังปิดอย่างสง่างาม...`);
  server.close(() => {
    logger.info('HTTP server ปิดแล้ว');
    process.exit(0);
  });
});