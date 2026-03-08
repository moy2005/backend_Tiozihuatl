import backupService from "../services/backup.service.js";
import { poolOperacion } from "../../../config/dbPools/poolOperacion.config.js";

/* ===============================
   BACKUP COMPLETO MANUAL
================================ */

const backupFull = async (req,res) => {

  try{

    const { sql, fileName } =
      await backupService.backupDatabase("manual");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${fileName}`
    );

    res.setHeader(
      "Content-Type",
      "application/sql"
    );

    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Disposition"
    );

    res.send(sql);

    await poolOperacion.execute(
      `
      INSERT INTO backups_log
      (tipo, alcance, tabla_afectada, nombre_archivo, ejecutado_por)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        "manual",
        "database",
        null,
        fileName,
        req.user?.id_usuario || null
      ]
    );

  }catch(error){

    console.error(error);

    res.status(500).json({
      message:"Error generando respaldo"
    });

  }

};


/* ===============================
   BACKUP DE TABLA MANUAL
================================ */

const backupSingleTable = async (req,res) => {

  try{

    const { table } = req.params;

    const tables =
      await backupService.getBackupTables();

    if(!tables.includes(table)){
      return res.status(400).json({
        message:"Tabla no permitida para respaldo"
      });
    }

    const { sql, fileName } =
      await backupService.backupTable(table,"manual");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${fileName}`
    );

    res.setHeader(
      "Content-Type",
      "application/sql"
    );

    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Disposition"
    );

    res.send(sql);

    await poolOperacion.execute(
      `
      INSERT INTO backups_log
      (tipo, alcance, tabla_afectada, nombre_archivo, ejecutado_por)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        "manual",
        "table",
        table,
        fileName,
        req.user?.id_usuario || null
      ]
    );

  }catch(error){

    console.error(error);

    res.status(500).json({
      message:"Error generando respaldo de tabla"
    });

  }

};


/* ===============================
   LISTA DE TABLAS
================================ */

const getTables = async (req,res) => {

  try{

    const tables =
      await backupService.getBackupTables();

    res.json({ tables });

  }catch(error){

    console.error(error);

    res.status(500).json({
      message:"Error obteniendo tablas"
    });

  }

};


/* ===============================
   HISTORIAL DE BACKUPS
================================ */

const getBackupHistory = async (req,res) => {

  try{

    const [rows] = await poolOperacion.execute(
      `
      SELECT *
      FROM backups_log
      ORDER BY fecha DESC
      `
    );

    res.json(rows);

  }catch(error){

    console.error(error);

    res.status(500).json({
      message:"Error obteniendo historial de backups"
    });

  }

};


export default {
  backupFull,
  backupSingleTable,
  getTables,
  getBackupHistory
};