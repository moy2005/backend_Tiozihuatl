import webpush from "web-push";
import dotenv from "dotenv";
import { PushModel } from "../models/push.model.js";

dotenv.config();

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
const enabled = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (enabled) {
  webpush.setVapidDetails(VAPID_SUBJECT || "mailto:soporte@tiozihuatl.edu.mx", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn("[Push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY no configuradas: las notificaciones push están desactivadas.");
}

/**
 * Construye el payload en el formato que entiende ngsw-worker.js de Angular:
 * la clave `notification` se pasa tal cual a showNotification() y `onActionClick`
 * indica qué ruta abrir cuando el usuario hace clic en el aviso de Windows.
 */
const buildPayload = ({ title, body, url = "/inicio", tag, id_notificacion }) =>
  JSON.stringify({
    notification: {
      title,
      body,
      icon: "/icons/iest-icon-192.png",
      badge: "/icons/favicon-32.png",
      lang: "es-MX",
      tag,
      renotify: Boolean(tag),
      vibrate: [100, 50, 100],
      data: {
        url,
        id_notificacion,
        onActionClick: {
          default: { operation: "navigateLastFocusedOrOpen", url },
        },
      },
    },
  });

/**
 * Guarda el aviso en la bandeja de la web. Si falla, el push se envía igual:
 * la bandeja nunca debe impedir que salga la notificación.
 */
const registrarEnBandeja = async (destino_tipo, destino_valor, message) => {
  try {
    return await PushModel.crearNotificacion({
      destino_tipo,
      destino_valor,
      categoria: message.categoria || "aviso",
      titulo: message.title,
      mensaje: message.body,
      url: message.url || "/inicio",
    });
  } catch (error) {
    console.warn("[Notificaciones] No se pudo guardar en la bandeja:", error.message);
    return undefined;
  }
};

const sendMany = async (subscriptions, message) => {
  if (!enabled || !subscriptions.length) return { enviadas: 0, fallidas: 0 };

  const payload = buildPayload(message);
  let enviadas = 0;
  let fallidas = 0;

  await Promise.all(
    subscriptions.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 60 * 60 * 24 }
        );
        enviadas++;
      } catch (error) {
        fallidas++;
        // 404/410: la suscripción ya no existe (permiso revocado, navegador limpiado).
        if (error.statusCode === 404 || error.statusCode === 410) {
          await PushModel.eliminarPorEndpoint(s.endpoint).catch(() => {});
        } else {
          console.warn("[Push] Error al enviar:", error.statusCode, error.body || error.message);
        }
      }
    })
  );

  return { enviadas, fallidas };
};

export const PushService = {
  enabled,
  publicKey: VAPID_PUBLIC_KEY || null,

  ensureTable: () =>
    PushModel.ensureTable().catch((error) =>
      console.warn("[Push] No se pudo crear la tabla push_subscriptions:", error.message)
    ),

  suscribir: (id_usuario, subscription, user_agent) => {
    const { endpoint, keys } = subscription || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw new Error("Suscripción push inválida");
    }
    return PushModel.guardar({
      id_usuario,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: user_agent?.slice(0, 255) || null,
    });
  },

  desuscribir: (endpoint) => PushModel.eliminarPorEndpoint(endpoint),

  estadisticas: () => PushModel.estadisticas(),

  enviarAUsuario: async (id_usuario, message) => {
    const id_notificacion = await registrarEnBandeja("usuario", id_usuario, message);
    return sendMany(await PushModel.obtenerPorUsuario(id_usuario), { ...message, id_notificacion });
  },

  enviarARol: async (rol, message) => {
    const id_notificacion = await registrarEnBandeja("rol", rol, message);
    return sendMany(await PushModel.obtenerPorRol(rol), { ...message, id_notificacion });
  },

  enviarATodos: async (message) => {
    const id_notificacion = await registrarEnBandeja("todos", null, message);
    return sendMany(await PushModel.obtenerTodas(), { ...message, id_notificacion });
  },

  bandeja: async (id_usuario, rol, limit) => ({
    items: await PushModel.listarBandeja(id_usuario, rol, limit),
    noLeidas: await PushModel.contarNoLeidas(id_usuario, rol),
  }),

  noLeidas: (id_usuario, rol) => PushModel.contarNoLeidas(id_usuario, rol),

  marcarLeida: (id_notificacion, id_usuario, rol) => PushModel.marcarLeida(id_notificacion, id_usuario, rol),

  marcarTodasLeidas: (id_usuario, rol) => PushModel.marcarTodasLeidas(id_usuario, rol),

  /** Envío que nunca rompe el flujo de negocio que lo invoca. */
  notificarSinBloquear(id_usuario, message) {
    if (!id_usuario) return;
    this.enviarAUsuario(id_usuario, message).catch((error) =>
      console.warn("[Push] Falló la notificación al usuario", id_usuario, error.message)
    );
  },

  notificarPrestamo: async (id_prestamo, tipo) => {
    try {
      const prestamo = await PushModel.obtenerPrestamo(id_prestamo);
      if (!prestamo) return;

      const mensajes = {
        registrado: {
          title: "Préstamo registrado 📚",
          body: `Se registró el préstamo de "${prestamo.titulo}". Fecha límite: ${prestamo.vence}.`,
        },
        activado: {
          title: "Préstamo activado 📚",
          body: `Tu préstamo de "${prestamo.titulo}" está activo. Fecha límite: ${prestamo.vence}.`,
        },
        vencido: {
          title: "Préstamo vencido ⚠️",
          body: `Tu préstamo de "${prestamo.titulo}" está vencido. Devuélvelo en biblioteca lo antes posible.`,
        },
        devuelto: {
          title: "Devolución registrada ✅",
          body: `Registramos la devolución de "${prestamo.titulo}". ¡Gracias!`,
        },
        cancelado: {
          title: "Préstamo cancelado",
          body: `El préstamo de "${prestamo.titulo}" fue cancelado.`,
        },
      };

      const mensaje = mensajes[tipo];
      if (!mensaje) return;

      await PushService.enviarAUsuario(prestamo.id_usuario, {
        ...mensaje,
        categoria: "prestamo",
        url: "/my-loans",
        tag: `prestamo-${prestamo.id_prestamo}`,
      });
    } catch (error) {
      console.warn("[Push] Falló la notificación de préstamo", id_prestamo, error.message);
    }
  },

  recordarPrestamosPorVencer: async () => {
    const prestamos = await PushModel.prestamosPorVencer();
    for (const p of prestamos) {
      await PushService.enviarAUsuario(p.id_usuario, {
        title: "Tu préstamo vence pronto ⏰",
        body: `"${p.titulo}" debe devolverse antes del ${p.vence}.`,
        categoria: "recordatorio",
        url: "/my-loans",
        tag: `prestamo-${p.id_prestamo}`,
      });
    }
    return prestamos.length;
  },
};
