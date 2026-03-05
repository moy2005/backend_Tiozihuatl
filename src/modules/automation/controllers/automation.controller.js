import { poolOperacion } from "../../../config/dbPools/poolOperacion.config.js";
import cronManager from "../cron.manager.js";

const createTask = async (req, res) => {
  try {
    const { nombre_tarea, cron_expression } = req.body;

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

    // 👇 Registrar inmediatamente en node-cron
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

export default {
  createTask,
  getTasks,
  toggleTask,
  deleteTask
};

