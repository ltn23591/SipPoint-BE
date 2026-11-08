// Khóa per-user cho lượt quay (thay Postgres advisory lock của spec gốc).
// Serialize 2 lượt quay cùng một khách để cổng "đọc-rồi-ghi" (single-win) nhất quán.
// Tự degrade (bỏ khóa) nếu Redis không khả dụng - draw vẫn chạy nhờ các $inc atomic.
const { redisClient } = require('../middleware/rateLimit.middleware');
const logger = require('../config/logger');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const lockKey = (customerId) => `game:draw:lock:${customerId}`;

// Trả về { acquired, degraded, key, token }
async function acquireUserDrawLock(customerId, { ttlMs = 15000, retries = 8, delayMs = 120 } = {}) {
  const key = lockKey(customerId);
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  // Nếu Redis chưa sẵn sàng, degrade ngay (tránh treo do offline-queue của ioredis)
  if (!redisClient || redisClient.status !== 'ready') {
    return { acquired: false, degraded: true, key: null, token: null };
  }
  for (let i = 0; i < retries; i += 1) {
    try {
      const ok = await redisClient.set(key, token, 'PX', ttlMs, 'NX');
      if (ok) return { acquired: true, degraded: false, key, token };
    } catch (err) {
      logger.warn(`[GameLock] Redis không khả dụng, bỏ qua khóa per-user: ${err.message}`);
      return { acquired: false, degraded: true, key: null, token: null };
    }
    await sleep(delayMs);
  }
  return { acquired: false, degraded: false, key, token: null };
}

async function releaseUserDrawLock(lock) {
  if (!lock || !lock.key || !lock.token) return;
  try {
    // CAS: chỉ xóa nếu token còn khớp (tránh xóa nhầm khóa của tiến trình khác)
    await redisClient.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      1,
      lock.key,
      lock.token
    );
  } catch {
    // Bỏ qua - khóa sẽ tự hết hạn theo TTL
  }
}

module.exports = { acquireUserDrawLock, releaseUserDrawLock };
