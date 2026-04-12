"use client";

import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { type FormEvent, useState } from "react";
import Spinner from "@/components/Spinner";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const stripeAppearance = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#39d9b8",
    colorBackground: "#262d27",
    colorText: "#e8ede6",
    colorTextSecondary: "#8fa88e",
    colorDanger: "#e86b6b",
    fontFamily: "monospace",
    borderRadius: "4px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": {
      border: "1px solid rgba(180, 210, 185, 0.14)",
      backgroundColor: "#1f2520",
    },
    ".Input:focus": {
      border: "1px solid #39d9b8",
      boxShadow: "none",
    },
    ".Label": {
      color: "#8fa88e",
      fontSize: "11px",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
    },
    ".Tab": {
      border: "1px solid rgba(180, 210, 185, 0.1)",
      backgroundColor: "#1f2520",
    },
    ".Tab--selected": {
      borderColor: "#39d9b8",
      backgroundColor: "rgba(57, 217, 184, 0.08)",
    },
  },
};

interface PaymentFormProps {
  onSuccess: (token: string) => void;
  onClose: () => void;
}

function PaymentForm({ onSuccess, onClose }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {},
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message ?? "Payment failed. Please try again.");
      setLoading(false);
      return;
    }

    if (result.paymentIntent?.status === "succeeded") {
      try {
        const res = await fetch("/api/mint-from-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId: result.paymentIntent.id }),
        });
        if (!res.ok) throw new Error("Token setup failed");
        const { token } = await res.json();
        onSuccess(token as string);
      } catch {
        setError("Payment succeeded but activation failed. Contact support.");
        setLoading(false);
      }
      return;
    }

    setError("Unexpected payment status. Please try again.");
    setLoading(false);
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "grid", gap: "var(--space-6)" }}>
      {/* Skeleton shown until Stripe iframe is ready */}
      {!ready && (
        <div style={{ display: "grid", gap: "var(--space-4)" }}>
          <div className="skeleton" style={{ height: "46px", borderRadius: "var(--radius-md)" }} />
          <div className="skeleton" style={{ height: "46px", borderRadius: "var(--radius-md)" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
            <div className="skeleton" style={{ height: "46px", borderRadius: "var(--radius-md)" }} />
            <div className="skeleton" style={{ height: "46px", borderRadius: "var(--radius-md)" }} />
          </div>
        </div>
      )}

      <div style={{ display: ready ? "block" : "none" }}>
        <PaymentElement
          options={{ layout: "tabs" }}
          onReady={() => setReady(true)}
        />
      </div>

      {error && (
        <p style={{ color: "var(--ps-red)", fontSize: "13px" }}>{error}</p>
      )}

      <div style={{ display: "grid", gap: "var(--space-3)" }}>
        <button
          type="submit"
          disabled={!stripe || !elements || !ready || loading}
          className="btn-primary btn-large btn-full"
        >
          {loading && <Spinner />}
          {loading ? "Processing…" : "Pay $5 →"}
        </button>
        <button type="button" onClick={onClose} className="btn-ghost btn-full">
          Cancel
        </button>
        <p className="fine-print" style={{ textAlign: "center" }}>
          One-time · No subscription · Secured by Stripe
        </p>
      </div>
    </form>
  );
}

interface CheckoutModalProps {
  clientSecret: string;
  onSuccess: (token: string) => void;
  onClose: () => void;
}

export default function CheckoutModal({ clientSecret, onSuccess, onClose }: CheckoutModalProps) {
  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Checkout"
    >
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "grid", gap: "var(--space-1)" }}>
            <span className="eyebrow" style={{ marginBottom: 0 }}>unlock full analysis</span>
            <p style={{ fontSize: "13px", color: "var(--ps-text-secondary)" }}>
              Bullet rewrites · Study plan · Cover letter
            </p>
          </div>
          <button
            type="button"
            className="modal-close btn-ghost btn-inline"
            onClick={onClose}
            aria-label="Close checkout"
          >
            ✕
          </button>
        </div>
        <div className="modal-body">
          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: stripeAppearance }}
          >
            <PaymentForm onSuccess={onSuccess} onClose={onClose} />
          </Elements>
        </div>
      </div>
    </div>
  );
}
