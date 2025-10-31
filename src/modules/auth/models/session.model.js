import bcrypt from "bcryptjs";
import { poolPromise } from "../../../config/db.config.js";

export const SessionModel = {
  /**
   * Guarda una nueva sesión JWT
   * @param {number} id_usuario
   * @param {string} jwtToken
   * @param {string|null} ip
   * @param {string|null} dispositivo
   */
  async save(id_usuario, jwtToken, ip = null, dispositivo = null) {
    try {
      const jwtHash = await bcrypt.hash(jwtToken, 12);
      await poolPromise.query(
        `INSERT INTO sesionesjwt (id_usuario, jwt_token, fecha_inicio, ip_origen, dispositivo)
         VALUES (?, ?, NOW(), ?, ?)`,
        [id_usuario, jwtHash, ip, dispositivo]
      );
    } catch (err) {
      console.error("❌ Error al guardar sesión JWT:", err.message);
    }
  },

  /**
   * Valida si el JWT sigue activo (no expirado ni cerrado)
   * @param {number} id_usuario
   * @param {string} jwtToken
   * @returns {boolean}
   */
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
    if (session.fecha_cierre) return false; // sesión ya cerrada

    const valid = await bcrypt.compare(jwtToken, session.jwt_token);
    return valid;
  },

  /**
   * Cierra todas las sesiones activas del usuario
   * @param {number} id_usuario
   */
  async closeAll(id_usuario) {
    try {
      await poolPromise.query(
        `UPDATE sesionesjwt
         SET fecha_cierre = NOW()
         WHERE id_usuario = ? AND fecha_cierre IS NULL`,
        [id_usuario]
      );
    } catch (err) {
      console.error("❌ Error al cerrar sesiones:", err.message);
    }
  },
};
