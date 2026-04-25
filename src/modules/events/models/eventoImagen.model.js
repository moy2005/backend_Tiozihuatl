import { poolPromise } from "../../../config/db.config.js";

export const EventoImagenModel = {
  create: async (id_evento, imagenes, orderOffset = 0) => {
    if (!imagenes?.length) return [];

    const values = imagenes.map((img, index) => [
      id_evento,
      img.url,
      img.public_id,
      orderOffset + index + 1,
    ]);

    const [result] = await poolPromise.query(
      `INSERT INTO evento_imagenes (id_evento, url, public_id, orden)
       VALUES ?`,
      [values]
    );

    const insertedIds = Array.from({ length: result.affectedRows }, (_, index) => (
      result.insertId + index
    ));

    if (!insertedIds.length) return [];

    const [rows] = await poolPromise.query(
      "SELECT * FROM evento_imagenes WHERE id_imagen IN (?)",
      [insertedIds]
    );

    const rowsById = new Map(rows.map((row) => [Number(row.id_imagen), row]));
    return insertedIds.map((id) => rowsById.get(Number(id))).filter(Boolean);
  },

  getByEvento: async (id_evento) => {
    const [rows] = await poolPromise.query(
      `SELECT * FROM evento_imagenes
       WHERE id_evento = ?
       ORDER BY orden ASC, id_imagen ASC`,
      [id_evento]
    );
    return rows;
  },

  getByEventos: async (ids_evento) => {
    if (!ids_evento?.length) return [];

    const [rows] = await poolPromise.query(
      `SELECT * FROM evento_imagenes
       WHERE id_evento IN (?)
       ORDER BY id_evento ASC, orden ASC, id_imagen ASC`,
      [ids_evento]
    );

    return rows;
  },

  delete: async (id_imagen) => {
    await poolPromise.query("DELETE FROM evento_imagenes WHERE id_imagen = ?", [
      id_imagen,
    ]);
  },

  updateOrden: async (imagenes) => {
    const promises = imagenes.map((img) =>
      poolPromise.query(
        "UPDATE evento_imagenes SET orden = ? WHERE id_imagen = ?",
        [img.orden, img.id_imagen]
      )
    );

    await Promise.all(promises);
  },

  getById: async (id_imagen) => {
    const [rows] = await poolPromise.query(
      "SELECT * FROM evento_imagenes WHERE id_imagen = ?",
      [id_imagen]
    );
    return rows[0];
  },

  normalizeOrden: async (id_evento) => {
    const imagenes = await EventoImagenModel.getByEvento(id_evento);

    if (!imagenes.length) return;

    const updates = imagenes.map((imagen, index) =>
      poolPromise.query(
        "UPDATE evento_imagenes SET orden = ? WHERE id_imagen = ?",
        [index + 1, imagen.id_imagen]
      )
    );

    await Promise.all(updates);
  },
};
