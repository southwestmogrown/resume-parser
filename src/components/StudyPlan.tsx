import type { StudyItem } from "@/lib/types";

interface StudyPlanProps {
  items: StudyItem[] | null;
  loading: boolean;
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-brand-border ${className ?? ""}`} />
  );
}

const SEVERITY_ICON = {
  dealbreaker: "🔴",
  learnable: "🟡",
  soft: "🟢",
} as const;

export default function StudyPlan({ items, loading }: StudyPlanProps) {
  if (!loading && !items) return null;

  if (loading) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-brand-border bg-brand-surface p-6">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-3 w-48" />
          </div>
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-brand-border bg-brand-surface p-6">
      <div>
        <h2 className="text-lg font-semibold text-brand-text">📚 What to Study</h2>
        <p className="text-xs text-brand-muted">Actionable steps to close your skill gaps</p>
      </div>

      <div className="flex flex-col gap-4">
        {items.map((item, i) => (
          <div
            key={i}
            className="rounded-lg border border-brand-border bg-brand-bg px-4 py-3"
          >
            <div className="mb-2 flex items-center gap-2">
              <span>{SEVERITY_ICON[item.severity]}</span>
              <span className="text-sm font-medium text-brand-text">{item.skill}</span>
            </div>
            <p className="text-sm text-brand-muted">{item.action}</p>
            <p className="mt-2 text-xs text-brand-accent">{item.resource}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
