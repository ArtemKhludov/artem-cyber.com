'use client'

import { motion } from 'framer-motion'

export function CohortRetentionChart() {
  const width = 600
  const height = 300
  const padding = 50

  // Retention data: cohort retention improves over time
  const cohorts = [
    { name: 'Cohort 1', data: [100, 75, 60, 55, 52, 50] },
    { name: 'Cohort 2', data: [100, 80, 70, 65, 62, 60] },
    { name: 'Cohort 3', data: [100, 85, 78, 75, 73, 72] },
  ]

  const months = ['Month 0', 'Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5']
  const colors = ['#3b82f6', '#8b5cf6', '#10b981']

  const scaleX = (val: number) => padding + (val / 5) * (width - padding * 2)
  const scaleY = (val: number) => height - padding - (val / 100) * (height - padding * 2)

  const makePath = (points: number[]) => {
    return points.reduce((acc, val, i) => {
      const x = scaleX(i)
      const y = scaleY(val)
      return acc + (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`)
    }, '')
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Cohort Retention</h3>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Grid */}
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, i) => (
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

        {/* Retention lines */}
        {cohorts.map((cohort, cohortIndex) => (
          <motion.g key={cohort.name}>
            <motion.path
              d={makePath(cohort.data)}
              stroke={colors[cohortIndex]}
              strokeWidth="3"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: cohortIndex * 0.2 }}
            />
            {/* Data points */}
            {cohort.data.map((val, i) => (
              <motion.circle
                key={i}
                cx={scaleX(i)}
                cy={scaleY(val)}
                r={4}
                fill={colors[cohortIndex]}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: cohortIndex * 0.2 + i * 0.1, type: "spring" }}
              />
            ))}
          </motion.g>
        ))}

        {/* Labels */}
        {months.map((month, i) => {
          const x = scaleX(i)
          return (
            <text
              key={month}
              x={x}
              y={height - padding + 20}
              fill="#64748b"
              fontSize="11"
              textAnchor="middle"
            >
              {month.split(' ')[1]}
            </text>
          )
        })}

        {/* Legend */}
        <g transform={`translate(${width - 120}, ${padding + 20})`}>
          {cohorts.map((cohort, i) => (
            <g key={cohort.name} transform={`translate(0, ${i * 25})`}>
              <line x1={0} y1={0} x2={30} y2={0} stroke={colors[i]} strokeWidth="3" />
              <text x={35} y={4} fill="#64748b" fontSize="11">{cohort.name}</text>
            </g>
          ))}
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
          Retention (%)
        </text>
      </svg>
    </div>
  )
}

export function ActivityGrowthChart() {
  const width = 600
  const height = 300
  const padding = 50

  const data = [
    { day: 0, interactions: 5 },
    { day: 7, interactions: 12 },
    { day: 14, interactions: 18 },
    { day: 21, interactions: 25 },
    { day: 30, interactions: 35 },
    { day: 60, interactions: 48 },
    { day: 90, interactions: 62 },
  ]

  const scaleX = (val: number) => padding + (val / 90) * (width - padding * 2)
  const scaleY = (val: number) => height - padding - (val / 70) * (height - padding * 2)

  const pathD = data.reduce((acc, point, i) => {
    const x = scaleX(point.day)
    const y = scaleY(point.interactions)
    return acc + (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`)
  }, '')

  return (
    <div className="w-full max-w-3xl mx-auto">
      <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">User Activity Growth</h3>
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

        {/* Area fill */}
        <motion.path
          d={pathD + ` L ${scaleX(90)} ${height - padding} L ${padding} ${height - padding} Z`}
          fill="url(#activityGradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 1, delay: 0.5 }}
        />
        <defs>
          <linearGradient id="activityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Line */}
        <motion.path
          d={pathD}
          stroke="url(#activityLineGradient)"
          strokeWidth="4"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2 }}
        />
        <defs>
          <linearGradient id="activityLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>

        {/* Data points */}
        {data.map((point, i) => (
          <motion.g key={i}>
            <motion.circle
              cx={scaleX(point.day)}
              cy={scaleY(point.interactions)}
              r={6}
              fill="#8b5cf6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.2, type: "spring" }}
            />
            <text
              x={scaleX(point.day)}
              y={scaleY(point.interactions) - 15}
              fill="#64748b"
              fontSize="10"
              textAnchor="middle"
              fontWeight="600"
            >
              {point.interactions}
            </text>
          </motion.g>
        ))}

        {/* X-axis labels */}
        {[0, 30, 60, 90].map((day) => (
          <text
            key={day}
            x={scaleX(day)}
            y={height - padding + 20}
            fill="#64748b"
            fontSize="11"
            textAnchor="middle"
          >
            Day {day}
          </text>
        ))}

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
          Daily Interactions
        </text>
      </svg>
    </div>
  )
}

export function AlignmentScoreChart() {
  const width = 600
  const height = 300
  const padding = 50

  const data = [
    { day: 0, score: 45 },
    { day: 7, score: 52 },
    { day: 14, score: 58 },
    { day: 21, score: 64 },
    { day: 30, score: 72 },
  ]

  const scaleX = (val: number) => padding + (val / 30) * (width - padding * 2)
  const scaleY = (val: number) => height - padding - (val / 100) * (height - padding * 2)

  const pathD = data.reduce((acc, point, i) => {
    const x = scaleX(point.day)
    const y = scaleY(point.score)
    return acc + (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`)
  }, '')

  return (
    <div className="w-full max-w-3xl mx-auto">
      <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Alignment Score Improvement (30 Days)</h3>
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

        {/* Improvement zone */}
        <rect
          x={padding}
          y={scaleY(72)}
          width={width - padding * 2}
          height={scaleY(45) - scaleY(72)}
          fill="rgba(16, 185, 129, 0.1)"
        />

        {/* Line */}
        <motion.path
          d={pathD}
          stroke="#10b981"
          strokeWidth="4"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5 }}
        />

        {/* Data points */}
        {data.map((point, i) => (
          <motion.g key={i}>
            <motion.circle
              cx={scaleX(point.day)}
              cy={scaleY(point.score)}
              r={6}
              fill="#10b981"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.2, type: "spring" }}
            />
            <text
              x={scaleX(point.day)}
              y={scaleY(point.score) - 15}
              fill="#10b981"
              fontSize="11"
              fontWeight="bold"
              textAnchor="middle"
            >
              {point.score}
            </text>
          </motion.g>
        ))}

        {/* Improvement annotation */}
        <motion.text
          x={width / 2}
          y={scaleY(72) - 10}
          fill="#10b981"
          fontSize="14"
          fontWeight="bold"
          textAnchor="middle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          +27 points improvement
        </motion.text>

        {/* X-axis labels */}
        {data.map((point) => (
          <text
            key={point.day}
            x={scaleX(point.day)}
            y={height - padding + 20}
            fill="#64748b"
            fontSize="11"
            textAnchor="middle"
          >
            Day {point.day}
          </text>
        ))}

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
          Alignment Score
        </text>
      </svg>
    </div>
  )
}
