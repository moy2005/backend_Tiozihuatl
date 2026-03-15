import { poolPromise } from "../../../config/db.config.js";

export const PrestamoModel = {

  crearPrestamo: async (conn, data) => {
    const [result] = await conn.query(
      `INSERT INTO prestamos 
       (id_usuario, libro_id, fecha_vencimiento, estado)
       VALUES (?, ?, ?, 'Activo')`,
      [data.id_usuario, data.libro_id, data.fecha_vencimiento]
    );
    return result.insertId;
  },

  descontarStock: async (conn, libro_id) => {
    const [result] = await conn.query(
      `UPDATE libro_formatos
       SET disponibles = disponibles - 1
       WHERE libro_id = ?
       AND tipo = 'FISICO'
       AND disponibles > 0`,
      [libro_id]
    );

    if (result.affectedRows === 0) {
      throw new Error("No hay stock disponible");
    }
  },

  devolverLibro: async (conn, id_prestamo, admin_id) => {

    const [prestamo] = await conn.query(
      `SELECT libro_id FROM prestamos 
       WHERE id_prestamo = ? AND estado='Activo'`,
      [id_prestamo]
    );

    if (!prestamo.length) {
      throw new Error("Préstamo no válido");
    }

    const libro_id = prestamo[0].libro_id;

    await conn.query(
      `UPDATE prestamos 
       SET estado='Devuelto',
           fecha_devolucion=NOW(),
           gestionado_por=?
       WHERE id_prestamo=?`,
      [admin_id, id_prestamo]
    );

    await conn.query(
      `UPDATE libro_formatos
       SET disponibles = disponibles + 1
       WHERE libro_id = ?
       AND tipo = 'FISICO'`,
      [libro_id]
    );
  },

  listarAdmin: async () => {
    const [rows] = await poolPromise.query(`
      SELECT 
        P.*,
        U.nombre,
        L.titulo
      FROM prestamos P
      JOIN usuarios U ON U.id_usuario = P.id_usuario
      JOIN libros L ON L.id = P.libro_id
      ORDER BY P.fecha_prestamo DESC
    `);
    return rows;
  },

  obtenerPorUsuario: async (usuario_id) => {
    const [rows] = await poolPromise.query(`
      SELECT 
        P.*,
        L.titulo,
        L.imagen_portada
      FROM prestamos P
      JOIN libros L ON L.id = P.libro_id
      WHERE P.id_usuario = ?
      ORDER BY P.fecha_prestamo DESC
    `, [usuario_id]);
    return rows;
  },


  contarPrestamosActivos: async (conn, usuario_id) => {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS total
     FROM prestamos
     WHERE id_usuario = ? AND estado = 'Activo'`,
    [usuario_id]
  );
  return rows[0].total;
},

// Cancelar préstamo (solo si está Activo)
cancelarPrestamo: async (conn, id_prestamo, admin_id, observaciones) => {
  const [prestamo] = await conn.query(
    `SELECT libro_id, estado FROM prestamos WHERE id_prestamo = ?`,
    [id_prestamo]
  );

  if (!prestamo.length) throw new Error("Préstamo no encontrado");
  if (prestamo[0].estado !== 'Activo') {
    throw new Error(`No se puede cancelar un préstamo en estado '${prestamo[0].estado}'`);
  }

  await conn.query(
    `UPDATE prestamos
     SET estado = 'Cancelado',
         gestionado_por = ?,
         observaciones = ?
     WHERE id_prestamo = ?`,
    [admin_id, observaciones ?? null, id_prestamo]
  );

  // Devolver stock
  await conn.query(
    `UPDATE libro_formatos
     SET disponibles = disponibles + 1
     WHERE libro_id = ? AND tipo = 'FISICO'`,
    [prestamo[0].libro_id]
  );
},

// Marcar como vencido manualmente
marcarVencido: async (conn, id_prestamo, admin_id, observaciones) => {
  const [prestamo] = await conn.query(
    `SELECT estado FROM prestamos WHERE id_prestamo = ?`,
    [id_prestamo]
  );

  if (!prestamo.length) throw new Error("Préstamo no encontrado");
  if (prestamo[0].estado !== 'Activo') {
    throw new Error(`No se puede vencer un préstamo en estado '${prestamo[0].estado}'`);
  }

  await conn.query(
    `UPDATE prestamos
     SET estado = 'Vencido',
         gestionado_por = ?,
         observaciones = ?
     WHERE id_prestamo = ?`,
    [admin_id, observaciones ?? null, id_prestamo]
  );
},

// Registrar préstamo manualmente (admin presta directamente)
registrarPrestamo: async (conn, data) => {
  const { id_usuario, libro_id, dias, admin_id, observaciones } = data;

  const fecha_vencimiento = new Date();
  fecha_vencimiento.setDate(fecha_vencimiento.getDate() + (dias ?? 7));

  const [result] = await conn.query(
    `INSERT INTO prestamos
     (id_usuario, libro_id, fecha_vencimiento, estado, gestionado_por, observaciones)
     VALUES (?, ?, ?, 'Activo', ?, ?)`,
    [id_usuario, libro_id, fecha_vencimiento, admin_id, observaciones ?? null]
  );

  return result.insertId;
},

// Actualizar observaciones
actualizarObservaciones: async (id_prestamo, observaciones) => {
  await poolPromise.execute(
    `UPDATE prestamos SET observaciones = ? WHERE id_prestamo = ?`,
    [observaciones, id_prestamo]
  );
},

};


