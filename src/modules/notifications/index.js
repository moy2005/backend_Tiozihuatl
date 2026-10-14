import cron from "node-cron";
import pushRoutes from "./routes/push.routes.js";
import { PushService } from "./services/push.service.js";

let reminderJob = null;

/** Crea la tabla (si no existe) y programa el recordatorio diario de préstamos por vencer. */
export const startPushNotifications = async () => {
  await PushService.ensureTable();
  // El recordatorio se programa aunque falten las claves VAPID: siempre queda en la bandeja de la web.
  if (reminderJob) return;

  reminderJob = cron.schedule(
    "0 9 * * 1-5",
    async () => {
      try {
        const total = await PushService.recordarPrestamosPorVencer();
        console.log(`[Push] Recordatorios de préstamos enviados: ${total}`);
      } catch (error) {
        console.warn("[Push] Error en recordatorio de préstamos:", error.message);
      }
    },
    { timezone: "America/Mexico_City" }
  );
};

export { PushService };
export default pushRoutes;
