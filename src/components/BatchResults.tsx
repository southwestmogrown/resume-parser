"use client";

import { useMemo, useState } from "react";
import ScoreRing from "@/components/ScoreRing";
import SeverityPill from "@/components/SeverityPill";
import SkeletonBlock from "@/components/SkeletonBlock";
import type { BatchScoreResult } from "@/lib/types";

interface BatchResultsProps {
  results: BatchScoreResult[] | null;
  loading: boolean;
  onSelect: (result: BatchScoreResult) => void;
  selectedJD?: string | null;
}

type SortField = "score" | "company" | "jobTitle";
type SortDirection = "asc" | "desc";

const sortOptions: Array<{ field: SortField; label: string }> = [
  { field: "score", label: "Score" },
  { field: "company", label: "Company" },
  { field: "jobTitle", label: "Title" },
];

export default function BatchResults({ results, loading, onSelect, selectedJD }: BatchResultsProps) {
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedResults = useMemo(() => {
    if (!results) return [];
    return [...results].sort((left, right) => {
      const multiplier = sortDirection === "asc" ? 1 : -1;
      if (sortField === "score") return (left.score - right.score) * multiplier;
      if (sortField === "company") return left.company.localeCompare(right.company) * multiplier;
      return left.jobTitle.localeCompare(right.jobTitle) * multiplier;
    });
  }, [results, sortDirection, sortField]);

  if (!loading && !results) return null;

  if (loading) {
    return (
      <div className="card result-card">
        <div>
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="mt-3 h-7 w-40" />
        </div>
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!results || results.length === 0) return null;

  return (
    <div className="card result-card">
      <div>
        <div className="eyebrow">batch scoring</div>
        <h2 style={{ fontSize: "1.35rem" }}>Compare roles fast</h2>
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        {sortOptions.map((option) => {
          const active = sortField === option.field;
          return (
            <button
              key={option.field}
              type="button"
              onClick={() => {
                if (sortField === option.field) {
                  setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                } else {
                  setSortField(option.field);
                  setSortDirection(option.field === "score" ? "desc" : "asc");
                }
              }}
              className={active ? "btn-primary btn-inline" : "btn-ghost btn-inline"}
            >
              {option.label}
              {active ? (sortDirection === "asc" ? " ↑" : " ↓") : ""}
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gap: "var(--space-3)" }}>
        {sortedResults.map((result) => (
          <button
            key={`${result.company}-${result.jobTitle}`}
            type="button"
            onClick={() => onSelect(result)}
            className={`batch-row${result.jobDescription === selectedJD ? " batch-row--selected" : ""}`}
            style={{
              padding: "var(--space-4)",
              display: "grid",
              gridTemplateColumns: "auto minmax(0, 1fr) auto",
              gap: "var(--space-4)",
              alignItems: "center",
              textAlign: "left",
            }}
          >
            <ScoreRing score={result.score} size={56} strokeWidth={5} />
            <div style={{ minWidth: 0 }}>
              <p>{result.jobTitle}</p>
              <p className="result-muted">{result.company}</p>
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginTop: "var(--space-3)" }}>
                {result.topGaps.map((gap, index) => (
                  <SeverityPill key={`${gap.skill}-${index}`} severity={gap.severity} label={gap.skill} />
                ))}
              </div>
            </div>
            <span className="subtle-note" style={result.jobDescription === selectedJD ? { color: "var(--ps-accent)" } : {}}>
              {result.jobDescription === selectedJD ? "Selected" : "Open →"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
