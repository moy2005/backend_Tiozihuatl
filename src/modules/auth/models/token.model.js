import { poolPromise } from "../../../config/db.config.js";

export const TokenModel = {
  /**
   * Guarda un nuevo código OTP (SMS o Email)
   * @param {number} id_usuario
   * @param {string} codigo_otp
   * @param {string} tipo - SMS | EMAIL
   * @param {Date|null} fecha_expiracion
   */
  async save(id_usuario, codigo_otp, tipo, fecha_expiracion = null) {
    try {
      const expiracionFinal =
        fecha_expiracion || new Date(Date.now() + 1 * 60 * 1000); // +1 min por defecto

      await poolPromise.query(
        `INSERT INTO tokens2fa (id_usuario, codigo_otp, fecha_emision, fecha_expiracion, tipo, estado)
         VALUES (?, ?, NOW(), ?, ?, 'Activo')`,
        [id_usuario, codigo_otp, expiracionFinal, tipo]
      );
    } catch (err) {
      console.error("❌ Error al guardar OTP:", err.message);
    }
  },

  /**
   * Obtiene el último OTP activo de un usuario
   * @param {number} id_usuario
   * @returns {object|null}
   */
  async findLatest(id_usuario) {
    try {
      const [rows] = await poolPromise.query(
        `SELECT *
         FROM tokens2fa
         WHERE id_usuario = ? AND estado = 'Activo'
         ORDER BY fecha_emision DESC
         LIMIT 1`,
        [id_usuario]
      );
      return rows[0] || null;
    } catch (err) {
      console.error("❌ Error al buscar OTP:", err.message);
      return null;
    }
  },

  /**
   * Marca un OTP como usado (desactiva el código)
   * @param {number} id_token
   */
  async markUsed(id_token) {
    try {
      await poolPromise.query(
        `UPDATE tokens2fa
         SET estado = 'Usado'
         WHERE id_token = ?`,
        [id_token]
      );
    } catch (err) {
      console.error("❌ Error al marcar OTP usado:", err.message);
    }
  },

  /**
   * Limpia OTP expirados automáticamente
   * (opcional, puede ejecutarse en un cron job)
   */
  async clearExpired() {
    try {
      await poolPromise.query(
        `DELETE FROM tokens2fa
         WHERE fecha_expiracion < NOW()`
      );
    } catch (err) {
      console.error("❌ Error al limpiar OTP expirados:", err.message);
    }
  },
};
