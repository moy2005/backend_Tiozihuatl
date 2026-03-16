import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const isLocal = process.env.NODE_ENV !== "production";

let sslConfig = undefined;

if (!isLocal) {
  sslConfig = {
    ca: process.env.DB_SSL_CA,
    rejectUnauthorized: true
  };
} else if (process.env.DB_SSL_CA) {
  sslConfig = {
    ca: process.env.DB_SSL_CA.replace(/\\n/g, "\n"),
    rejectUnauthorized: false
  };
}

export const poolConsulta = mysql.createPool({

  host: process.env.DB_HOST,
  user: process.env.DB_USER_CONSULTA,
  password: process.env.DB_PASS_CONSULTA,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,

  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0,
  connectTimeout: 10000,
  ssl: sslConfig

});
