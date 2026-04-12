import ScoreRing from "@/components/ScoreRing";
import SeverityPill from "@/components/SeverityPill";
import SkeletonBlock from "@/components/SkeletonBlock";
import type { MatchResult, MissingSkill } from "@/lib/types";

interface MatchScoreProps {
  result: MatchResult | null;
  loading: boolean;
}

const SECTION_LABELS = {
  dealbreaker: "Dealbreakers",
  learnable: "Learnable gaps",
  soft: "Soft gaps",
} as const;

function GapGroup({ severity, gaps }: { severity: keyof typeof SECTION_LABELS; gaps: MissingSkill[] }) {
  if (gaps.length === 0) return null;

  return (
    <div className="result-block">
      <div className="field-label">
        <span>{SECTION_LABELS[severity]}</span>
      </div>
      <div style={{ display: "grid", gap: "var(--space-3)" }}>
        {gaps.map((gap, index) => (
          <div key={`${gap.skill}-${index}`} className={`gap-item gap-item--${severity}`} style={{ padding: "var(--space-4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", alignItems: "flex-start", flexWrap: "wrap" }}>
              <p>{gap.skill}</p>
              <SeverityPill severity={gap.severity} label={gap.severity} />
            </div>
            <p className="result-muted" style={{ marginTop: "var(--space-3)" }}>{gap.reason}</p>
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
      <div className="card result-card">
        <div style={{ display: "grid", justifyItems: "center", gap: "var(--space-3)" }}>
          <SkeletonBlock className="h-20 w-20 rounded-full" />
          <SkeletonBlock className="h-4 w-24" />
        </div>
        <div>
          <SkeletonBlock className="h-4 w-32" />
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-6 w-20" />
            ))}
          </div>
        </div>
        <div className="grid gap-3">
          <SkeletonBlock className="h-16 w-full" />
          <SkeletonBlock className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (!result) return null;

  const dealbreakers = result.missingSkills.filter((gap) => gap.severity === "dealbreaker");
  const learnable = result.missingSkills.filter((gap) => gap.severity === "learnable");
  const soft = result.missingSkills.filter((gap) => gap.severity === "soft");

  return (
    <div className="card result-card">
      <div style={{ display: "grid", justifyItems: "center", gap: "var(--space-4)" }}>
        <div className="eyebrow">phase 2</div>
        <ScoreRing score={result.score} />
        <div style={{ textAlign: "center" }}>
          <div className="score-number">{result.score}</div>
          <p className="result-muted">match score</p>
        </div>
        <div className="score-meta">
          {dealbreakers.length > 0 ? <SeverityPill tone="red" label={`${dealbreakers.length} dealbreakers`} /> : null}
          {learnable.length > 0 ? <SeverityPill tone="amber" label={`${learnable.length} learnable`} /> : null}
          {soft.length > 0 ? <SeverityPill tone="green" label={`${soft.length} soft`} /> : null}
        </div>
      </div>

      {result.matchedSkills.length > 0 ? (
        <div className="result-block">
          <div className="field-label">
            <span>Matched skills</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {result.matchedSkills.map((skill) => (
              <SeverityPill key={skill} tone="sage" label={skill} />
            ))}
          </div>
        </div>
      ) : null}

      <GapGroup severity="dealbreaker" gaps={dealbreakers} />
      <GapGroup severity="learnable" gaps={learnable} />
      <GapGroup severity="soft" gaps={soft} />

      {result.recommendation ? (
        <div className="accent-panel" style={{ padding: "var(--space-4)" }}>
          <div className="field-label">
            <span>Recommendation</span>
          </div>
          <p className="result-muted" style={{ marginTop: "var(--space-3)" }}>{result.recommendation}</p>
        </div>
      ) : null}
    </div>
  );
}
