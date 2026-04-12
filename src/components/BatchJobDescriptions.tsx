"use client";

import { useState } from "react";

interface BatchJobDescriptionsProps {
  onSubmit: (descriptions: string[]) => void;
  loading: boolean;
}

export default function BatchJobDescriptions({ onSubmit, loading }: BatchJobDescriptionsProps) {
  const [text, setText] = useState("");

  const descriptions = text
    .split(/\n---\n/)
    .map((d) => d.trim())
    .filter((d) => d.length > 0);

  const handleSubmit = () => {
    if (descriptions.length > 0) {
      onSubmit(descriptions);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-brand-text">
          Batch Job Descriptions
        </label>
        <span className="text-xs text-brand-muted">
          {descriptions.length} job{descriptions.length !== 1 ? "s" : ""} detected
        </span>
      </div>
      <p className="text-xs text-brand-muted">
        Paste multiple job descriptions separated by a line containing only <code className="rounded bg-brand-bg px-1">---</code>
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Paste first job description here…\n---\nPaste second job description here…\n---\nPaste third job description here…`}
        disabled={loading}
        className="min-h-[200px] flex-1 resize-none rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-sm text-brand-text placeholder:text-brand-muted focus:border-brand-accent focus:outline-none transition-colors"
      />
      <button
        onClick={handleSubmit}
        disabled={descriptions.length === 0 || loading}
        className="self-start rounded-xl bg-brand-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Scoring…" : `Score Against ${descriptions.length} Job${descriptions.length !== 1 ? "s" : ""}`}
      </button>
    </div>
  );
}
