/* =====================================
   AUDITORÍA DE COMPRAS
===================================== */

export const registerAudit = async ({
  connection,
  id_usuario,
  id_compra,
  accion,
  detalle
}) => {

  await connection.query(
    `INSERT INTO auditoria_compras
     (id_usuario, id_compra, accion, detalle)
     VALUES (?, ?, ?, ?)`,
    [id_usuario, id_compra, accion, detalle]
  );
};
