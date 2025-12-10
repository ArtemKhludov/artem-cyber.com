'use client'

import { motion } from 'framer-motion'

export function SCurveChart() {
  const width = 800
  const height = 400
  const padding = 60

  // S-curve points (sigmoid function approximation)
  const points = Array.from({ length: 50 }, (_, i) => {
    const x = (i / 49) * (width - padding * 2) + padding
    const t = (i / 49) * 20 - 10 // -10 to 10
    const sigmoid = 1 / (1 + Math.exp(-t))
    const y = height - padding - sigmoid * (height - padding * 2)
    return { x, y }
  })

  const pathD = points.reduce((acc, point, i) => {
    return acc + (i === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`)
  }, '')

  // Markers for different stages
  const stages = [
    { x: padding + (width - padding * 2) * 0.15, label: 'Early Adopters', year: '2005-2010' },
    { x: padding + (width - padding * 2) * 0.4, label: 'Growth Phase', year: '2010-2018' },
    { x: padding + (width - padding * 2) * 0.65, label: 'Mass Adoption', year: '2018-2024' },
    { x: padding + (width - padding * 2) * 0.85, label: 'ENERGY Logic', year: '2024+', highlight: true },
  ]

  return (
    <div className="w-full max-w-4xl mx-auto">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <g key={i}>
            <line
              x1={padding}
              y1={padding + ratio * (height - padding * 2)}
              x2={width - padding}
              y2={padding + ratio * (height - padding * 2)}
              stroke="rgba(148, 163, 184, 0.2)"
              strokeWidth="1"
            />
            <text
              x={padding - 10}
              y={padding + ratio * (height - padding * 2) + 4}
              fill="rgba(148, 163, 184, 0.6)"
              fontSize="12"
              textAnchor="end"
            >
              {Math.round((1 - ratio) * 100)}%
            </text>
          </g>
        ))}

        {/* Year markers */}
        {[2005, 2010, 2015, 2020, 2024].map((year, i) => {
          const x = padding + (i / 4) * (width - padding * 2)
          return (
            <g key={year}>
              <line
                x1={x}
                y1={height - padding}
                x2={x}
                y2={height - padding + 5}
                stroke="rgba(148, 163, 184, 0.3)"
                strokeWidth="1"
              />
              <text
                x={x}
                y={height - padding + 20}
                fill="rgba(148, 163, 184, 0.6)"
                fontSize="11"
                textAnchor="middle"
              >
                {year}
              </text>
            </g>
          )
        })}

        {/* S-curve path */}
        <motion.path
          d={pathD}
          stroke="url(#gradient)"
          strokeWidth="4"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>

        {/* Stage markers */}
        {stages.map((stage, i) => {
          const point = points[Math.round((stage.x - padding) / (width - padding * 2) * 49)]
          return (
            <g key={i}>
              <motion.circle
                cx={stage.x}
                cy={point?.y || height - padding}
                r={stage.highlight ? 8 : 5}
                fill={stage.highlight ? "#fbbf24" : "#8b5cf6"}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.5 + i * 0.2, type: "spring" }}
              />
              {stage.highlight && (
                <motion.circle
                  cx={stage.x}
                  cy={point?.y || height - padding}
                  r={12}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              <text
                x={stage.x}
                y={(point?.y || height - padding) - 25}
                fill={stage.highlight ? "#fbbf24" : "#64748b"}
                fontSize={stage.highlight ? "14" : "11"}
                fontWeight={stage.highlight ? "bold" : "normal"}
                textAnchor="middle"
              >
                {stage.label}
              </text>
              <text
                x={stage.x}
                y={(point?.y || height - padding) - 10}
                fill={stage.highlight ? "#fbbf24" : "#94a3b8"}
                fontSize="10"
                textAnchor="middle"
              >
                {stage.year}
              </text>
            </g>
          )
        })}

        {/* Axes */}
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="rgba(148, 163, 184, 0.5)"
          strokeWidth="2"
        />
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="rgba(148, 163, 184, 0.5)"
          strokeWidth="2"
        />

        {/* Labels */}
        <text
          x={width / 2}
          y={height - 10}
          fill="#64748b"
          fontSize="13"
          fontWeight="600"
          textAnchor="middle"
        >
          Technology Adoption Timeline (2005-2024+)
        </text>
        <text
          x={20}
          y={height / 2}
          fill="#64748b"
          fontSize="13"
          fontWeight="600"
          textAnchor="middle"
          transform={`rotate(-90, 20, ${height / 2})`}
        >
          % Population Using Self-Management Tools
        </text>
      </svg>
    </div>
  )
}
