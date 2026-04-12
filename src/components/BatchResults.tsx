"use client";

import { useState } from "react";
import type { BatchScoreResult } from "@/lib/types";

interface BatchResultsProps {
  results: BatchScoreResult[] | null;
  loading: boolean;
  onSelect: (result: BatchScoreResult) => void;
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-brand-border ${className ?? ""}`} />
  );
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-brand-green";
  if (score >= 60) return "text-brand-amber";
  return "text-brand-red";
}

function scoreBg(score: number): string {
  if (score >= 80) return "bg-brand-green";
  if (score >= 60) return "bg-brand-amber";
  return "bg-brand-red";
}

type SortField = "score" | "company" | "jobTitle";
type SortDir = "asc" | "desc";

export default function BatchResults({ results, loading, onSelect }: BatchResultsProps) {
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  if (!loading && !results) return null;

  if (loading) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-brand-border bg-brand-surface p-6">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!results || results.length === 0) return null;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(field === "score" ? "desc" : "asc");
    }
  };

  const sorted = [...results].sort((a, b) => {
    const mul = sortDir === "asc" ? 1 : -1;
    if (sortField === "score") return (a.score - b.score) * mul;
    if (sortField === "company") return a.company.localeCompare(b.company) * mul;
    return a.jobTitle.localeCompare(b.jobTitle) * mul;
  });

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-brand-border bg-brand-surface p-6">
      <h2 className="text-lg font-semibold text-brand-text">📊 Batch Results</h2>

      {/* Sort controls */}
      <div className="flex gap-4">
        {([["score", "Score"], ["company", "Company"], ["jobTitle", "Title"]] as const).map(([field, label]) => (
          <button
            key={field}
            onClick={() => handleSort(field)}
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-brand-muted hover:text-brand-text transition-colors"
          >
            {label}
            {sortField === field && (
              <span className="text-brand-accent">{sortDir === "asc" ? "↑" : "↓"}</span>
            )}
          </button>
        ))}
      </div>

      {/* Results table */}
      <div className="flex flex-col gap-3">
        {sorted.map((result, i) => (
          <button
            key={i}
            onClick={() => onSelect(result)}
            className="flex items-center gap-4 rounded-xl border border-brand-border bg-brand-bg px-4 py-3 text-left transition-colors hover:border-brand-accent/50"
          >
            {/* Score bar */}
            <div className="flex flex-col items-center gap-1 shrink-0 w-16">
              <span className={`text-lg font-bold ${scoreColor(result.score)}`}>
                {result.score}%
              </span>
              <div className="h-1 w-full rounded-full bg-brand-border">
                <div
                  className={`h-1 rounded-full ${scoreBg(result.score)}`}
                  style={{ width: `${result.score}%` }}
                />
              </div>
            </div>

            {/* Job info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-brand-text truncate">{result.jobTitle}</p>
              <p className="text-xs text-brand-muted truncate">{result.company}</p>
            </div>

            {/* Top gaps */}
            <div className="hidden md:flex flex-wrap gap-1 shrink-0 max-w-[200px]">
              {result.topGaps.slice(0, 2).map((gap, j) => {
                const colors = {
                  dealbreaker: "border-brand-red/30 bg-brand-red/10 text-brand-red",
                  learnable: "border-brand-amber/30 bg-brand-amber/10 text-brand-amber",
                  soft: "border-brand-green/30 bg-brand-green/10 text-brand-green",
                };
                return (
                  <span
                    key={j}
                    className={`rounded-full border px-2 py-0.5 text-xs ${colors[gap.severity]}`}
                  >
                    {gap.skill}
                  </span>
                );
              })}
            </div>

            {/* Chevron */}
            <svg className="h-4 w-4 text-brand-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
