import bcrypt from "bcryptjs";
import { poolPromise } from "../../../config/db.config.js";

export const RefreshModel = {
  /**
   * Guarda o reemplaza un refresh token para un usuario.
   * @param {number} id_usuario
   * @param {string} refreshToken
   * @param {number} duracionDias - Días de validez (por defecto 7)
   */
  async save(id_usuario, refreshToken, duracionDias = 7) {
    const hash = await bcrypt.hash(refreshToken, 10);
    const exp = new Date(Date.now() + duracionDias * 24 * 60 * 60 * 1000);

    // Revoca tokens anteriores
    await poolPromise.query(
      "UPDATE tokensrefresh SET estado = 'Revocado' WHERE id_usuario = ?",
      [id_usuario]
    );

    // Guarda el nuevo token
    await poolPromise.query(
      `INSERT INTO tokensrefresh (id_usuario, refresh_token, fecha_expiracion, estado)
       VALUES (?, ?, ?, 'Activo')`,
      [id_usuario, hash, exp]
    );
  },

  /**
   * Valida un refresh token recibido del cliente.
   * @param {number} id_usuario
   * @param {string} token
   * @returns {boolean}
   */
  async validate(id_usuario, token) {
    const [rows] = await poolPromise.query(
      `SELECT * FROM tokensrefresh
       WHERE id_usuario = ? AND estado = 'Activo'
       ORDER BY fecha_emision DESC
       LIMIT 1`,
      [id_usuario]
    );

    if (!rows.length) return false;

    const record = rows[0];
    const match = await bcrypt.compare(token, record.refresh_token);
    if (!match) return false;

    const now = new Date();
    if (now > record.fecha_expiracion) return false;

    return true;
  },

  /**
   * Revoca todos los refresh tokens activos del usuario (por logout o rotación)
   * @param {number} id_usuario
   */
  async revoke(id_usuario) {
    await poolPromise.query(
      `UPDATE tokensrefresh
       SET estado = 'Revocado'
       WHERE id_usuario = ? AND estado = 'Activo'`,
      [id_usuario]
    );
  },
};
