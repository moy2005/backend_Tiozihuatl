import bcrypt from "bcryptjs";
import { poolPromise } from "../../../config/db.config.js";

const SESSION_IDLE_DAYS = Math.max(1, Number(process.env.SESSION_IDLE_DAYS) || 7);
const SESSION_ACTIVITY_TOUCH_MINUTES = Math.max(
  1,
  Number(process.env.SESSION_ACTIVITY_TOUCH_MINUTES) || 5
);

export const RefreshModel = {
  async save(id_usuario, refreshToken, duracionDias = SESSION_IDLE_DAYS) {
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
      `SELECT id_token, refresh_token, fecha_expiracion
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

    return match ? record : null;
  },

  async rotate(id_usuario, previousTokenId, refreshToken, duracionDias = SESSION_IDLE_DAYS) {
    const connection = await poolPromise.getConnection();

    try {
      await connection.beginTransaction();

      const hash = await bcrypt.hash(refreshToken, 10);

      await connection.query(
        "UPDATE tokensrefresh SET estado = 'Revocado' WHERE id_usuario = ? AND estado = 'Activo'",
        [id_usuario]
      );

      await connection.query(
        `INSERT INTO tokensrefresh (id_usuario, refresh_token, fecha_emision, fecha_expiracion, estado)
         SELECT ?, ?, UTC_TIMESTAMP(),
                COALESCE(
                  (SELECT fecha_expiracion
                   FROM tokensrefresh
                   WHERE id_token = ? AND id_usuario = ?
                   LIMIT 1),
                  DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY)
                ),
                'Activo'`,
        [id_usuario, hash, previousTokenId, id_usuario, duracionDias]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async touchActivity(
    id_usuario,
    duracionDias = SESSION_IDLE_DAYS,
    touchCooldownMinutes = SESSION_ACTIVITY_TOUCH_MINUTES
  ) {
    if (!id_usuario) return;

    await poolPromise.query(
      `UPDATE tokensrefresh
       SET fecha_expiracion = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY)
       WHERE id_usuario = ?
         AND estado = 'Activo'
         AND fecha_expiracion > UTC_TIMESTAMP()
         AND fecha_expiracion <= DATE_ADD(
           DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY),
           INTERVAL -? MINUTE
         )`,
      [duracionDias, id_usuario, duracionDias, touchCooldownMinutes]
    );
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
