import mysql from "mysql2/promise";

export const poolBackup = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER_BACKUP,
  password: process.env.DB_PASS_BACKUP,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 5
});