type PassStackLogoProps = {
  compact?: boolean;
};

export default function PassStackLogo({ compact = false }: PassStackLogoProps) {
  return (
    <span className={compact ? "passstack-logo passstack-logo--compact" : "passstack-logo"}>
      <svg
        className="passstack-logo__icon"
        viewBox="0 0 64 64"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="4" y="4" width="56" height="56" rx="18" fill="#111613" stroke="#39d9b8" strokeOpacity="0.14" />
        <rect x="6" y="8" width="28" height="36" rx="7" fill="#262d27" stroke="#8fa88e" strokeOpacity="0.28" />
        <rect x="16" y="14" width="30" height="38" rx="8" fill="#1f2520" stroke="#39d9b8" strokeOpacity="0.3" />
        <rect x="22" y="20" width="24" height="32" rx="8" fill="#101512" />
        <path d="M28 28H40" stroke="#8fa88e" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M28 35H38" stroke="#8fa88e" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M28 42H35" stroke="#8fa88e" strokeWidth="3.5" strokeLinecap="round" />
        <path
          d="M18 38.5L25.5 46L45.5 24"
          fill="none"
          stroke="#39d9b8"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="passstack-logo__wordmark">
        <span>Pass</span>
        <span className="passstack-logo__wordmark-accent">Stack</span>
      </span>
    </span>
  );
}
