"use client";

import { useState } from "react";
import SkeletonBlock from "@/components/SkeletonBlock";
import type { RewriteSuggestion } from "@/lib/types";

interface ResumeRewriterProps {
  suggestions: RewriteSuggestion[] | null;
  loading: boolean;
}

export default function ResumeRewriter({ suggestions, loading }: ResumeRewriterProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!loading && !suggestions) return null;

  if (loading) {
    return (
      <div className="card result-card">
        <div>
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="mt-3 h-7 w-52" />
        </div>
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="grid gap-3">
            <SkeletonBlock className="h-4 w-40" />
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-24 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) return null;

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    window.setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="card result-card">
      <div>
        <div className="eyebrow">phase 3</div>
        <h2 style={{ fontSize: "1.35rem" }}>Bullet rewrites</h2>
        <p className="result-muted" style={{ marginTop: "var(--space-3)" }}>
          Your experience, reframed for the role instead of left to interpretation.
        </p>
      </div>

      {suggestions.map((suggestion, index) => (
        <div key={`${suggestion.originalRole}-${index}`} className="result-block">
          <h3 style={{ fontSize: "1rem" }}>{suggestion.originalRole}</h3>
          <div className="subcard" style={{ padding: "var(--space-4)" }}>
            <div className="field-label">
              <span>Original</span>
            </div>
            <p className="result-muted" style={{ marginTop: "var(--space-3)" }}>{suggestion.originalBullet}</p>
          </div>
          <div className="accent-panel" style={{ padding: "var(--space-4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
              <div className="field-label">
                <span>Rewritten</span>
              </div>
              <button type="button" onClick={() => void handleCopy(suggestion.rewrittenBullet, index)} className="btn-ghost btn-inline copy-button">
                {copiedIndex === index ? "Copied" : "Copy"}
              </button>
            </div>
            <p style={{ marginTop: "var(--space-3)" }}>{suggestion.rewrittenBullet}</p>
          </div>
          <p className="result-muted">{suggestion.rationale}</p>
        </div>
      ))}
    </div>
  );
}
