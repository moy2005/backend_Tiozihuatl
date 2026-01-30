import { poolPromise } from "../../../config/db.config.js";

export const HelpModel = {
  getAllAdmin: async () => {
    const [rows] = await poolPromise.query(
      "SELECT * FROM ayuda_faq ORDER BY fecha_creacion DESC"
    );
    return rows;
  },

  getPublic: async () => {
    const [rows] = await poolPromise.query(
      `SELECT pregunta, respuesta
       FROM ayuda_faq
       WHERE estado = 'Activo'
       ORDER BY fecha_creacion ASC`
    );
    return rows;
  },

  getById: async (id) => {
    const [rows] = await poolPromise.query(
      "SELECT * FROM ayuda_faq WHERE id_faq = ?",
      [id]
    );
    return rows[0] || null;
  },

  create: async (data) => {
    const { pregunta, respuesta, estado } = data;
    const [result] = await poolPromise.query(
      "INSERT INTO ayuda_faq (pregunta, respuesta, estado) VALUES (?, ?, ?)",
      [pregunta, respuesta, estado || "Activo"]
    );
    return result.insertId;
  },

  update: async (id, data) => {
    const { pregunta, respuesta, estado } = data;
    const [result] = await poolPromise.query(
      `UPDATE ayuda_faq
       SET pregunta = ?, respuesta = ?, estado = ?, fecha_actualizacion = NOW()
       WHERE id_faq = ?`,
      [pregunta, respuesta, estado, id]
    );
    return result.affectedRows;
  },

  delete: async (id) => {
    const [result] = await poolPromise.query(
      "DELETE FROM ayuda_faq WHERE id_faq = ?",
      [id]
    );
    return result.affectedRows;
  }
};
