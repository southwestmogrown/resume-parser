interface SkeletonBlockProps {
  className?: string;
}

export default function SkeletonBlock({ className = "" }: SkeletonBlockProps) {
  return <div className={`skeleton ${className}`.trim()} aria-hidden="true" />;
}
