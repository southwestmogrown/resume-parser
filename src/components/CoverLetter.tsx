"use client";

import { useState } from "react";

interface CoverLetterProps {
  content: string | null;
  loading: boolean;
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-brand-border ${className ?? ""}`} />
  );
}

export default function CoverLetter({ content, loading }: CoverLetterProps) {
  const [copied, setCopied] = useState(false);

  if (!loading && !content) return null;

  if (loading) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-brand-border bg-brand-surface p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  if (!content) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple markdown bold rendering
  const renderText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-semibold text-brand-text">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-brand-border bg-brand-surface p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-text">📝 Cover Letter Draft</h2>
        <button
          onClick={handleCopy}
          className="rounded-lg border border-brand-border bg-brand-bg px-3 py-1.5 text-xs text-brand-muted transition-colors hover:border-brand-accent hover:text-brand-text"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <div className="rounded-lg border border-brand-border bg-brand-bg px-5 py-4">
        {content.split("\n\n").map((paragraph, i) => (
          <p key={i} className={`text-sm leading-relaxed text-brand-muted ${i > 0 ? "mt-4" : ""}`}>
            {renderText(paragraph)}
          </p>
        ))}
      </div>

      <p className="text-xs text-brand-muted italic">
        This is a first draft — personalize it with specific details about why you want this role.
      </p>
    </div>
  );
}
