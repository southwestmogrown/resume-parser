import type { MatchResult, MissingSkill } from "@/lib/types";

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

const SEVERITY_CONFIG = {
  dealbreaker: {
    label: "Dealbreakers",
    emoji: "🔴",
    border: "border-brand-red/30",
    bg: "bg-brand-red/10",
    text: "text-brand-red",
    description: "Hard requirements you don\u2019t meet",
  },
  learnable: {
    label: "Learnable Gaps",
    emoji: "🟡",
    border: "border-brand-amber/30",
    bg: "bg-brand-amber/10",
    text: "text-brand-amber",
    description: "Skills you could pick up in weeks",
  },
  soft: {
    label: "Soft Gaps",
    emoji: "🟢",
    border: "border-brand-green/30",
    bg: "bg-brand-green/10",
    text: "text-brand-green",
    description: "Nice-to-haves or partially covered",
  },
} as const;

function GapSection({ gaps, severity }: { gaps: MissingSkill[]; severity: keyof typeof SEVERITY_CONFIG }) {
  if (gaps.length === 0) return null;
  const config = SEVERITY_CONFIG[severity];

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
        {config.emoji} {config.label}
      </h3>
      <p className="text-xs text-brand-muted">{config.description}</p>
      <div className="flex flex-col gap-1.5">
        {gaps.map((gap, i) => (
          <div key={i} className={`flex items-start gap-2 rounded-lg border ${config.border} ${config.bg} px-3 py-2`}>
            <span className={`text-xs font-medium ${config.text} shrink-0`}>{gap.skill}</span>
            <span className="text-xs text-brand-muted">{gap.reason}</span>
          </div>
        ))}
      </div>
    </div>
  );
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
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!result) return null;

  const dealbreakers = result.missingSkills.filter((g) => g.severity === "dealbreaker");
  const learnable = result.missingSkills.filter((g) => g.severity === "learnable");
  const soft = result.missingSkills.filter((g) => g.severity === "soft");

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
            ✅ Matched Skills
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

      {/* Tiered Missing Skills */}
      <GapSection gaps={dealbreakers} severity="dealbreaker" />
      <GapSection gaps={learnable} severity="learnable" />
      <GapSection gaps={soft} severity="soft" />

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
