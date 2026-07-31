const { setWorldConstructor, World } = require('@cucumber/cucumber');
const { request } = require('@playwright/test');
const { BASE_URL, USERS } = require('./config');

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

  async loginAs(username) {
    const user = USERS[username];
    const response = await this.apiRequest('post', '/api/login', {
      data: { username: user.username, password: user.password },
    });
    if (response.ok()) {
      this.token = this.responseBody.token;
      this.role = this.responseBody.role;
      this.username = user.username;
    }
    return response;
  }

  async findProductByName(productName) {
    const response = await this.apiRequest('get', '/api/products');
    const products = await response.json();
    const product = products.find((p) => p.name === productName);
    if (!product) {
      throw new Error(`No seeded product named "${productName}"`);
    }
    return product;
  }

  async setResponse(response) {
    this.response = response;
    const contentType = response.headers()['content-type'] || '';
    this.responseBody = contentType.includes('application/json') ? await response.json() : null;
  }

  // Central place every step goes through to call the API, so every step in
  // the report carries the same thing you'd see testing manually in
  // Postman: request (method/url/headers/body), response status, duration
  // and response body.
  async apiRequest(method, url, options = {}) {
    const start = Date.now();
    const response = await this.apiContext[method](url, options);
    const duration = Date.now() - start;
    await this.setResponse(response);

    const summary = `${method.toUpperCase()} ${url} -> ${response.status()} (${duration}ms)`;
    this.log(summary);
    this.attach(summary, 'text/plain');
    this.attach(
      JSON.stringify(
        {
          request: {
            method: method.toUpperCase(),
            url,
            headers: options.headers || {},
            body: options.data ?? null,
          },
          response: {
            status: response.status(),
            durationMs: duration,
            body: this.responseBody,
          },
        },
        null,
        2
      ),
      'application/json'
    );

    return response;
  }
}

setWorldConstructor(CustomWorld);
