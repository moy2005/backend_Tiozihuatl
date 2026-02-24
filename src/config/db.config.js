import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

// Detectar si estamos en desarrollo local
const isLocal = process.env.NODE_ENV !== "production";

let sslConfig = undefined;

// 𝗣𝗥𝗢𝗗𝗨𝗖𝗖𝗜𝗢́𝗡  → usar DB_SSL_CA tal como está (Vercel sí interpreta multilínea)
if (!isLocal) {
  sslConfig = {
    ca: process.env.DB_SSL_CA,
    rejectUnauthorized: false//aqui
  };
}

// 𝗟𝗢𝗖𝗔𝗟  → corregir saltos de línea del certificado (.env)
else if (process.env.DB_SSL_CA) {
  sslConfig = {
    ca: process.env.DB_SSL_CA.replace(/\\n/g, "\n"),
    rejectUnauthorized: false // ⚠️ local no necesita rígido
  };
}

const poolPromise = mysql.createPool({
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
});

// TEST
poolPromise.getConnection().then(conn => {
  console.log("SSL:", conn.connection.stream.ssl ? "ACTIVO" : "NO ACTIVO");
  conn.release();
})
.catch(err => {
  console.error("❌ Error de conexión:", err);
});

export { poolPromise };
