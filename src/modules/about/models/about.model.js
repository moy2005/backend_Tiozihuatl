import { poolPromise } from "../../../config/db.config.js";

export const AboutModel = {

  async getAll() {
    const pool = await poolPromise;
    const [rows] = await pool.query("SELECT * FROM about ORDER BY id_about DESC");
    return rows;
  },

  async getPublic() {
    const pool = await poolPromise;
    const [rows] = await pool.query(
      "SELECT * FROM about WHERE status = 'Activo' ORDER BY id_about"
    );
    return rows;
  },

  async create(data) {
    const pool = await poolPromise;
    const { type, title, content, status } = data;

    const [result] = await pool.query(
      `INSERT INTO about (type, title, content, status)
       VALUES (?, ?, ?, ?)`,
      [type, title, content, status || 'Activo']
    );

    return { id_about: result.insertId };
  },

  async update(id, data) {
    const pool = await poolPromise;
    const { type, title, content, status } = data;

    await pool.query(
      `UPDATE about 
       SET type = ?, title = ?, content = ?, status = ?
       WHERE id_about = ?`,
      [type, title, content, status, id]
    );

    return true;
  },

  async delete(id) {
    const pool = await poolPromise;
    await pool.query(
      "UPDATE about SET status = 'Inactivo' WHERE id_about = ?",
      [id]
    );
    return true;
  }
};