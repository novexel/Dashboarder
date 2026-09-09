import { registerVisual, type VisualPlugin } from '@novexel/dashboarder'

// Define custom domain plugin
export const customHealthScorePlugin: VisualPlugin = {
  id: 'enterprise-health-score',
  name: 'Security Health Score',
  category: 'Monitoring',
  renderer: 'custom',
  requiredMappings: [
    { key: 'score', label: 'Health Score (0-100)', required: true, acceptedTypes: ['number', 'integer'] },
  ],
  optionalMappings: [
    { key: 'status', label: 'Status Label', acceptedTypes: ['string', 'category'] },
  ],
  compatibleFieldTypes: [
    { mappingKey: 'score', acceptedTypes: ['number', 'integer'] },
  ],
  defaultSize: { w: 3, h: 3 },
  minSize: { w: 2, h: 2 },
  defaultStyle: {
    backgroundColor: '#0f172a',
    titleColor: '#38bdf8',
  },
}

// Register into the global catalog
registerVisual(customHealthScorePlugin)
