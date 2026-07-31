const { setWorldConstructor, World } = require('@cucumber/cucumber');
const { request } = require('@playwright/test');
const { BASE_URL } = require('./config');

class CustomWorld extends World {
  constructor(options) {
    super(options);
    this.baseURL = BASE_URL;
    this.apiContext = null;

    // Session state set by auth steps, read by request steps.
    this.token = null;
    this.role = null;
    this.username = null;

    // Last HTTP exchange, set by request steps, read by assertion steps.
    this.response = null;
    this.responseBody = null;
  }

  async init() {
    this.apiContext = await request.newContext({ baseURL: this.baseURL });
  }

  async dispose() {
    if (this.apiContext) {
      await this.apiContext.dispose();
    }
  }

  authHeaders() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  async setResponse(response) {
    this.response = response;
    const contentType = response.headers()['content-type'] || '';
    this.responseBody = contentType.includes('application/json') ? await response.json() : null;
  }
}

setWorldConstructor(CustomWorld);
