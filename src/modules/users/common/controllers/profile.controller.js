import { UserService } from "../services/profile.service.js";
import { JWTService } from "../../../../core/services/jwt.service.js";
import { AuditService } from "../../../../core/services/audit.service.js";

export const UserController = {
  /**
   * ================================================================
   * GET /api/perfil
   * Obtener datos del perfil del usuario autenticado
   * ================================================================
   */
  async getProfile(req, res) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ error: "Token no proporcionado." });

      const decoded = JWTService.verifyToken(token);
      if (!decoded) return res.status(401).json({ error: "Token inválido o expirado." });

      const user = await UserService.getProfile(decoded.id);
      res.status(200).json(user);
    } catch (err) {
      console.error("❌ Error en getProfile:", err.message);
      res.status(400).json({ error: err.message || "Error al obtener el perfil." });
    }
  },

  /**
   * ================================================================
   * PUT /api/perfil
   * Actualizar datos personales del usuario autenticado
   * ================================================================
   */
  async updateProfile(req, res) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ error: "Token no proporcionado." });

      const decoded = JWTService.verifyToken(token);
      if (!decoded) return res.status(401).json({ error: "Token inválido o expirado." });

      const result = await UserService.updateProfile(decoded.id, req.body);

      // Registro en auditoría
      await AuditService.logEvent({
        id_usuario: decoded.id,
        tipo_evento: "ACTUALIZACION_PERFIL",
        descripcion: "El usuario actualizó su información personal.",
        ip_origen: req.ip,
      });

      res.status(200).json(result);
    } catch (err) {
      console.error("❌ Error en updateProfile:", err.message);
      res.status(400).json({ error: err.message || "Error al actualizar el perfil." });
    }
  },

  /**
   * ================================================================
   * PUT /api/perfil/cambiar-contrasena
   * Cambiar contraseña del usuario autenticado
   * ================================================================
   */
  async changePassword(req, res) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ error: "Token no proporcionado." });

      const decoded = JWTService.verifyToken(token);
      if (!decoded) return res.status(401).json({ error: "Token inválido o expirado." });

      const { contrasenaActual, nuevaContrasena } = req.body;
      if (!contrasenaActual || !nuevaContrasena)
        return res.status(400).json({ error: "Debe proporcionar ambas contraseñas." });

      const result = await UserService.changePassword(
        decoded.id,
        contrasenaActual,
        nuevaContrasena
      );

      // Registro en auditoría
      await AuditService.logEvent({
        id_usuario: decoded.id,
        tipo_evento: "CAMBIO_CONTRASENA",
        descripcion: "El usuario cambió su contraseña.",
        ip_origen: req.ip,
      });

      res.status(200).json(result);
    } catch (err) {
      console.error("❌ Error en changePassword:", err.message);
      res.status(400).json({ error: err.message || "Error al cambiar contraseña." });
    }
  },
};
