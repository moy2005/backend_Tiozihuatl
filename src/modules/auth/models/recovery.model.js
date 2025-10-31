import { poolPromise } from "../../../config/db.config.js";

export const RecoveryModel = {
  /**
   * Crea un nuevo registro de recuperación de contraseña
   * Guarda código y fecha de expiración
   */
  async create({ id_usuario, codigo, expiracion }) {
    const query = `
      INSERT INTO recuperacion (id_usuario, codigo, fecha_emision, fecha_expiracion)
      VALUES (?, ?, NOW(), ?);
    `;
    await poolPromise.query(query, [id_usuario, codigo, expiracion]);
  },

  /**
   * Busca un registro activo por código
   * (verifica que no esté expirado)
   */
  async findByCode(codigo) {
    const query = `
      SELECT *
      FROM recuperacion
      WHERE codigo = ?
        AND fecha_expiracion > NOW()
      ORDER BY fecha_emision DESC
      LIMIT 1;
    `;
    const [rows] = await poolPromise.query(query, [codigo]);
    return rows[0] || null;
  },

  /**
   * (Opcional) elimina o invalida códigos anteriores del usuario
   * útil cuando se genera un nuevo código
   */
  async invalidateOldCodes(id_usuario) {
    const query = `
      DELETE FROM recuperacion
      WHERE id_usuario = ? OR fecha_expiracion < NOW();
    `;
    await poolPromise.query(query, [id_usuario]);
  },
};
