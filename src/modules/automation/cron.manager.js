import cron from "node-cron";
import automationService from "./services/automation.service.js";

let scheduledTasks = {};

// 👇 Función reutilizable para registrar una tarea
const scheduleTask = (task) => {
  if (scheduledTasks[task.id_tarea]) {
    scheduledTasks[task.id_tarea].stop(); // evitar duplicados
  }

  const job = cron.schedule(
    task.cron_expression,
    async () => {
      console.log("Ejecutando tarea automática:", task.nombre_tarea);
      await automationService.executeTask(task);
    }
  );

  scheduledTasks[task.id_tarea] = job;
};


const loadTasks = async () => {
  const tasks = await automationService.getActiveTasks();
  tasks.forEach(task => scheduleTask(task)); 
};


const stopTask = (taskId) => {
  if (scheduledTasks[taskId]) {
    scheduledTasks[taskId].stop();
    delete scheduledTasks[taskId];
  }
};

export default {
  loadTasks,
  stopTask,
  scheduleTask
};