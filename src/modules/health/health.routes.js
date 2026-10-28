const { Router } = require('express');
const db = require('../../config/db');

const router = Router();
const startedAt = Date.now();

// Railway gọi endpoint này để biết app sống; trả 503 khi DB không kết nối được
router.get('/', async (req, res) => {
  let dbStatus = 'up';
  try {
    await db.ping();
  } catch {
    dbStatus = 'down';
  }

  const healthy = dbStatus === 'up';
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    db: dbStatus,
    uptime: Math.round((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
    version: (process.env.RENDER_GIT_COMMIT || process.env.RAILWAY_GIT_COMMIT_SHA)?.slice(0, 7) || 'local',
  });
});

module.exports = router;
