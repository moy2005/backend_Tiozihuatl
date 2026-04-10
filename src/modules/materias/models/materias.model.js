import { poolPromise } from "../../../config/db.config.js";

export const createMateria = async ({ nombre }) => {
  const pool = await poolPromise;
  const [result] = await pool.query(
    `INSERT INTO materias (nombre, activo) VALUES (?, 1)`,
    [nombre]
  );
  return result.insertId;
};

export const getAllMaterias = async ({ search } = {}) => {
  const pool = await poolPromise;
  let query = `SELECT * FROM materias WHERE 1=1`;
  const params = [];

  if (search) {
    query += ` AND nombre LIKE ?`;
    params.push(`%${search}%`);
  }

  query += ` ORDER BY nombre ASC`;
  const [rows] = await pool.query(query, params);
  return rows;
};

export const updateMateria = async (id, { nombre }) => {
  const pool = await poolPromise;
  await pool.query(
    `UPDATE materias SET nombre = ? WHERE id = ?`,
    [nombre, id]
  );
};

export const toggleMateria = async (id, activo) => {
  const pool = await poolPromise;
  await pool.query(
    `UPDATE materias SET activo = ? WHERE id = ?`,
    [activo, id]
  );
};

export const deleteMateria = async (id) => {
  const pool = await poolPromise;
  await pool.query(`DELETE FROM materias WHERE id = ?`, [id]);
};

export const checkMateriaRelaciones = async (id) => {
  const pool = await poolPromise;

  // Detecta automáticamente todas las tablas con FK hacia materias
  const [fks] = await pool.query(
    `SELECT
       kcu.TABLE_NAME  AS tabla,
       kcu.COLUMN_NAME AS columna
     FROM information_schema.KEY_COLUMN_USAGE kcu
     JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
       ON rc.CONSTRAINT_NAME   = kcu.CONSTRAINT_NAME
      AND rc.CONSTRAINT_SCHEMA = kcu.TABLE_SCHEMA
     WHERE rc.REFERENCED_TABLE_NAME = 'materias'
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