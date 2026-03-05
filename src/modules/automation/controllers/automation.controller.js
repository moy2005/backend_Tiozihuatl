import { poolOperacion } from "../../../config/dbPools/poolOperacion.config.js";
import cronManager from "../cron.manager.js";
import automationService from "../services/automation.service.js";

const createTask = async (req, res) => {
  try {
    const { nombre_tarea, cron_expression } = req.body;

    // contar tareas existentes
    const [countRows] = await poolOperacion.execute(
      `SELECT COUNT(*) AS total FROM tareas_programadas`
    );

    const totalTasks = countRows[0].total;

    // límite
    if (totalTasks >= 10) {
      return res.status(400).json({
        message: "Se alcanzó el límite máximo de tareas (10)"
      });
    }

    const [existing] = await poolOperacion.execute(
      `SELECT id_tarea
       FROM tareas_programadas
       WHERE nombre_tarea = ?
       AND cron_expression = ?
       LIMIT 1`,
      [nombre_tarea, cron_expression]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        message: "Ya existe una tarea con ese nombre en el mismo horario"
      });
    }

    const [result] = await poolOperacion.execute(
      `INSERT INTO tareas_programadas
       (nombre_tarea, tipo_tarea, cron_expression)
       VALUES (?, ?, ?)`,
      [nombre_tarea, "backup_database", cron_expression]
    );

    const [rows] = await poolOperacion.execute(
      `SELECT * FROM tareas_programadas WHERE id_tarea = ?`,
      [result.insertId]
    );

    // Registrar inmediatamente en node-cron
    await cronManager.scheduleTask(rows[0]);

    res.json({ message: "Tarea programada creada" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creando tarea" });
  }
};


const getTasks = async (req,res) => {

  const [rows] = await poolOperacion.execute(
    `SELECT * FROM tareas_programadas`
  );

  res.json(rows);

};


const toggleTask = async (req, res) => {
  const { id } = req.params;

  await poolOperacion.execute(
    `UPDATE tareas_programadas SET activo = NOT activo WHERE id_tarea = ?`,
    [id]
  );

  const [rows] = await poolOperacion.execute(
    `SELECT * FROM tareas_programadas WHERE id_tarea = ?`,
    [id]
  );

  const task = rows[0];

  if (task.activo) {
    cronManager.scheduleTask(task); // 👈 reactivar en node-cron
  } else {
    cronManager.stopTask(Number(id)); // 👈 detener en node-cron
  }

  res.json({ message: "Estado actualizado" });
};


const deleteTask = async (req, res) => {
  const { id } = req.params;

  cronManager.stopTask(Number(id)); // 👈 detener ANTES de eliminar

  await poolOperacion.execute(
    `DELETE FROM tareas_programadas WHERE id_tarea = ?`,
    [id]
  );

  res.json({ message: "Tarea eliminada" });
};

// automation.controller.js — agregar este método
const runPendingTasks = async (req, res) => {
  try {
    const secret = req.headers['x-cron-secret'];
    if (secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    const tasks = await automationService.getActiveTasks();
    const now = new Date();
    const pendientes = tasks.filter(t => shouldRunNow(t.cron_expression, now));

    // 👇 Este header le dice a Vercel que NO cierre la función todavía
    res.setHeader('Connection', 'keep-alive');

    // Ejecutar PRIMERO, responder DESPUÉS
    const results = [];
    for (const task of pendientes) {
      try {
        await automationService.executeTask(task); // await, no fire-and-forget
        results.push(task.nombre_tarea);
      } catch(e) {
        console.error('Error ejecutando tarea:', task.nombre_tarea, e);
      }
    }

    res.json({ 
      ejecutadas: results.length, 
      tareas: results
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error ejecutando tareas' });
  }
};

// Verifica si la expresión cron debe correr en este minuto
function shouldRunNow(cronExpr, now) {
  const partes = cronExpr.trim().split(/\s+/);
  if (partes.length < 5) return false;

  const [minCron, horaCron, , , diasCron] = partes;

  const minActual  = now.getUTCMinutes();
  const horaActual = now.getUTCHours();
  const diaActual  = now.getUTCDay();

  // 👇 LOG TEMPORAL
  console.log(`CRON: ${cronExpr} | UTC actual: ${horaActual}:${minActual} | cronHora: ${horaCron} cronMin: ${minCron}`);

  if (horaCron.startsWith('*/')) {
    const intervalo = Number(horaCron.replace('*/', ''));
    return horaActual % intervalo === 0 && minActual === 0;
  }

  if (Number(minCron) !== minActual) return false;
  if (Number(horaCron) !== horaActual) return false;

  if (diasCron !== '*') {
    const diasPermitidos = diasCron.split(',').map(Number);
    return diasPermitidos.includes(diaActual);
  }

  return true;
}

export default {
  createTask,
  getTasks,
  toggleTask,
  deleteTask,
  runPendingTasks
};

