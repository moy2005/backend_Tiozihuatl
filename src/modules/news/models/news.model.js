import {poolPromise} from "../../../config/db.config.js";

export const NewsModel = {

  // =======================
  // ADMIN
  // =======================

  getAllAdmin: async () => {
    const [rows] = await poolPromise.query(
      `SELECT *
       FROM noticias
       ORDER BY fecha_creacion DESC`
    );
    return rows;
  },

  getById: async (id) => {
    const [rows] = await poolPromise.query(
      "SELECT * FROM noticias WHERE id_noticia = ?",
      [id]
    );
    return rows[0];
  },

  create: async (data) => {
    const {
      titulo,
      contenido,
      imagen_url,
      video_url,
      categoria,
      fecha_publicacion,
      fecha_caducidad,
      estado
    } = data;

    await poolPromise.query(
      `INSERT INTO noticias
       (titulo, contenido, imagen_url, video_url, categoria,
        fecha_publicacion, fecha_caducidad, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        titulo,
        contenido,
        imagen_url || null,
        video_url || null,
        categoria || null,
        fecha_publicacion,
        fecha_caducidad || null,
        estado || 'Borrador'
      ]
    );
  },

  update: async (id, data) => {
    const {
      titulo,
      contenido,
      imagen_url,
      video_url,
      categoria,
      fecha_publicacion,
      fecha_caducidad,
      estado
    } = data;

    await poolPromise.query(
      `UPDATE noticias
       SET titulo = ?,
           contenido = ?,
           imagen_url = ?,
           video_url = ?,
           categoria = ?,
           fecha_publicacion = ?,
           fecha_caducidad = ?,
           estado = ?,
           fecha_actualizacion = NOW()
       WHERE id_noticia = ?`,
      [
        titulo,
        contenido,
        imagen_url || null,
        video_url || null,
        categoria || null,
        fecha_publicacion,
        fecha_caducidad || null,
        estado,
        id
      ]
    );
  },

  delete: async (id) => {
    await poolPromise.query(
      "DELETE FROM noticias WHERE id_noticia = ?",
      [id]
    );
  },

  // =======================
  // PUBLIC
  // =======================

getPublic: async () => {
  try {
    
    const query = `
      SELECT id_noticia, titulo, contenido, imagen_url, video_url,
             categoria, fecha_publicacion
      FROM noticias
      WHERE estado = 'Publicada'
      ORDER BY fecha_publicacion DESC
    `;
    
    const [rows] = await poolPromise.query(query);
    

    return rows;
  } catch (error) {
    console.error('❌ Error en getPublic:', error);
    throw error;
  }
}
};
