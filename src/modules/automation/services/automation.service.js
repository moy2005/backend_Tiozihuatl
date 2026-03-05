// src/modules/automation/services/automation.service.js
import { poolOperacion } from "../../../config/dbPools/poolOperacion.config.js";
import backupService from "../../backups/services/backup.service.js";


const getActiveTasks = async () => {

  const [rows] = await poolOperacion.execute(
    `
    SELECT *
    FROM tareas_programadas
    WHERE activo = 1
    `
  );

  return rows;

};

const executeTask = async (task) => {
  if (task.tipo_tarea === "backup_database") {

    // Evitar duplicados en el mismo minuto
    const [recent] = await poolOperacion.execute(
      `SELECT * FROM backups_log
       WHERE tipo = 'automatico' 
       AND fecha >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)
       LIMIT 1`
    );

    if (recent.length > 0) {
      console.log("Backup ya ejecutado en este minuto, omitiendo...");
      return;
    }

    const backup = await backupService.backupDatabaseAutomatic();

    await poolOperacion.execute(
      `INSERT INTO backups_log (tipo, alcance, nombre_archivo, url_backup)
       VALUES (?, ?, ?, ?)`,
      ["automatico", "database", backup.fileName, backup.url]
    );

    await poolOperacion.execute(
      `UPDATE tareas_programadas SET ultima_ejecucion = NOW() WHERE id_tarea = ?`,
      [task.id_tarea]
    );
  }
};

export default {
  getActiveTasks,
  executeTask
};

