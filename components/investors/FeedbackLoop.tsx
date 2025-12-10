'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Database, Brain, Target, TrendingUp } from 'lucide-react'

const stages = [
  { name: 'Input', icon: Database, color: 'blue', description: 'User data & behavior' },
  { name: 'Interpretation', icon: Brain, color: 'purple', description: 'AI analysis & modeling' },
  { name: 'Guidance', icon: Target, color: 'green', description: 'Personalized recommendations' },
  { name: 'Behavior Change', icon: TrendingUp, color: 'pink', description: 'User actions & outcomes' },
]

export function FeedbackLoop() {
  const centerX = 200
  const centerY = 200
  const radius = 140
  const angleStep = (2 * Math.PI) / stages.length

  return (
    <div className="w-full max-w-2xl mx-auto">
      <svg width="100%" height="450" viewBox="0 0 400 450" className="overflow-visible">
        {/* Circular path for arrows */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke="rgba(148, 163, 184, 0.2)"
          strokeWidth="2"
          strokeDasharray="4 4"
        />

        {/* Stage nodes */}
        {stages.map((stage, index) => {
          const angle = (index * angleStep) - Math.PI / 2
          const x = centerX + radius * Math.cos(angle)
          const y = centerY + radius * Math.sin(angle)

          return (
            <g key={stage.name}>
              {/* Connection line to next stage */}
              {index < stages.length - 1 && (() => {
                const nextAngle = ((index + 1) * angleStep) - Math.PI / 2
                const nextX = centerX + radius * Math.cos(nextAngle)
                const nextY = centerY + radius * Math.sin(nextAngle)
                const midX = centerX + (radius + 30) * Math.cos((angle + nextAngle) / 2)
                const midY = centerY + (radius + 30) * Math.sin((angle + nextAngle) / 2)

                return (
                  <motion.g
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.3 + 0.5 }}
                  >
                    <path
                      d={`M ${x} ${y} Q ${midX} ${midY} ${nextX} ${nextY}`}
                      fill="none"
                      stroke={`url(#gradient-${index})`}
                      strokeWidth="3"
                      markerEnd="url(#arrowhead)"
                    />
                    <defs>
                      <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={
                          stage.color === 'blue' ? '#3b82f6' :
                            stage.color === 'purple' ? '#8b5cf6' :
                              stage.color === 'green' ? '#10b981' :
                                '#ec4899'
                        } />
                        <stop offset="100%" stopColor={
                          stages[index + 1].color === 'blue' ? '#3b82f6' :
                            stages[index + 1].color === 'purple' ? '#8b5cf6' :
                              stages[index + 1].color === 'green' ? '#10b981' :
                                '#ec4899'
                        } />
                      </linearGradient>
                      <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="10"
                        refX="9"
                        refY="3"
                        orient="auto"
                      >
                        <polygon points="0 0, 10 3, 0 6" fill="currentColor" />
                      </marker>
                    </defs>
                  </motion.g>
                )
              })()}

              {/* Last connection back to first */}
              {index === stages.length - 1 && (() => {
                const firstAngle = -Math.PI / 2
                const firstX = centerX + radius * Math.cos(firstAngle)
                const firstY = centerY + radius * Math.sin(firstAngle)
                const midX = centerX + (radius + 30) * Math.cos((angle + firstAngle) / 2)
                const midY = centerY + (radius + 30) * Math.sin((angle + firstAngle) / 2)

                return (
                  <motion.g
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.3 + 0.5 }}
                  >
                    <path
                      d={`M ${x} ${y} Q ${midX} ${midY} ${firstX} ${firstY}`}
                      fill="none"
                      stroke="url(#gradient-final)"
                      strokeWidth="3"
                      markerEnd="url(#arrowhead-final)"
                    />
                    <defs>
                      <linearGradient id="gradient-final" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ec4899" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                      <marker
                        id="arrowhead-final"
                        markerWidth="10"
                        markerHeight="10"
                        refX="9"
                        refY="3"
                        orient="auto"
                      >
                        <polygon points="0 0, 10 3, 0 6" fill="currentColor" />
                      </marker>
                    </defs>
                  </motion.g>
                )
              })()}

              {/* Stage node */}
              <motion.g
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.2, type: "spring" }}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={45}
                  fill={`url(#nodeGradient-${index})`}
                  stroke="white"
                  strokeWidth="3"
                  className="shadow-lg"
                />
                <defs>
                  <linearGradient id={`nodeGradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={
                      stage.color === 'blue' ? '#3b82f6' :
                        stage.color === 'purple' ? '#8b5cf6' :
                          stage.color === 'green' ? '#10b981' :
                            '#ec4899'
                    } />
                    <stop offset="100%" stopColor={
                      stage.color === 'blue' ? '#1e40af' :
                        stage.color === 'purple' ? '#6d28d9' :
                          stage.color === 'green' ? '#059669' :
                            '#be185d'
                    } />
                  </linearGradient>
                </defs>

                {/* Icon */}
                <foreignObject x={x - 20} y={y - 25} width="40" height="40">
                  <div className="flex items-center justify-center">
                    <stage.icon className="w-8 h-8 text-white" />
                  </div>
                </foreignObject>

                {/* Label */}
                <text
                  x={x}
                  y={y + 70}
                  fill="#1e293b"
                  fontSize="14"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {stage.name}
                </text>
                <text
                  x={x}
                  y={y + 85}
                  fill="#64748b"
                  fontSize="11"
                  textAnchor="middle"
                >
                  {stage.description}
                </text>
              </motion.g>
            </g>
          )
        })}

        {/* Center label */}
        <motion.text
          x={centerX}
          y={centerY + 5}
          fill="#1e293b"
          fontSize="16"
          fontWeight="bold"
          textAnchor="middle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Continuous
        </motion.text>
        <motion.text
          x={centerX}
          y={centerY + 20}
          fill="#64748b"
          fontSize="12"
          textAnchor="middle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          Improvement Loop
        </motion.text>
      </svg>
    </div>
  )
}
