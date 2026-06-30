import {
  createCheckoutForPurchase,
  getCheckoutSessionStatusForUser,
} from '../services/payments.service.js';

export const createCheckoutSession = async (req, res) => {
  try {
    const idUsuario = req.user?.id_usuario;

    if (!idUsuario) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const checkout = await createCheckoutForPurchase({
      idUsuario,
      body: req.body,
    });

    return res.json(checkout);
  } catch (error) {
    const statusCode = error.statusCode || 500;

    console.error('[stripe.checkout.error]', {
      message: error.message,
      statusCode,
    });

    return res.status(statusCode).json({
      error: statusCode === 500 ? 'Error creando sesion de pago' : error.message,
    });
  }
};

export const getCheckoutSessionStatus = async (req, res) => {
  try {
    const idUsuario = req.user?.id_usuario;
    const { sessionId } = req.params;

    const status = await getCheckoutSessionStatusForUser({
      idUsuario,
      sessionId,
    });

    return res.json(status);
  } catch (error) {
    const statusCode = error.statusCode || 500;

    console.error('[stripe.checkout.status_error]', {
      message: error.message,
      statusCode,
    });

    return res.status(statusCode).json({
      error: statusCode === 500 ? 'Error consultando estado de pago' : error.message,
    });
  }
};
