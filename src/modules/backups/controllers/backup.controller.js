import backupService from "../services/backup.service.js";
import { poolOperacion } from "../../../config/dbPools/poolOperacion.config.js";

// Genera fecha/hora en zona México (UTC-6) como string para insertar en BD
const getNowMexico = () => {
  return new Date()
    .toLocaleString('sv-SE', { timeZone: 'America/Mexico_City' })
    .replace('T', ' ')
    .slice(0, 19);
};


/* ===============================
   BACKUP COMPLETO MANUAL
================================ */

const backupFull = async (req, res) => {
  try {

    const { fileName, url } =
      await backupService.backupDatabase("manual");

    await poolOperacion.execute(
      `INSERT INTO backups_log
       (tipo, alcance, tabla_afectada, nombre_archivo, url_backup, ejecutado_por, fecha)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        "manual",
        "database",
        null,
        fileName,
        url,
        req.user?.id_usuario || null,
        getNowMexico()
      ]
    );

    res.json({
      message: "Respaldo generado y guardado en Cloudinary",
      fileName,
      url
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error generando respaldo" });
  }
};


/* ===============================
   BACKUP DE TABLA MANUAL
================================ */

const backupSingleTable = async (req, res) => {
  try {

    const { table } = req.params;

    const tables = await backupService.getBackupTables();

    if (!tables.includes(table)) {
      return res.status(400).json({
        message: "Tabla no permitida para respaldo"
      });
    }

    const { fileName, url } =
      await backupService.backupTable(table, "manual");

    await poolOperacion.execute(
      `INSERT INTO backups_log
       (tipo, alcance, tabla_afectada, nombre_archivo, url_backup, ejecutado_por, fecha)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        "manual",
        "table",
        table,
        fileName,
        url,
        req.user?.id_usuario || null,
        getNowMexico()
      ]
    );

    res.json({
      message: "Respaldo de sección generado y guardado en Cloudinary",
      fileName,
      url
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error generando respaldo de tabla" });
  }
};


/* ===============================
   LISTA DE TABLAS
================================ */

const getTables = async (req, res) => {
  try {
    const tables = await backupService.getBackupTables();
    res.json({ tables });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo tablas" });
  }
};


/* ===============================
   HISTORIAL DE BACKUPS
================================ */

const getBackupHistory = async (req, res) => {
  try {
    const [rows] = await poolOperacion.execute(
      `SELECT * FROM backups_log ORDER BY fecha DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo historial de backups" });
  }
};


export default {
  backupFull,
  backupSingleTable,
  getTables,
  getBackupHistory,
};