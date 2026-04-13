"use client";

import { useState } from "react";
import SkeletonBlock from "@/components/SkeletonBlock";

interface CoverLetterProps {
  content: string | null;
  loading: boolean;
  blockedSkills?: string[] | null;
}

export default function CoverLetter({ content, loading, blockedSkills }: CoverLetterProps) {
  const [copied, setCopied] = useState(false);

  if (!loading && !content && !blockedSkills?.length) return null;

  if (!loading && !content && blockedSkills?.length) {
    return (
      <div className="card result-card">
        <div className="eyebrow">phase 4</div>
        <h2 style={{ fontSize: "1.3rem" }}>Cover letter — not generated</h2>
        <p className="result-muted">
          This role has dealbreaker gaps. Writing a cover letter that manufactures enthusiasm for a role you won&apos;t
          pass the bar on isn&apos;t helpful — so we didn&apos;t.
        </p>
        {blockedSkills.length > 0 && (
          <div>
            <p className="subtle-note" style={{ marginBottom: "var(--space-2)" }}>Dealbreakers:</p>
            <ul style={{ paddingLeft: "var(--space-5)", display: "grid", gap: "var(--space-1)" }}>
              {blockedSkills.map((s) => (
                <li key={s} className="result-muted" style={{ color: "var(--ps-red)" }}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="result-muted">
          Focus on roles where your profile matches more cleanly — or close these gaps first.
        </p>
      </div>
    );
  }

  // Skeleton only when loading with no content yet (pre-stream)
  if (loading && !content) {
    return (
      <div className="card result-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", alignItems: "center" }}>
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

  if (!content) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const renderText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} style={{ color: "var(--ps-text-primary)" }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="card result-card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div className="eyebrow">phase 4</div>
          <h2 style={{ fontSize: "1.3rem" }}>Cover letter draft</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          {loading && (
            <span className="eyebrow" style={{ color: "var(--ps-accent)", animation: "pulse 1.5s ease-in-out infinite" }}>
              writing…
            </span>
          )}
          <button
            type="button"
            onClick={() => void handleCopy()}
            disabled={loading}
            className="btn-ghost btn-inline copy-button"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className="cover-letter-panel" style={{ padding: "var(--space-5, 1.25rem)" }}>
        {content.split("\n\n").map((paragraph, index) => (
          <p key={index} className="result-muted" style={{ marginTop: index === 0 ? 0 : "var(--space-4)" }}>
            {renderText(paragraph)}
          </p>
        ))}
      </div>

      {!loading && <p className="result-muted">Use this as a draft, then make it sound like you.</p>}
    </div>
  );
}
