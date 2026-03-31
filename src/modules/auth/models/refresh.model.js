import bcrypt from "bcryptjs";
import { poolPromise } from "../../../config/db.config.js";

export const RefreshModel = {
  async save(id_usuario, refreshToken, duracionDias = 7) {
    const hash = await bcrypt.hash(refreshToken, 10);

    await poolPromise.query(
      "UPDATE tokensrefresh SET estado = 'Revocado' WHERE id_usuario = ?",
      [id_usuario]
    );

    await poolPromise.query(
      `INSERT INTO tokensrefresh (id_usuario, refresh_token, fecha_emision, fecha_expiracion, estado)
       VALUES (?, ?, UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY), 'Activo')`,
      [id_usuario, hash, duracionDias]
    );
  },

  async validate(id_usuario, token) {
    if (!id_usuario || !token) return false;

    const [rows] = await poolPromise.query(
      `SELECT refresh_token
       FROM tokensrefresh
       WHERE id_usuario = ?
         AND estado = 'Activo'
         AND fecha_expiracion > UTC_TIMESTAMP()
       ORDER BY fecha_emision DESC
       LIMIT 1`,
      [id_usuario]
    );

    if (!rows.length) return false;

    const record = rows[0];
    const match = await bcrypt.compare(token, record.refresh_token);

    return match;
  },

  async revoke(id_usuario) {
    await poolPromise.query(
      `UPDATE tokensrefresh
       SET estado = 'Revocado'
       WHERE id_usuario = ? AND estado = 'Activo'`,
      [id_usuario]
    );
  },
};
