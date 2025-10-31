import { AdminUserService } from "../services/admin.user.service.js";
import { AuditService } from "../../../../core/services/audit.service.js";

// ================================================================
// 🧑‍💼 Controlador: Administración de Usuarios
// ================================================================
export const AdminUserController = {
  /**
   * ================================================================
   * GET /api/admin/usuarios
   * Listar todos los usuarios con sus roles y relaciones
   * ================================================================
   */
  async getAll(req, res) {
    try {
      const users = await AdminUserService.getAllUsers();
      res.status(200).json(users);
    } catch (err) {
      console.error("❌ Error al obtener usuarios:", err);
      res.status(500).json({ error: "Error interno al listar usuarios" });
    }
  },

  /**
   * ================================================================
   * POST /api/admin/usuarios
   * Crear un nuevo usuario desde el panel de administración
   * ================================================================
   */
  async create(req, res) {
    try {
      const result = await AdminUserService.createUser(req.body);

      // Auditoría del evento
      await AuditService.logEvent({
        id_usuario: req.user?.id || null,
        tipo_evento: "CREACION_USUARIO_ADMIN",
        descripcion: `El administrador #${req.user?.id || "N/A"} creó al usuario ${
          req.body.correo || req.body.matricula || "sin identificador"
        }`,
        ip_origen: req.ip,
      });

      res.status(201).json(result);
    } catch (err) {
      console.error("❌ Error al crear usuario:", err);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * ================================================================
   * PUT /api/admin/usuarios/:id
   * Actualizar datos completos de un usuario
   * ================================================================
   */
  async update(req, res) {
    try {
      const id_usuario = req.params.id;
      const result = await AdminUserService.updateUser(id_usuario, req.body);

      // Auditoría del evento
      await AuditService.logEvent({
        id_usuario: req.user?.id || null,
        tipo_evento: "ACTUALIZACION_USUARIO",
        descripcion: `El administrador #${req.user?.id || "N/A"} actualizó al usuario #${id_usuario}`,
        ip_origen: req.ip,
      });

      res.status(200).json(result);
    } catch (err) {
      console.error("❌ Error al actualizar usuario:", err);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * ================================================================
   * DELETE /api/admin/usuarios/:id
   * Desactivar (eliminación lógica) un usuario
   * ================================================================
   */
  async delete(req, res) {
    try {
      const id_usuario = req.params.id;
      const result = await AdminUserService.deleteUser(id_usuario);

      // Auditoría del evento
      await AuditService.logEvent({
        id_usuario: req.user?.id || null,
        tipo_evento: "DESACTIVACION_USUARIO",
        descripcion: `El administrador #${req.user?.id || "N/A"} desactivó al usuario #${id_usuario}`,
        ip_origen: req.ip,
      });

      res.status(200).json(result);
    } catch (err) {
      console.error("❌ Error al desactivar usuario:", err);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * ================================================================
   * GET /api/admin/roles
   * Listar roles activos
   * ================================================================
   */
  async getRoles(req, res) {
    try {
      const roles = await AdminUserService.getRoles();
      res.status(200).json(roles);
    } catch (err) {
      console.error("❌ Error al obtener roles:", err);
      res.status(500).json({ error: "Error interno al consultar roles" });
    }
  },
};
