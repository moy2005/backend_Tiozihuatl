import { poolPromise } from '../../../config/db.config.js';

const getAll = async () => {
  const [rows] = await poolPromise.execute(
    `SELECT id, numero, titulo, subtitulo, contenido, activo, orden
     FROM terminos_condiciones
     ORDER BY orden ASC, numero ASC`
  );
  return rows;
};

const getAllPublic = async () => {
  const [rows] = await poolPromise.execute(
    `SELECT id, numero, titulo, subtitulo, contenido, orden
     FROM terminos_condiciones
     WHERE activo = 1
     ORDER BY orden ASC, numero ASC`
  );
  return rows;
};

const getById = async (id) => {
  const [rows] = await poolPromise.execute(
    `SELECT id, numero, titulo, subtitulo, contenido, activo, orden
     FROM terminos_condiciones WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
};

const create = async ({ numero, titulo, subtitulo, contenido, orden }) => {
  const [result] = await poolPromise.execute(
    `INSERT INTO terminos_condiciones (numero, titulo, subtitulo, contenido, orden)
     VALUES (?, ?, ?, ?, ?)`,
    [numero, titulo, subtitulo ?? null, contenido, orden ?? 0]
  );
  return result.insertId;
};

const update = async (id, { numero, titulo, subtitulo, contenido, orden }) => {
  await poolPromise.execute(
    `UPDATE terminos_condiciones
     SET numero = ?, titulo = ?, subtitulo = ?, contenido = ?, orden = ?
     WHERE id = ?`,
    [numero, titulo, subtitulo ?? null, contenido, orden ?? 0, id]
  );
};

const cambiarEstado = async (id, activo) => {
  await poolPromise.execute(
    `UPDATE terminos_condiciones SET activo = ? WHERE id = ?`,
    [activo, id]
  );
};

const getUltimaActualizacion = async () => {
  const [rows] = await poolPromise.execute(
    `SELECT MAX(updated_at) as ultima FROM terminos_condiciones WHERE activo = 1`
  );
  return rows[0]?.ultima || null;
};

export default { getAll, getAllPublic, getById, create, update, cambiarEstado, getUltimaActualizacion };