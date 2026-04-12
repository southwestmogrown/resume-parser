"use client";

import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CheckoutModalProps {
  clientSecret: string;
  onClose: () => void;
}

export default function CheckoutModal({ clientSecret, onClose }: CheckoutModalProps) {
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
          <span className="eyebrow" style={{ marginBottom: 0 }}>secure checkout</span>
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
          <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </div>
  );
}
