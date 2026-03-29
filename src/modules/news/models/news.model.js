import { poolPromise } from "../../../config/db.config.js";

const LOCAL_NOW_SQL = "DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR)";

export const NewsModel = {

  getAllAdmin: async () => {
    await NewsModel.sincronizarEstados();

    const [rows] = await poolPromise.query(
      `SELECT * FROM noticias ORDER BY fecha_creacion DESC`
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

  sincronizarEstados: async () => {
    await poolPromise.query(`
      UPDATE noticias
      SET estado = 'Borrador', fecha_actualizacion = UTC_TIMESTAMP()
      WHERE fecha_publicacion > ${LOCAL_NOW_SQL}
        AND (fecha_caducidad IS NULL OR fecha_caducidad > ${LOCAL_NOW_SQL})
        AND estado != 'Borrador'
    `);

    await poolPromise.query(`
      UPDATE noticias
      SET estado = 'Publicada', fecha_actualizacion = UTC_TIMESTAMP()
      WHERE estado = 'Borrador'
        AND fecha_publicacion <= ${LOCAL_NOW_SQL}
        AND (fecha_caducidad IS NULL OR fecha_caducidad > ${LOCAL_NOW_SQL})
    `);

    await poolPromise.query(`
      UPDATE noticias
      SET estado = 'Inactiva', fecha_actualizacion = UTC_TIMESTAMP()
      WHERE fecha_caducidad IS NOT NULL
        AND fecha_caducidad <= ${LOCAL_NOW_SQL}
        AND estado != 'Inactiva'
    `);
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
      estado,
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
        estado,
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
      estado,
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
           fecha_actualizacion = UTC_TIMESTAMP()
       WHERE id_noticia = ?`,
      [
        titulo,
        contenido,
        imagen_url ?? null,
        video_url ?? null,
        categoria || null,
        fecha_publicacion,
        fecha_caducidad || null,
        estado,
        id,
      ]
    );
  },

  delete: async (id) => {
    await poolPromise.query(
      "DELETE FROM noticias WHERE id_noticia = ?",
      [id]
    );
  },

  getPublic: async () => {
    await NewsModel.sincronizarEstados();

    const [rows] = await poolPromise.query(`
      SELECT id_noticia, titulo, contenido, imagen_url, video_url,
             categoria, fecha_publicacion
      FROM noticias
      WHERE estado = 'Publicada'
        AND fecha_publicacion <= ${LOCAL_NOW_SQL}
        AND (fecha_caducidad IS NULL OR fecha_caducidad > ${LOCAL_NOW_SQL})
      ORDER BY fecha_publicacion DESC
    `);
    return rows;
  }
};
