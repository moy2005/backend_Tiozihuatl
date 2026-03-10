import { poolPromise } from "../../../config/db.config.js";

export const createCalendar = async ({ 
  titulo, 
  titulo_seccion,
  archivo_url, 
  tipo_calendario, 
  tipo_archivo 
}) => {

  const pool = await poolPromise;

  // Desactivar solo los del mismo tipo (ALUMNO o DOCENTE)
  await pool.query(
    "UPDATE calendarios SET activo = 0 WHERE tipo_calendario = ?",
    [tipo_calendario]
  );

  const [result] = await pool.query(
    `INSERT INTO calendarios 
     (titulo, titulo_seccion, archivo_url, tipo_calendario, tipo_archivo, activo)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [titulo, titulo_seccion, archivo_url, tipo_calendario, tipo_archivo]
  );

  return result.insertId;
};

export const updateCalendar = async (id, {
  titulo,
  titulo_seccion,
  archivo_url,
  tipo_calendario,
  tipo_archivo
}) => {

  const pool = await poolPromise;

  if (archivo_url) {

    await pool.query(
      `UPDATE calendarios
       SET titulo = ?,
           titulo_seccion = ?,
           archivo_url = ?,
           tipo_calendario = ?,
           tipo_archivo = ?
       WHERE id = ?`,
      [titulo, titulo_seccion, archivo_url, tipo_calendario, tipo_archivo, id]
    );

  } else {

    await pool.query(
      `UPDATE calendarios
       SET titulo = ?,
           titulo_seccion = ?,
           tipo_calendario = ?,
           tipo_archivo = ?
       WHERE id = ?`,
      [titulo, titulo_seccion, tipo_calendario, tipo_archivo, id]
    );

  }
};

export const getAllCalendars = async ({ search, tipo_calendario, activo } = {}) => {

  const pool = await poolPromise;

  let query = `
    SELECT *
    FROM calendarios
    WHERE 1 = 1
  `;

  const params = [];

  //  BUSCAR
  if (search) {
    query += ` AND titulo LIKE ?`;
    params.push(`%${search}%`);
  }

  //  TIPO DE CALENDARIO
  if (tipo_calendario) {
    query += ` AND tipo_calendario = ?`;
    params.push(tipo_calendario);
  }

  //  ESTADO
  if (activo !== undefined && activo !== '') {
    query += ` AND activo = ?`;
    params.push(activo);
  }

  query += ` ORDER BY created_at DESC`;

  const [rows] = await pool.query(query, params);

  return rows;
};

export const toggleCalendarStatus = async (id, activo) => {

  const pool = await poolPromise;

  if (activo === 1) {

    // Obtener tipo del calendario
    const [[calendar]] = await pool.query(
      "SELECT tipo_calendario FROM calendarios WHERE id = ?",
      [id]
    );

    // Desactivar solo los del mismo tipo
    await pool.query(
      "UPDATE calendarios SET activo = 0 WHERE tipo_calendario = ?",
      [calendar.tipo_calendario]
    );
  }

  await pool.query(
    "UPDATE calendarios SET activo = ? WHERE id = ?",
    [activo, id]
  );
};

export const getActiveCalendarByTipo = async (tipo_calendario) => {
  const pool = await poolPromise;

  const [rows] = await pool.query(
    `SELECT id, titulo, titulo_seccion,  archivo_url, tipo_calendario, tipo_archivo
     FROM calendarios
     WHERE tipo_calendario = ?
     AND activo = 1
     LIMIT 1`,
    [tipo_calendario]
  );

  return rows[0] || null;
};

export const deleteCalendar = async (id) => {

  const pool = await poolPromise;

  const [result] = await pool.query(
    "DELETE FROM calendarios WHERE id = ?",
    [id]
  );

  if (result.affectedRows === 0) {
    throw new Error("Calendario no encontrado");
  }

};