// src/modules/automation/services/automation.service.js
import { poolOperacion } from "../../../config/dbPools/poolOperacion.config.js";
import backupService from "../../backups/services/backup.service.js";

// Genera fecha/hora en zona México (UTC-6) como string para insertar en BD
const getNowMexico = () => {
  return new Date()
    .toLocaleString('sv-SE', { timeZone: 'America/Mexico_City' })
    .replace('T', ' ')
    .slice(0, 19);
};

const getActiveTasks = async () => {
  const [rows] = await poolOperacion.execute(
    `SELECT * FROM tareas_programadas WHERE activo = 1`
  );
  return rows;
};

const executeTask = async (task) => {

  if (task.tipo_tarea === "backup_database") {

    // Evitar duplicados en el mismo minuto
    const [recent] = await poolOperacion.execute(
      `SELECT id_backup FROM backups_log
       WHERE tipo = 'automatico'
       AND fecha >= DATE_SUB(?, INTERVAL 1 MINUTE)
       LIMIT 1`,
      [getNowMexico()]
    );

    if (recent.length > 0) {
      console.log("Backup ya ejecutado en este minuto, omitiendo...");
      return;
    }

    const backup = await backupService.backupDatabase("automatico");

    await poolOperacion.execute(
      `INSERT INTO backups_log (tipo, alcance, nombre_archivo, url_backup, fecha)
       VALUES (?, ?, ?, ?, ?)`,
      ["automatico", "database", backup.fileName, backup.url, getNowMexico()]
    );

    await poolOperacion.execute(
      `UPDATE tareas_programadas SET ultima_ejecucion = ? WHERE id_tarea = ?`,
      [getNowMexico(), task.id_tarea]
    );

  }

};

export default {
  getActiveTasks,
  executeTask
};