import { poolPromise } from "../../config/db.config.js";

export const AuditService = {
  /**
   * Registra un evento de auditoría en la base de datos.
   * Se recomienda usar solo para acciones importantes (inicio de sesión, cambios, etc.)
   */
  async logEvent({
    id_usuario = null,
    tipo_evento,
    descripcion,
    ip_origen = null,
    dispositivo = null,
  }) {
    try {
      const sql = `
        INSERT INTO auditoriaeventos 
          (id_usuario, tipo_evento, descripcion, ip_origen, dispositivo, fecha_evento)
        VALUES (?, ?, ?, ?, ?, NOW());
      `;

      await poolPromise.query(sql, [
        id_usuario,
        tipo_evento,
        descripcion,
        ip_origen,
        dispositivo,
      ]);
    } catch (err) {
      // Solo muestra errores críticos (no logs normales)
      console.error("Error al registrar auditoría:", err.message);
    }
  },
};
