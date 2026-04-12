"use client";

import Spinner from "@/components/Spinner";
import type { ResumeData } from "@/lib/types";

type PaymentState = "idle" | "pending" | "paid" | "canceled";

interface PayGateProps {
  resumeData: ResumeData;
  paymentState: PaymentState;
  onPay: () => void;
}

export default function PayGate({ resumeData, paymentState, onPay }: PayGateProps) {
  return (
    <div className="card card-accent result-card">
      <div>
        <div className="eyebrow" style={{ color: "var(--ps-accent)" }}>
          phase 1 complete
        </div>
        <h2 className="display" style={{ fontSize: "1.9rem" }}>
          Ready to see where you stand?
        </h2>
      </div>

      <div className="subcard" style={{ padding: "var(--space-4)" }}>
        <p>{resumeData.name || "Unknown candidate"}</p>
        <p className="result-muted" style={{ marginTop: "var(--space-2)" }}>
          {resumeData.skills.length} skills · {resumeData.experience.length} roles · {resumeData.education.length} education
        </p>
      </div>

      <ul className="feature-list">
        <li>Match score vs. this JD</li>
        <li>Gap breakdown — 3 tiers</li>
        <li>Bullet rewrites</li>
        <li>Cover letter + study plan</li>
      </ul>

      {paymentState === "pending" ? (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <Spinner />
          <p>Verifying payment…</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          {paymentState === "canceled" ? <p style={{ color: "var(--ps-red)" }}>Payment canceled.</p> : null}
          <button type="button" onClick={onPay} className="btn-primary btn-large">
            Unlock Full Analysis — $5 →
          </button>
          <p className="fine-print">One-time. No subscription.</p>
        </div>
      )}
    </div>
  );
}
