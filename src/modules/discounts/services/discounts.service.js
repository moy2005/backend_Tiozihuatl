import { poolPromise } from '../../../config/db.config.js';

const httpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeDiscount = (body = {}) => {
  const nombre = String(body.nombre || '').trim();
  const tipo = String(body.tipo || '').trim();
  const valor = Number(body.valor);
  const fecha_inicio = body.fecha_inicio;
  const fecha_fin = body.fecha_fin;
  const estado = body.estado === 'Inactivo' ? 'Inactivo' : 'Activo';
  const revistas = Array.isArray(body.revistas)
    ? body.revistas
    : Array.isArray(body.id_revistas)
      ? body.id_revistas
      : [];

  const revistaIds = [...new Set(
    revistas
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
  )];

  if (!nombre) throw httpError('El nombre del descuento es obligatorio.');
  if (!['porcentaje', 'monto'].includes(tipo)) {
    throw httpError('El tipo de descuento debe ser porcentaje o monto.');
  }
  if (!Number.isFinite(valor) || valor <= 0) {
    throw httpError('El valor del descuento debe ser mayor a 0.');
  }
  if (tipo === 'porcentaje' && valor >= 100) {
    throw httpError('El porcentaje debe ser menor a 100 para pagos con Stripe.');
  }
  if (!fecha_inicio || !fecha_fin) {
    throw httpError('Las fechas de inicio y fin son obligatorias.');
  }
  if (new Date(fecha_inicio) > new Date(fecha_fin)) {
    throw httpError('La fecha de inicio no puede ser mayor a la fecha fin.');
  }
  if (revistaIds.length === 0) {
    throw httpError('Selecciona al menos una revista.');
  }

  return {
    nombre,
    tipo,
    valor,
    fecha_inicio,
    fecha_fin,
    estado,
    revistaIds,
  };
};

const assertMagazinesExist = async (connection, revistaIds) => {
  const placeholders = revistaIds.map(() => '?').join(',');
  const [rows] = await connection.query(
    `SELECT id_revista
     FROM revistas
     WHERE id_revista IN (${placeholders})`,
    revistaIds
  );

  if (rows.length !== revistaIds.length) {
    throw httpError('Una o mas revistas seleccionadas no existen.', 404);
  }
};

export const listDiscounts = async () => {
  const [rows] = await poolPromise.query(`
    SELECT
      d.id_descuento,
      d.nombre,
      d.tipo,
      d.valor,
      d.fecha_inicio,
      d.fecha_fin,
      d.estado,
      d.created_at,
      CASE
        WHEN d.estado = 'Activo'
         AND CURDATE() BETWEEN d.fecha_inicio AND d.fecha_fin
        THEN 1 ELSE 0
      END AS vigente,
      COUNT(rd.id_revista) AS total_revistas,
      GROUP_CONCAT(rd.id_revista ORDER BY r.titulo SEPARATOR ',') AS revista_ids,
      GROUP_CONCAT(r.titulo ORDER BY r.titulo SEPARATOR ', ') AS revistas
    FROM descuentos d
    LEFT JOIN revista_descuento rd ON rd.id_descuento = d.id_descuento
    LEFT JOIN revistas r ON r.id_revista = rd.id_revista
    GROUP BY
      d.id_descuento,
      d.nombre,
      d.tipo,
      d.valor,
      d.fecha_inicio,
      d.fecha_fin,
      d.estado,
      d.created_at
    ORDER BY d.created_at DESC, d.id_descuento DESC
  `);

  return rows.map((row) => ({
    ...row,
    revista_ids: row.revista_ids
      ? String(row.revista_ids).split(',').map((id) => Number(id))
      : [],
  }));
};

export const createDiscount = async (body) => {
  const discount = normalizeDiscount(body);
  const connection = await poolPromise.getConnection();

  try {
    await connection.beginTransaction();
    await assertMagazinesExist(connection, discount.revistaIds);

    const [result] = await connection.query(
      `INSERT INTO descuentos
       (nombre, tipo, valor, fecha_inicio, fecha_fin, estado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        discount.nombre,
        discount.tipo,
        discount.valor,
        discount.fecha_inicio,
        discount.fecha_fin,
        discount.estado,
      ]
    );

    for (const idRevista of discount.revistaIds) {
      await connection.query(
        `INSERT INTO revista_descuento (id_revista, id_descuento)
         VALUES (?, ?)`,
        [idRevista, result.insertId]
      );
    }

    await connection.commit();
    return { id_descuento: result.insertId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateDiscount = async (id, body) => {
  const idDescuento = Number(id);
  if (!Number.isInteger(idDescuento) || idDescuento <= 0) {
    throw httpError('Descuento invalido.');
  }

  const discount = normalizeDiscount(body);
  const connection = await poolPromise.getConnection();

  try {
    await connection.beginTransaction();
    await assertMagazinesExist(connection, discount.revistaIds);

    const [result] = await connection.query(
      `UPDATE descuentos
       SET nombre = ?,
           tipo = ?,
           valor = ?,
           fecha_inicio = ?,
           fecha_fin = ?,
           estado = ?
       WHERE id_descuento = ?`,
      [
        discount.nombre,
        discount.tipo,
        discount.valor,
        discount.fecha_inicio,
        discount.fecha_fin,
        discount.estado,
        idDescuento,
      ]
    );

    if (result.affectedRows === 0) {
      throw httpError('Descuento no encontrado.', 404);
    }

    await connection.query(
      'DELETE FROM revista_descuento WHERE id_descuento = ?',
      [idDescuento]
    );

    for (const idRevista of discount.revistaIds) {
      await connection.query(
        `INSERT INTO revista_descuento (id_revista, id_descuento)
         VALUES (?, ?)`,
        [idRevista, idDescuento]
      );
    }

    await connection.commit();
    return { id_descuento: idDescuento };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const toggleDiscountStatus = async (id) => {
  const idDescuento = Number(id);
  if (!Number.isInteger(idDescuento) || idDescuento <= 0) {
    throw httpError('Descuento invalido.');
  }

  const [rows] = await poolPromise.query(
    'SELECT estado FROM descuentos WHERE id_descuento = ? LIMIT 1',
    [idDescuento]
  );

  if (rows.length === 0) throw httpError('Descuento no encontrado.', 404);

  const nuevoEstado = rows[0].estado === 'Activo' ? 'Inactivo' : 'Activo';

  await poolPromise.query(
    'UPDATE descuentos SET estado = ? WHERE id_descuento = ?',
    [nuevoEstado, idDescuento]
  );

  return { estado: nuevoEstado };
};
