import { poolPromise } from "../../../config/db.config.js";

export const createPeriodo = async ({ nombre, fecha_inicio, fecha_fin }) => {
  const pool = await poolPromise;
  const [exists] = await pool.query(
    `SELECT * FROM periodos WHERE fecha_inicio <= ? AND fecha_fin >= ?`,
    [fecha_fin, fecha_inicio]
  );

  if (exists.length) {
    throw new Error("El periodo se traslapa con otro");
  }

  const [result] = await pool.query(
    `INSERT INTO periodos (nombre, fecha_inicio, fecha_fin, estado)
     VALUES (?, ?, ?, 'Cerrado')`,
    [nombre, fecha_inicio, fecha_fin]
  );

  return result.insertId;
};

export const updatePeriodo = async (id, data) => {
  const pool = await poolPromise;
  await pool.query(
    `UPDATE periodos SET nombre = ?, fecha_inicio = ?, fecha_fin = ? WHERE id_periodo = ?`,
    [data.nombre, data.fecha_inicio, data.fecha_fin, id]
  );
};

export const getAllPeriodos = async ({ search, estado } = {}) => {
  const pool = await poolPromise;
  let query = `SELECT * FROM periodos WHERE 1=1`;
  const params = [];

  if (search) { query += ` AND nombre LIKE ?`; params.push(`%${search}%`); }
  if (estado) { query += ` AND estado = ?`;    params.push(estado); }

  query += ` ORDER BY fecha_inicio DESC`;
  const [rows] = await pool.query(query, params);
  return rows;
};

export const activarPeriodo = async (id) => {
  const conn = await poolPromise.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`UPDATE periodos SET estado = 'Cerrado'`);
    await conn.query(`UPDATE periodos SET estado = 'Activo' WHERE id_periodo = ?`, [id]);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export const deletePeriodo = async (id) => {
  const pool = await poolPromise;
  await pool.query(`DELETE FROM periodos WHERE id_periodo = ?`, [id]);
};

export const checkPeriodoRelaciones = async (id) => {
  const pool = await poolPromise;

  const [fks] = await pool.query(
    `SELECT
       kcu.TABLE_NAME  AS tabla,
       kcu.COLUMN_NAME AS columna
     FROM information_schema.KEY_COLUMN_USAGE kcu
     JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
       ON rc.CONSTRAINT_NAME   = kcu.CONSTRAINT_NAME
      AND rc.CONSTRAINT_SCHEMA = kcu.TABLE_SCHEMA
     WHERE rc.REFERENCED_TABLE_NAME = 'periodos'
       AND kcu.TABLE_SCHEMA = DATABASE()`
  );

  const relaciones = [];

  for (const { tabla, columna } of fks) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total FROM \`${tabla}\` WHERE \`${columna}\` = ?`,
      [id]
    );
    if (rows[0].total > 0) {
      relaciones.push({ tabla, columna, total: rows[0].total });
    }
  }

  return {
    puedeEliminar: relaciones.length === 0,
    relaciones
  };
};