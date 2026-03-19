import type { ResumeData } from "@/lib/types";

interface ResumeProfileProps {
  data: ResumeData | null;
  loading: boolean;
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-brand-border ${className ?? ""}`}
    />
  );
}

export default function ResumeProfile({ data, loading }: ResumeProfileProps) {
  if (!loading && !data) return null;

  if (loading) {
    return (
      <div className="flex flex-col gap-6 rounded-2xl border border-brand-border bg-brand-surface p-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-16" />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-brand-border bg-brand-surface p-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-brand-text">{data.name}</h2>
        {data.summary && (
          <p className="text-sm text-brand-muted">{data.summary}</p>
        )}
      </div>

      {/* Skills */}
      {data.skills.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
            Skills
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.skills.map((skill, i) => (
              <span
                key={i}
                className="rounded-full border border-brand-border bg-brand-bg px-3 py-1 text-xs text-brand-text"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      {data.experience.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
            Experience
          </h3>
          <div className="flex flex-col gap-4">
            {data.experience.map((entry, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <p className="text-sm font-medium text-brand-text">
                  {entry.title}{" "}
                  <span className="font-normal text-brand-muted">
                    @ {entry.company}
                  </span>
                </p>
                <p className="text-xs text-brand-muted">
                  {entry.startDate} — {entry.endDate ?? "Present"}
                </p>
                {entry.description && (
                  <p className="mt-1 text-xs text-brand-muted">
                    {entry.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
            Education
          </h3>
          <div className="flex flex-col gap-2">
            {data.education.map((entry, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <p className="text-sm font-medium text-brand-text">
                  {entry.degree}
                </p>
                <p className="text-xs text-brand-muted">
                  {entry.institution} · {entry.graduationYear}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
