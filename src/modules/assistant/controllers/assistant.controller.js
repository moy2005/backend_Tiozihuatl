import { AssistantService } from "../services/assistant.service.js";

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || null;
};

export const AssistantController = {
  async topics(req, res) {
    try {
      res.json({
        success: true,
        data: AssistantService.getTopics(),
      });
    } catch (error) {
      console.error("Error GET /api/assistant/topics:", error);
      res.status(500).json({
        success: false,
        message: "No se pudieron obtener los temas del asistente",
      });
    }
  },

  async message(req, res) {
    try {
      const { message, context } = req.body || {};

      if (typeof message !== "string") {
        return res.status(400).json({
          success: false,
          message: "El mensaje es obligatorio",
        });
      }

      if (message.length > 1000) {
        return res.status(400).json({
          success: false,
          message: "El mensaje no puede superar 1000 caracteres",
        });
      }

      const data = await AssistantService.answer({
        message,
        context,
        authenticatedUser: req.user || null,
        reqMeta: {
          ip: getClientIp(req),
          userAgent: req.headers["user-agent"] || null,
        },
      });

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error("Error POST /api/assistant/message:", error);
      res.status(500).json({
        success: false,
        message: "El asistente no pudo procesar la consulta",
      });
    }
  },
};
