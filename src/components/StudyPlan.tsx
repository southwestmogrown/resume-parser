import SeverityPill from "@/components/SeverityPill";
import SkeletonBlock from "@/components/SkeletonBlock";
import type { StudyItem } from "@/lib/types";

interface StudyPlanProps {
  items: StudyItem[] | null;
  loading: boolean;
}

export default function StudyPlan({ items, loading }: StudyPlanProps) {
  if (!loading && !items) return null;

  if (loading) {
    return (
      <div className="card result-card">
        <div>
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="mt-3 h-7 w-40" />
        </div>
        {Array.from({ length: 2 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) return null;

  return (
    <div className="card result-card">
      <div>
        <div className="eyebrow">phase 3</div>
        <h2 style={{ fontSize: "1.3rem" }}>Study plan</h2>
        <p className="result-muted" style={{ marginTop: "var(--space-3)" }}>
          Focus only on the gaps worth closing.
        </p>
      </div>
      <div style={{ display: "grid", gap: "var(--space-4)" }}>
        {items.map((item, index) => (
          <div key={`${item.skill}-${index}`} className="study-item" style={{ padding: "var(--space-4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", alignItems: "flex-start", flexWrap: "wrap" }}>
              <p>{item.skill}</p>
              <SeverityPill severity={item.severity} label={item.severity} />
            </div>
            <p className="result-muted" style={{ marginTop: "var(--space-3)" }}>{item.action}</p>
            <p style={{ marginTop: "var(--space-3)", color: "var(--ps-accent)" }}>{item.resource}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
