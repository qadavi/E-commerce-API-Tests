const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

async function placeOrder(world, quantity, productName) {
  const product = await world.findProductByName(productName);
  await world.apiRequest('post', '/api/orders', {
    headers: world.authHeaders(),
    data: { items: [{ productId: product.id, quantity }] },
  });
}

When('I place an order for {int} unit(s) of {string}', async function (quantity, productName) {
  await placeOrder(this, quantity, productName);
});

Given('I have placed an order for {int} unit(s) of {string}', async function (quantity, productName) {
  await placeOrder(this, quantity, productName);
  this.myOrder = this.responseBody;
});

When('I retrieve that order', async function () {
  await this.apiRequest('get', `/api/orders/${this.myOrder.id}`, {
    headers: this.authHeaders(),
  });
});

When('I retrieve the order {string}', async function (orderId) {
  await this.apiRequest('get', `/api/orders/${orderId}`, {
    headers: this.authHeaders(),
  });
});

When('I cancel that order', async function () {
  await this.apiRequest('delete', `/api/orders/${this.myOrder.id}`, {
    headers: this.authHeaders(),
  });
});

When('I update that order status to {string}', async function (status) {
  await this.apiRequest('put', `/api/orders/${this.myOrder.id}/status`, {
    headers: this.authHeaders(),
    data: { status },
  });
});

// Fires the requests sequentially, fast enough to land in the same 10s
// rate-limit window. this.response/this.responseBody end up holding the
// last (6th) call, which is the one the scenario asserts on.
When('I rapidly place {int} orders for {int} unit(s) of {string}', async function (count, quantity, productName) {
  const product = await this.findProductByName(productName);
  for (let i = 0; i < count; i += 1) {
    await this.apiRequest('post', '/api/orders', {
      headers: this.authHeaders(),
      data: { items: [{ productId: product.id, quantity }] },
    });
  }
});

Then('the order status should be {string}', function (status) {
  expect(this.responseBody).toHaveProperty('status', status);
});

Then('the order should belong to {string}', function (username) {
  expect(this.responseBody).toHaveProperty('ownerId', username);
});

// Business-language field labels used in feature files, mapped to the
// actual response field. Written as a regex, not a Cucumber Expression,
// because the parentheses in "(UUID format)" would otherwise be parsed as
// optional text.
const UUID_FIELD_MAP = { orderId: 'id' };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Then(/^the response should have a valid "([^"]+)" \(UUID format\)$/, function (fieldLabel) {
  const field = UUID_FIELD_MAP[fieldLabel] || fieldLabel;
  expect(this.responseBody[field]).toMatch(UUID_PATTERN);
});

Then(/^the response should have a valid "([^"]+)" timestamp$/, function (fieldLabel) {
  const value = this.responseBody[fieldLabel];
  const parsed = new Date(value);
  expect(Number.isNaN(parsed.getTime())).toBe(false);
  expect(parsed.getTime()).toBeLessThanOrEqual(Date.now());
});

Then('the order should contain the correct product {string}', function (productName) {
  const item = this.responseBody.items.find((i) => i.name === productName);
  expect(item).toBeTruthy();
});

Then('the order quantity should be {int}', function (quantity) {
  expect(this.responseBody.items[0].quantity).toBe(quantity);
});

Then('the order total should be calculated correctly', function () {
  const expectedTotal = this.responseBody.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  expect(this.responseBody.total).toBe(expectedTotal);
});

Then('the stock for {string} should still be {int}', async function (productName, expectedStock) {
  const product = await this.findProductByName(productName);
  expect(product.stock).toBe(expectedStock);
});
