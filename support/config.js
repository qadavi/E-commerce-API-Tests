const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const USERS = {
  admin: { username: 'admin', password: 'admin123', role: 'admin' },
  customer1: { username: 'customer1', password: 'cust123', role: 'customer' },
  customer2: { username: 'customer2', password: 'cust123', role: 'customer' },
};

module.exports = { BASE_URL, USERS };
