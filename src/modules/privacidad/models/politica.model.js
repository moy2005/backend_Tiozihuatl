import { poolPromise } from "../../../config/db.config.js";

const getAll = async () => {
  const [rows] = await poolPromise.execute(`
    SELECT id, seccion_numero, titulo, contenido, icono, orden, activo
    FROM politicas_privacidad
    WHERE activo = 1
    ORDER BY orden ASC, seccion_numero ASC
  `);
  return rows;
};

const getAllAdmin = async ({ search = '', activo } = {}) => {
  let query = `
    SELECT id, seccion_numero, titulo, contenido, icono, orden, activo
    FROM politicas_privacidad
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ` AND (titulo LIKE ? OR contenido LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  if (activo !== undefined && activo !== '') {
    query += ` AND activo = ?`;
    params.push(activo);
  }

  query += ` ORDER BY orden ASC, seccion_numero ASC`;
  const [rows] = await poolPromise.execute(query, params);
  return rows;
};

const create = async ({ seccion_numero, titulo, contenido, icono, orden }) => {
  const [result] = await poolPromise.execute(
    `INSERT INTO politicas_privacidad (seccion_numero, titulo, contenido, icono, orden)
     VALUES (?, ?, ?, ?, ?)`,
    [seccion_numero, titulo, contenido, icono || 'document-text-outline', orden ?? 0]
  );
  return result.insertId;
};

const update = async (id, { seccion_numero, titulo, contenido, icono, orden }) => {
  await poolPromise.execute(
    `UPDATE politicas_privacidad
     SET seccion_numero = ?, titulo = ?, contenido = ?, icono = ?, orden = ?
     WHERE id = ?`,
    [seccion_numero, titulo, contenido, icono || 'document-text-outline', orden ?? 0, id]
  );
};

const cambiarEstado = async (id, activo) => {
  await poolPromise.execute(
    `UPDATE politicas_privacidad SET activo = ? WHERE id = ?`,
    [activo, id]
  );
};

const deleteById = async (id) => {
  await poolPromise.execute(
    `DELETE FROM politicas_privacidad WHERE id = ?`,
    [id]
  );
};

export default { getAll, getAllAdmin, create, update, cambiarEstado, deleteById };