const app = require('./app');
const env = require('./config/env');
const db = require('./config/db');

const server = app.listen(env.PORT, () => {
  console.log(`[server] listening on port ${env.PORT} (${env.NODE_ENV})`);
});

// Railway gửi SIGTERM khi redeploy: dừng nhận request mới, đóng pool DB rồi thoát
function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down`);
  server.close(async () => {
    await db.close().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
