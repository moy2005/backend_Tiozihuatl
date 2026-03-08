import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const isLocal = process.env.NODE_ENV !== "production";
let sslConfig = undefined;
if (!isLocal) {
  sslConfig = {
    ca: process.env.DB_SSL_CA,
    rejectUnauthorized: false//aqui
  };
} else if (process.env.DB_SSL_CA) {
  sslConfig = {
    ca: process.env.DB_SSL_CA.replace(/\\n/g, "\n"),
    rejectUnauthorized: false
  };
}
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  ssl: sslConfig,
  timezone: '-06:00'
});

export const poolPromise = pool;

// Test opcional
pool.getConnection()
  .then(conn => {
    console.log("SSL:", conn.connection.stream.ssl ? "ACTIVO" : "NO ACTIVO");
    conn.release();
  })
  .catch(err => {
    console.error("❌ Error de conexión:", err);
  });
