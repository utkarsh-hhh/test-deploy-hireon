interface ScoreRingProps {
  score: number | null | undefined
  size?: number
  strokeWidth?: number
  className?: string
}

export function ScoreRing({ score, size = 56, strokeWidth = 5 }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = score != null ? Math.min(100, Math.max(0, score)) : 0
  const dashOffset = circumference - (progress / 100) * circumference

  const color =
    score == null ? '#d1d5db'
    : score >= 80 ? '#10b981'
    : score >= 60 ? '#f59e0b'
    : '#ef4444'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>
        {score != null ? `${Math.round(score)}` : '—'}
      </span>
    </div>
  )
}
