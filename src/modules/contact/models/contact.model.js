import { poolPromise } from "../../../config/db.config.js";

export const ContactInfoModel = {
  getPublic: async () => {
    const [rows] = await poolPromise.query(
      "SELECT * FROM contacto_info WHERE estado = 'Activo' ORDER BY id_contacto DESC LIMIT 1"
    );
    return rows[0] || null;
  },

  getAllAdmin: async () => {
    const [rows] = await poolPromise.query(
      "SELECT * FROM contacto_info WHERE estado='Activo'ORDER BY id_contacto DESC LIMIT 1"
    );
    return rows;
  },

createOrUpdate: async (data) => {
  const conn = await poolPromise.getConnection();

  try {
    await conn.beginTransaction();

    await conn.query(
      "UPDATE contacto_info SET estado = 'Inactivo'"
    );

    const [result] = await conn.query(
      `INSERT INTO contacto_info
       (telefono, correo, direccion, horario, facebook, instagram, twitter, whatsapp, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.telefono,
        data.correo,
        data.direccion,
        data.horario,
        data.facebook,
        data.instagram,
        data.twitter,
        data.whatsapp,
        "Activo"
      ]
    );

    await conn.commit();
    return result.affectedRows;

  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

};
