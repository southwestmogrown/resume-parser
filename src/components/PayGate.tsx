'use client';

import Spinner from './Spinner';
import type { ResumeData } from '@/lib/types';

type PaymentState = 'idle' | 'pending' | 'paid' | 'canceled';

interface PayGateProps {
  resumeData: ResumeData;
  paymentState: PaymentState;
  onPay: () => void;
  onCancel: () => void;
}

export default function PayGate({ resumeData, paymentState, onPay, onCancel }: PayGateProps) {
  return (
    <div className="mt-6 rounded-2xl border border-brand-border bg-brand-surface p-8 text-center">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-brand-text">Unlock Full Analysis</h2>
        <p className="mt-2 text-sm text-brand-muted">
          Your resume is ready. Get gap analysis, bullet rewrites, a study plan, and a cover letter.
        </p>
      </div>

      {/* Resume preview */}
      <div className="mx-auto mb-6 max-w-sm rounded-xl border border-brand-border bg-brand-bg p-4 text-left">
        <p className="font-medium text-brand-text">{resumeData.name || 'Unknown'}</p>
        <p className="mt-1 text-xs text-brand-muted">
          {resumeData.skills.length} skills · {resumeData.experience.length} experience entries
        </p>
        {resumeData.summary && (
          <p className="mt-2 text-xs text-brand-muted line-clamp-2">{resumeData.summary}</p>
        )}
      </div>

      {/* Value prop */}
      <div className="mb-6 flex flex-col gap-2 text-sm text-brand-muted">
        <p>Full gap analysis with severity tiers</p>
        <p>Tailored bullet rewrites for your experience</p>
        <p>Actionable study plan with resources</p>
        <p>Custom cover letter draft</p>
      </div>

      {/* Price */}
      <p className="mb-6 text-lg font-bold text-brand-text">$5 one-time — no subscription</p>

      {/* Actions */}
      {paymentState === 'pending' ? (
        <div className="flex flex-col items-center gap-2">
          <Spinner />
          <p className="text-sm text-brand-muted">Verifying payment…</p>
        </div>
      ) : paymentState === 'canceled' ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-brand-red">Payment canceled.</p>
          <button
            onClick={onPay}
            className="flex items-center gap-2 rounded-xl bg-brand-accent px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-accent-hover"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onPay}
            className="flex items-center gap-2 rounded-xl bg-brand-accent px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-accent-hover"
          >
            Unlock Full Analysis →
          </button>
          <button
            onClick={onCancel}
            className="text-xs text-brand-muted underline hover:text-brand-text"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
