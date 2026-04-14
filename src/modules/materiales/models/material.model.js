import { poolOperacion } from "../../../config/dbPools/poolOperacion.config.js";

export const MaterialModel = {

  async create(material, conn) {
    const [result] = await conn.query(
      `INSERT INTO materiales 
      (titulo, descripcion, tipo, public_id, url, id_usuario, visibilidad)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        material.titulo,
        material.descripcion,
        material.tipo,
        material.public_id,
        material.url,
        material.id_usuario,
        material.visibilidad || "PUBLICO"
      ]
    );

    return result.insertId;
  },

  async insertMaterias(id_material, materias, conn) {
    if (!materias || materias.length === 0) return;

    const values = materias.map(id_materia => [id_material, id_materia]);

    await conn.query(
      `INSERT INTO material_materia (id_material, id_materia)
       VALUES ?`,
      [values]
    );
  },

  async insertSemestres(id_material, semestres, conn) {
    if (!semestres || semestres.length === 0) return;

    const values = semestres.map(id_semestre => [id_material, id_semestre]);

    await conn.query(
      `INSERT INTO material_semestre (id_material, id_semestre)
       VALUES ?`,
      [values]
    );
  },

  async findByUser(id_usuario) {
  const [rows] = await poolOperacion.query(
    `SELECT * FROM materiales 
     WHERE id_usuario = ?`,
    [id_usuario]
  );
  return rows;
},

  async findById(id_material, conn = null) {
    const db = conn || poolOperacion;
    const [rows] = await db.query(
      `SELECT * FROM materiales WHERE id_material = ?`,
      [id_material]
    );
    return rows[0];
  },

  async delete(id_material) {
    await poolOperacion.query(
      `DELETE FROM materiales WHERE id_material = ?`,
      [id_material]
    );
  },

  async getMaterias() {
    const [rows] = await poolConsulta.query(
      `SELECT id, nombre FROM materias WHERE activo = 1`
    );
    return rows;
  },

  async getSemestres() {
    const [rows] = await poolConsulta.query(
      `SELECT id_semestre, nombre_semestre FROM semestres`
    );
    return rows;
  },

  async update(id_material, data, conn) {
    await conn.query(
      `UPDATE materiales 
      SET titulo = ?, descripcion = ?, visibilidad = ?, tipo = ?, public_id = ?, url = ?
      WHERE id_material = ?`,
      [
        data.titulo,
        data.descripcion,
        data.visibilidad,
        data.tipo,
        data.public_id,
        data.url,
        id_material
      ]
    );
  },

  async clearMaterias(id_material, conn) {
    await conn.query(
      `DELETE FROM material_materia WHERE id_material = ?`,
      [id_material]
    );
  },

  async clearSemestres(id_material, conn) {
    await conn.query(
      `DELETE FROM material_semestre WHERE id_material = ?`,
      [id_material]
    );
  },

  async findByIdWithRelations(id_material) {

    const [rows] = await poolOperacion.query(`
      SELECT 
        m.*,
        GROUP_CONCAT(DISTINCT mm.id_materia) AS materias,
        GROUP_CONCAT(DISTINCT ms.id_semestre) AS semestres

      FROM materiales m

      LEFT JOIN material_materia mm 
        ON mm.id_material = m.id_material

      LEFT JOIN material_semestre ms 
        ON ms.id_material = m.id_material

      WHERE m.id_material = ?

      GROUP BY m.id_material
    `, [id_material]);

    return rows[0];
  },

  async updateStatus(id_material, activo) {
    await poolOperacion.query(
      `UPDATE materiales SET activo = ? WHERE id_material = ?`,
      [activo, id_material]
    );
  },

  async findByIdWithConn(id_material, conn) {
    const [rows] = await conn.query(
      `SELECT * FROM materiales WHERE id_material = ?`,
      [id_material]
    );
    return rows[0];
  },
  
};
