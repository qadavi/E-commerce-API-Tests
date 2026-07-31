const { Given, When } = require('@cucumber/cucumber');

Given('I am authenticated as {string}', async function (username) {
  await this.loginAs(username);
});

When('I authenticate as {string}', async function (username) {
  await this.loginAs(username);
});

Given('I am not authenticated', function () {
  this.token = null;
  this.role = null;
  this.username = null;
});
