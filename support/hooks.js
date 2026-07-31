const { Before, After, BeforeAll } = require('@cucumber/cucumber');
const { request } = require('@playwright/test');
const { BASE_URL } = require('./config');

// Fail fast with a clear message instead of letting every scenario time out
// if the API under test was never started.
BeforeAll({ timeout: 5000 }, async function () {
  const probe = await request.newContext({ baseURL: BASE_URL });
  try {
    const res = await probe.get('/api/products');
    if (!res.ok()) {
      throw new Error(`unexpected status ${res.status()}`);
    }
  } catch (err) {
    throw new Error(
      `Could not reach API at ${BASE_URL}. Start it with "npm start" before running tests. (${err.message})`
    );
  } finally {
    await probe.dispose();
  }
});

// All state in server.js (products, orders, notifications, rate-limit log)
// is global and in-memory, so scenarios reset it before each run to stay
// independent of one another.
Before(async function () {
  await this.init();
  await this.apiContext.post('/api/__reset');
});

After(async function () {
  await this.dispose();
});
