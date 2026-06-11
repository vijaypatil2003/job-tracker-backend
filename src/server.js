require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/database');
const { startCronJobs } = require('./services/cronService');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

// Handle uncaught exceptions (must be first)
process.on('uncaughtException', (err) => {
  logger.error(`UNCAUGHT EXCEPTION: ${err.name} - ${err.message}`);
  logger.error(err.stack);
  process.exit(1);
});

const server = http.createServer(app);

const start = async () => {
  // Connect to MongoDB
  await connectDB();

  // Start cron jobs
  startCronJobs();

  // Start HTTP server
  server.listen(PORT, () => {
    logger.info(`
    ╔════════════════════════════════════════════╗
    ║     Job Tracker Pro — Backend Server       ║
    ╠════════════════════════════════════════════╣
    ║  Environment : ${(process.env.NODE_ENV || 'development').padEnd(27)}║
    ║  Port        : ${String(PORT).padEnd(27)}║
    ║  API Base    : /api/v1${' '.repeat(21)}║
    ╚════════════════════════════════════════════╝
    `);
  });
};

start();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`UNHANDLED REJECTION: ${err.name} - ${err.message}`);
  server.close(() => process.exit(1));
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000); // Force exit after 10s
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;
