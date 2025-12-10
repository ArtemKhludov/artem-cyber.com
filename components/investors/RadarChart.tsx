'use client'

import { motion } from 'framer-motion'

const categories = [
  'Personalization',
  'Context Sensitivity',
  'Emotional Modeling',
  'Prediction',
  'Guidance Precision',
  'Adaptivity',
  'Holistic Life Modeling'
]

const competitors = [
  { name: 'ENERGY Logic', values: [95, 90, 92, 88, 90, 93, 95], color: '#8b5cf6' },
  { name: 'Coaching Services', values: [60, 50, 55, 40, 70, 45, 50], color: '#3b82f6' },
  { name: 'Habit Trackers', values: [40, 30, 20, 25, 35, 50, 30], color: '#10b981' },
  { name: 'AI Assistants', values: [50, 60, 45, 65, 55, 60, 40], color: '#f59e0b' },
]

export function RadarChart() {
  const centerX = 300
  const centerY = 300
  const radius = 200
  const numCategories = categories.length
  const angleStep = (2 * Math.PI) / numCategories

  // Calculate points for each category
  const categoryPoints = categories.map((_, i) => {
    const angle = (i * angleStep) - Math.PI / 2
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      angle,
      labelX: centerX + (radius + 40) * Math.cos(angle),
      labelY: centerY + (radius + 40) * Math.sin(angle),
    }
  })

  // Draw radar lines for each competitor
  const drawRadarPath = (values: number[]) => {
    return values.map((value, i) => {
      const angle = (i * angleStep) - Math.PI / 2
      const r = (value / 100) * radius
      const x = centerX + r * Math.cos(angle)
      const y = centerY + r * Math.sin(angle)
      return { x, y }
    }).reduce((acc, point, i) => {
      return acc + (i === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`)
    }, '') + ' Z'
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Competitive Advantage Analysis</h3>
      <svg width="100%" height="650" viewBox="0 0 600 650" className="overflow-visible">
        {/* Grid circles */}
        {[0.2, 0.4, 0.6, 0.8, 1].map((ratio, i) => (
          <circle
            key={i}
            cx={centerX}
            cy={centerY}
            r={radius * ratio}
            fill="none"
            stroke="rgba(148, 163, 184, 0.2)"
            strokeWidth="1"
          />
        ))}

        {/* Grid lines from center to categories */}
        {categoryPoints.map((point, i) => (
          <line
            key={i}
            x1={centerX}
            y1={centerY}
            x2={point.x}
            y2={point.y}
            stroke="rgba(148, 163, 184, 0.2)"
            strokeWidth="1"
          />
        ))}

        {/* Competitor radar areas */}
        {competitors.map((competitor, compIndex) => (
          <motion.g key={competitor.name}>
            <motion.path
              d={drawRadarPath(competitor.values)}
              fill={competitor.color}
              fillOpacity={competitor.name === 'ENERGY Logic' ? 0.4 : 0.2}
              stroke={competitor.color}
              strokeWidth={competitor.name === 'ENERGY Logic' ? 3 : 2}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: compIndex * 0.2 }}
            />
            {/* Data points */}
            {competitor.values.map((value, i) => {
              const angle = (i * angleStep) - Math.PI / 2
              const r = (value / 100) * radius
              const x = centerX + r * Math.cos(angle)
              const y = centerY + r * Math.sin(angle)
              return (
                <motion.circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={competitor.name === 'ENERGY Logic' ? 5 : 3}
                  fill={competitor.color}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: compIndex * 0.2 + i * 0.05, type: "spring" }}
                />
              )
            })}
          </motion.g>
        ))}

        {/* Category labels */}
        {categoryPoints.map((point, i) => (
          <text
            key={i}
            x={point.labelX}
            y={point.labelY}
            fill="#1e293b"
            fontSize="12"
            fontWeight="600"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {categories[i]}
          </text>
        ))}

        {/* Value labels on grid */}
        {[20, 40, 60, 80, 100].map((value, i) => {
          const ratio = (i + 1) / 5
          return (
            <text
              key={value}
              x={centerX + radius * ratio * Math.cos(-Math.PI / 2 - 0.2)}
              y={centerY + radius * ratio * Math.sin(-Math.PI / 2 - 0.2) + 4}
              fill="#64748b"
              fontSize="10"
              textAnchor="middle"
            >
              {value}
            </text>
          )
        })}

        {/* Legend */}
        <g transform="translate(50, 550)">
          {competitors.map((competitor, i) => (
            <g key={competitor.name} transform={`translate(0, ${i * 30})`}>
              <rect
                x={0}
                y={0}
                width={20}
                height={20}
                fill={competitor.color}
                fillOpacity={competitor.name === 'ENERGY Logic' ? 0.4 : 0.2}
                stroke={competitor.color}
                strokeWidth={competitor.name === 'ENERGY Logic' ? 2 : 1}
              />
              <text
                x={30}
                y={15}
                fill="#1e293b"
                fontSize="13"
                fontWeight={competitor.name === 'ENERGY Logic' ? 'bold' : 'normal'}
              >
                {competitor.name}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}
