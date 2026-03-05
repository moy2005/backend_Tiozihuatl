import { poolPromise } from "../../../../config/db.config.js";

export const PeriodoModel = {

  async findAll() {
    const pool = await poolPromise;

    const [rows] = await pool.query(`
      SELECT 
        id_periodo,
        nombre,
        fecha_inicio,
        fecha_fin,
        estado
      FROM periodos
      ORDER BY fecha_inicio DESC
    `);

    return rows;
  },

  async findById(id_periodo) {
    const pool = await poolPromise;

    const [rows] = await pool.query(
      `SELECT * FROM periodos WHERE id_periodo = ?`,
      [id_periodo]
    );

    return rows[0] || null;
  },

  async findActivo() {
    const pool = await poolPromise;

    const [rows] = await pool.query(`
      SELECT *
      FROM periodos
      WHERE estado = 'Activo'
      LIMIT 1
    `);

    return rows[0] || null;
  }

};

