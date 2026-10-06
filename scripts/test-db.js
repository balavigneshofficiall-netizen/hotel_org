const mysql = require('mysql2/promise');

async function testConnections() {
  const passwords = ['', 'root', 'password', '1234', '123456', 'admin'];
  for (const pw of passwords) {
    try {
      const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: pw,
        connectTimeout: 2000
      });
      console.log(`SUCCESS: Connected with user 'root' and password '${pw}'`);
      await connection.query('CREATE DATABASE IF NOT EXISTS hotel_qr_ordering;');
      console.log('Database hotel_qr_ordering created or already exists.');
      await connection.end();
      return pw;
    } catch (err) {
      console.log(`Failed with password '${pw}': ${err.message}`);
    }
  }
  console.log('Could not connect with standard passwords.');
}

testConnections();
