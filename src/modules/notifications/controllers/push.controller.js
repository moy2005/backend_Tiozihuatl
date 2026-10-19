import { PushService } from "../services/push.service.js";

const ROLES_VALIDOS = ["Estudiante", "Docente", "Administrador"];

export const PushController = {
  publicKey: (_req, res) => {
    res.json({ success: true, data: { enabled: PushService.enabled, publicKey: PushService.publicKey } });
  },

  suscribir: async (req, res) => {
    try {
      await PushService.suscribir(req.user.id, req.body, req.headers["user-agent"]);
      res.status(201).json({ success: true, message: "Notificaciones activadas" });
    } catch (error) {
      const status = error.message === "Suscripción push inválida" ? 400 : 500;
      console.error("Error al suscribir push:", error);
      res.status(status).json({ success: false, message: error.message });
    }
  },

  desuscribir: async (req, res) => {
    try {
      const { endpoint } = req.body || {};
      if (!endpoint) return res.status(400).json({ success: false, message: "endpoint requerido" });
      await PushService.desuscribir(endpoint);
      res.json({ success: true, message: "Notificaciones desactivadas" });
    } catch (error) {
      console.error("Error al desuscribir push:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  bandeja: async (req, res) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
      res.json({ success: true, data: await PushService.bandeja(req.user.id, req.user.rol, limit) });
    } catch (error) {
      console.error("Error al listar notificaciones:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  noLeidas: async (req, res) => {
    try {
      res.json({ success: true, data: { noLeidas: await PushService.noLeidas(req.user.id, req.user.rol) } });
    } catch (error) {
      console.error("Error al contar notificaciones:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  marcarLeida: async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "id no válido" });
      await PushService.marcarLeida(id, req.user.id, req.user.rol);
      res.json({ success: true });
    } catch (error) {
      console.error("Error al marcar notificación:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  marcarTodasLeidas: async (req, res) => {
    try {
      await PushService.marcarTodasLeidas(req.user.id, req.user.rol);
      res.json({ success: true });
    } catch (error) {
      console.error("Error al marcar notificaciones:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  estadisticas: async (_req, res) => {
    try {
      res.json({ success: true, data: { enabled: PushService.enabled, ...(await PushService.estadisticas()) } });
    } catch (error) {
      console.error("Error en estadísticas push:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  enviar: async (req, res) => {
    try {
      const { title, body, url, destino = "todos", id_usuario } = req.body || {};
      if (!title?.trim() || !body?.trim()) {
        return res.status(400).json({ success: false, message: "Título y mensaje son requeridos" });
      }
      if (url && !String(url).startsWith("/")) {
        return res.status(400).json({ success: false, message: "La ruta debe ser interna y comenzar con /" });
      }

      const message = { title: title.trim().slice(0, 80), body: body.trim().slice(0, 240), url: url || "/inicio", categoria: "aviso" };
      let result;

      if (destino === "todos") result = await PushService.enviarATodos(message);
      else if (destino === "usuario") {
        if (!id_usuario) return res.status(400).json({ success: false, message: "id_usuario requerido" });
        result = await PushService.enviarAUsuario(id_usuario, message);
      } else if (ROLES_VALIDOS.includes(destino)) result = await PushService.enviarARol(destino, message);
      else return res.status(400).json({ success: false, message: "Destino no válido" });

      res.json({ success: true, message: `Enviadas: ${result.enviadas}`, data: result });
    } catch (error) {
      console.error("Error al enviar push:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
