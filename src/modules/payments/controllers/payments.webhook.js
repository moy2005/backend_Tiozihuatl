import Stripe from 'stripe';
import { processStripeWebhookEvent } from '../services/payments.service.js';

let stripeClient;

const getStripe = () => {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
};

export const stripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[stripe.webhook.config_error]', {
      message: 'STRIPE_SECRET_KEY o STRIPE_WEBHOOK_SECRET no configurado',
    });
    return res.sendStatus(500);
  }

  let event;

  try {
    if (!Buffer.isBuffer(req.body)) {
      console.error('[stripe.webhook.raw_body_error]', {
        message: 'El webhook no recibio un Buffer. Revisa que express.raw este antes de express.json.',
      });
      return res.status(400).send('Webhook Error: raw body requerido');
    }

    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.warn('[stripe.webhook.signature_error]', {
      message: error.message,
    });
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    const result = await processStripeWebhookEvent(event);

    console.info('[stripe.webhook.ok]', {
      event_id: event.id,
      event_type: event.type,
      result,
    });

    return res.sendStatus(200);
  } catch (error) {
    console.error('[stripe.webhook.processing_error]', {
      event_id: event.id,
      event_type: event.type,
      message: error.message,
    });

    return res.sendStatus(500);
  }
};
