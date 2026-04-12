import SkeletonBlock from "@/components/SkeletonBlock";
import SeverityPill from "@/components/SeverityPill";
import type { ResumeData } from "@/lib/types";

interface ResumeProfileProps {
  data: ResumeData | null;
  loading: boolean;
}

export default function ResumeProfile({ data, loading }: ResumeProfileProps) {
  if (!loading && !data) return null;

  if (loading) {
    return (
      <div className="card result-card">
        <div>
          <SkeletonBlock className="h-4 w-20" />
          <SkeletonBlock className="mt-3 h-8 w-48" />
          <SkeletonBlock className="mt-3 h-4 w-full" />
          <SkeletonBlock className="mt-2 h-4 w-3/4" />
        </div>
        <div>
          <SkeletonBlock className="h-4 w-28" />
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-6 w-20" />
            ))}
          </div>
        </div>
        <div>
          <SkeletonBlock className="h-4 w-32" />
          <div className="mt-3 grid gap-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="card result-card">
      <div>
        <div className="eyebrow">phase 1 complete</div>
        <h2 style={{ fontSize: "1.4rem" }}>{data.name}</h2>
        {data.summary ? <p className="result-muted" style={{ marginTop: "var(--space-3)" }}>{data.summary}</p> : null}
      </div>

      {data.skills.length > 0 ? (
        <div className="result-block">
          <div className="field-label">
            <span>Skills</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {data.skills.map((skill) => (
              <SeverityPill key={skill} tone="sage" label={skill} />
            ))}
          </div>
        </div>
      ) : null}

      {data.experience.length > 0 ? (
        <div className="result-block">
          <div className="field-label">
            <span>Experience</span>
          </div>
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            {data.experience.map((entry, index) => (
              <div key={`${entry.company}-${entry.title}-${index}`} className="resume-entry" style={{ padding: "var(--space-4)" }}>
                <p>
                  {entry.title} <span className="result-muted">@ {entry.company}</span>
                </p>
                <p className="subtle-note" style={{ marginTop: "var(--space-2)" }}>
                  {entry.startDate} — {entry.endDate ?? "Present"}
                </p>
                {entry.description ? <p className="result-muted" style={{ marginTop: "var(--space-3)" }}>{entry.description}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {data.education.length > 0 ? (
        <div className="result-block">
          <div className="field-label">
            <span>Education</span>
          </div>
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            {data.education.map((entry, index) => (
              <div key={`${entry.institution}-${entry.degree}-${index}`} className="resume-entry" style={{ padding: "var(--space-4)" }}>
                <p>{entry.degree}</p>
                <p className="result-muted" style={{ marginTop: "var(--space-2)" }}>
                  {entry.institution} · {entry.graduationYear}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
