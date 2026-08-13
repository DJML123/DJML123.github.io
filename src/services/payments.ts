import type { DonationMethod } from './types';

/**
 * Payment seam - the ONLY place that knows about real money.
 *
 * Every donation goes through `payDonation` first; the repository only ever
 * records the result. Currently a simulation (fixed latency, always
 * succeeds). To go live, replace the body with a Stripe PaymentIntent flow
 * against the backend (src/services/api.ts): create intent -> confirm with
 * the chosen method -> store the payment id in the donation record.
 */
export async function payDonation(amountCents: number, method: DonationMethod): Promise<{ ok: boolean; refId: string }> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  return { ok: true, refId: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
}
