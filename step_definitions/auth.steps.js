const { Given, When } = require('@cucumber/cucumber');
const { USERS } = require('../support/config');

async function login(world, username) {
  const user = USERS[username];
  const response = await world.apiRequest('post', '/api/login', {
    data: { username: user.username, password: user.password },
  });
  if (response.ok()) {
    world.token = world.responseBody.token;
    world.role = world.responseBody.role;
    world.username = user.username;
  }
}

Given('I am authenticated as {string}', async function (username) {
  await login(this, username);
});

When('I authenticate as {string}', async function (username) {
  await login(this, username);
});

Given('I am not authenticated', function () {
  this.token = null;
  this.role = null;
  this.username = null;
});
