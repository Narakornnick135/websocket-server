// module.exports = {
//     apps: [{
//       name: "ws-server",
//       script: "./dist/index.js",
//       instances: "max",
//       exec_mode: "cluster",
//       watch: false,
//       max_memory_restart: "1G",
//       env: {
//         NODE_ENV: "production",
//         PORT: 3000,
//         MAX_CONNECTIONS: 4000,
//         LOG_LEVEL: "info"
//       }
//     }]
//   };

// module.exports = {
//     apps: [{
//       name: "ws-server",
//       script: "./dist/index.js",
//       instances: 1,  // เปลี่ยนจาก "max" เป็น 1
//       exec_mode: "fork",  // เปลี่ยนจาก "cluster" เป็น "fork"
//       watch: false,
//       max_memory_restart: "1G",
//       env: {
//         NODE_ENV: "production",
//         PORT: 3000,
//         MAX_CONNECTIONS: 4000,
//         LOG_LEVEL: "info"
//       }
//     }]
//   };

module.exports = {
    apps: [{
      name: "ws-server",
      script: "./dist/index.js",
      instances: 5, // ใช้ CPU cores ทั้งหมดที่มี
      exec_mode: "cluster", // กลับไปใช้โหมด cluster
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        MAX_CONNECTIONS: 4000,
        LOG_LEVEL: "info",
        // เพิ่มการตั้งค่า Redis (ถ้าจำเป็น)
        REDIS_HOST: "localhost",
        REDIS_PORT: 6379
      }
    }]
  };