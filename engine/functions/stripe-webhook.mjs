/**
 * POST /api/stripe/webhook — Stripe event "checkout.session.completed".
 * Signature checked with STRIPE_WEBHOOK_SECRET, then: CRM order + customer,
 * supplier order at CJ, push notification to the owner.
 */
import { verifySignature } from '../lib/stripe.mjs';
import { processPaidSession } from '../lib/orders.mjs';
import { crm } from '../lib/store.mjs';
import { onDispute, onRefunded } from '../lib/aftersale.mjs';

export default async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET))
    return new Response('bad signature', { status: 400 });
  const event = JSON.parse(raw);
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    await processPaidSession(crm(), event.data.object);
  } else if (event.type === 'charge.dispute.created') {
    await onDispute(crm(), event.data.object);
  } else if (event.type === 'charge.refunded') {
    await onRefunded(crm(), event.data.object);
  }
  return new Response(JSON.stringify({ received: true }), { headers: { 'content-type': 'application/json' } });
};

export const config = { path: '/api/stripe/webhook' };
