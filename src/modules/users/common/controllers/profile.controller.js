import { UserService } from "../services/profile.service.js";
import { AuditService } from "../../../../core/services/audit.service.js";

export const UserController = {

  async getProfile(req, res) {
    try {
      // ✅ req.user ya viene del authMiddleware, no re-verificar
      const user = await UserService.getProfile(req.user.id);
      res.status(200).json(user);
    } catch (err) {
      console.error("❌ Error en getProfile:", err.message);
      res.status(400).json({ error: err.message || "Error al obtener el perfil." });
    }
  },

  async updateProfile(req, res) {
    try {
      const result = await UserService.updateProfile(req.user.id, req.body);

      await AuditService.logEvent({
        id_usuario: req.user.id,
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

  async changePassword(req, res) {
    try {
      const { contrasenaActual, nuevaContrasena } = req.body;
      if (!contrasenaActual || !nuevaContrasena)
        return res.status(400).json({ error: "Debe proporcionar ambas contraseñas." });

      const result = await UserService.changePassword(
        req.user.id,
        contrasenaActual,
        nuevaContrasena
      );

      await AuditService.logEvent({
        id_usuario: req.user.id,
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