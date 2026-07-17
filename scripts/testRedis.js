const Redis = require('ioredis');

const REDIS_URL = 'rediss://default:gQAAAAAAAnk1AAlgcDI2MjlhNjQ4ZTM3M2Y0ZGQyOTJhNjY2ZHNzBKMmJMW@precious-sailfish-162101.upstash.io:6379';

const redis = new Redis(REDIS_URL, {
  connectTimeout: 5000,
  maxRetriesPerRequest: 1
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
  process.exit(1);
});

redis.on('connect', () => {
  console.log('Connected to Redis!');
  process.exit(0);
});
