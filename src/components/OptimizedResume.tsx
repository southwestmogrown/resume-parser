'use client';

import { useState } from 'react';
import SkeletonBlock from '@/components/SkeletonBlock';

interface OptimizedResumeProps {
  content: string | null;
  loading: boolean;
  onGenerate: () => void;
  canGenerate: boolean;
}

export default function OptimizedResume({
  content,
  loading,
  onGenerate,
  canGenerate,
}: OptimizedResumeProps) {
  const [copied, setCopied] = useState(false);

  // Skeleton only when loading with no content yet (pre-stream)
  if (loading && !content) {
    return (
      <div className="card result-card">
        <div className="optimized-resume__header">
          <div>
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="mt-3 h-7 w-40" />
          </div>
          <SkeletonBlock className="h-9 w-20" />
        </div>
        <SkeletonBlock className="h-64 w-full" />
      </div>
    );
  }

  // CTA when not yet generated and STAR prep is complete
  if (!content && !loading && canGenerate) {
    return (
      <div className="card result-card optimized-resume__cta">
        <div className="eyebrow optimized-resume__cta-eyebrow">phase 6</div>
        <h2 className="optimized-resume__cta-title">Optimized Resume</h2>
        <p className="result-muted optimized-resume__cta-desc">
          Your STAR coaching sessions are complete. Generate a polished, ATS-ready resume that
          incorporates your best answers, optimized bullets, and matched skills — no extra charge.
        </p>
        <button type="button" className="btn-primary btn-inline" onClick={onGenerate} data-testid="generate-resume-button">
          Generate my optimized resume →
        </button>
      </div>
    );
  }

  // Not ready — STAR prep not done
  if (!content && !loading && !canGenerate) {
    return (
      <div className="card result-card optimized-resume__cta">
        <div className="eyebrow optimized-resume__cta-eyebrow">phase 6</div>
        <h2 className="optimized-resume__cta-title">Optimized Resume</h2>
        <p className="result-muted optimized-resume__cta-subdesc">
          Complete at least one STAR coaching session to unlock your optimized resume. The coach
          surfaces the real outcomes and impact metrics that make this document shine.
        </p>
      </div>
    );
  }

  if (!content) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'optimized-resume.txt';
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="card result-card">
      <div className="optimized-resume__header">
        <div>
          <div className="eyebrow">phase 6</div>
          <h2 className="optimized-resume__title">Optimized Resume</h2>
        </div>
        <div className="optimized-resume__actions">
          {loading && (
            <span className="eyebrow optimized-resume__generating">
              generating…
            </span>
          )}
          {!loading && (
            <button
              type="button"
              onClick={handleDownload}
              className="btn-ghost btn-inline"
            >
              Download ↓
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleCopy()}
            disabled={loading}
            className="btn-ghost btn-inline copy-button"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="cover-letter-panel optimized-resume__content">
        {content}
      </div>

      {!loading && (
        <p className="result-muted">
          Use this as a base — swap in real contact details and tailor the summary for each application.
          Downloads as <code>.txt</code>; paste into Word or Google Docs to save as PDF.
        </p>
      )}
    </div>
  );
}
