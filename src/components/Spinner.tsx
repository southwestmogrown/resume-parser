interface SpinnerProps {
  className?: string;
}

export default function Spinner({ className = "" }: SpinnerProps) {
  return <span className={`spinner ${className}`.trim()} aria-hidden="true" />;
}
