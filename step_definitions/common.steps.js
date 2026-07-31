const { Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

Then('the response status should be {int}', function (expectedStatus) {
  expect(this.response.status()).toBe(expectedStatus);
});

Then('the response should contain an error message', function () {
  expect(this.responseBody).toHaveProperty('error');
  expect(typeof this.responseBody.error).toBe('string');
  expect(this.responseBody.error.length).toBeGreaterThan(0);
});
