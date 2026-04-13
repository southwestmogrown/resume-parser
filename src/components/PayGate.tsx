"use client";

import Spinner from "@/components/Spinner";
import type { ResumeData } from "@/lib/types";

type PaymentState = "idle" | "pending" | "paid" | "canceled";

interface PayGateProps {
  resumeData: ResumeData;
  score: number;
  paymentState: PaymentState;
  onPay: () => void;
}

export default function PayGate({ resumeData, score, paymentState, onPay }: PayGateProps) {
  return (
    <div className="card card-accent result-card paygate-card">
      <div>
        <div className="eyebrow" style={{ color: "var(--ps-accent)" }}>
          your score
        </div>
        <h2 className="display" style={{ fontSize: "1.9rem" }}>
          {score}% match — unlock the full analysis
        </h2>
      </div>

      <div className="subcard" style={{ padding: "var(--space-4)" }}>
        <p>{resumeData.name || "Unknown candidate"}</p>
        <p className="result-muted" style={{ marginTop: "var(--space-2)" }}>
          {resumeData.skills.length} skills · {resumeData.experience.length} roles · {resumeData.education.length} education
        </p>
      </div>

      <ul className="feature-list">
        <li>Bullet rewrites — reframed against the JD</li>
        <li>Study plan for each gap with resources</li>
        <li>Cover letter draft, ready to customize</li>
        <li>STAR interview coaching — all questions, unlimited turns</li>
      </ul>
      <p className="fine-print" style={{ marginTop: 'var(--space-1)' }}>
        Access expires 24 hours after payment. All features available the full window — no per-question limits.
      </p>

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
