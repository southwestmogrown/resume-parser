"use client";

import { useState } from "react";
import type { RewriteSuggestion } from "@/lib/types";

interface ResumeRewriterProps {
  suggestions: RewriteSuggestion[] | null;
  loading: boolean;
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-brand-border ${className ?? ""}`} />
  );
}

export default function ResumeRewriter({ suggestions, loading }: ResumeRewriterProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!loading && !suggestions) return null;

  if (loading) {
    return (
      <div className="flex flex-col gap-6 rounded-2xl border border-brand-border bg-brand-surface p-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) return null;

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-brand-border bg-brand-surface p-6">
      <div>
        <h2 className="text-lg font-semibold text-brand-text">✍️ Resume Rewrites</h2>
        <p className="text-xs text-brand-muted">Tailored bullet points that mirror the job description&apos;s language</p>
      </div>

      {suggestions.map((s, i) => (
        <div key={i} className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-brand-text">{s.originalRole}</h3>

          {/* Original */}
          <div className="rounded-lg border border-brand-border bg-brand-bg px-4 py-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-muted">Original</p>
            <p className="text-sm text-brand-muted">{s.originalBullet}</p>
          </div>

          {/* Rewritten */}
          <div className="rounded-lg border border-brand-accent/30 bg-brand-accent/5 px-4 py-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">Rewritten</p>
              <button
                onClick={() => handleCopy(s.rewrittenBullet, i)}
                className="text-xs text-brand-muted transition-colors hover:text-brand-text"
              >
                {copiedIndex === i ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="text-sm text-brand-text">{s.rewrittenBullet}</p>
          </div>

          {/* Rationale */}
          <p className="text-xs text-brand-muted italic">💡 {s.rationale}</p>
        </div>
      ))}
    </div>
  );
}
