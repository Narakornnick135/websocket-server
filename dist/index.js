"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
const logger_1 = require("./utils/logger");
// เริ่มต้นเซิร์ฟเวอร์
const server = (0, server_1.createServer)();
logger_1.logger.info(`กระบวนการเซิร์ฟเวอร์กำลังทำงาน, pid: ${process.pid}`);
// จัดการข้อผิดพลาดที่ไม่ได้จัดการ
process.on('uncaughtException', (error) => {
    logger_1.logger.error(`Uncaught Exception: ${error.message}`);
    logger_1.logger.error(error.stack);
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Unhandled Rejection at:', promise);
    logger_1.logger.error('Reason:', reason);
});
// จัดการกับ process signals
process.on('SIGTERM', () => {
    logger_1.logger.info(`Process ${process.pid} ได้รับ SIGTERM - กำลังปิดอย่างสง่างาม...`);
    server.close(() => {
        logger_1.logger.info('HTTP server ปิดแล้ว');
        process.exit(0);
    });
});
