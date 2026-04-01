// Inline I.CA brand logo — use instead of emoji for /prace nav items
export function ICAIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ borderRadius: size * 0.1, flexShrink: 0 }}
    >
      <rect width="100" height="100" rx="10" fill="#1D38A8" />
      <rect x="28" y="12" width="24" height="64" fill="white" />
      <rect x="60" y="66" width="18" height="18" fill="white" />
    </svg>
  )
}
