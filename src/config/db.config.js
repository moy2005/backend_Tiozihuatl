import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

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

  // SSL requerido por Aiven
  ssl: {
    ca: fs.readFileSync("./ca.pem", "utf8"),
    rejectUnauthorized: true
  }
});

// TEST SSL detection
poolPromise.getConnection().then(conn => {
  console.log("SSL:", conn.connection.stream.ssl ? "ACTIVO" : "NO ACTIVO");
  conn.release();
})
.catch(err => {
  console.error("❌ Error de conexión:", err);
});

export { poolPromise };
