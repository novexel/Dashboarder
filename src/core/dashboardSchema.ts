import { z } from 'zod'
import type { DashboardConfig, DashboardWidgetConfig } from './types'
import { createDefaultWidgetStyle, createEmptyDashboardConfig } from './types'

export const widgetStyleSchema = z.object({
  backgroundColor: z.string(),
  borderColor: z.string(),
  borderRadius: z.number(),
  borderWidth: z.number(),
  padding: z.number(),
  shadow: z.string(),
  fontFamily: z.string(),
  fontSize: z.number(),
  titleColor: z.string(),
  subtitleColor: z.string(),
  axisLabelColor: z.string(),
  axisLineColor: z.string(),
  gridLineColor: z.string(),
  showGridLines: z.boolean(),
  showMinorGridLines: z.boolean(),
  legendPosition: z.enum([
    'top',
    'right',
    'bottom',
    'left',
    'horizontal-top-left',
    'horizontal-top-center',
    'horizontal-top-right',
    'horizontal-bottom-left',
    'horizontal-bottom-center',
    'horizontal-bottom-right',
    'vertical-right',
    'vertical-left',
  ]),
  legendAlign: z.enum(['start', 'center', 'end']),
  showLegend: z.boolean(),
  showTooltip: z.boolean(),
  tooltipBackground: z.string(),
  tooltipTextColor: z.string(),
  seriesColors: z.array(z.string()),
  colorPalette: z.string(),
  useGradient: z.boolean(),
  opacity: z.number(),
  strokeWidth: z.number(),
  strokeStyle: z.enum(['solid', 'dashed', 'dotted']),
  curveType: z.enum(['straight', 'smooth', 'step']),
  showMarkers: z.boolean(),
  markerShape: z.enum(['circle', 'rect', 'diamond', 'triangle']),
  markerSize: z.number(),
  showDataLabels: z.boolean(),
  dataLabelPosition: z.enum(['top', 'inside', 'bottom', 'left', 'right', 'center']),
  valueFormat: z.enum(['number', 'currency', 'percentage', 'compact', 'date']),
  dateFormat: z.string(),
  currencySymbol: z.string(),
  compactNumbers: z.boolean(),
  axisMin: z.number().optional(),
  axisMax: z.number().optional(),
  axisScaleType: z.enum(['linear', 'log', 'category', 'time']),
  animations: z.boolean(),
  animationDuration: z.number(),
  graphicZoom: z.number().optional(),
  panX: z.number().optional(),
  panY: z.number().optional(),
  kpiSubtitle: z.string().optional(),
  showRowCount: z.boolean().optional(),
  showComparisonDelta: z.boolean().optional(),
  hideWidgetName: z.boolean().optional(),
  hideWidgetType: z.boolean().optional(),
  fontSizeTitle: z.number().optional(),
  fontSizeSubtitle: z.number().optional(),
  fontSizeAxis: z.number().optional(),
  fontSizeLegend: z.number().optional(),
  fontSizeDataLabel: z.number().optional(),
  fontSizeTooltip: z.number().optional(),
  fontSizeValue: z.number().optional(),
  fontSizeTableHeader: z.number().optional(),
  fontSizeTableCell: z.number().optional(),
  fontSizeKpiSubtitle: z.number().optional(),
  fontSizeRowCount: z.number().optional(),
  fontSizeDelta: z.number().optional(),
  dataLabelColor: z.string().optional(),
  dataLabelBackgroundColor: z.string().optional(),
  dataLabelFontFamily: z.string().optional(),
  dataLabelFormat: z.enum(['value', 'category', 'percent', 'both']).optional(),
  hiddenDataLabels: z.array(z.string()).optional(),
  stacking: z.enum(['none', 'normal', 'percent']).optional(),
})

export const widgetSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  layout: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    minW: z.number().optional(),
    minH: z.number().optional(),
    maxW: z.number().optional(),
    maxH: z.number().optional(),
    static: z.boolean().optional(),
  }),
  data: z.object({
    dataSourceId: z.string().optional(),
    mappings: z.record(z.string(), z.union([z.string(), z.array(z.string()), z.undefined()])),
    aggregation: z
      .object({
        type: z.string(),
        field: z.string().optional(),
        groupBy: z.array(z.string()).optional(),
      })
      .optional(),
    filters: z
      .array(
        z.object({
          id: z.string(),
          field: z.string(),
          operator: z.string(),
          value: z.unknown().optional(),
          valueTo: z.unknown().optional(),
          sourceWidgetId: z.string().optional(),
        }),
      )
      .optional(),
    sort: z
      .array(
        z.object({
          field: z.string(),
          direction: z.enum(['asc', 'desc']),
        }),
      )
      .optional(),
    limit: z.number().optional(),
    calculatedFields: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          formula: z.string(),
        }),
      )
      .optional(),
  }),
  labels: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    xAxis: z.string().optional(),
    yAxis: z.string().optional(),
    secondaryYAxis: z.string().optional(),
    legend: z.record(z.string(), z.string()).optional(),
    tooltip: z.record(z.string(), z.string()).optional(),
    dataLabels: z.record(z.string(), z.string()).optional(),
  }),
  style: widgetStyleSchema,
  interactions: z
    .object({
      drilldown: z
        .object({
          targetWidgetId: z.string().optional(),
          targetField: z.string().optional(),
        })
        .optional(),
      clickAction: z
        .object({
          type: z.string().optional(),
          url: z.string().optional(),
        })
        .optional(),
      hoverAction: z
        .object({
          type: z.string().optional(),
        })
        .optional(),
      linkedFilters: z.array(z.string()).optional(),
      ignoreCrossFilters: z.boolean().optional(),
    })
    .optional(),
  pluginConfig: z.record(z.string(), z.unknown()).optional(),
  layers: z
    .array(
      z.object({
        id: z.string(),
        type: z.string(),
        mappings: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
        style: z.record(z.string(), z.unknown()),
        visible: z.boolean(),
        zIndex: z.number().optional(),
      }),
    )
    .optional(),
})

export const dashboardConfigSchema = z.object({
  version: z.string(),
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  widgets: z.array(widgetSchema),
  globalFilters: z
    .array(
      z.object({
        id: z.string(),
        field: z.string(),
        operator: z.string(),
        value: z.unknown().optional(),
        valueTo: z.unknown().optional(),
        sourceWidgetId: z.string().optional(),
      }),
    )
    .default([]),
  theme: z
    .object({
      mode: z.enum(['light', 'dark', 'system']).optional(),
      accentColor: z.string().optional(),
      backgroundColor: z.string().optional(),
      cardColor: z.string().optional(),
      textColor: z.string().optional(),
      mutedTextColor: z.string().optional(),
      borderColor: z.string().optional(),
      fontFamily: z.string().optional(),
      defaultChartPalette: z.array(z.string()).optional(),
      radiusScale: z.number().optional(),
      spacingScale: z.number().optional(),
      shadowStyle: z.string().optional(),
    })
    .optional(),
  layout: z
    .object({
      columns: z.number().optional(),
      rowHeight: z.number().optional(),
      compactType: z.enum(['vertical', 'horizontal']).nullable().optional(),
    })
    .optional(),
  variables: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
      }),
    )
    .default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  targetWidgetId: z.string().optional(),
})

export const migrateDashboardConfig = (input: unknown): DashboardConfig => {
  const base = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}
  const rawWidgets = Array.isArray(base.widgets) ? base.widgets : []

  const defaultStyle = createDefaultWidgetStyle()
  const normalizedWidgets = rawWidgets.map((rawW) => {
    const w = typeof rawW === 'object' && rawW !== null ? (rawW as Record<string, unknown>) : {}
    return {
      id: String(w.id || 'widget-migrated'),
      type: String(w.type || 'bar-chart'),
      title: typeof w.title === 'string' ? w.title : undefined,
      description: typeof w.description === 'string' ? w.description : undefined,
      layout: {
        x: Number((w.layout as any)?.x ?? 0),
        y: Number((w.layout as any)?.y ?? 0),
        w: Number((w.layout as any)?.w ?? 4),
        h: Number((w.layout as any)?.h ?? 4),
        minW: (w.layout as any)?.minW,
        minH: (w.layout as any)?.minH,
        maxW: (w.layout as any)?.maxW,
        maxH: (w.layout as any)?.maxH,
        static: Boolean((w.layout as any)?.static),
      },
      data: {
        dataSourceId: (w.data as any)?.dataSourceId,
        mappings: (w.data as any)?.mappings ?? {},
        aggregation: (w.data as any)?.aggregation,
        filters: (w.data as any)?.filters ?? [],
        sort: (w.data as any)?.sort ?? [],
        limit: (w.data as any)?.limit,
        calculatedFields: (w.data as any)?.calculatedFields,
      },
      labels: (w.labels as any) ?? {},
      style: {
        ...defaultStyle,
        ...((w.style as any) ?? {}),
      },
      interactions: (w.interactions as any) ?? {},
      pluginConfig: (w.pluginConfig as any) ?? {},
      layers: (w.layers as any) ?? [],
    }
  })

  return dashboardConfigSchema.parse({
    ...createEmptyDashboardConfig(),
    ...base,
    widgets: normalizedWidgets,
  }) as DashboardConfig
}
