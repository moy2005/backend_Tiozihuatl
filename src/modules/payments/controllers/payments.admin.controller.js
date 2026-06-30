import { poolPromise } from '../../../config/db.config.js';

const normalizeEstado = (estado) => {
  const allowed = ['aprobado', 'pendiente', 'cancelado'];
  return allowed.includes(estado) ? estado : '';
};

const buildAdminPaymentsWhere = (filters = {}) => {
  const where = ['1=1'];
  const params = [];

  const estado = normalizeEstado(String(filters.estado || '').trim().toLowerCase());
  if (estado) {
    where.push(`
      CASE
        WHEN p.estado = 'aprobado' AND c.estado = 'pagado' THEN 'aprobado'
        WHEN p.estado = 'cancelado' OR c.estado = 'cancelado' THEN 'cancelado'
        ELSE 'pendiente'
      END = ?
    `);
    params.push(estado);
  }

  const usuario = String(filters.usuario || '').trim();
  if (usuario) {
    where.push(`
      (
        u.nombre LIKE ?
        OR u.a_paterno LIKE ?
        OR u.a_materno LIKE ?
        OR u.correo LIKE ?
        OR CAST(c.id_compra AS CHAR) LIKE ?
        OR p.referencia LIKE ?
      )
    `);
    const like = `%${usuario}%`;
    params.push(like, like, like, like, like, like);
  }

  if (filters.fecha_inicio) {
    where.push('DATE(COALESCE(p.fecha_pago, c.created_at)) >= ?');
    params.push(filters.fecha_inicio);
  }

  if (filters.fecha_fin) {
    where.push('DATE(COALESCE(p.fecha_pago, c.created_at)) <= ?');
    params.push(filters.fecha_fin);
  }

  return {
    whereSql: where.join(' AND '),
    params,
  };
};

const paymentsBaseQuery = `
  FROM compras c
  LEFT JOIN pagos p ON p.id_compra = c.id_compra
  LEFT JOIN usuarios u ON u.id_usuario = c.id_usuario
  LEFT JOIN (
    SELECT
      dc.id_compra,
      GROUP_CONCAT(DISTINCT r.titulo ORDER BY r.titulo SEPARATOR ', ') AS revistas,
      SUM(COALESCE(dc.descuento_aplicado, 0)) AS descuento_total
    FROM detalle_compra dc
    LEFT JOIN revistas r ON r.id_revista = dc.id_revista
    GROUP BY dc.id_compra
  ) detalle ON detalle.id_compra = c.id_compra
`;

export const getAdminPurchases = async (req, res) => {
  try {
    const { whereSql, params } = buildAdminPaymentsWhere(req.query);
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);

    const [rows] = await poolPromise.query(
      `
      SELECT
        c.id_compra,
        c.id_usuario,
        p.id_pago,
        TRIM(CONCAT_WS(' ', u.a_paterno, u.a_materno, u.nombre)) AS usuario,
        u.correo,
        COALESCE(detalle.revistas, 'Sin detalle') AS revistas,
        COALESCE(c.total, p.monto, 0) AS total_compra,
        COALESCE(p.monto, c.total, 0) AS monto_pagado,
        COALESCE(detalle.descuento_total, 0) AS descuento_total,
        COALESCE(p.metodo, 'stripe') AS metodo,
        p.referencia,
        c.estado AS estado_compra,
        COALESCE(p.estado, 'pendiente') AS estado_pago,
        CASE
          WHEN p.estado = 'aprobado' AND c.estado = 'pagado' THEN 'aprobado'
          WHEN p.estado = 'cancelado' OR c.estado = 'cancelado' THEN 'cancelado'
          ELSE 'pendiente'
        END AS estado,
        COALESCE(p.fecha_pago, c.created_at) AS fecha
      ${paymentsBaseQuery}
      WHERE ${whereSql}
      ORDER BY fecha DESC, c.id_compra DESC
      LIMIT ?
      `,
      [...params, limit]
    );

    return res.json(rows);
  } catch (error) {
    console.error('[admin.payments.list.error]', error);
    return res.status(500).json({ error: 'No se pudo cargar el historial de pagos.' });
  }
};

export const getAdminPaymentStats = async (req, res) => {
  try {
    const { whereSql, params } = buildAdminPaymentsWhere(req.query);

    const [rows] = await poolPromise.query(
      `
      SELECT
        COUNT(*) AS total_compras,
        COALESCE(SUM(CASE WHEN estado = 'aprobado' THEN 1 ELSE 0 END), 0) AS aprobadas,
        COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END), 0) AS pendientes,
        COALESCE(SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END), 0) AS canceladas,
        COALESCE(SUM(CASE WHEN estado = 'aprobado' THEN monto ELSE 0 END), 0) AS ingresos,
        COALESCE(SUM(descuento_total), 0) AS descuentos
      FROM (
        SELECT
          c.id_compra,
          COALESCE(p.monto, c.total, 0) AS monto,
          COALESCE(detalle.descuento_total, 0) AS descuento_total,
          CASE
            WHEN p.estado = 'aprobado' AND c.estado = 'pagado' THEN 'aprobado'
            WHEN p.estado = 'cancelado' OR c.estado = 'cancelado' THEN 'cancelado'
            ELSE 'pendiente'
          END AS estado
        ${paymentsBaseQuery}
        WHERE ${whereSql}
      ) resumen
      `,
      params
    );

    return res.json(rows[0] || {
      total_compras: 0,
      aprobadas: 0,
      pendientes: 0,
      canceladas: 0,
      ingresos: 0,
      descuentos: 0,
    });
  } catch (error) {
    console.error('[admin.payments.stats.error]', error);
    return res.status(500).json({ error: 'No se pudieron cargar las estadisticas de pagos.' });
  }
};
