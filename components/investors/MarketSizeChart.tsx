'use client'

import { motion } from 'framer-motion'

export function MarketSizeChart() {
  const centerX = 200
  const centerY = 200
  const tamRadius = 180
  const samRadius = 120
  const somRadius = 60

  return (
    <div className="w-full max-w-2xl mx-auto">
      <svg width="100%" height="400" viewBox="0 0 400 400" className="overflow-visible">
        {/* TAM - Total Addressable Market */}
        <motion.circle
          cx={centerX}
          cy={centerY}
          r={tamRadius}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="rgba(59, 130, 246, 0.4)"
          strokeWidth="2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, delay: 0 }}
        />
        <motion.text
          x={centerX}
          y={centerY - tamRadius + 20}
          fill="#3b82f6"
          fontSize="14"
          fontWeight="bold"
          textAnchor="middle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          TAM: $200B+
        </motion.text>
        <motion.text
          x={centerX}
          y={centerY - tamRadius + 35}
          fill="#64748b"
          fontSize="11"
          textAnchor="middle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Global Self-Improvement
        </motion.text>

        {/* SAM - Serviceable Addressable Market */}
        <motion.circle
          cx={centerX}
          cy={centerY}
          r={samRadius}
          fill="rgba(139, 92, 246, 0.15)"
          stroke="rgba(139, 92, 246, 0.5)"
          strokeWidth="2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
        <motion.text
          x={centerX}
          y={centerY - samRadius + 20}
          fill="#8b5cf6"
          fontSize="14"
          fontWeight="bold"
          textAnchor="middle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          SAM: $50B
        </motion.text>
        <motion.text
          x={centerX}
          y={centerY - samRadius + 35}
          fill="#64748b"
          fontSize="11"
          textAnchor="middle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Active Users of Coaching
        </motion.text>

        {/* SOM - Serviceable Obtainable Market */}
        <motion.circle
          cx={centerX}
          cy={centerY}
          r={somRadius}
          fill="rgba(236, 72, 153, 0.2)"
          stroke="rgba(236, 72, 153, 0.7)"
          strokeWidth="3"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4, type: "spring" }}
        />
        <motion.text
          x={centerX}
          y={centerY - 10}
          fill="#ec4899"
          fontSize="16"
          fontWeight="bold"
          textAnchor="middle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          SOM: $5B
        </motion.text>
        <motion.text
          x={centerX}
          y={centerY + 10}
          fill="#64748b"
          fontSize="11"
          textAnchor="middle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Personal Dynamic Systems
        </motion.text>

        {/* Pulsing effect on SOM */}
        <motion.circle
          cx={centerX}
          cy={centerY}
          r={somRadius}
          fill="none"
          stroke="#ec4899"
          strokeWidth="2"
          strokeDasharray="4 4"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 1.3, opacity: 0 }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </svg>
    </div>
  )
}

export function GrowthGraph() {
  const width = 600
  const height = 300
  const padding = 50

  // Data points for three lines
  const digitalSelfDev = [
    { x: 0, y: 20 }, { x: 1, y: 35 }, { x: 2, y: 55 }, { x: 3, y: 80 }, { x: 4, y: 120 }
  ]
  const aiCoaching = [
    { x: 0, y: 5 }, { x: 1, y: 15 }, { x: 2, y: 40 }, { x: 3, y: 75 }, { x: 4, y: 150 }
  ]
  const personalOS = [
    { x: 0, y: 2 }, { x: 1, y: 8 }, { x: 2, y: 25 }, { x: 3, y: 60 }, { x: 4, y: 140 }
  ]

  const scaleX = (val: number) => padding + (val / 4) * (width - padding * 2)
  const scaleY = (val: number) => height - padding - (val / 160) * (height - padding * 2)

  const makePath = (points: { x: number; y: number }[]) => {
    return points.reduce((acc, point, i) => {
      const x = scaleX(point.x)
      const y = scaleY(point.y)
      return acc + (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`)
    }, '')
  }

  const years = ['2020', '2021', '2022', '2023', '2024']

  return (
    <div className="w-full max-w-3xl mx-auto">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <line
            key={i}
            x1={padding}
            y1={padding + ratio * (height - padding * 2)}
            x2={width - padding}
            y2={padding + ratio * (height - padding * 2)}
            stroke="rgba(148, 163, 184, 0.1)"
            strokeWidth="1"
          />
        ))}

        {/* Year labels */}
        {years.map((year, i) => {
          const x = scaleX(i)
          return (
            <text
              key={year}
              x={x}
              y={height - padding + 20}
              fill="#64748b"
              fontSize="11"
              textAnchor="middle"
            >
              {year}
            </text>
          )
        })}

        {/* Growth lines */}
        <motion.path
          d={makePath(digitalSelfDev)}
          stroke="#3b82f6"
          strokeWidth="3"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, delay: 0.2 }}
        />
        <motion.path
          d={makePath(aiCoaching)}
          stroke="#8b5cf6"
          strokeWidth="3"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, delay: 0.4 }}
        />
        <motion.path
          d={makePath(personalOS)}
          stroke="#ec4899"
          strokeWidth="3"
          fill="none"
          strokeDasharray="6 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, delay: 0.6 }}
        />

        {/* Legend */}
        <g transform={`translate(${width - 150}, ${padding + 20})`}>
          <line x1={0} y1={0} x2={30} y2={0} stroke="#3b82f6" strokeWidth="3" />
          <text x={35} y={4} fill="#64748b" fontSize="11">Digital Self-Dev</text>
          <line x1={0} y1={20} x2={30} y2={20} stroke="#8b5cf6" strokeWidth="3" />
          <text x={35} y={24} fill="#64748b" fontSize="11">AI Coaching</text>
          <line x1={0} y1={40} x2={30} y2={40} stroke="#ec4899" strokeWidth="3" strokeDasharray="6 4" />
          <text x={35} y={44} fill="#64748b" fontSize="11" fontWeight="bold">Personal OS</text>
        </g>

        {/* Y-axis label */}
        <text
          x={15}
          y={height / 2}
          fill="#64748b"
          fontSize="12"
          fontWeight="600"
          textAnchor="middle"
          transform={`rotate(-90, 15, ${height / 2})`}
        >
          Market Size ($B)
        </text>
      </svg>
    </div>
  )
}
