let client = null;
let isConnected = false;

// 初始化 Redis 连接（快速失败，不阻塞启动）
async function initCache() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log("未配置 REDIS_URL，跳过缓存");
    return;
  }

  try {
    const { createClient } = require("redis");
    client = createClient({ url: redisUrl });

    client.on("error", () => {
      isConnected = false;
    });

    client.on("connect", () => {
      console.log("Redis 已连接");
      isConnected = true;
    });

    // 2秒超时，连不上就跳过
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("超时")), 2000)
    );
    await Promise.race([client.connect(), timeout]);
  } catch {
    console.log("Redis 不可用，将不使用缓存");
    client = null;
    isConnected = false;
  }
}

// 获取缓存
async function getCache(key) {
  if (!isConnected || !client) return null;
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// 设置缓存（可选过期时间，单位秒）
async function setCache(key, value, expireSeconds = 60) {
  if (!isConnected || !client) return;
  try {
    await client.set(key, JSON.stringify(value), { EX: expireSeconds });
  } catch {}
}

// 删除缓存
async function delCache(key) {
  if (!isConnected || !client) return;
  try {
    await client.del(key);
  } catch {}
}

module.exports = { initCache, getCache, setCache, delCache };
