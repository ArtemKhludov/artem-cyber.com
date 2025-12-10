'use client'

import { motion } from 'framer-motion'
import { Database, Brain, Layers, Target, AlertCircle, TrendingUp } from 'lucide-react'

const layers = [
  {
    name: 'Data Intake',
    icon: Database,
    color: 'blue',
    items: ['Daily Journal', 'Activity Trackers', 'Voice Notes', 'Environment Data']
  },
  {
    name: 'Processing Layer',
    icon: Brain,
    color: 'purple',
    items: ['Semantic Parsing', 'Emotional State Modeling', 'Pattern Recognition', 'Life-Domain Weighting']
  },
  {
    name: 'Logic Core',
    icon: Target,
    color: 'green',
    items: ['Energy Balance Model', 'Bottleneck Predictor', 'Task → Priority Converter', 'Resource Allocation Engine']
  },
  {
    name: 'Output Layer',
    icon: TrendingUp,
    color: 'pink',
    items: ['Personalized Roadmaps', 'Recommended Actions', 'Alerts & Predictive Signals', 'Daily Alignment Score']
  }
]

export function DataFlowDiagram() {
  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {layers.map((layer, index) => (
          <motion.div
            key={layer.name}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.15 }}
            className="relative"
          >
            {/* Connection arrow */}
            {index < layers.length - 1 && (
              <div className="hidden lg:block absolute top-1/2 -right-3 z-10">
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.15 + 0.3 }}
                  className="w-6 h-0.5 bg-gradient-to-r from-gray-300 to-transparent"
                />
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.15 + 0.5 }}
                  className="absolute right-0 top-1/2 transform -translate-y-1/2"
                >
                  <div className="w-0 h-0 border-l-8 border-l-gray-300 border-t-4 border-t-transparent border-b-4 border-b-transparent" />
                </motion.div>
              </div>
            )}

            <div className={`bg-gradient-to-br ${layer.color === 'blue' ? 'from-blue-50 to-cyan-50' :
                layer.color === 'purple' ? 'from-purple-50 to-pink-50' :
                  layer.color === 'green' ? 'from-green-50 to-emerald-50' :
                    'from-pink-50 to-rose-50'
              } rounded-2xl p-6 border-2 ${layer.color === 'blue' ? 'border-blue-200' :
                layer.color === 'purple' ? 'border-purple-200' :
                  layer.color === 'green' ? 'border-green-200' :
                    'border-pink-200'
              } shadow-lg h-full`}>
              <div className={`w-16 h-16 bg-gradient-to-br ${layer.color === 'blue' ? 'from-blue-500 to-cyan-500' :
                  layer.color === 'purple' ? 'from-purple-500 to-pink-500' :
                    layer.color === 'green' ? 'from-green-500 to-emerald-500' :
                      'from-pink-500 to-rose-500'
                } rounded-xl flex items-center justify-center mb-4`}>
                <layer.icon className="w-8 h-8 text-white" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {layer.name}
              </h3>

              <ul className="space-y-2">
                {layer.items.map((item, itemIndex) => (
                  <motion.li
                    key={item}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.15 + itemIndex * 0.1 }}
                    className="flex items-start space-x-2 text-sm text-gray-700"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${layer.color === 'blue' ? 'from-blue-500 to-cyan-500' :
                        layer.color === 'purple' ? 'from-purple-500 to-pink-500' :
                          layer.color === 'green' ? 'from-green-500 to-emerald-500' :
                            'from-pink-500 to-rose-500'
                      } mt-1.5 flex-shrink-0`} />
                    <span>{item}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Flow indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8 }}
        className="mt-8 text-center"
      >
        <div className="inline-flex items-center space-x-2 text-gray-600">
          <span className="text-sm font-medium">Data Flow Direction</span>
          <motion.div
            animate={{ x: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-2xl">→</span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
