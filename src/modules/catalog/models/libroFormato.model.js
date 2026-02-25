import { poolPromise } from "../../../config/db.config.js";

/** Crear formato */
const createFormato = async (data) => {
  const { libro_id, tipo, total, disponibles, pdf_url } = data;

  await poolPromise.execute(
    `INSERT INTO libro_formatos
     (libro_id, tipo, total, disponibles, pdf_url)
     VALUES (?, ?, ?, ?, ?)`,
    [libro_id, tipo, total, disponibles, pdf_url]
  );
};

/** Obtener formatos por libro */
const getByLibro = async (libro_id) => {
  const [rows] = await poolPromise.execute(
    `SELECT * FROM libro_formatos WHERE libro_id = ?`,
    [libro_id]
  );
  return rows;
};

/** Actualizar stock físico */
const updateStock = async (id, total, disponibles) => {
  await poolPromise.execute(
    `UPDATE libro_formatos
     SET total = ?, disponibles = ?
     WHERE libro_id = ? AND tipo = 'FISICO'`,
    [total, disponibles, id]
  );
};

/** Actualizar PDF digital */
const updatePdf = async (id, pdf_url) => {
  await poolPromise.execute(
    `UPDATE libro_formatos
     SET pdf_url = ?
     WHERE libro_id = ? AND tipo = 'DIGITAL'`,
    [pdf_url, id]
  );
};

export default {
  createFormato,
  getByLibro,
  updateStock,
  updatePdf
};