import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { poolPromise } from '../../../config/db.config.js';

let mercadoPagoClient;

const activeDiscountJoin = `
  LEFT JOIN (
    SELECT
      rd.id_revista,
      MAX(
        CASE
          WHEN d.tipo = 'porcentaje' THEN r2.precio * (d.valor / 100)
          ELSE d.valor
        END
      ) AS descuento_monto
    FROM revista_descuento rd
    INNER JOIN descuentos d ON d.id_descuento = rd.id_descuento
    INNER JOIN revistas r2 ON r2.id_revista = rd.id_revista
    WHERE d.estado = 'Activo'
      AND CURDATE() BETWEEN d.fecha_inicio AND d.fecha_fin
    GROUP BY rd.id_revista
  ) best_discount ON best_discount.id_revista = r.id_revista
`;

const httpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const money = (amount) => Number(Number(amount || 0).toFixed(2));

const assertMercadoPagoConfig = () => {
  if (!process.env.MP_ACCESS_TOKEN) {
    throw httpError('MP_ACCESS_TOKEN no configurado', 500);
  }

  if (!process.env.FRONT_URL) {
    throw httpError('FRONT_URL no configurado', 500);
  }
};

const getBackendUrl = () => (
  process.env.BACKEND_URL
  || process.env.API_PUBLIC_URL
  || process.env.RENDER_EXTERNAL_URL
  || ''
).replace(/\/$/, '');

const getMercadoPagoClient = () => {
  if (!process.env.MP_ACCESS_TOKEN) {
    throw httpError('MP_ACCESS_TOKEN no configurado', 500);
  }

  if (!mercadoPagoClient) {
    mercadoPagoClient = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN,
      options: { timeout: 10000 },
    });
  }

  return mercadoPagoClient;
};

const normalizeItems = (body) => {
  const rawItems = Array.isArray(body?.items) && body.items.length > 0
    ? body.items
    : [body];

  const ids = rawItems
    .map((item) => Number(item.id_revista || item.id_magazine || item.id))
    .filter((id) => Number.isInteger(id) && id > 0);

  return [...new Set(ids)];
};

const fetchCheckoutUser = async (connection, idUsuario) => {
  const [rows] = await connection.query(
    `SELECT id_usuario, correo
     FROM usuarios
     WHERE id_usuario = ?
     LIMIT 1`,
    [idUsuario]
  );

  if (rows.length === 0) {
    throw httpError('Usuario no encontrado', 404);
  }

  return rows[0];
};

const fetchMagazinesForPayment = async (connection, revistaIds) => {
  const placeholders = revistaIds.map(() => '?').join(',');

  const [rows] = await connection.query(
    `SELECT
       r.id_revista,
       r.titulo,
       r.precio,
       COALESCE(ROUND(LEAST(r.precio, best_discount.descuento_monto), 2), 0) AS descuento_aplicado,
       ROUND(
         GREATEST(
           r.precio - COALESCE(LEAST(r.precio, best_discount.descuento_monto), 0),
           0
         ),
         2
       ) AS precio_final,
       r.stock,
       r.estado
     FROM revistas r
     ${activeDiscountJoin}
     WHERE r.id_revista IN (${placeholders})
     FOR UPDATE`,
    revistaIds
  );

  if (rows.length !== revistaIds.length) {
    throw httpError('Una o mas revistas no existen', 404);
  }

  const byId = new Map(rows.map((row) => [Number(row.id_revista), row]));
  return revistaIds.map((id) => byId.get(id));
};

const validateMagazinesCanBePurchased = (magazines) => {
  for (const magazine of magazines) {
    if (magazine.estado !== 'Activa') {
      throw httpError(`La revista ${magazine.id_revista} no esta activa`, 409);
    }

    if (!Number.isFinite(Number(magazine.precio)) || Number(magazine.precio) <= 0) {
      throw httpError(`La revista ${magazine.id_revista} tiene un precio invalido`, 409);
    }

    if (!Number.isFinite(Number(magazine.precio_final)) || Number(magazine.precio_final) <= 0) {
      throw httpError(`La revista ${magazine.id_revista} no tiene un precio final valido`, 409);
    }
  }
};

const assertNotAlreadyPurchased = async (connection, idUsuario, revistaIds) => {
  const placeholders = revistaIds.map(() => '?').join(',');

  const [rows] = await connection.query(
    `SELECT dc.id_revista
     FROM compras c
     INNER JOIN detalle_compra dc ON dc.id_compra = c.id_compra
     WHERE c.id_usuario = ?
       AND c.estado = 'pagado'
       AND dc.id_revista IN (${placeholders})
     LIMIT 1`,
    [idUsuario, ...revistaIds]
  );

  if (rows.length > 0) {
    throw httpError(`Ya compraste la revista ${rows[0].id_revista}`, 409);
  }
};

const createPendingPurchase = async (connection, idUsuario, magazines) => {
  const total = money(magazines.reduce((sum, magazine) => sum + Number(magazine.precio_final), 0));

  const [compraResult] = await connection.query(
    `INSERT INTO compras (id_usuario, total, estado)
     VALUES (?, ?, 'pendiente')`,
    [idUsuario, total]
  );

  const idCompra = compraResult.insertId;

  for (const magazine of magazines) {
    await connection.query(
      `INSERT INTO detalle_compra
       (id_compra, id_revista, precio_base, descuento_aplicado, precio_final)
       VALUES (?, ?, ?, ?, ?)`,
      [
        idCompra,
        magazine.id_revista,
        money(magazine.precio),
        money(magazine.descuento_aplicado),
        money(magazine.precio_final),
      ]
    );
  }

  const [pagoResult] = await connection.query(
    `INSERT INTO pagos (id_compra, metodo, monto, estado)
     VALUES (?, 'mercado_pago', ?, 'pendiente')`,
    [idCompra, total]
  );

  return {
    idCompra,
    idPago: pagoResult.insertId,
    total,
  };
};

const cleanupPendingPurchase = async (idCompra) => {
  if (!idCompra) return;

  const connection = await poolPromise.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM pagos WHERE id_compra = ?', [idCompra]);
    await connection.query('DELETE FROM detalle_compra WHERE id_compra = ?', [idCompra]);
    await connection.query(
      `DELETE FROM compras
       WHERE id_compra = ?
         AND estado = 'pendiente'`,
      [idCompra]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('[mp.preference.cleanup_failed]', {
      id_compra: idCompra,
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

const buildPreferenceItems = (magazines) => magazines.map((magazine) => ({
  id: String(magazine.id_revista),
  title: magazine.titulo || `Revista ${magazine.id_revista}`,
  unit_price: money(magazine.precio_final),
  quantity: 1,
  currency_id: 'MXN',
}));

const getNotificationUrl = () => {
  if (process.env.MP_NOTIFICATION_URL) return process.env.MP_NOTIFICATION_URL;

  const backendUrl = getBackendUrl();
  if (!backendUrl) {
    throw httpError('BACKEND_URL o MP_NOTIFICATION_URL no configurado para webhook de Mercado Pago', 500);
  }

  return `${backendUrl}/api/payments/webhook`;
};

const buildPreferenceBody = ({ pendingPurchase, magazines, revistaIds, checkoutUser, idUsuario }) => ({
  items: buildPreferenceItems(magazines),
  payer: checkoutUser.correo ? { email: checkoutUser.correo } : undefined,
  external_reference: String(pendingPurchase.idCompra),
  metadata: {
    id_usuario: String(idUsuario),
    id_compra: String(pendingPurchase.idCompra),
    id_pago: String(pendingPurchase.idPago),
    id_revistas: revistaIds.join(','),
  },
  notification_url: getNotificationUrl(),
  back_urls: {
    success: `${process.env.FRONT_URL}/magazines?payment=success`,
    failure: `${process.env.FRONT_URL}/magazines?payment=failure`,
    pending: `${process.env.FRONT_URL}/magazines?payment=pending`,
  },
  auto_return: 'approved',
});

export const createPreferenceForPurchase = async ({ idUsuario, body }) => {
  assertMercadoPagoConfig();

  const revistaIds = normalizeItems(body);
  if (revistaIds.length === 0) {
    throw httpError('id_revista requerido');
  }

  let pendingPurchase = null;
  let preferenceCreated = false;
  const connection = await poolPromise.getConnection();

  try {
    await connection.beginTransaction();

    const checkoutUser = await fetchCheckoutUser(connection, idUsuario);
    const magazines = await fetchMagazinesForPayment(connection, revistaIds);
    validateMagazinesCanBePurchased(magazines);
    await assertNotAlreadyPurchased(connection, idUsuario, revistaIds);

    pendingPurchase = await createPendingPurchase(connection, idUsuario, magazines);

    await connection.commit();

    const preferenceClient = new Preference(getMercadoPagoClient());
    const preference = await preferenceClient.create({
      body: buildPreferenceBody({
        pendingPurchase,
        magazines,
        revistaIds,
        checkoutUser,
        idUsuario,
      }),
      requestOptions: {
        idempotencyKey: `compra-${pendingPurchase.idCompra}`,
      },
    });
    preferenceCreated = true;

    await poolPromise.query(
      `UPDATE pagos
       SET referencia = ?
       WHERE id_pago = ?
         AND estado = 'pendiente'`,
      [preference.id, pendingPurchase.idPago]
    );

    console.info('[mp.preference.created]', {
      preference_id: preference.id,
      id_compra: pendingPurchase.idCompra,
      id_pago: pendingPurchase.idPago,
      total: pendingPurchase.total,
    });

    return {
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      preference_id: preference.id,
      id_compra: pendingPurchase.idCompra,
      total: pendingPurchase.total,
    };
  } catch (error) {
    await connection.rollback().catch(() => {});

    if (pendingPurchase?.idCompra && !preferenceCreated) {
      await cleanupPendingPurchase(pendingPurchase.idCompra);
    }

    throw error;
  } finally {
    connection.release();
  }
};

export const extractMercadoPagoPaymentId = (req) => {
  const query = req.query || {};
  const body = req.body || {};

  return (
    query['data.id']
    || query.id
    || query.payment_id
    || body?.data?.id
    || body?.id
    || body?.payment_id
    || body?.resource
  );
};

const normalizePaymentResourceId = (rawId) => {
  const value = String(rawId || '').trim();
  if (!value) return '';

  const match = value.match(/\/payments\/(\d+)/);
  if (match) return match[1];

  return value;
};

const findPendingPaymentForMercadoPago = async (connection, paymentData) => {
  const metadata = paymentData.metadata || {};
  const idCompra = Number(metadata.id_compra || metadata.idCompra || paymentData.external_reference);
  const idPago = Number(metadata.id_pago || metadata.idPago);
  const mercadoPagoId = String(paymentData.id || '');

  const params = [];
  const conditions = [];

  if (Number.isInteger(idPago) && idPago > 0) {
    conditions.push('p.id_pago = ?');
    params.push(idPago);
  }

  if (Number.isInteger(idCompra) && idCompra > 0) {
    conditions.push('p.id_compra = ?');
    params.push(idCompra);
  }

  if (mercadoPagoId) {
    conditions.push('p.referencia = ?');
    params.push(mercadoPagoId);
  }

  if (!conditions.length) {
    throw new Error('Pago de Mercado Pago sin metadata/external_reference usable');
  }

  const [rows] = await connection.query(
    `SELECT
       p.id_pago,
       p.id_compra,
       p.monto,
       p.estado AS pago_estado,
       p.referencia,
       c.estado AS compra_estado,
       c.id_usuario
     FROM pagos p
     INNER JOIN compras c ON c.id_compra = p.id_compra
     WHERE (${conditions.join(' OR ')})
       AND p.metodo = 'mercado_pago'
     LIMIT 1
     FOR UPDATE`,
    params
  );

  return rows[0] || null;
};

const validatePaymentOwnership = (paymentData, pago) => {
  const metadata = paymentData.metadata || {};
  const metadataUserId = Number(metadata.id_usuario || metadata.idUsuario);

  if (Number.isInteger(metadataUserId) && metadataUserId > 0 && metadataUserId !== Number(pago.id_usuario)) {
    throw new Error(`Metadata de usuario no coincide. payment=${paymentData.id}, id_pago=${pago.id_pago}`);
  }

  if (paymentData.transaction_amount == null) return;

  const expectedAmount = money(pago.monto);
  const paidAmount = money(paymentData.transaction_amount);
  if (paidAmount !== expectedAmount) {
    throw new Error(`Monto Mercado Pago no coincide. payment=${paidAmount}, db=${expectedAmount}, id_pago=${pago.id_pago}`);
  }
};

const markMercadoPagoApproved = async (connection, paymentData, pago) => {
  if (pago.pago_estado === 'aprobado' && pago.compra_estado === 'pagado') {
    console.info('[mp.webhook.idempotent_skip]', {
      payment_id: paymentData.id,
      id_compra: pago.id_compra,
      id_pago: pago.id_pago,
    });
    return { updated: false, reason: 'already_approved' };
  }

  if (pago.pago_estado === 'cancelado' || pago.compra_estado === 'cancelado') {
    throw new Error(`No se puede aprobar una compra cancelada. id_compra=${pago.id_compra}, id_pago=${pago.id_pago}`);
  }

  await connection.query(
    `UPDATE pagos
     SET estado = 'aprobado',
         referencia = ?,
         fecha_pago = NOW()
     WHERE id_pago = ?
       AND estado <> 'aprobado'`,
    [String(paymentData.id), pago.id_pago]
  );

  await connection.query(
    `UPDATE compras
     SET estado = 'pagado'
     WHERE id_compra = ?
       AND estado <> 'pagado'`,
    [pago.id_compra]
  );

  console.info('[mp.webhook.payment_approved]', {
    payment_id: paymentData.id,
    id_compra: pago.id_compra,
    id_pago: pago.id_pago,
  });

  return {
    updated: true,
    id_compra: pago.id_compra,
    id_pago: pago.id_pago,
  };
};

const markMercadoPagoRejected = async (connection, paymentData, pago) => {
  if (pago.pago_estado === 'aprobado' || pago.compra_estado === 'pagado') {
    console.info('[mp.webhook.rejected_already_paid_skip]', {
      payment_id: paymentData.id,
      id_compra: pago.id_compra,
      id_pago: pago.id_pago,
    });
    return { updated: false, reason: 'already_approved' };
  }

  await connection.query(
    `UPDATE pagos
     SET estado = 'cancelado',
         referencia = ?
     WHERE id_pago = ?
       AND estado = 'pendiente'`,
    [String(paymentData.id), pago.id_pago]
  );

  await connection.query(
    `UPDATE compras
     SET estado = 'cancelado'
     WHERE id_compra = ?
       AND estado = 'pendiente'`,
    [pago.id_compra]
  );

  console.info('[mp.webhook.payment_rejected]', {
    payment_id: paymentData.id,
    status: paymentData.status,
    id_compra: pago.id_compra,
    id_pago: pago.id_pago,
  });

  return {
    updated: true,
    id_compra: pago.id_compra,
    id_pago: pago.id_pago,
  };
};

export const processMercadoPagoPayment = async (paymentId) => {
  assertMercadoPagoConfig();

  const normalizedPaymentId = normalizePaymentResourceId(paymentId);
  if (!normalizedPaymentId) {
    throw httpError('payment_id requerido', 400);
  }

  const paymentClient = new Payment(getMercadoPagoClient());
  const paymentData = await paymentClient.get({ id: normalizedPaymentId });

  if (!paymentData?.id) {
    throw new Error('Mercado Pago no devolvio un pago valido');
  }

  const connection = await poolPromise.getConnection();

  try {
    await connection.beginTransaction();

    const pago = await findPendingPaymentForMercadoPago(connection, paymentData);
    if (!pago) {
      console.warn('[mp.webhook.payment_not_found]', {
        payment_id: paymentData.id,
        external_reference: paymentData.external_reference,
        metadata: paymentData.metadata,
      });
      await connection.commit();
      return { updated: false, reason: 'payment_not_found' };
    }

    validatePaymentOwnership(paymentData, pago);

    let result;
    if (paymentData.status === 'approved') {
      result = await markMercadoPagoApproved(connection, paymentData, pago);
    } else if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(paymentData.status)) {
      result = await markMercadoPagoRejected(connection, paymentData, pago);
    } else {
      result = { updated: false, reason: 'pending_or_in_process', status: paymentData.status };
      console.info('[mp.webhook.payment_pending]', {
        payment_id: paymentData.id,
        status: paymentData.status,
        id_compra: pago.id_compra,
        id_pago: pago.id_pago,
      });
    }

    await connection.commit();
    return {
      payment_id: paymentData.id,
      status: paymentData.status,
      result,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
