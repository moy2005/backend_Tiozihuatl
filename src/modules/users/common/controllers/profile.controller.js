import { UserService } from "../services/profile.service.js";
import { AuditService } from "../../../../core/services/audit.service.js";

export const UserController = {
  async getProfile(req, res) {
    try {
      const user = await UserService.getProfile(req.user.id);
      res.status(200).json(user);
    } catch (err) {
      console.error("Error en getProfile:", err.message);
      res.status(err.statusCode || 400).json({
        error: err.message || "Error al obtener el perfil.",
      });
    }
  },

  async updateProfile(req, res) {
    try {
      const result = await UserService.updateProfile(req.user.id, req.body);

      await AuditService.logEvent({
        id_usuario: req.user.id,
        tipo_evento: "ACTUALIZACION_PERFIL",
        descripcion: "El usuario actualizo su informacion personal.",
        ip_origen: req.ip,
      });

      res.status(200).json(result);
    } catch (err) {
      console.error("Error en updateProfile:", err.message);
      res.status(err.statusCode || 400).json({
        error: err.message || "Error al actualizar el perfil.",
      });
    }
  },

  async changePassword(req, res) {
    try {
      const { contrasenaActual, nuevaContrasena } = req.body;

      if (!contrasenaActual || !nuevaContrasena) {
        return res.status(400).json({
          error: "Debe proporcionar ambas contrasenas.",
        });
      }

      const result = await UserService.changePassword(
        req.user.id,
        contrasenaActual,
        nuevaContrasena
      );

      await AuditService.logEvent({
        id_usuario: req.user.id,
        tipo_evento: "CAMBIO_CONTRASENA",
        descripcion: "El usuario cambio su contrasena.",
        ip_origen: req.ip,
      });

      res.status(200).json(result);
    } catch (err) {
      console.error("Error en changePassword:", err.message);
      res.status(err.statusCode || 400).json({
        error: err.message || "Error al cambiar contrasena.",
      });
    }
  },

  async deleteAccount(req, res) {
    try {
      const result = await UserService.deleteOwnAccount(req.user.id);

      await AuditService.logEvent({
        id_usuario: null,
        tipo_evento: "ELIMINACION_CUENTA_VISITANTE",
        descripcion: `La cuenta de visitante ${req.user.id} fue eliminada por su propietario.`,
        ip_origen: req.ip,
      });

      res.status(200).json(result);
    } catch (err) {
      console.error("Error en deleteAccount:", err.message);
      res.status(err.statusCode || 400).json({
        error: err.message || "Error al eliminar la cuenta.",
      });
    }
  },
};
