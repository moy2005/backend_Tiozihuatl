import {
  createPreferenceForPurchase,
  extractMercadoPagoPaymentId,
  processMercadoPagoPayment,
} from '../services/payments.service.js';

export const createPaymentPreference = async (req, res) => {
  try {
    const idUsuario = req.user?.id_usuario;

    if (!idUsuario) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const preference = await createPreferenceForPurchase({
      idUsuario,
      body: req.body,
    });

    return res.json(preference);
  } catch (error) {
    const statusCode = error.statusCode || error.status || 500;

    console.error('[mp.preference.error]', {
      message: error.message,
      statusCode,
      cause: error.cause,
    });

    return res.status(statusCode).json({
      error: statusCode === 500 ? 'Error creando preferencia de pago' : error.message,
    });
  }
};

export const mercadoPagoWebhook = async (req, res) => {
  try {
    const paymentId = extractMercadoPagoPaymentId(req);

    if (!paymentId) {
      console.info('[mp.webhook.ignored]', {
        query: req.query,
        body: req.body,
      });
      return res.status(200).json({ received: true, ignored: true });
    }

    const result = await processMercadoPagoPayment(paymentId);

    console.info('[mp.webhook.ok]', result);
    return res.status(200).json({ received: true, result });
  } catch (error) {
    console.error('[mp.webhook.error]', {
      message: error.message,
      query: req.query,
      body: req.body,
    });

    return res.status(500).json({ error: 'Error procesando webhook de Mercado Pago' });
  }
};
