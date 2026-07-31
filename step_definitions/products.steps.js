const { When } = require('@cucumber/cucumber');

When('I retrieve the product {string}', async function (productId) {
  await this.apiRequest('get', `/api/products/${productId}`, {
    headers: this.authHeaders(),
  });
});

When(
  'I attempt to create a product with name {string}, price {float} and stock {int}',
  async function (name, price, stock) {
    await this.apiRequest('post', '/api/products', {
      headers: this.authHeaders(),
      data: { name, price, stock },
    });
  }
);

When('I attempt to create a product without a price', async function () {
  await this.apiRequest('post', '/api/products', {
    headers: this.authHeaders(),
    data: { name: 'Gaming Chair', stock: 5 },
  });
});
