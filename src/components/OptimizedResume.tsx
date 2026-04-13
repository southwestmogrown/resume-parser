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
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', alignItems: 'center' }}>
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
      <div className="card result-card" style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-8)' }}>
        <div className="eyebrow" style={{ marginBottom: 'var(--space-3)' }}>phase 6</div>
        <h2 style={{ fontSize: '1.3rem', marginBottom: 'var(--space-3)' }}>Optimized Resume</h2>
        <p className="result-muted" style={{ maxWidth: 480, margin: '0 auto var(--space-5)' }}>
          Your STAR coaching sessions are complete. Generate a polished, ATS-ready resume that
          incorporates your best answers, optimized bullets, and matched skills — no extra charge.
        </p>
        <button type="button" className="btn-primary btn-inline" onClick={onGenerate}>
          Generate my optimized resume →
        </button>
      </div>
    );
  }

  // Not ready — STAR prep not done
  if (!content && !loading && !canGenerate) {
    return (
      <div className="card result-card" style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-8)' }}>
        <div className="eyebrow" style={{ marginBottom: 'var(--space-3)' }}>phase 6</div>
        <h2 style={{ fontSize: '1.3rem', marginBottom: 'var(--space-3)' }}>Optimized Resume</h2>
        <p className="result-muted" style={{ maxWidth: 440, margin: '0 auto' }}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow">phase 6</div>
          <h2 style={{ fontSize: '1.3rem' }}>Optimized Resume</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {loading && (
            <span
              className="eyebrow"
              style={{ color: 'var(--ps-accent)', animation: 'pulse 1.5s ease-in-out infinite' }}
            >
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

      <div className="cover-letter-panel" style={{ padding: 'var(--space-5, 1.25rem)', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.82rem', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
        {content}
      </div>

      {!loading && (
        <p className="result-muted">
          Use this as a base — swap in real contact details and tailor the summary for each application.
        </p>
      )}
    </div>
  );
}
