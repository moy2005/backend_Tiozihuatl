import Stripe from 'stripe';
import { poolPromise } from '../../../config/db.config.js';

let stripeClient;
let webhookEventsTableReady = false;

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

const toCents = (amount) => Math.round(Number(amount) * 100);

const httpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const ensureStripeWebhookEventsTable = async () => {
  if (webhookEventsTableReady) return;

  await poolPromise.query(`
    CREATE TABLE IF NOT EXISTS stripe_webhook_events (
      event_id VARCHAR(255) NOT NULL PRIMARY KEY,
      event_type VARCHAR(120) NOT NULL,
      object_id VARCHAR(255) NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'processed',
      processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  webhookEventsTableReady = true;
};

const registerStripeWebhookEvent = async (connection, event) => {
  const objectId = event?.data?.object?.id || null;

  const [result] = await connection.query(
    `INSERT IGNORE INTO stripe_webhook_events
     (event_id, event_type, object_id, status)
     VALUES (?, ?, ?, 'processed')`,
    [event.id, event.type, objectId]
  );

  return result.affectedRows === 1;
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

const assertStripeConfig = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw httpError('STRIPE_SECRET_KEY no configurado', 500);
  }

  if (!process.env.FRONT_URL) {
    throw httpError('FRONT_URL no configurado', 500);
  }
};

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw httpError('STRIPE_SECRET_KEY no configurado', 500);
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
};

const fetchMagazinesForCheckout = async (connection, revistaIds) => {
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
      throw httpError(`La revista ${magazine.id_revista} no tiene un precio final valido para Stripe`, 409);
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

const createPendingPurchase = async (connection, idUsuario, magazines) => {
  const total = magazines.reduce((sum, magazine) => sum + Number(magazine.precio_final), 0);

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
        magazine.precio,
        magazine.descuento_aplicado,
        magazine.precio_final,
      ]
    );
  }

  const [pagoResult] = await connection.query(
    `INSERT INTO pagos (id_compra, metodo, monto, estado)
     VALUES (?, 'stripe', ?, 'pendiente')`,
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
    console.error('[stripe.checkout.cleanup_failed]', {
      id_compra: idCompra,
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

const buildLineItems = (magazines) => magazines.map((magazine) => ({
  price_data: {
    currency: 'mxn',
    product_data: {
      name: magazine.titulo || `Revista ${magazine.id_revista}`,
    },
    unit_amount: toCents(magazine.precio_final),
  },
  quantity: 1,
}));

export const createCheckoutForPurchase = async ({ idUsuario, body }) => {
  assertStripeConfig();
  const stripe = getStripe();

  const revistaIds = normalizeItems(body);

  if (revistaIds.length === 0) {
    throw httpError('id_revista requerido');
  }

  let pendingPurchase = null;
  let stripeSessionCreated = false;

  const connection = await poolPromise.getConnection();

  try {
    await connection.beginTransaction();

    const checkoutUser = await fetchCheckoutUser(connection, idUsuario);
    const magazines = await fetchMagazinesForCheckout(connection, revistaIds);
    validateMagazinesCanBePurchased(magazines);
    await assertNotAlreadyPurchased(connection, idUsuario, revistaIds);

    pendingPurchase = await createPendingPurchase(connection, idUsuario, magazines);

    await connection.commit();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: buildLineItems(magazines),
      client_reference_id: String(pendingPurchase.idCompra),
      metadata: {
        id_usuario: String(idUsuario),
        id_compra: String(pendingPurchase.idCompra),
        id_pago: String(pendingPurchase.idPago),
        id_revistas: revistaIds.join(','),
      },
      customer_email: checkoutUser.correo || undefined,
      success_url: `${process.env.FRONT_URL}/magazines?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONT_URL}/magazines?cancel=true`,
    }, {
      idempotencyKey: `checkout-compra-${pendingPurchase.idCompra}`,
    });
    stripeSessionCreated = true;

    await poolPromise.query(
      `UPDATE pagos
       SET referencia = ?
       WHERE id_pago = ?
         AND estado = 'pendiente'`,
      [session.id, pendingPurchase.idPago]
    );

    console.info('[stripe.checkout.created]', {
      session_id: session.id,
      id_compra: pendingPurchase.idCompra,
      id_pago: pendingPurchase.idPago,
      amount_total: session.amount_total,
    });

    return {
      url: session.url,
      sessionId: session.id,
      id_compra: pendingPurchase.idCompra,
    };
  } catch (error) {
    await connection.rollback().catch(() => {});

    if (pendingPurchase?.idCompra && !stripeSessionCreated) {
      await cleanupPendingPurchase(pendingPurchase.idCompra);
    }

    throw error;
  } finally {
    connection.release();
  }
};

const findPaymentForCheckoutSession = async (connection, session) => {
  const metadataPagoId = Number(session.metadata?.id_pago);
  const metadataCompraId = Number(session.metadata?.id_compra);

  const params = [session.id];
  let metadataCondition = '';

  if (Number.isInteger(metadataPagoId) && metadataPagoId > 0) {
    metadataCondition = ' OR p.id_pago = ?';
    params.push(metadataPagoId);
  } else if (Number.isInteger(metadataCompraId) && metadataCompraId > 0) {
    metadataCondition = ' OR p.id_compra = ?';
    params.push(metadataCompraId);
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
     WHERE (p.referencia = ?${metadataCondition})
       AND p.metodo = 'stripe'
     LIMIT 1
     FOR UPDATE`,
    params
  );

  return rows[0] || null;
};

const markCheckoutSessionPaidInTransaction = async (connection, session) => {
  if (!session?.id) {
    throw new Error('Checkout Session sin id');
  }

  if (session.mode && session.mode !== 'payment') {
    throw new Error(`Checkout Session no es de pago. session=${session.id}, mode=${session.mode}`);
  }

  if (session.payment_status && session.payment_status !== 'paid') {
    console.info('[stripe.webhook.checkout_not_paid]', {
      session_id: session.id,
      payment_status: session.payment_status,
    });
    return { updated: false, reason: 'not_paid' };
  }

  if (session.currency && String(session.currency).toLowerCase() !== 'mxn') {
    throw new Error(`Moneda Stripe invalida. session=${session.id}, currency=${session.currency}`);
  }

  const pago = await findPaymentForCheckoutSession(connection, session);

  if (!pago) {
    console.warn('[stripe.webhook.payment_not_found]', {
      session_id: session.id,
      metadata: session.metadata,
    });
    return { updated: false, reason: 'payment_not_found' };
  }

  const expectedAmount = toCents(pago.monto);
  if (Number(session.amount_total) !== expectedAmount) {
    throw new Error(
      `Monto Stripe no coincide. session=${session.amount_total}, db=${expectedAmount}, id_pago=${pago.id_pago}`
    );
  }

  if (pago.pago_estado === 'aprobado' && pago.compra_estado === 'pagado') {
    console.info('[stripe.webhook.idempotent_skip]', {
      session_id: session.id,
      id_compra: pago.id_compra,
      id_pago: pago.id_pago,
    });
    return { updated: false, reason: 'already_paid' };
  }

  if (pago.pago_estado === 'cancelado' || pago.compra_estado === 'cancelado') {
    throw new Error(
      `No se puede aprobar una compra cancelada. id_compra=${pago.id_compra}, id_pago=${pago.id_pago}`
    );
  }

  await connection.query(
    `UPDATE pagos
     SET estado = 'aprobado',
         referencia = COALESCE(referencia, ?)
     WHERE id_pago = ?
       AND estado <> 'aprobado'`,
    [session.id, pago.id_pago]
  );

  await connection.query(
    `UPDATE compras
     SET estado = 'pagado'
     WHERE id_compra = ?
       AND estado <> 'pagado'`,
    [pago.id_compra]
  );

  console.info('[stripe.webhook.payment_approved]', {
    session_id: session.id,
    id_compra: pago.id_compra,
    id_pago: pago.id_pago,
  });

  return {
    updated: true,
    id_compra: pago.id_compra,
    id_pago: pago.id_pago,
  };
};

const markCheckoutSessionExpiredInTransaction = async (connection, session) => {
  if (!session?.id) {
    throw new Error('Checkout Session sin id');
  }

  const pago = await findPaymentForCheckoutSession(connection, session);

  if (!pago) {
    console.warn('[stripe.webhook.expired_payment_not_found]', {
      session_id: session.id,
      metadata: session.metadata,
    });
    return { updated: false, reason: 'payment_not_found' };
  }

  if (pago.pago_estado === 'aprobado' || pago.compra_estado === 'pagado') {
    console.info('[stripe.webhook.expired_already_paid_skip]', {
      session_id: session.id,
      id_compra: pago.id_compra,
      id_pago: pago.id_pago,
    });
    return { updated: false, reason: 'already_paid' };
  }

  await connection.query(
    `UPDATE pagos
     SET estado = 'cancelado',
         referencia = COALESCE(referencia, ?)
     WHERE id_pago = ?
       AND estado = 'pendiente'`,
    [session.id, pago.id_pago]
  );

  await connection.query(
    `UPDATE compras
     SET estado = 'cancelado'
     WHERE id_compra = ?
       AND estado = 'pendiente'`,
    [pago.id_compra]
  );

  console.info('[stripe.webhook.checkout_expired]', {
    session_id: session.id,
    id_compra: pago.id_compra,
    id_pago: pago.id_pago,
  });

  return {
    updated: true,
    id_compra: pago.id_compra,
    id_pago: pago.id_pago,
  };
};

export const markCheckoutSessionPaid = async (session) => {
  const connection = await poolPromise.getConnection();

  try {
    await connection.beginTransaction();
    const result = await markCheckoutSessionPaidInTransaction(connection, session);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const fetchCheckoutStatusRow = async ({ idUsuario, sessionId, idCompra }) => {
  const params = [idUsuario];
  let condition = '';

  if (sessionId) {
    condition = 'p.referencia = ?';
    params.push(sessionId);
  }

  if (idCompra) {
    condition = condition
      ? `(${condition} OR c.id_compra = ?)`
      : 'c.id_compra = ?';
    params.push(idCompra);
  }

  if (!condition) return null;

  const [rows] = await poolPromise.query(
    `SELECT
       c.id_compra,
       c.estado AS compra_estado,
       c.total,
       p.id_pago,
       p.estado AS pago_estado,
       p.referencia,
       GROUP_CONCAT(dc.id_revista ORDER BY dc.id_revista SEPARATOR ',') AS id_revistas
     FROM compras c
     INNER JOIN pagos p ON p.id_compra = c.id_compra
     INNER JOIN detalle_compra dc ON dc.id_compra = c.id_compra
     WHERE c.id_usuario = ?
       AND p.metodo = 'stripe'
       AND ${condition}
     GROUP BY
       c.id_compra,
       c.estado,
       c.total,
       p.id_pago,
       p.estado,
       p.referencia
     LIMIT 1`,
    params
  );

  return rows[0] || null;
};

const mapCheckoutStatus = (row, stripeSession = null) => ({
  id_compra: row?.id_compra || null,
  id_pago: row?.id_pago || null,
  compra_estado: row?.compra_estado || 'pendiente',
  pago_estado: row?.pago_estado || 'pendiente',
  referencia: row?.referencia || stripeSession?.id || null,
  stripe_payment_status: stripeSession?.payment_status || null,
  total: row?.total || null,
  id_revistas: row?.id_revistas
    ? String(row.id_revistas).split(',').map((id) => Number(id))
    : [],
  paid: row?.compra_estado === 'pagado' && row?.pago_estado === 'aprobado',
});

export const getCheckoutSessionStatusForUser = async ({ idUsuario, sessionId }) => {
  if (!idUsuario) throw httpError('Usuario no autenticado', 401);
  if (!sessionId || !String(sessionId).startsWith('cs_')) {
    throw httpError('Sesion de Stripe invalida', 400);
  }

  let row = await fetchCheckoutStatusRow({ idUsuario, sessionId });
  let stripeSession = null;

  if (!row || row.compra_estado !== 'pagado' || row.pago_estado !== 'aprobado') {
    stripeSession = await getStripe().checkout.sessions.retrieve(sessionId);

    const metadataUserId = Number(stripeSession.metadata?.id_usuario);
    if (metadataUserId !== Number(idUsuario)) {
      throw httpError('La sesion no pertenece al usuario autenticado', 403);
    }

    if (stripeSession.payment_status === 'paid') {
      await markCheckoutSessionPaid(stripeSession);
    }

    const metadataCompraId = Number(stripeSession.metadata?.id_compra);
    row = await fetchCheckoutStatusRow({
      idUsuario,
      sessionId,
      idCompra: Number.isInteger(metadataCompraId) ? metadataCompraId : null,
    });
  }

  if (!row) {
    throw httpError('No se encontro la compra asociada a la sesion', 404);
  }

  return mapCheckoutStatus(row, stripeSession);
};

export const processStripeWebhookEvent = async (event) => {
  if (!event?.id || !event?.type) {
    throw new Error('Evento Stripe invalido');
  }

  await ensureStripeWebhookEventsTable();

  const connection = await poolPromise.getConnection();

  try {
    await connection.beginTransaction();

    const isNewEvent = await registerStripeWebhookEvent(connection, event);

    if (!isNewEvent) {
      await connection.commit();
      console.info('[stripe.webhook.duplicate_event_skip]', {
        event_id: event.id,
        event_type: event.type,
      });
      return { processed: false, reason: 'duplicate_event' };
    }

    let result;

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        result = await markCheckoutSessionPaidInTransaction(connection, event.data.object);
        break;

      case 'checkout.session.expired':
        result = await markCheckoutSessionExpiredInTransaction(connection, event.data.object);
        break;

      default:
        result = { updated: false, reason: 'ignored_event' };
        console.info('[stripe.webhook.ignored]', {
          event_id: event.id,
          event_type: event.type,
        });
        break;
    }

    await connection.commit();

    return {
      processed: true,
      event_id: event.id,
      event_type: event.type,
      result,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
