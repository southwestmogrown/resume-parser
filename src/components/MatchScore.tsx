import type { MatchResult } from "@/lib/types";

interface MatchScoreProps {
  result: MatchResult | null;
  loading: boolean;
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-brand-border ${className ?? ""}`}
    />
  );
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-brand-green";
  if (score >= 60) return "text-brand-amber";
  return "text-brand-red";
}

export default function MatchScore({ result, loading }: MatchScoreProps) {
  if (!loading && !result) return null;

  if (loading) {
    return (
      <div className="flex flex-col gap-6 rounded-2xl border border-brand-border bg-brand-surface p-6">
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-16 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-16" />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-16" />
            ))}
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-brand-border bg-brand-surface p-6">
      {/* Score */}
      <div className="flex flex-col items-center gap-1">
        <span className={`text-6xl font-bold ${scoreColor(result.score)}`}>
          {result.score}%
        </span>
        <span className="text-sm text-brand-muted">Match Score</span>
      </div>

      {/* Matched Skills */}
      {result.matchedSkills.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
            Matched Skills
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.matchedSkills.map((skill, i) => (
              <span
                key={i}
                className="rounded-full border border-brand-green/30 bg-brand-green/10 px-3 py-1 text-xs text-brand-green"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missing Skills */}
      {result.missingSkills.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
            Missing Skills
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.missingSkills.map((skill, i) => (
              <span
                key={i}
                className="rounded-full border border-brand-red/30 bg-brand-red/10 px-3 py-1 text-xs text-brand-red"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation */}
      {result.recommendation && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
            Recommendation
          </h3>
          <p className="text-sm text-brand-muted">{result.recommendation}</p>
        </div>
      )}
    </div>
  );
}
