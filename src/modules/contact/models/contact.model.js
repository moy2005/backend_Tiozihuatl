import { poolPromise } from "../../../config/db.config.js";

export const ContactInfoModel = {
  getPublic: async () => {
    const [rows] = await poolPromise.query(
      "SELECT * FROM contacto_info WHERE estado = 'Activo' LIMIT 1"
    );
    return rows[0] || null;
  },

  getAllAdmin: async () => {
    const [rows] = await poolPromise.query(
      "SELECT * FROM contacto_info"
    );
    return rows;
  },

  createOrUpdate: async (data) => {
    const {
      telefono,
      correo,
      direccion,
      horario,
      facebook,
      instagram,
      twitter,
      whatsapp,
      estado
    } = data;

    const [result] = await poolPromise.query(
      `INSERT INTO contacto_info
       (telefono, correo, direccion, horario, facebook, instagram, twitter, whatsapp, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         telefono = VALUES(telefono),
         correo = VALUES(correo),
         direccion = VALUES(direccion),
         horario = VALUES(horario),
         facebook = VALUES(facebook),
         instagram = VALUES(instagram),
         twitter = VALUES(twitter),
         whatsapp = VALUES(whatsapp),
         estado = VALUES(estado),
         fecha_actualizacion = NOW()`,
      [
        telefono,
        correo,
        direccion,
        horario,
        facebook,
        instagram,
        twitter,
        whatsapp,
        estado || "Activo"
      ]
    );

    return result.affectedRows;
  }
};
