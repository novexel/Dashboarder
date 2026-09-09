import type { ComponentType } from 'react'

export type DataFieldType =
  | 'string'
  | 'number'
  | 'integer'
  | 'float'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'category'
  | 'currency'
  | 'percentage'
  | 'geo'
  | 'latitude'
  | 'longitude'
  | 'url'
  | 'email'
  | 'json'
  | 'array'
  | 'object'
  | 'unknown'

export type DataSourceType = 'static' | 'json' | 'csv' | 'api' | 'database' | 'custom'

export type DashboardRow = Record<string, unknown>

export type DataField = {
  name: string
  label: string
  type: DataFieldType
  nullable?: boolean
  uniqueCount?: number
  sampleValues?: unknown[]
}

export type ApiAuthType = 'none' | 'bearer' | 'apiKeyHeader' | 'apiKeyQuery' | 'basic'

export type ApiConnectorConfig = {
  url: string
  method: 'GET' | 'POST'
  authType: ApiAuthType
  bearerToken?: string
  apiKeyName?: string
  apiKeyValue?: string
  username?: string
  password?: string
  headers?: Record<string, string>
  body?: string
  responsePath?: string
}

export type DataSource = {
  id: string
  name: string
  type: DataSourceType
  rows: DashboardRow[]
  fields: DataField[]
  metadata?: Record<string, unknown>
  connector?: ApiConnectorConfig
}

export type AggregationType =
  | 'sum'
  | 'average'
  | 'median'
  | 'min'
  | 'max'
  | 'count'
  | 'countDistinct'
  | 'first'
  | 'last'
  | 'standardDeviation'
  | 'variance'
  | 'percentile'

export type AggregationConfig = {
  type: AggregationType
  field?: string
  groupBy?: string[]
}

export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'doesNotContain'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'between'
  | 'inList'
  | 'notInList'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'dateBefore'
  | 'dateAfter'
  | 'dateRange'
  | 'relativeDate'

export type FilterConfig = {
  id: string
  field: string
  operator: FilterOperator
  value?: unknown
  valueTo?: unknown
  sourceWidgetId?: string
}

export type SortConfig = {
  field: string
  direction: 'asc' | 'desc'
}

export type CalculatedFieldConfig = {
  id: string
  name: string
  formula: string
}

export type DashboardVariable = {
  id: string
  name: string
  value: string | number | boolean | null
}

export type DashboardLayoutConfig = {
  columns?: number
  rowHeight?: number
  compactType?: 'vertical' | 'horizontal' | null
}

export type DashboardThemeConfig = {
  mode?: 'light' | 'dark' | 'system'
  accentColor?: string
  backgroundColor?: string
  cardColor?: string
  textColor?: string
  mutedTextColor?: string
  borderColor?: string
  fontFamily?: string
  defaultChartPalette?: string[]
  radiusScale?: number
  spacingScale?: number
  shadowStyle?: string
}

export type DrilldownConfig = {
  targetWidgetId?: string
  targetField?: string
}

export type ClickActionConfig = {
  type?: 'none' | 'link' | 'filter'
  url?: string
}

export type HoverActionConfig = {
  type?: 'none' | 'highlight'
}

export type VisualLayer = {
  id: string
  type: string
  mappings: Record<string, string | string[]>
  style: Record<string, unknown>
  visible: boolean
  zIndex?: number
}

export type WidgetStyleConfig = {
  backgroundColor: string
  borderColor: string
  borderRadius: number
  borderWidth: number
  padding: number
  shadow: string
  fontFamily: string
  fontSize: number
  titleColor: string
  subtitleColor: string
  axisLabelColor: string
  axisLineColor: string
  gridLineColor: string
  showGridLines: boolean
  showMinorGridLines: boolean
  legendPosition:
    | 'top'
    | 'right'
    | 'bottom'
    | 'left'
    | 'horizontal-top-left'
    | 'horizontal-top-center'
    | 'horizontal-top-right'
    | 'horizontal-bottom-left'
    | 'horizontal-bottom-center'
    | 'horizontal-bottom-right'
    | 'vertical-right'
    | 'vertical-left'
  legendAlign: 'start' | 'center' | 'end'
  showLegend: boolean
  showTooltip: boolean
  tooltipBackground: string
  tooltipTextColor: string
  seriesColors: string[]
  colorPalette: string
  useGradient: boolean
  opacity: number
  strokeWidth: number
  strokeStyle: 'solid' | 'dashed' | 'dotted'
  curveType: 'straight' | 'smooth' | 'step'
  showMarkers: boolean
  markerShape: 'circle' | 'rect' | 'diamond' | 'triangle'
  markerSize: number
  showDataLabels: boolean
  dataLabelPosition: 'top' | 'inside' | 'bottom' | 'left' | 'right' | 'center'
  valueFormat: 'number' | 'currency' | 'percentage' | 'compact' | 'date'
  dateFormat: string
  currencySymbol: string
  compactNumbers: boolean
  axisMin?: number
  axisMax?: number
  axisScaleType: 'linear' | 'log' | 'category' | 'time'
  animations: boolean
  animationDuration: number
  graphicZoom?: number
  panX?: number
  panY?: number
  kpiSubtitle?: string
  showRowCount?: boolean
  showComparisonDelta?: boolean
  hideWidgetName?: boolean
  hideWidgetType?: boolean
  fontSizeTitle?: number
  fontSizeSubtitle?: number
  fontSizeAxis?: number
  fontSizeLegend?: number
  fontSizeDataLabel?: number
  fontSizeTooltip?: number
  fontSizeValue?: number
  fontSizeTableHeader?: number
  fontSizeTableCell?: number
  fontSizeKpiSubtitle?: number
  fontSizeRowCount?: number
  fontSizeDelta?: number
  dataLabelColor?: string
  dataLabelBackgroundColor?: string
  dataLabelFontFamily?: string
  dataLabelFormat?: 'value' | 'category' | 'percent' | 'both'
  hiddenDataLabels?: string[]
  stacking?: 'none' | 'normal' | 'percent'
}

export type WidgetDataConfig = {
  dataSourceId?: string
  mappings: Record<string, string | string[] | undefined>
  aggregation?: AggregationConfig
  filters?: FilterConfig[]
  sort?: SortConfig[]
  limit?: number
  calculatedFields?: CalculatedFieldConfig[]
}

export type DashboardWidgetConfig = {
  id: string
  type: string
  title?: string
  description?: string
  layout: {
    x: number
    y: number
    w: number
    h: number
    minW?: number
    minH?: number
    maxW?: number
    maxH?: number
    static?: boolean
  }
  data: WidgetDataConfig
  labels: {
    title?: string
    subtitle?: string
    xAxis?: string
    yAxis?: string
    secondaryYAxis?: string
    legend?: Record<string, string>
    tooltip?: Record<string, string>
    dataLabels?: Record<string, string>
  }
  style: WidgetStyleConfig
  interactions?: {
    drilldown?: DrilldownConfig
    clickAction?: ClickActionConfig
    hoverAction?: HoverActionConfig
    linkedFilters?: string[]
    ignoreCrossFilters?: boolean
  }
  pluginConfig?: Record<string, unknown>
  layers?: VisualLayer[]
}

export type DashboardConfig = {
  version: string
  id?: string
  name?: string
  description?: string
  widgets: DashboardWidgetConfig[]
  globalFilters?: FilterConfig[]
  theme?: DashboardThemeConfig
  layout?: DashboardLayoutConfig
  variables?: DashboardVariable[]
  createdAt?: string
  updatedAt?: string
  targetWidgetId?: string
}

export type VisualCategory =
  | 'Advanced'
  | 'KPI'
  | 'Time series'
  | 'Bar and column'
  | 'Area'
  | 'Pie and part-to-whole'
  | 'Scatter and relationship'
  | 'Distribution'
  | 'Statistical'
  | 'Heatmap'
  | 'Matrix'
  | 'Radar and polar'
  | 'Gauge and progress'
  | 'Geographic'
  | 'Financial'
  | 'Hierarchical'
  | 'Network'
  | 'Flow'
  | 'Timeline'
  | 'Project management'
  | 'Table'
  | 'Text and media'
  | 'Diagram'
  | 'Monitoring'
  | 'Product analytics'
  | 'Machine learning'
  | 'Scientific'
  | '3D'
  | 'Custom'

export type FieldMappingRequirement = {
  key: string
  label: string
  required?: boolean
  acceptedTypes?: DataFieldType[]
  multiple?: boolean
}

export type CompatibleFieldRule = {
  mappingKey: string
  acceptedTypes: DataFieldType[]
}

export type TransformDataArgs = {
  dataSource?: DataSource
  rows: DashboardRow[]
  widget: DashboardWidgetConfig
}

export type BuildOptionsArgs = TransformDataArgs

export type VisualRendererKind = 'echarts' | 'kpi' | 'table' | 'placeholder' | 'custom'

export type VisualPlugin = {
  id: string
  name: string
  category: VisualCategory
  description?: string
  icon?: ComponentType
  renderer: VisualRendererKind
  component?: ComponentType
  requiredMappings: FieldMappingRequirement[]
  optionalMappings?: FieldMappingRequirement[]
  compatibleFieldTypes: CompatibleFieldRule[]
  defaultSize: { w: number; h: number }
  minSize?: { w: number; h: number }
  defaultStyle?: Partial<WidgetStyleConfig>
  transformData?: (args: TransformDataArgs) => unknown
  buildOptions?: (args: BuildOptionsArgs) => unknown
  implemented?: boolean
}

export type DashboardBuilderMode = 'builder' | 'preview'

export type DashboardBuilderProps = {
  dataSources?: DataSource[]
  initialConfig?: DashboardConfig
  config?: DashboardConfig
  mode?: DashboardBuilderMode
  onSave?: (config: DashboardConfig) => void
  onChange?: (config: DashboardConfig) => void
  onReset?: () => void
  authProvider?: unknown
  theme?: DashboardThemeConfig
  storageKey?: string
  className?: string
  loaderComponent?: React.ReactNode
}

export type DashboardRendererProps = {
  dataSources?: DataSource[]
  config: DashboardConfig
  className?: string
}

const DEFAULT_SERIES_COLORS = ['#0f766e', '#2563eb', '#ea580c', '#7c3aed', '#be123c', '#0891b2']

export const createDefaultWidgetStyle = (): WidgetStyleConfig => ({
  backgroundColor: '#ffffff',
  borderColor: '#dbe4f0',
  borderRadius: 24,
  borderWidth: 1,
  padding: 18,
  shadow: 'panel',
  fontFamily: 'Manrope, Segoe UI, sans-serif',
  fontSize: 14,
  titleColor: '#0f172a',
  subtitleColor: '#475569',
  axisLabelColor: '#475569',
  axisLineColor: '#94a3b8',
  gridLineColor: '#dbe4f0',
  showGridLines: true,
  showMinorGridLines: false,
  legendPosition: 'top',
  legendAlign: 'start',
  showLegend: true,
  showTooltip: true,
  tooltipBackground: '#0f172a',
  tooltipTextColor: '#f8fafc',
  seriesColors: DEFAULT_SERIES_COLORS,
  colorPalette: 'teal-sunrise',
  useGradient: false,
  opacity: 0.9,
  strokeWidth: 3,
  strokeStyle: 'solid',
  curveType: 'straight',
  showMarkers: true,
  markerShape: 'circle',
  markerSize: 10,
  showDataLabels: false,
  dataLabelPosition: 'top',
  valueFormat: 'number',
  dateFormat: 'MMM yyyy',
  currencySymbol: '$',
  compactNumbers: true,
  axisScaleType: 'linear',
  animations: true,
  animationDuration: 500,
  graphicZoom: 1,
  panX: 0,
  panY: 0,
  showRowCount: true,
  showComparisonDelta: true,
  hideWidgetName: false,
  hideWidgetType: true,
  fontSizeTitle: 14,
  fontSizeSubtitle: 12,
  fontSizeAxis: 12,
  fontSizeLegend: 12,
  fontSizeDataLabel: 12,
  fontSizeTooltip: 14,
  fontSizeValue: 36,
  fontSizeTableHeader: 11,
  fontSizeTableCell: 14,
  fontSizeKpiSubtitle: 12,
  fontSizeRowCount: 14,
  fontSizeDelta: 12,
  dataLabelColor: '#f8fafc',
  dataLabelBackgroundColor: '#0f172a80',
  dataLabelFontFamily: 'Manrope, Segoe UI, sans-serif',
})

export const createEmptyDashboardConfig = (name = 'Untitled Dashboard'): DashboardConfig => {
  const timestamp = new Date().toISOString()

  return {
    version: '1.0.0',
    name,
    widgets: [],
    globalFilters: [],
    variables: [],
    layout: {
      columns: 12,
      rowHeight: 48,
      compactType: 'vertical',
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function adjustWidgetForTheme(widget: DashboardWidgetConfig, themeMode: 'light' | 'dark'): DashboardWidgetConfig {
  if (themeMode === 'dark') {
    const isDefaultWhite = widget.style.backgroundColor.toLowerCase() === '#ffffff' || widget.style.backgroundColor.toLowerCase() === '#fff'
    const isDefaultBorder = widget.style.borderColor.toLowerCase() === '#dbe4f0'
    const isDefaultTitle = widget.style.titleColor.toLowerCase() === '#0f172a'
    const isDefaultGrid = widget.style.gridLineColor.toLowerCase() === '#dbe4f0'
    const isDefaultAxisLabel = widget.style.axisLabelColor?.toLowerCase() === '#475569'
    const isDefaultAxisLine = widget.style.axisLineColor?.toLowerCase() === '#94a3b8'

    return {
      ...widget,
      style: {
        ...widget.style,
        backgroundColor: isDefaultWhite ? '#0f172a' : widget.style.backgroundColor,
        borderColor: isDefaultBorder ? '#1e293b' : widget.style.borderColor,
        titleColor: isDefaultTitle ? '#f8fafc' : widget.style.titleColor,
        gridLineColor: isDefaultGrid ? '#1e293b' : widget.style.gridLineColor,
        axisLabelColor: isDefaultAxisLabel ? '#94a3b8' : widget.style.axisLabelColor,
        axisLineColor: isDefaultAxisLine ? '#475569' : widget.style.axisLineColor,
      }
    }
  }
  return widget
}
