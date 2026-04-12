import type { GapSeverity } from "@/lib/types";

type PillTone = "red" | "amber" | "green" | "sage";

interface SeverityPillProps {
  severity?: GapSeverity;
  tone?: PillTone;
  label: string;
}

export function toneForSeverity(severity: GapSeverity): Exclude<PillTone, "sage"> {
  if (severity === "dealbreaker") return "red";
  if (severity === "learnable") return "amber";
  return "green";
}

export default function SeverityPill({ severity, tone, label }: SeverityPillProps) {
  const resolvedTone = tone ?? (severity ? toneForSeverity(severity) : "sage");

  return (
    <span className={`pill pill-${resolvedTone}`}>
      <span className="pill-dot" />
      {label}
    </span>
  );
}
