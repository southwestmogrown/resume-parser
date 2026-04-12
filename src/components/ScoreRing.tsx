import type { CSSProperties } from "react";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export function getScoreColorValue(score: number) {
  if (score >= 80) return "var(--ps-green)";
  if (score >= 60) return "var(--ps-amber)";
  return "var(--ps-red)";
}

export default function ScoreRing({ score, size = 80, strokeWidth = 6 }: ScoreRingProps) {
  const center = size / 2;
  const radius = center - strokeWidth - 2;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference * (1 - score / 100);

  return (
    <div
      className="score-ring"
      style={{ "--score-color": getScoreColorValue(score) } as CSSProperties}
      aria-label={`Match score ${score}%`}
      role="img"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--ps-accent-dim)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--score-color)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <span className="score-ring__number">
        {score}
        <span className="score-ring__suffix">%</span>
      </span>
    </div>
  );
}
