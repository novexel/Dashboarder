import type { DataFieldType, VisualCategory } from '../core/types'

export const VISUAL_CATEGORIES: VisualCategory[] = [
  'KPI',
  'Time series',
  'Bar and column',
  'Area',
  'Pie and part-to-whole',
  'Scatter and relationship',
  'Distribution',
  'Statistical',
  'Heatmap',
  'Matrix',
  'Radar and polar',
  'Gauge and progress',
  'Geographic',
  'Financial',
  'Hierarchical',
  'Network',
  'Flow',
  'Timeline',
  'Project management',
  'Table',
  'Text and media',
  'Diagram',
  'Monitoring',
  'Product analytics',
  'Machine learning',
  'Scientific',
  '3D',
  'Custom',
]

export const NUMERIC_FIELD_TYPES: DataFieldType[] = [
  'number',
  'integer',
  'float',
  'currency',
  'percentage',
]

export const DIMENSION_FIELD_TYPES: DataFieldType[] = [
  'string',
  'category',
  'date',
  'datetime',
  'boolean',
]

export const LOCATION_FIELD_TYPES: DataFieldType[] = ['geo', 'latitude', 'longitude']
