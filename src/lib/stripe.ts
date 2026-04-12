import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2026-03-25.dahlia',
    });
  }

  return stripeClient;
}
