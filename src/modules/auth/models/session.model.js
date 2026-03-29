import bcrypt from "bcryptjs";
import { poolPromise } from "../../../config/db.config.js";

export const SessionModel = {
  async save(id_usuario, jwtToken, ip = null, dispositivo = null) {
    try {
      const jwtHash = await bcrypt.hash(jwtToken, 12);
      await poolPromise.query(
        `INSERT INTO sesionesjwt (id_usuario, jwt_token, fecha_inicio, ip_origen, dispositivo)
         VALUES (?, ?, NOW(), ?, ?)`,
        [id_usuario, jwtHash, ip, dispositivo]
      );
    } catch (err) {
      console.error("Error al guardar sesión JWT:", err.message);
    }
  },

  async validate(id_usuario, jwtToken) {
    const [rows] = await poolPromise.query(
      `SELECT jwt_token, fecha_cierre
       FROM sesionesjwt
       WHERE id_usuario = ?
       ORDER BY fecha_inicio DESC
       LIMIT 1`,
      [id_usuario]
    );

    if (!rows.length) return false;

    const session = rows[0];
    if (session.fecha_cierre) return false;

    return bcrypt.compare(jwtToken, session.jwt_token);
  },

  async closeAll(id_usuario) {
    try {
      await poolPromise.query(
        `UPDATE sesionesjwt
         SET fecha_cierre = NOW()
         WHERE id_usuario = ? AND fecha_cierre IS NULL`,
        [id_usuario]
      );
    } catch (err) {
      console.error("Error al cerrar sesiones:", err.message);
    }
  },

  async close(id_usuario) {
    return this.closeAll(id_usuario);
  },
};
