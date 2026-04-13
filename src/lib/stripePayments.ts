import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

export const RESUME_ANALYSIS_PRODUCT = "resume_analysis";

export interface ResumeAnalysisPrice {
  priceId: string;
  amount: number;
  currency: string;
}

export async function getResumeAnalysisPrice(): Promise<ResumeAnalysisPrice> {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    throw new Error("STRIPE_PRICE_ID environment variable is not set");
  }

  const price = await getStripe().prices.retrieve(priceId);
  if (!price.unit_amount || !price.currency) {
    throw new Error("Configured Stripe price is missing amount or currency");
  }

  return {
    priceId,
    amount: price.unit_amount,
    currency: price.currency.toLowerCase(),
  };
}

export function isExpectedResumeAnalysisPayment(details: {
  amount: number | null | undefined;
  currency: string | null | undefined;
  metadata?: Stripe.Metadata | null;
}, expected: ResumeAnalysisPrice): boolean {
  return (
    details.amount === expected.amount &&
    details.currency?.toLowerCase() === expected.currency &&
    details.metadata?.product === RESUME_ANALYSIS_PRODUCT &&
    (!details.metadata?.price_id || details.metadata.price_id === expected.priceId)
  );
}
