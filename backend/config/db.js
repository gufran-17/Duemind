const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'duemind_pro',

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  // Fix timezone issues
  timezone: '+00:00',
  dateStrings: true
});

// Test connection on startup
pool.getConnection()
  .then(conn => {
    console.log(' MySQL connected');
    conn.release();
  })
  .catch(err => {
    console.error(' MySQL connection failed:', err.message);
    process.exit(1);
  });

module.exports = pool;