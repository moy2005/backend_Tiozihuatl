import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const poolPromise = mysql.createPool({
  host: process.env.DB_HOST,         // Servidor MySQL
  user: process.env.DB_USER,         // Usuario
  password: process.env.DB_PASS,     // Contraseña
  database: process.env.DB_NAME,     // Nombre BD
  port: process.env.DB_PORT || 3306, // Puerto
  waitForConnections: true,
  connectionLimit: 10,               // Máx conexiones simultáneas
  queueLimit: 0,
  connectTimeout: 10000, // 10 segundos
});

poolPromise
  .getConnection()
  .then(() => {
    console.log('✅ Conectado a MySQL');
  })
  .catch((err) => {
    console.error('❌ Error de conexión a la base de datos:', err.message);
    process.exit(1);
  });

export { poolPromise };
