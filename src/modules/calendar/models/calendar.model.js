import { poolPromise } from "../../../config/db.config.js";

export const createCalendar = async ({ titulo, archivo_url, tipo }) => {
  const pool = await poolPromise;

  await pool.query("UPDATE calendarios SET activo = 0");

  const [result] = await pool.query(
    `INSERT INTO calendarios (titulo, archivo_url, tipo, activo)
     VALUES (?, ?, ?, 1)`,
    [titulo, archivo_url, tipo]
  );

  return result.insertId;
};

export const updateCalendar = async (id, { titulo, archivo_url, tipo }) => {
  const pool = await poolPromise;

  await pool.query(
    `UPDATE calendarios
     SET titulo = ?, archivo_url = ?, tipo = ?
     WHERE id = ?`,
    [titulo, archivo_url, tipo, id]
  );
};

export const deleteCalendar = async (id) => {
  const pool = await poolPromise;

  await pool.query(
    "DELETE FROM calendarios WHERE id = ?",
    [id]
  );
};

export const getAllCalendars = async () => {
  const pool = await poolPromise;
  const [rows] = await pool.query(
    "SELECT * FROM calendarios ORDER BY created_at DESC"
  );
  return rows;
};

export const toggleCalendarStatus = async (id, activo) => {
  const pool = await poolPromise;

  if (activo === 1) {
    await pool.query("UPDATE calendarios SET activo = 0");
  }

  await pool.query(
    "UPDATE calendarios SET activo = ? WHERE id = ?",
    [activo, id]
  );
};
