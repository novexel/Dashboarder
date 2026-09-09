import type {
  BarSeriesOption,
  EChartsOption,
  LineSeriesOption,
} from 'echarts'
import type { AggregationType, DashboardRow, DashboardWidgetConfig, DataFieldType, DataSource, VisualPlugin } from '../core/types'
import { createDefaultWidgetStyle } from '../core/types'
import { DIMENSION_FIELD_TYPES, NUMERIC_FIELD_TYPES } from './pluginTypes'

const visualRegistry = new Map<string, VisualPlugin>()

const uniqueId = (prefix: string) =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? `${prefix}-${crypto.randomUUID().slice(0, 8)}` : `${prefix}-${Math.random().toString(36).slice(2, 10)}`

const toDisplayLabel = (value: unknown) => String(value ?? 'Unknown')

const toNumericValue = (value: unknown) => {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[,$%]/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

export const aggregateValues = (rows: DashboardRow[], valueField: string, type?: AggregationType): number => {
  if (rows.length === 0) return 0
  
  if (!type) {
    return toNumericValue(rows[0][valueField])
  }

  const values = rows.map((row) => toNumericValue(row[valueField]))

  switch (type) {
    case 'sum':
      return values.reduce((sum, val) => sum + val, 0)
    case 'average':
      return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
    case 'min':
      return Math.min(...values)
    case 'max':
      return Math.max(...values)
    case 'count':
      return values.length
    default:
      return values[0] ?? 0
  }
}

const getMappedField = (widget: DashboardWidgetConfig, key: string) => {
  const mapping = widget.data.mappings[key]
  return Array.isArray(mapping) ? mapping[0] : mapping
}

const getMappedFields = (widget: DashboardWidgetConfig, key: string): string[] => {
  const mapping = widget.data.mappings[key]
  if (!mapping) return []
  return Array.isArray(mapping) ? mapping : [mapping]
}

const getSeriesPalette = (widget: DashboardWidgetConfig) =>
  widget.style.seriesColors.length > 0 ? widget.style.seriesColors : createDefaultWidgetStyle().seriesColors

const getLabelPosition = (widget: DashboardWidgetConfig) => {
  return widget.style.dataLabelPosition === 'center' ? 'inside' : widget.style.dataLabelPosition
}

const getLabelConfig = (widget: DashboardWidgetConfig, totalSum?: number) => {
  if (!widget.style.showDataLabels) return undefined
  
  const format = widget.style.dataLabelFormat ?? 'value'
  const hiddenLabels = widget.style.hiddenDataLabels ?? []

  return {
    show: true,
    position: getLabelPosition(widget),
    color: widget.style.dataLabelColor,
    backgroundColor: widget.style.dataLabelBackgroundColor,
    fontFamily: widget.style.dataLabelFontFamily,
    fontSize: widget.style.fontSizeDataLabel ?? 12,
    borderRadius: 4,
    padding: [4, 6],
    formatter: (params: any) => {
      const labelName = params.name || params.seriesName || ''
      if (hiddenLabels.includes(labelName) || hiddenLabels.includes(params.seriesName)) {
        return ''
      }
      
      let valStr = String(params.value)
      if (Array.isArray(params.value)) {
        valStr = String(params.value[1] ?? params.value[0])
      }
      
      let percentStr = ''
      if (params.percent !== undefined) {
         percentStr = `${params.percent}%`
      } else if (totalSum && totalSum > 0) {
         const numericVal = Number(valStr.replace(/[^0-9.-]+/g, ''))
         if (!isNaN(numericVal)) {
           percentStr = `${((numericVal / totalSum) * 100).toFixed(1)}%`
         }
      }

      switch(format) {
         case 'category': return labelName
         case 'percent': return percentStr || valStr
         case 'both': return `${labelName}: ${valStr}`
         case 'value':
         default:
           return valStr
      }
    }
  }
}

const getPluginMappings = (plugin: VisualPlugin) => [...plugin.requiredMappings, ...(plugin.optionalMappings ?? [])]

const MAPPING_TYPE_PRIORITIES: Partial<Record<string, DataFieldType[]>> = {
  x: ['date', 'datetime', 'category', 'string', 'number', 'integer', 'float', 'currency', 'percentage'],
  y: NUMERIC_FIELD_TYPES,
  label: ['string', 'category', 'date', 'datetime', 'boolean'],
  category: ['string', 'category', 'date', 'datetime', 'boolean'],
  series: ['string', 'category', 'boolean', 'date', 'datetime'],
  source: ['string', 'category'],
  target: ['string', 'category'],
  start: ['date', 'datetime'],
  metric: NUMERIC_FIELD_TYPES,
  comparison: NUMERIC_FIELD_TYPES,
  value: NUMERIC_FIELD_TYPES,
  size: NUMERIC_FIELD_TYPES,
}

const fieldMatchesAcceptedTypes = (fieldType: DataFieldType, acceptedTypes?: DataFieldType[]) =>
  !acceptedTypes?.length || acceptedTypes.includes(fieldType)

const getRankedFieldsForRequirement = ({
  dataSource,
  mappingKey,
  acceptedTypes,
  preferredFieldType,
  usedFields,
}: {
  dataSource: DataSource
  mappingKey: string
  acceptedTypes?: DataFieldType[]
  preferredFieldType?: DataFieldType
  usedFields: Set<string>
}) => {
  const mappingPriority = MAPPING_TYPE_PRIORITIES[mappingKey] ?? acceptedTypes ?? []

  return dataSource.fields
    .filter((field) => fieldMatchesAcceptedTypes(field.type, acceptedTypes))
    .sort((left, right) => {
      const leftPreferredScore =
        preferredFieldType && left.type === preferredFieldType && fieldMatchesAcceptedTypes(left.type, acceptedTypes) ? 100 : 0
      const rightPreferredScore =
        preferredFieldType && right.type === preferredFieldType && fieldMatchesAcceptedTypes(right.type, acceptedTypes) ? 100 : 0

      const leftUnusedScore = usedFields.has(left.name) ? 0 : 10
      const rightUnusedScore = usedFields.has(right.name) ? 0 : 10

      const leftPriorityScore = mappingPriority.includes(left.type) ? mappingPriority.length - mappingPriority.indexOf(left.type) : 0
      const rightPriorityScore = mappingPriority.includes(right.type) ? mappingPriority.length - mappingPriority.indexOf(right.type) : 0

      const leftScore = leftPreferredScore + leftUnusedScore + leftPriorityScore
      const rightScore = rightPreferredScore + rightUnusedScore + rightPriorityScore

      if (rightScore !== leftScore) {
        return rightScore - leftScore
      }

      return left.label.localeCompare(right.label)
    })
}

const createSuggestedMappings = (plugin: VisualPlugin, dataSource?: DataSource, preferredFieldType?: DataFieldType) => {
  if (!dataSource) {
    return {}
  }

  const mappings: DashboardWidgetConfig['data']['mappings'] = {}
  const usedFields = new Set<string>()

  getPluginMappings(plugin).forEach((requirement) => {
    const rankedFields = getRankedFieldsForRequirement({
      dataSource,
      mappingKey: requirement.key,
      acceptedTypes: requirement.acceptedTypes,
      preferredFieldType,
      usedFields,
    })

    if (rankedFields.length === 0) {
      return
    }

    if (requirement.multiple) {
      const preferredFields = rankedFields.filter((field) => !usedFields.has(field.name))
      const nextFields = (preferredFields.length > 0 ? preferredFields : rankedFields).slice(0, 6)

      if (nextFields.length > 0) {
        mappings[requirement.key] = nextFields.map((field) => field.name)
        nextFields.forEach((field) => usedFields.add(field.name))
      }

      return
    }

    const nextField = rankedFields.find((field) => !usedFields.has(field.name)) ?? rankedFields[0]

    if (nextField) {
      mappings[requirement.key] = nextField.name
      usedFields.add(nextField.name)
    }
  })

  if (plugin.id === 'data-table' && !mappings.columns) {
    mappings.columns = dataSource.fields.slice(0, 6).map((field) => field.name)
  }

  return mappings
}

const createBaseOption = (widget: DashboardWidgetConfig): EChartsOption => ({
  color: getSeriesPalette(widget),
  animation: widget.style.animations,
  animationDuration: widget.style.animationDuration,
  textStyle: {
    fontFamily: widget.style.fontFamily,
    fontSize: widget.style.fontSizeAxis ?? 12,
    color: widget.style.axisLabelColor,
  },
  tooltip: widget.style.showTooltip
    ? {
        trigger: 'axis',
        backgroundColor: widget.style.tooltipBackground,
        textStyle: {
          color: widget.style.tooltipTextColor,
          fontSize: widget.style.fontSizeTooltip ?? 14,
        },
      }
    : undefined,
  legend: (() => {
    if (!widget.style.showLegend) return undefined

    const pos = widget.style.legendPosition || 'top'
    let orient: 'horizontal' | 'vertical' = 'horizontal'
    let top: string | number | undefined = undefined
    let bottom: string | number | undefined = undefined
    let left: string | number | undefined = undefined
    let right: string | number | undefined = undefined

    switch (pos) {
      case 'horizontal-top-left':
        orient = 'horizontal'
        top = 0
        left = 0
        break
      case 'horizontal-top-center':
      case 'top':
        orient = 'horizontal'
        top = 0
        left = 'center'
        break
      case 'horizontal-top-right':
        orient = 'horizontal'
        top = 0
        right = 0
        break
      case 'horizontal-bottom-left':
        orient = 'horizontal'
        bottom = 0
        left = 0
        break
      case 'horizontal-bottom-center':
      case 'bottom':
        orient = 'horizontal'
        bottom = 0
        left = 'center'
        break
      case 'horizontal-bottom-right':
        orient = 'horizontal'
        bottom = 0
        right = 0
        break
      case 'vertical-right':
      case 'right':
        orient = 'vertical'
        top = 'middle'
        right = 0
        break
      case 'vertical-left':
      case 'left':
        orient = 'vertical'
        top = 'middle'
        left = 0
        break
      default:
        orient = 'horizontal'
        top = 0
        left = 'center'
    }

    return {
      orient,
      top,
      bottom,
      left,
      right,
      textStyle: {
        color: widget.style.axisLabelColor,
        fontSize: widget.style.fontSizeLegend ?? 12,
      },
    }
  })(),
  grid: (() => {
    const pos = widget.style.legendPosition || 'top'
    const showL = widget.style.showLegend
    return {
      left: showL && (pos === 'vertical-left' || pos === 'left') ? 90 : 8,
      right: showL && (pos === 'vertical-right' || pos === 'right') ? 90 : 8,
      top: showL && (pos.startsWith('horizontal-top') || pos === 'top') ? 44 : 16,
      bottom: showL && (pos.startsWith('horizontal-bottom') || pos === 'bottom') ? 44 : 12,
      containLabel: true,
    }
  })(),
})

const buildCartesianOption = ({
  widget,
  rows,
  seriesType,
  orientation = 'vertical',
  area = false,
}: {
  widget: DashboardWidgetConfig
  rows: DashboardRow[]
  seriesType: 'line' | 'bar'
  orientation?: 'vertical' | 'horizontal'
  area?: boolean
}): EChartsOption => {
  const xField = getMappedField(widget, orientation === 'horizontal' ? 'category' : 'x')
  const yField = getMappedField(widget, orientation === 'horizontal' ? 'value' : 'y')
  const seriesField = getMappedField(widget, 'series')

  if (!xField || !yField) {
    return createBaseOption(widget)
  }

  const groupedData = new Map<string, DashboardRow[]>()
  const categories = new Set<string>()
  const seriesNames = new Set<string>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const cat = toDisplayLabel(row[xField])
    const ser = seriesField ? toDisplayLabel(row[seriesField]) : 'Series'
    
    categories.add(cat)
    seriesNames.add(ser)
    
    const key = `${ser}\0${cat}`
    let group = groupedData.get(key)
    if (!group) {
      group = []
      groupedData.set(key, group)
    }
    group.push(row)
  }

  const seriesArray = Array.from(seriesNames).slice(0, 50)
  const categoriesArray = Array.from(categories).slice(0, 2000)

  const categoryTotals = new Map<string, number>()
  if (widget.style.stacking === 'percent') {
    categoriesArray.forEach(category => {
      let sum = 0
      seriesArray.forEach(seriesName => {
        const matches = groupedData.get(`${seriesName}\0${category}`) ?? []
        const val = aggregateValues(matches, yField, widget.data.aggregation?.type)
        if (typeof val === 'number') {
          sum += Math.max(0, val)
        }
      })
      categoryTotals.set(category, sum)
    })
  }

  const stackValue = widget.style.stacking === 'normal' || widget.style.stacking === 'percent' ? 'total' : undefined

  const series: Array<LineSeriesOption | BarSeriesOption> = seriesArray.map((seriesName, index) => {
    let data = categoriesArray.map((category) => {
      const matches = groupedData.get(`${seriesName}\0${category}`) ?? []
      return aggregateValues(matches, yField, widget.data.aggregation?.type)
    })

    if (widget.style.stacking === 'percent') {
      data = data.map((val, idx) => {
        if (typeof val === 'number') {
          const catSum = categoryTotals.get(categoriesArray[idx]) || 0
          return catSum > 0 ? Number(((val / catSum) * 100).toFixed(2)) : 0
        }
        return val
      })
    }

    const totalSum = data.reduce((acc, val) => acc + (typeof val === 'number' ? val : 0), 0)

    if (seriesType === 'line') {
      return {
        name: seriesName,
        type: 'line',
        stack: stackValue,
        smooth: widget.style.curveType === 'smooth',
        step: widget.style.curveType === 'step' ? 'end' : false,
        symbol: widget.style.showMarkers ? widget.style.markerShape : 'none',
        symbolSize: widget.style.markerSize,
        lineStyle: {
          width: widget.style.strokeWidth,
          type: widget.style.strokeStyle,
        },
        areaStyle: area
          ? {
              opacity: widget.style.opacity,
            }
          : undefined,
        itemStyle: {
          opacity: widget.style.opacity,
        },
        label: getLabelConfig(widget, totalSum as number),
        data,
        emphasis: {
          focus: 'series',
        },
        z: index + 1,
      }
    }

    return {
      name: seriesName,
      type: 'bar',
      stack: stackValue,
      itemStyle: {
        opacity: widget.style.opacity,
      },
      label: getLabelConfig(widget, totalSum as number),
      data,
      emphasis: {
        focus: 'series',
      },
      z: index + 1,
    }
  })

  const axisCommon = {
    axisLine: {
      lineStyle: {
        color: widget.style.axisLineColor,
      },
    },
    axisLabel: {
      color: widget.style.axisLabelColor,
      fontSize: widget.style.fontSizeAxis ?? 12,
    },
    splitLine: {
      show: widget.style.showGridLines,
      lineStyle: {
        color: widget.style.gridLineColor,
      },
    },
  }

  return {
    ...createBaseOption(widget),
    tooltip: widget.style.showTooltip
      ? {
          ...(createBaseOption(widget).tooltip ?? {}),
          trigger: seriesType === 'bar' ? 'axis' : 'axis',
        }
      : undefined,
    xAxis:
      orientation === 'horizontal'
        ? {
            type: widget.style.axisScaleType === 'time' ? 'time' : 'value',
            min: widget.style.axisMin,
            max: widget.style.axisMax,
            ...axisCommon,
          }
        : {
            type: widget.style.axisScaleType === 'time' ? 'category' : 'category',
            data: categoriesArray,
            ...axisCommon,
          },
    yAxis:
      orientation === 'horizontal'
        ? {
            type: 'category',
            data: categoriesArray,
            ...axisCommon,
          }
        : {
            type: widget.style.axisScaleType === 'log' ? 'log' : 'value',
            min: widget.style.axisMin,
            max: widget.style.axisMax,
            ...axisCommon,
          },
    series,
  }
}

const buildPieOption = ({ widget, rows, donut = false, funnel = false }: { widget: DashboardWidgetConfig; rows: DashboardRow[]; donut?: boolean; funnel?: boolean }): EChartsOption => {
  const labelField = getMappedField(widget, 'label')
  const valueField = getMappedField(widget, 'value')

  if (!labelField || !valueField) {
    return createBaseOption(widget)
  }

  // Get unique labels to group by and cap them to prevent SVG/canvas freezes
  const categories = Array.from(new Set(rows.map((row) => toDisplayLabel(row[labelField])))).slice(0, 500)

  const groupedData = new Map<string, DashboardRow[]>()
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const cat = toDisplayLabel(row[labelField])
    let group = groupedData.get(cat)
    if (!group) {
      group = []
      groupedData.set(cat, group)
    }
    group.push(row)
  }

  const data = categories.map((category) => {
    const matches = groupedData.get(category) ?? []
    return {
      name: category,
      value: aggregateValues(matches, valueField, widget.data.aggregation?.type),
    }
  })

  if (funnel) {
    return {
      ...createBaseOption(widget),
      tooltip: widget.style.showTooltip
        ? {
            trigger: 'item',
          }
        : undefined,
      series: [
        {
          type: 'funnel',
          width: '90%',
          left: '5%',
          sort: 'descending',
          label: getLabelConfig(widget) || { show: false },
          data,
        },
      ],
    }
  }

  return {
    ...createBaseOption(widget),
    tooltip: widget.style.showTooltip
      ? {
          trigger: 'item',
        }
      : undefined,
    series: [
      {
        type: 'pie',
        radius: donut ? ['48%', '72%'] : ['0%', '72%'],
        center: ['50%', '54%'],
        label: getLabelConfig(widget) || { show: false },
        data,
      },
    ],
  }
}

const buildScatterOption = ({ widget, rows, bubble = false }: { widget: DashboardWidgetConfig; rows: DashboardRow[]; bubble?: boolean }): EChartsOption => {
  const xField = getMappedField(widget, 'x')
  const yField = getMappedField(widget, 'y')
  const sizeField = getMappedField(widget, 'size')
  const seriesField = getMappedField(widget, 'series')

  if (!xField || !yField) {
    return createBaseOption(widget)
  }

  const groups = new Map<string, number[][]>()

  rows.forEach((row) => {
    const seriesName = seriesField ? toDisplayLabel(row[seriesField]) : 'Series'
    const current = groups.get(seriesName) ?? []
    current.push([
      toNumericValue(row[xField]),
      toNumericValue(row[yField]),
      bubble ? Math.max(12, toNumericValue(row[sizeField ?? yField]) * 2) : 18,
    ])
    groups.set(seriesName, current)
  })

  return {
    ...createBaseOption(widget),
    xAxis: {
      type: 'value',
      splitLine: {
        show: widget.style.showGridLines,
        lineStyle: {
          color: widget.style.gridLineColor,
        },
      },
      axisLabel: {
        color: widget.style.axisLabelColor,
        fontSize: widget.style.fontSizeAxis ?? 12,
      },
    },
    yAxis: {
      type: 'value',
      splitLine: {
        show: widget.style.showGridLines,
        lineStyle: {
          color: widget.style.gridLineColor,
        },
      },
      axisLabel: {
        color: widget.style.axisLabelColor,
      },
    },
    series: Array.from(groups.entries()).slice(0, 50).map(([seriesName, data]) => ({
      name: seriesName,
      type: 'scatter',
      data,
      symbolSize: (value: number[]) => (bubble ? value[2] : widget.style.markerSize + 6),
      itemStyle: {
        opacity: 0.84,
      },
    })),
  }
}

const buildAdvancedOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  if (!widget.layers || widget.layers.length === 0) {
    return createBaseOption(widget)
  }

  const baseOption = createBaseOption(widget)
  const series: any[] = []
  
  // We need to support dual Y-axes based on layer styles
  let hasRightAxis = false
  
  widget.layers.filter(l => l.visible !== false).forEach((layer, layerIdx) => {
    const xField = Array.isArray(layer.mappings.x) ? layer.mappings.x[0] : layer.mappings.x
    const yField = Array.isArray(layer.mappings.y) ? layer.mappings.y[0] : layer.mappings.y
    const seriesField = Array.isArray(layer.mappings.series) ? layer.mappings.series[0] : layer.mappings.series
    
    if (!xField || !yField) return
    
    const yAxisIndex = layer.style.yAxisPosition === 'right' ? 1 : 0
    if (yAxisIndex === 1) hasRightAxis = true

    // O(N) grouping
    const groupedData = new Map<string, DashboardRow[]>()
    const categories = new Set<string>()
    const seriesNames = new Set<string>()
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const cat = toDisplayLabel(row[xField])
      const ser = seriesField ? toDisplayLabel(row[seriesField]) : layer.style.name ? String(layer.style.name) : `Layer ${layerIdx + 1}`
      
      categories.add(cat)
      seriesNames.add(ser)
      
      const key = `${ser}\0${cat}`
      let group = groupedData.get(key)
      if (!group) {
        group = []
        groupedData.set(key, group)
      }
      group.push(row)
    }
    
    const seriesArray = Array.from(seriesNames).slice(0, 50)
    const categoriesArray = Array.from(categories).slice(0, 2000)
    
    // Assign categories to xAxis (assuming first layer dictates categories for now)
    if (layerIdx === 0) {
      baseOption.xAxis = {
        type: 'category',
        data: categoriesArray,
        axisLine: { lineStyle: { color: widget.style.axisLineColor } },
        axisLabel: { color: widget.style.axisLabelColor, fontSize: widget.style.fontSizeAxis ?? 12 },
        splitLine: { show: widget.style.showGridLines, lineStyle: { color: widget.style.gridLineColor } },
      }
    }
    
    seriesArray.forEach((seriesName) => {
      const data = categoriesArray.map((category) => {
        const matches = groupedData.get(`${seriesName}\0${category}`) ?? []
        // we'll just sum or use the first value for now as standard
        return aggregateValues(matches, yField, widget.data.aggregation?.type)
      })
      
      const isArea = layer.type === 'area'
      const baseType = isArea ? 'line' : layer.type
      
      series.push({
        name: seriesName,
        type: baseType,
        yAxisIndex,
        smooth: layer.style.curveType === 'smooth',
        step: layer.style.curveType === 'step' ? 'end' : false,
        areaStyle: isArea ? { opacity: Number(layer.style.opacity ?? 0.3) } : undefined,
        itemStyle: layer.style.color ? { color: String(layer.style.color) } : undefined,
        data,
      })
    })
  })
  
  const yAxisBase = {
    type: 'value' as const,
    axisLine: { lineStyle: { color: widget.style.axisLineColor } },
    splitLine: { show: widget.style.showGridLines, lineStyle: { color: widget.style.gridLineColor } },
    axisLabel: { color: widget.style.axisLabelColor },
  }
  
  baseOption.yAxis = hasRightAxis 
    ? [yAxisBase, { ...yAxisBase, position: 'right' as const, splitLine: { show: false } }]
    : yAxisBase

  baseOption.series = series
  
  return baseOption
}

const buildHeatmapOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  const xField = getMappedField(widget, 'x')
  const yField = getMappedField(widget, 'y')
  const valueField = getMappedField(widget, 'value')

  if (!xField || !yField || !valueField) {
    return createBaseOption(widget)
  }

  const xCategories = Array.from(new Set(rows.map((row) => toDisplayLabel(row[xField]))))
  const yCategories = Array.from(new Set(rows.map((row) => toDisplayLabel(row[yField]))))
  
  const xIndexMap = new Map(xCategories.map((c, i) => [c, i]))
  const yIndexMap = new Map(yCategories.map((c, i) => [c, i]))

  const heatmapData = rows.map((row) => [
    xIndexMap.get(toDisplayLabel(row[xField])) ?? 0,
    yIndexMap.get(toDisplayLabel(row[yField])) ?? 0,
    toNumericValue(row[valueField]),
  ])

  return {
    ...createBaseOption(widget),
    visualMap: {
      min: 0,
      max: Math.max(...rows.map((row) => toNumericValue(row[valueField])), 1),
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: {
        color: ['#dbeafe', '#38bdf8', '#0f766e'],
      },
    },
    xAxis: {
      type: 'category',
      data: xCategories,
      splitArea: { show: true },
    },
    yAxis: {
      type: 'category',
      data: yCategories,
      splitArea: { show: true },
    },
    series: [
      {
        type: 'heatmap',
        data: heatmapData,
        label: getLabelConfig(widget) || { show: false },
      },
    ],
  }
}

const buildRadarOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  const labelField = getMappedField(widget, 'label')
  const valueField = getMappedField(widget, 'value')

  if (!labelField || !valueField || rows.length === 0) {
    return createBaseOption(widget)
  }

  const indicators = rows.slice(0, 8).map((row) => ({
    name: toDisplayLabel(row[labelField]),
    max: Math.max(...rows.map((entry) => toNumericValue(entry[valueField])), 1),
  }))

  return {
    ...createBaseOption(widget),
    tooltip: widget.style.showTooltip
      ? {
          trigger: 'item',
        }
      : undefined,
    radar: {
      indicator: indicators,
      splitLine: {
        lineStyle: {
          color: widget.style.gridLineColor,
        },
      },
      splitArea: {
        areaStyle: {
          color: ['rgba(15,118,110,0.02)', 'rgba(15,118,110,0.05)'],
        },
      },
      axisName: {
        color: widget.style.axisLabelColor,
        fontSize: widget.style.fontSizeAxis ?? 12,
      },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: rows.slice(0, 8).map((row) => toNumericValue(row[valueField])),
            areaStyle: {
              opacity: 0.24,
            },
          },
        ],
      },
    ],
  }
}

const buildGaugeOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  const valueField = getMappedField(widget, 'value') ?? getMappedField(widget, 'metric')
  if (!valueField) {
    return createBaseOption(widget)
  }

  const values = rows.map((row) => toNumericValue(row[valueField]))
  const value = values.length > 0 ? values.reduce((total, current) => total + current, 0) / values.length : 0

  return {
    ...createBaseOption(widget),
    tooltip: widget.style.showTooltip
      ? {
          formatter: '{a} <br/>{b} : {c}',
        }
      : undefined,
    series: [
      {
        name: widget.title,
        type: 'gauge',
        detail: {
          formatter: '{value}',
          color: widget.style.axisLabelColor,
          fontSize: widget.style.fontSizeValue ?? 24,
        },
        data: [
          {
            value,
            name: '',
          },
        ],
        axisLine: {
          lineStyle: {
            color: [[1, '#0f766e']],
          },
        },
        min: widget.style.axisMin ?? 0,
        max: widget.style.axisMax ?? Math.max(value, 100),
      },
    ],
  }
}

const buildSankeyOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  const sourceField = getMappedField(widget, 'source')
  const targetField = getMappedField(widget, 'target')
  const valueField = getMappedField(widget, 'value')

  if (!sourceField || !targetField || !valueField) {
    return createBaseOption(widget)
  }

  const nodes = new Set<string>()
  const links: any[] = []

  rows.forEach((row) => {
    const source = toDisplayLabel(row[sourceField])
    const target = toDisplayLabel(row[targetField])
    const value = toNumericValue(row[valueField])

    if (source && target && value) {
      nodes.add(source)
      nodes.add(target)
      links.push({ source, target, value })
    }
  })

  return {
    ...createBaseOption(widget),
    tooltip: widget.style.showTooltip ? { trigger: 'item', triggerOn: 'mousemove' } : undefined,
    series: [
      {
        type: 'sankey',
        data: Array.from(nodes).map(name => ({ name })),
        links,
        emphasis: {
          focus: 'adjacency',
        },
        lineStyle: {
          color: 'gradient',
          curveness: 0.5,
        },
        label: {
          color: widget.style.axisLabelColor,
        },
      },
    ],
  }
}

const buildTimelineOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  const startField = getMappedField(widget, 'start')
  const labelField = getMappedField(widget, 'label')

  if (!startField || !labelField) {
    return createBaseOption(widget)
  }

  const data = rows.map(row => {
    const d = new Date(String(row[startField]))
    return [d.getTime(), toDisplayLabel(row[labelField])]
  })

  return {
    ...createBaseOption(widget),
    tooltip: widget.style.showTooltip ? { trigger: 'item' } : undefined,
    xAxis: {
      type: 'time',
      axisLabel: { color: widget.style.axisLabelColor },
      splitLine: { lineStyle: { color: widget.style.gridLineColor } },
    },
    yAxis: {
      type: 'category',
      axisLabel: { color: widget.style.axisLabelColor },
      splitLine: { lineStyle: { color: widget.style.gridLineColor } },
    },
    series: [
      {
        type: 'scatter',
        symbolSize: 20,
        itemStyle: { color: '#0f766e' },
        data: data.filter(d => !isNaN(d[0] as number)),
      },
    ],
  }
}

const buildTreemapOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  const categoryFields = getMappedFields(widget, 'category')
  const valueField = getMappedField(widget, 'value')

  if (!categoryFields || categoryFields.length === 0 || !valueField) {
    return createBaseOption(widget)
  }

  const tree: any = { name: 'root', children: [] }

  rows.forEach(row => {
    let parts: string[] = []
    if (categoryFields.length === 1) {
      parts = toDisplayLabel(row[categoryFields[0]]).split('/').map(p => p.trim())
    } else {
      parts = categoryFields.map(f => toDisplayLabel(row[f]))
    }
    
    const val = toNumericValue(row[valueField])
    
    let currentLevel = tree.children
    parts.forEach((part, index) => {
      if (!part) return
      let existingNode = currentLevel.find((n: any) => n.name === part)
      if (!existingNode) {
        existingNode = { name: part, children: [] }
        currentLevel.push(existingNode)
      }
      if (index === parts.length - 1) {
        existingNode.value = (existingNode.value || 0) + val
      }
      currentLevel = existingNode.children
    })
  })

  return {
    ...createBaseOption(widget),
    tooltip: widget.style.showTooltip
      ? {
          trigger: 'item',
        }
      : undefined,
    series: [
      {
        type: 'treemap',
        roam: false,
        nodeClick: false,
        breadcrumb: {
          show: false,
        },
        label: {
          show: true,
          formatter: '{b}',
          color: '#0f172a',
          fontSize: widget.style.fontSizeDataLabel ?? 12,
        },
        data: tree.children,
      },
    ],
  }
}

const buildWaterfallOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  const categoryField = getMappedField(widget, 'category')
  const valueField = getMappedField(widget, 'value')

  if (!categoryField || !valueField) {
    return createBaseOption(widget)
  }

  let currentSum = 0
  const placeholderData: number[] = []
  const positiveData: string[] = []
  const negativeData: string[] = []
  const categories: string[] = []

  rows.forEach((row) => {
    const val = toNumericValue(row[valueField])
    const cat = toDisplayLabel(row[categoryField])
    categories.push(cat)

    if (val >= 0) {
      placeholderData.push(currentSum)
      positiveData.push(String(val))
      negativeData.push('-')
      currentSum += val
    } else {
      currentSum += val
      placeholderData.push(currentSum)
      positiveData.push('-')
      negativeData.push(String(Math.abs(val)))
    }
  })

  // Add a "Total" bar at the end
  categories.push('Total')
  placeholderData.push(0)
  if (currentSum >= 0) {
    positiveData.push(String(currentSum))
    negativeData.push('-')
  } else {
    positiveData.push('-')
    negativeData.push(String(Math.abs(currentSum)))
  }

  return {
    ...createBaseOption(widget),
    tooltip: widget.style.showTooltip ? { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params: any) => {
      let tar = params[1];
      if (tar.value !== '-') {
        return tar.name + '<br/>' + tar.seriesName + ' : ' + tar.value;
      }
      tar = params[2];
      return tar.name + '<br/>' + tar.seriesName + ' : ' + tar.value;
    }} : undefined,
    xAxis: {
      type: 'category',
      splitLine: { show: false },
      data: categories,
      axisLabel: { color: widget.style.axisLabelColor, fontSize: widget.style.fontSizeAxis ?? 12 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: widget.style.axisLabelColor },
      splitLine: { show: widget.style.showGridLines, lineStyle: { color: widget.style.gridLineColor } },
    },
    series: [
      {
        name: 'Placeholder',
        type: 'bar',
        stack: 'Total',
        itemStyle: { borderColor: 'transparent', color: 'transparent' },
        emphasis: { itemStyle: { borderColor: 'transparent', color: 'transparent' } },
        data: placeholderData
      },
      {
        name: 'Increase',
        type: 'bar',
        stack: 'Total',
        label: { show: widget.style.showDataLabels, position: 'top', color: widget.style.dataLabelColor },
        itemStyle: { color: widget.style.seriesColors[0] ?? '#10b981' },
        data: positiveData
      },
      {
        name: 'Decrease',
        type: 'bar',
        stack: 'Total',
        label: { show: widget.style.showDataLabels, position: 'bottom', color: widget.style.dataLabelColor },
        itemStyle: { color: widget.style.seriesColors[1] ?? '#ef4444' },
        data: negativeData
      }
    ]
  }
}

const buildCandlestickOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  const dateField = getMappedField(widget, 'date')
  const openField = getMappedField(widget, 'open')
  const closeField = getMappedField(widget, 'close')
  const lowestField = getMappedField(widget, 'lowest')
  const highestField = getMappedField(widget, 'highest')

  if (!dateField || !openField || !closeField || !lowestField || !highestField) {
    return createBaseOption(widget)
  }

  const categoryData: string[] = []
  const values: number[][] = []

  rows.forEach(row => {
    categoryData.push(toDisplayLabel(row[dateField]))
    values.push([
      toNumericValue(row[openField]),
      toNumericValue(row[closeField]),
      toNumericValue(row[lowestField]),
      toNumericValue(row[highestField])
    ])
  })

  return {
    ...createBaseOption(widget),
    tooltip: widget.style.showTooltip ? { trigger: 'axis', axisPointer: { type: 'cross' } } : undefined,
    xAxis: {
      type: 'category',
      data: categoryData,
      boundaryGap: false,
      axisLine: { onZero: false },
      splitLine: { show: false },
      min: 'dataMin',
      max: 'dataMax',
      axisLabel: { color: widget.style.axisLabelColor, fontSize: widget.style.fontSizeAxis ?? 12 },
    },
    yAxis: {
      scale: true,
      splitArea: { show: true },
      axisLabel: { color: widget.style.axisLabelColor },
      splitLine: { show: widget.style.showGridLines, lineStyle: { color: widget.style.gridLineColor } },
    },
    series: [
      {
        name: 'Stock',
        type: 'candlestick',
        data: values,
        itemStyle: {
          color: widget.style.seriesColors[0] ?? '#10b981',
          color0: widget.style.seriesColors[1] ?? '#ef4444',
          borderColor: widget.style.seriesColors[0] ?? '#10b981',
          borderColor0: widget.style.seriesColors[1] ?? '#ef4444'
        }
      }
    ]
  }
}

const buildBoxplotOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  const categoryField = getMappedField(widget, 'category')
  const valueField = getMappedField(widget, 'value')

  if (!categoryField || !valueField) {
    return createBaseOption(widget)
  }

  const groups = new Map<string, number[]>()
  rows.forEach(row => {
    const cat = toDisplayLabel(row[categoryField])
    const val = toNumericValue(row[valueField])
    const arr = groups.get(cat) ?? []
    arr.push(val)
    groups.set(cat, arr)
  })

  const categories = Array.from(groups.keys())
  const boxData = categories.map(cat => {
    const vals = groups.get(cat)!
    vals.sort((a, b) => a - b)
    if (vals.length === 0) return [0,0,0,0,0]
    
    const min = vals[0]
    const max = vals[vals.length - 1]
    const q1 = vals[Math.floor(vals.length * 0.25)]
    const median = vals[Math.floor(vals.length * 0.5)]
    const q3 = vals[Math.floor(vals.length * 0.75)]
    
    return [min, q1, median, q3, max]
  })

  return {
    ...createBaseOption(widget),
    tooltip: widget.style.showTooltip ? { trigger: 'item', axisPointer: { type: 'shadow' } } : undefined,
    xAxis: {
      type: 'category',
      data: categories,
      boundaryGap: true,
      nameGap: 30,
      splitArea: { show: false },
      axisLabel: { color: widget.style.axisLabelColor, fontSize: widget.style.fontSizeAxis ?? 12 },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: widget.style.axisLabelColor },
      splitArea: { show: true },
      splitLine: { show: widget.style.showGridLines, lineStyle: { color: widget.style.gridLineColor } },
    },
    series: [
      {
        name: 'Boxplot',
        type: 'boxplot',
        data: boxData,
        itemStyle: {
          color: widget.style.seriesColors[0] ?? '#0ea5e9',
          borderColor: '#1e293b'
        }
      }
    ]
  }
}

const buildSunburstOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  const categoryFields = getMappedFields(widget, 'category') // Could be array if UI supported multi-select, but we'll assume a single hierarchical path like "A/B/C" for now, or just a basic one level if not.
  const valueField = getMappedField(widget, 'value')

  if (!categoryFields || categoryFields.length === 0 || !valueField) {
    return createBaseOption(widget)
  }

  // To do a real sunburst from flat data, users often provide a path string like "USA/California/SF". 
  // We'll split by '/' to build the tree if it exists.
  const tree: any = { name: 'root', children: [] }

  rows.forEach(row => {
    let parts: string[] = []
    if (categoryFields.length === 1) {
      parts = toDisplayLabel(row[categoryFields[0]]).split('/').map(p => p.trim())
    } else {
      parts = categoryFields.map(f => toDisplayLabel(row[f]))
    }
    
    const val = toNumericValue(row[valueField])
    
    let currentLevel = tree.children
    parts.forEach((part, index) => {
      if (!part) return
      let existingNode = currentLevel.find((n: any) => n.name === part)
      if (!existingNode) {
        existingNode = { name: part, children: [] }
        currentLevel.push(existingNode)
      }
      if (index === parts.length - 1) {
        existingNode.value = (existingNode.value || 0) + val
      }
      currentLevel = existingNode.children
    })
  })

  // Clean up empty children arrays so echarts doesn't get confused
  const cleanTree = (nodes: any[]) => {
    nodes.forEach(n => {
      if (n.children.length === 0) delete n.children
      else cleanTree(n.children)
    })
  }
  cleanTree(tree.children)

  return {
    ...createBaseOption(widget),
    tooltip: widget.style.showTooltip ? { trigger: 'item' } : undefined,
    series: {
      type: 'sunburst',
      data: tree.children,
      radius: [0, '90%'],
      itemStyle: {
        borderRadius: 7,
        borderWidth: 2
      },
      label: {
        show: true,
        color: widget.style.dataLabelColor || '#1e293b',
        fontSize: widget.style.fontSizeDataLabel ?? 12
      }
    }
  }
}
const buildCalendarHeatmapOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  const dateField = getMappedField(widget, 'date')
  const valueField = getMappedField(widget, 'value')

  if (!dateField || !valueField) {
    return createBaseOption(widget)
  }

  const data = rows.map(row => [toDisplayLabel(row[dateField]), toNumericValue(row[valueField])])
  
  // Find min and max for visualMap
  let min = 0
  let max = 100
  if (data.length > 0) {
    min = Math.min(...data.map(d => Number(d[1])))
    max = Math.max(...data.map(d => Number(d[1])))
  }
  
  // Find range for calendar
  const dates = data.map(d => new Date(d[0]).getTime()).filter(t => !isNaN(t))
  const year = dates.length > 0 ? new Date(Math.max(...dates)).getFullYear() : new Date().getFullYear()

  return {
    ...createBaseOption(widget),
    tooltip: widget.style.showTooltip ? { position: 'top' } : undefined,
    visualMap: {
      min,
      max,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      top: 'top',
      inRange: { color: ['#ebedf0', widget.style.seriesColors[0] ?? '#10b981'] },
      textStyle: { color: widget.style.axisLabelColor }
    },
    calendar: {
      top: 80,
      range: year,
      cellSize: ['auto', 20],
      itemStyle: { borderColor: widget.style.gridLineColor, borderWidth: 1 },
      splitLine: { show: false },
      dayLabel: { color: widget.style.axisLabelColor },
      monthLabel: { color: widget.style.axisLabelColor },
      yearLabel: { show: true, color: widget.style.axisLabelColor }
    },
    series: {
      type: 'heatmap',
      coordinateSystem: 'calendar',
      data
    }
  }
}

const buildTreeOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  const categoryFields = getMappedFields(widget, 'category') // Expected path e.g. "CEO/VP/Manager/IC"
  const valueField = getMappedField(widget, 'value')

  if (!categoryFields || categoryFields.length === 0) {
    return createBaseOption(widget)
  }

  const tree: any = { name: widget.title || 'Root', children: [] }

  rows.forEach(row => {
    let parts: string[] = []
    if (categoryFields.length === 1) {
      parts = toDisplayLabel(row[categoryFields[0]]).split('/').map(p => p.trim())
    } else {
      parts = categoryFields.map(f => toDisplayLabel(row[f]))
    }
    
    const val = valueField ? toNumericValue(row[valueField]) : 1
    
    let currentLevel = tree.children
    parts.forEach((part, index) => {
      if (!part) return
      let existingNode = currentLevel.find((n: any) => n.name === part)
      if (!existingNode) {
        existingNode = { name: part, children: [] }
        currentLevel.push(existingNode)
      }
      if (index === parts.length - 1) {
        existingNode.value = (existingNode.value || 0) + val
      }
      currentLevel = existingNode.children
    })
  })

  const cleanTree = (nodes: any[]) => {
    nodes.forEach(n => {
      if (n.children.length === 0) delete n.children
      else cleanTree(n.children)
    })
  }
  cleanTree(tree.children)

  return {
    ...createBaseOption(widget),
    tooltip: widget.style.showTooltip ? { trigger: 'item', triggerOn: 'mousemove' } : undefined,
    series: [
      {
        type: 'tree',
        data: [tree],
        top: '5%',
        left: '15%',
        bottom: '5%',
        right: '20%',
        symbolSize: 10,
        label: {
          position: 'left',
          verticalAlign: 'middle',
          align: 'right',
          fontSize: widget.style.fontSizeDataLabel ?? 12,
          color: widget.style.dataLabelColor || '#1e293b'
        },
        leaves: {
          label: {
            position: 'right',
            verticalAlign: 'middle',
            align: 'left'
          }
        },
        emphasis: {
          focus: 'descendant'
        },
        expandAndCollapse: true,
        animationDuration: 550,
        animationDurationUpdate: 750
      }
    ]
  }
}

const buildGraphOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  const sourceField = getMappedField(widget, 'source')
  const targetField = getMappedField(widget, 'target')

  if (!sourceField || !targetField) {
    return createBaseOption(widget)
  }

  const nodesMap = new Map<string, number>()
  const links: any[] = []

  rows.forEach(row => {
    const source = toDisplayLabel(row[sourceField])
    const target = toDisplayLabel(row[targetField])

    if (source && target) {
      nodesMap.set(source, (nodesMap.get(source) || 0) + 1)
      nodesMap.set(target, (nodesMap.get(target) || 0) + 1)
      links.push({ source, target })
    }
  })

  const nodes = Array.from(nodesMap.entries()).map(([name, weight]) => ({
    name,
    symbolSize: Math.max(10, Math.min(50, weight * 5)),
    category: 0
  }))

  return {
    ...createBaseOption(widget),
    tooltip: widget.style.showTooltip ? {} : undefined,
    animationDurationUpdate: 1500,
    animationEasingUpdate: 'quinticInOut',
    series: [
      {
        type: 'graph',
        layout: 'force',
        data: nodes,
        links: links,
        roam: true,
        label: {
          show: widget.style.showDataLabels,
          position: 'right',
          color: widget.style.dataLabelColor || '#1e293b',
          fontSize: widget.style.fontSizeDataLabel ?? 12
        },
        force: {
          repulsion: 200,
          edgeLength: 100
        },
        itemStyle: {
          color: widget.style.seriesColors[0] ?? '#0ea5e9'
        },
        lineStyle: {
          color: 'source',
          curveness: 0.3
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            width: 3
          }
        }
      }
    ]
  }
}

const build3DScatterOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  const xField = getMappedField(widget, 'x')
  const yField = getMappedField(widget, 'y')
  const zField = getMappedField(widget, 'z')
  
  if (!xField || !yField || !zField) {
    return createBaseOption(widget)
  }

  const data = rows.map(row => [
    toNumericValue(row[xField]),
    toNumericValue(row[yField]),
    toNumericValue(row[zField])
  ])

  return {
    ...createBaseOption(widget),
    tooltip: widget.style.showTooltip ? {} : undefined,
    grid3D: {
      viewControl: { autoRotate: true }
    },
    xAxis3D: { type: 'value', name: xField, nameTextStyle: { color: widget.style.axisLabelColor } },
    yAxis3D: { type: 'value', name: yField, nameTextStyle: { color: widget.style.axisLabelColor } },
    zAxis3D: { type: 'value', name: zField, nameTextStyle: { color: widget.style.axisLabelColor } },
    series: [{
      type: 'scatter3D',
      data,
      symbolSize: 8,
      itemStyle: { color: widget.style.seriesColors[0] ?? '#0ea5e9' }
    }]
  } as any
}

const build3DSurfaceOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  const xField = getMappedField(widget, 'x')
  const yField = getMappedField(widget, 'y')
  const zField = getMappedField(widget, 'z')
  
  if (!xField || !yField || !zField) {
    return createBaseOption(widget)
  }

  const data = rows.map(row => [
    toNumericValue(row[xField]),
    toNumericValue(row[yField]),
    toNumericValue(row[zField])
  ])

  return {
    ...createBaseOption(widget),
    tooltip: widget.style.showTooltip ? {} : undefined,
    visualMap: {
      show: false,
      min: Math.min(...data.map(d => Number(d[2]))),
      max: Math.max(...data.map(d => Number(d[2]))),
      inRange: {
        color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
      }
    },
    grid3D: {
      viewControl: { autoRotate: true }
    },
    xAxis3D: { type: 'value', name: xField, nameTextStyle: { color: widget.style.axisLabelColor } },
    yAxis3D: { type: 'value', name: yField, nameTextStyle: { color: widget.style.axisLabelColor } },
    zAxis3D: { type: 'value', name: zField, nameTextStyle: { color: widget.style.axisLabelColor } },
    series: [{
      type: 'surface',
      data,
      wireframe: { show: false }
    }]
  } as any
}

const buildChoroplethMapOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  const locationField = getMappedField(widget, 'location')
  const valueField = getMappedField(widget, 'value')

  if (!locationField || !valueField) {
    return createBaseOption(widget)
  }

  const data = rows.map(row => ({
    name: toDisplayLabel(row[locationField]),
    value: toNumericValue(row[valueField])
  }))

  const maxVal = Math.max(...data.map(d => d.value), 1)

  return {
    ...createBaseOption(widget),
    tooltip: {
      trigger: 'item',
      backgroundColor: widget.style.tooltipBackground,
      textStyle: { color: widget.style.tooltipTextColor, fontSize: widget.style.fontSizeTooltip ?? 14 }
    },
    visualMap: {
      left: 'right',
      min: 0,
      max: maxVal,
      text: ['High', 'Low'],
      calculable: true,
      inRange: {
        color: widget.style.seriesColors.length > 1 ? widget.style.seriesColors : ['#e0f2fe', '#0369a1']
      }
    },
    series: [
      {
        name: widget.title || 'Map',
        type: 'map',
        map: 'world',
        roam: true,
        data,
        emphasis: {
          label: { show: true },
          itemStyle: { areaColor: '#fef08a' }
        }
      }
    ]
  } as any
}

const buildScatterMapOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  const latField = getMappedField(widget, 'lat')
  const lonField = getMappedField(widget, 'lon')
  const valueField = getMappedField(widget, 'value')
  const labelField = getMappedField(widget, 'label')

  if (!latField || !lonField) {
    return createBaseOption(widget)
  }

  const data = rows.map(row => {
    const lat = toNumericValue(row[latField])
    const lon = toNumericValue(row[lonField])
    const val = valueField ? toNumericValue(row[valueField]) : 1
    const name = labelField ? toDisplayLabel(row[labelField]) : ''
    return { name, value: [lon, lat, val] }
  })

  let maxVal = 1
  if (valueField) {
    maxVal = Math.max(...data.map(d => d.value[2]), 1)
  }

  return {
    ...createBaseOption(widget),
    tooltip: {
      trigger: 'item',
      backgroundColor: widget.style.tooltipBackground,
      textStyle: { color: widget.style.tooltipTextColor, fontSize: widget.style.fontSizeTooltip ?? 14 },
      formatter: (params: any) => {
        return `${params.name ? params.name + '<br/>' : ''}Value: ${params.value[2]}`
      }
    },
    geo: {
      map: 'world',
      roam: true,
      emphasis: {
        label: { show: false },
        itemStyle: { areaColor: '#f1f5f9' }
      },
      itemStyle: {
        areaColor: '#e2e8f0',
        borderColor: '#cbd5e1'
      }
    },
    series: [
      {
        name: widget.title || 'Scatter Map',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data,
        symbolSize: (val: any) => {
          if (!valueField) return widget.style.markerSize ?? 10
          const ratio = maxVal > 0 ? val[2] / maxVal : 1
          return Math.max(5, ratio * (widget.style.markerSize || 20))
        },
        itemStyle: {
          color: widget.style.seriesColors[0] ?? '#0ea5e9'
        },
        emphasis: {
          label: { show: true, formatter: '{b}', position: 'right' }
        }
      }
    ]
  } as any
}

const buildGlobeFlightOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  const startLat = getMappedField(widget, 'startLat')
  const startLon = getMappedField(widget, 'startLon')
  const endLat = getMappedField(widget, 'endLat')
  const endLon = getMappedField(widget, 'endLon')
  
  if (!startLat || !startLon || !endLat || !endLon) {
    return createBaseOption(widget)
  }

  const data = rows.map(row => [
    [toNumericValue(row[startLon]), toNumericValue(row[startLat])],
    [toNumericValue(row[endLon]), toNumericValue(row[endLat])]
  ])

  return {
    ...createBaseOption(widget),
    globe: {
      baseTexture: 'none',
      shading: 'color',
      environment: 'none',
      viewControl: { autoRotate: true }
    },
    series: [{
      type: 'lines3D',
      coordinateSystem: 'globe',
      effect: {
        show: true,
        trailWidth: 2,
        trailLength: 0.15,
        trailOpacity: 1,
        trailColor: widget.style.seriesColors[0] ?? '#0ea5e9'
      },
      blendMode: 'lighter',
      lineStyle: { width: 1, color: widget.style.seriesColors[0] ?? '#0ea5e9', opacity: 0.1 },
      data
    }]
  } as any
}


const buildRiskMatrixOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  const xField = getMappedField(widget, 'impact') || getMappedField(widget, 'x')
  const yField = getMappedField(widget, 'likelihood') || getMappedField(widget, 'y')
  const labelField = getMappedField(widget, 'label')
  const sizeField = getMappedField(widget, 'size')

  if (!xField || !yField) return createBaseOption(widget)

  const data = rows.map(row => ({
    name: labelField ? toDisplayLabel(row[labelField]) : '',
    value: [toNumericValue(row[xField]), toNumericValue(row[yField]), sizeField ? toNumericValue(row[sizeField]) : 1]
  }))

  const maxSize = sizeField ? Math.max(...data.map(d => d.value[2]), 1) : 1

  return {
    ...createBaseOption(widget),
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => `${params.name}<br/>Impact: ${params.value[0]}<br/>Likelihood: ${params.value[1]}`
    },
    xAxis: { type: 'value', name: 'Impact', min: 0, max: 5, splitLine: { show: false } },
    yAxis: { type: 'value', name: 'Likelihood', min: 0, max: 5, splitLine: { show: false } },
    series: [{
      type: 'scatter',
      data,
      symbolSize: (val: any) => sizeField ? Math.max(10, (val[2] / maxSize) * 40) : 20,
      itemStyle: { color: widget.style.seriesColors[0] ?? '#334155' },
      markArea: {
        silent: true,
        itemStyle: { opacity: 0.3 },
        data: [
          [{ coord: [0, 0], itemStyle: { color: '#4ade80' } }, { coord: [2.5, 2.5] }],
          [{ coord: [2.5, 0], itemStyle: { color: '#facc15' } }, { coord: [5, 2.5] }],
          [{ coord: [0, 2.5], itemStyle: { color: '#fb923c' } }, { coord: [2.5, 5] }],
          [{ coord: [2.5, 2.5], itemStyle: { color: '#f87171' } }, { coord: [5, 5] }]
        ]
      }
    }]
  } as any
}

const buildControlChartOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  const xField = getMappedField(widget, 'x')
  const yField = getMappedField(widget, 'y')
  if (!xField || !yField) return createBaseOption(widget)

  const categories = rows.map(r => toDisplayLabel(r[xField]))
  const values = rows.map(r => toNumericValue(r[yField]))
  
  const mean = values.reduce((a,b) => a+b, 0) / (values.length || 1)
  const stdDev = Math.sqrt(values.reduce((a,b) => a + Math.pow(b - mean, 2), 0) / (values.length || 1))
  const ucl = mean + 3 * stdDev
  const lcl = mean - 3 * stdDev

  return {
    ...createBaseOption(widget),
    xAxis: { type: 'category', data: categories },
    yAxis: { type: 'value', scale: true },
    series: [{
      type: 'line',
      data: values,
      itemStyle: { color: widget.style.seriesColors[0] ?? '#0ea5e9' },
      markLine: {
        data: [
          { yAxis: mean, name: 'Mean', lineStyle: { color: '#10b981' } },
          { yAxis: ucl, name: 'UCL (+3σ)', lineStyle: { color: '#ef4444', type: 'dashed' } },
          { yAxis: lcl, name: 'LCL (-3σ)', lineStyle: { color: '#ef4444', type: 'dashed' } }
        ]
      }
    }]
  } as any
}

const buildParetoChartOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  const xField = getMappedField(widget, 'x')
  const yField = getMappedField(widget, 'y')
  if (!xField || !yField) return createBaseOption(widget)

  let dataPairs = rows.map(r => ({ name: toDisplayLabel(r[xField]), value: toNumericValue(r[yField]) }))
  dataPairs.sort((a,b) => b.value - a.value)
  
  const total = dataPairs.reduce((a,b) => a + b.value, 0) || 1
  let cumulative = 0
  const cumulativeData = dataPairs.map(d => {
    cumulative += d.value
    return Number(((cumulative / total) * 100).toFixed(2))
  })

  return {
    ...createBaseOption(widget),
    xAxis: { type: 'category', data: dataPairs.map(d => d.name) },
    yAxis: [
      { type: 'value', name: 'Frequency' },
      { type: 'value', name: 'Cumulative %', min: 0, max: 100, position: 'right', axisLabel: { formatter: '{value}%' } }
    ],
    series: [
      { type: 'bar', data: dataPairs.map(d => d.value), yAxisIndex: 0, itemStyle: { color: widget.style.seriesColors[0] ?? '#3b82f6' } },
      { type: 'line', data: cumulativeData, yAxisIndex: 1, itemStyle: { color: widget.style.seriesColors[1] ?? '#f59e0b' }, smooth: true }
    ]
  } as any
}

const buildGanttChartOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  const taskField = getMappedField(widget, 'task')
  const startField = getMappedField(widget, 'start')
  const endField = getMappedField(widget, 'end')
  if (!taskField || !startField || !endField) return createBaseOption(widget)

  const categories = rows.map(r => toDisplayLabel(r[taskField]))
  const baseData = rows.map(r => new Date(toDisplayLabel(r[startField])).getTime())
  const durationData = rows.map(r => {
    const end = new Date(toDisplayLabel(r[endField])).getTime()
    const start = new Date(toDisplayLabel(r[startField])).getTime()
    return end - start
  })

  return {
    ...createBaseOption(widget),
    xAxis: { type: 'time' },
    yAxis: { type: 'category', data: categories, inverse: true },
    series: [
      { type: 'bar', stack: 'total', itemStyle: { borderColor: 'transparent', color: 'transparent' }, emphasis: { itemStyle: { borderColor: 'transparent', color: 'transparent' } }, data: baseData },
      { type: 'bar', stack: 'total', data: durationData, itemStyle: { color: widget.style.seriesColors[0] ?? '#8b5cf6' } }
    ]
  } as any
}

const buildSparklineOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  const yField = getMappedField(widget, 'y')
  if (!yField) return createBaseOption(widget)

  const data = rows.map(r => toNumericValue(r[yField]))

  return {
    grid: { left: 0, right: 0, top: 0, bottom: 0 },
    xAxis: { type: 'category', show: false },
    yAxis: { type: 'value', show: false, scale: true },
    tooltip: { trigger: 'axis' },
    series: [{
      type: 'line',
      data,
      showSymbol: false,
      smooth: widget.style.curveType === 'smooth',
      lineStyle: { width: widget.style.strokeWidth ?? 2 },
      areaStyle: { opacity: widget.style.opacity ?? 0.2 },
      itemStyle: { color: widget.style.seriesColors[0] ?? '#3b82f6' }
    }]
  } as any
}

const buildMindmapOption = ({ widget, rows }: { widget: DashboardWidgetConfig; rows: DashboardRow[] }): EChartsOption => {
  const pathFields = getMappedFields(widget, 'path')
  const valueField = getMappedField(widget, 'value')
  if (!pathFields || pathFields.length === 0) return createBaseOption(widget)

  const tree: any = { name: widget.title || 'Mindmap', children: [] }

  rows.forEach((row) => {
    let parts: string[] = []
    if (pathFields.length === 1) {
      parts = toDisplayLabel(row[pathFields[0]]).split('/').map(p => p.trim())
    } else {
      parts = pathFields.map(f => toDisplayLabel(row[f]))
    }
    
    let currentLevel = tree.children
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (!part) continue
      let existingNode = currentLevel.find((n: any) => n.name === part)
      if (!existingNode) {
        existingNode = { name: part, children: [] }
        currentLevel.push(existingNode)
      }
      if (i === parts.length - 1 && valueField) {
        existingNode.value = toNumericValue(row[valueField])
      }
      currentLevel = existingNode.children
    }
  })

  const cleanTree = (nodes: any[]) => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].children.length === 0) {
        delete nodes[i].children
      } else {
        cleanTree(nodes[i].children)
      }
    }
  }
  cleanTree(tree.children)

  return {
    ...createBaseOption(widget),
    tooltip: { trigger: 'item', triggerOn: 'mousemove' },
    series: [
      {
        type: 'tree',
        data: [tree],
        layout: 'radial',
        symbol: 'emptyCircle',
        symbolSize: 7,
        initialTreeDepth: 3,
        animationDurationUpdate: 750,
        emphasis: { focus: 'descendant' },
        itemStyle: { color: widget.style.seriesColors[0] ?? '#8b5cf6' },
        label: { position: 'top', rotate: 0, verticalAlign: 'middle', align: 'center', fontSize: widget.style.fontSizeDataLabel ?? 12 }
      }
    ]
  } as any
}

const createPlugin = (plugin: VisualPlugin): VisualPlugin => ({
  implemented: plugin.implemented ?? true,
  ...plugin,
})

const seedPlugins = () => {
  const initialPlugins: VisualPlugin[] = [
    createPlugin({
      id: 'risk-matrix',
      name: 'Cyber Risk Matrix',
      category: 'Advanced',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'impact', label: 'Impact (X)', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
        { key: 'likelihood', label: 'Likelihood (Y)', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      optionalMappings: [
        { key: 'label', label: 'Label', acceptedTypes: DIMENSION_FIELD_TYPES },
        { key: 'size', label: 'Size', acceptedTypes: NUMERIC_FIELD_TYPES }
      ],
      compatibleFieldTypes: [
        { mappingKey: 'impact', acceptedTypes: NUMERIC_FIELD_TYPES },
        { mappingKey: 'likelihood', acceptedTypes: NUMERIC_FIELD_TYPES },
        { mappingKey: 'label', acceptedTypes: DIMENSION_FIELD_TYPES },
        { mappingKey: 'size', acceptedTypes: NUMERIC_FIELD_TYPES }
      ],
      defaultSize: { w: 6, h: 6 },
      buildOptions: ({ widget, rows }) => buildRiskMatrixOption({ widget, rows }),
    }),
    createPlugin({
      id: 'control-chart',
      name: 'Control Chart (SPC)',
      category: 'Advanced',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'x', label: 'X Axis (Time)', required: true, acceptedTypes: DIMENSION_FIELD_TYPES },
        { key: 'y', label: 'Y Axis (Metric)', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      compatibleFieldTypes: [
        { mappingKey: 'x', acceptedTypes: DIMENSION_FIELD_TYPES },
        { mappingKey: 'y', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 8, h: 5 },
      buildOptions: ({ widget, rows }) => buildControlChartOption({ widget, rows }),
    }),
    createPlugin({
      id: 'pareto-chart',
      name: 'Pareto Chart',
      category: 'Advanced',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'x', label: 'Category', required: true, acceptedTypes: DIMENSION_FIELD_TYPES },
        { key: 'y', label: 'Frequency', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      compatibleFieldTypes: [
        { mappingKey: 'x', acceptedTypes: DIMENSION_FIELD_TYPES },
        { mappingKey: 'y', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 8, h: 5 },
      buildOptions: ({ widget, rows }) => buildParetoChartOption({ widget, rows }),
    }),
    createPlugin({
      id: 'gantt-chart',
      name: 'Gantt Chart',
      category: 'Advanced',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'task', label: 'Task Name', required: true, acceptedTypes: DIMENSION_FIELD_TYPES },
        { key: 'start', label: 'Start Date', required: true, acceptedTypes: DIMENSION_FIELD_TYPES },
        { key: 'end', label: 'End Date', required: true, acceptedTypes: DIMENSION_FIELD_TYPES },
      ],
      compatibleFieldTypes: [
        { mappingKey: 'task', acceptedTypes: DIMENSION_FIELD_TYPES },
        { mappingKey: 'start', acceptedTypes: DIMENSION_FIELD_TYPES },
        { mappingKey: 'end', acceptedTypes: DIMENSION_FIELD_TYPES },
      ],
      defaultSize: { w: 8, h: 5 },
      buildOptions: ({ widget, rows }) => buildGanttChartOption({ widget, rows }),
    }),
    createPlugin({
      id: 'sparkline',
      name: 'Sparkline',
      category: 'Advanced',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'y', label: 'Metric', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      optionalMappings: [
        { key: 'x', label: 'Time (Optional)', acceptedTypes: DIMENSION_FIELD_TYPES }
      ],
      compatibleFieldTypes: [
        { mappingKey: 'y', acceptedTypes: NUMERIC_FIELD_TYPES },
        { mappingKey: 'x', acceptedTypes: DIMENSION_FIELD_TYPES }
      ],
      defaultSize: { w: 3, h: 2 },
      buildOptions: ({ widget, rows }) => buildSparklineOption({ widget, rows }),
    }),
    createPlugin({
      id: 'mindmap',
      name: 'Mindmap',
      category: 'Advanced',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'path', label: 'Hierarchy Path', required: true, acceptedTypes: DIMENSION_FIELD_TYPES, multiple: true },
      ],
      optionalMappings: [
        { key: 'value', label: 'Node Size', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      compatibleFieldTypes: [
        { mappingKey: 'path', acceptedTypes: DIMENSION_FIELD_TYPES },
        { mappingKey: 'value', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 8, h: 8 },
      buildOptions: ({ widget, rows }) => buildMindmapOption({ widget, rows }),
    }),

    createPlugin({
      id: 'kpi-card',
      name: 'KPI Card',
      category: 'KPI',
      description: 'A single headline metric with supporting context.',
      renderer: 'kpi',
      requiredMappings: [{ key: 'metric', label: 'Metric', required: true, acceptedTypes: NUMERIC_FIELD_TYPES }],
      optionalMappings: [{ key: 'comparison', label: 'Comparison', acceptedTypes: NUMERIC_FIELD_TYPES }],
      compatibleFieldTypes: [{ mappingKey: 'metric', acceptedTypes: NUMERIC_FIELD_TYPES }],
      defaultSize: { w: 3, h: 3 },
      minSize: { w: 2, h: 2 },
    }),
    createPlugin({
      id: 'line-chart',
      name: 'Line Chart',
      category: 'Time series',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'x', label: 'X Axis', required: true, acceptedTypes: [...DIMENSION_FIELD_TYPES, 'number'] },
        { key: 'y', label: 'Y Axis', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      optionalMappings: [{ key: 'series', label: 'Series', acceptedTypes: DIMENSION_FIELD_TYPES }],
      compatibleFieldTypes: [
        { mappingKey: 'x', acceptedTypes: [...DIMENSION_FIELD_TYPES, 'number'] },
        { mappingKey: 'y', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 6, h: 5 },
      buildOptions: ({ widget, rows }) => buildCartesianOption({ widget, rows, seriesType: 'line' }),
    }),
    createPlugin({
      id: 'bar-chart',
      name: 'Bar Chart',
      category: 'Bar and column',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'x', label: 'Category', required: true, acceptedTypes: DIMENSION_FIELD_TYPES },
        { key: 'y', label: 'Value', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      optionalMappings: [{ key: 'series', label: 'Series', acceptedTypes: DIMENSION_FIELD_TYPES }],
      compatibleFieldTypes: [
        { mappingKey: 'x', acceptedTypes: DIMENSION_FIELD_TYPES },
        { mappingKey: 'y', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 6, h: 5 },
      buildOptions: ({ widget, rows }) => buildCartesianOption({ widget, rows, seriesType: 'bar' }),
    }),
    createPlugin({
      id: 'horizontal-bar-chart',
      name: 'Horizontal Bar Chart',
      category: 'Bar and column',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'category', label: 'Category', required: true, acceptedTypes: DIMENSION_FIELD_TYPES },
        { key: 'value', label: 'Value', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      optionalMappings: [{ key: 'series', label: 'Series', acceptedTypes: DIMENSION_FIELD_TYPES }],
      compatibleFieldTypes: [
        { mappingKey: 'category', acceptedTypes: DIMENSION_FIELD_TYPES },
        { mappingKey: 'value', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 6, h: 5 },
      buildOptions: ({ widget, rows }) => buildCartesianOption({ widget, rows, seriesType: 'bar', orientation: 'horizontal' }),
    }),
    createPlugin({
      id: 'area-chart',
      name: 'Area Chart',
      category: 'Area',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'x', label: 'X Axis', required: true, acceptedTypes: [...DIMENSION_FIELD_TYPES, 'number'] },
        { key: 'y', label: 'Y Axis', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      optionalMappings: [{ key: 'series', label: 'Series', acceptedTypes: DIMENSION_FIELD_TYPES }],
      compatibleFieldTypes: [
        { mappingKey: 'x', acceptedTypes: [...DIMENSION_FIELD_TYPES, 'number'] },
        { mappingKey: 'y', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 6, h: 5 },
      buildOptions: ({ widget, rows }) => buildCartesianOption({ widget, rows, seriesType: 'line', area: true }),
    }),
    createPlugin({
      id: 'pie-chart',
      name: 'Pie Chart',
      category: 'Pie and part-to-whole',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'label', label: 'Label', required: true, acceptedTypes: DIMENSION_FIELD_TYPES },
        { key: 'value', label: 'Value', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      compatibleFieldTypes: [
        { mappingKey: 'label', acceptedTypes: DIMENSION_FIELD_TYPES },
        { mappingKey: 'value', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 4, h: 5 },
      buildOptions: ({ widget, rows }) => buildPieOption({ widget, rows }),
    }),
    createPlugin({
      id: 'donut-chart',
      name: 'Donut Chart',
      category: 'Pie and part-to-whole',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'label', label: 'Label', required: true, acceptedTypes: DIMENSION_FIELD_TYPES },
        { key: 'value', label: 'Value', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      compatibleFieldTypes: [
        { mappingKey: 'label', acceptedTypes: DIMENSION_FIELD_TYPES },
        { mappingKey: 'value', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 4, h: 5 },
      buildOptions: ({ widget, rows }) => buildPieOption({ widget, rows, donut: true }),
    }),
    createPlugin({
      id: 'scatter-plot',
      name: 'Scatter Plot',
      category: 'Scatter and relationship',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'x', label: 'X Axis', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
        { key: 'y', label: 'Y Axis', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      optionalMappings: [{ key: 'series', label: 'Series', acceptedTypes: DIMENSION_FIELD_TYPES }],
      compatibleFieldTypes: [
        { mappingKey: 'x', acceptedTypes: NUMERIC_FIELD_TYPES },
        { mappingKey: 'y', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 6, h: 5 },
      buildOptions: ({ widget, rows }) => buildScatterOption({ widget, rows }),
    }),
    createPlugin({
      id: 'bubble-chart',
      name: 'Bubble Chart',
      category: 'Scatter and relationship',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'x', label: 'X Axis', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
        { key: 'y', label: 'Y Axis', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
        { key: 'size', label: 'Bubble Size', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      optionalMappings: [{ key: 'series', label: 'Series', acceptedTypes: DIMENSION_FIELD_TYPES }],
      compatibleFieldTypes: [
        { mappingKey: 'x', acceptedTypes: NUMERIC_FIELD_TYPES },
        { mappingKey: 'y', acceptedTypes: NUMERIC_FIELD_TYPES },
        { mappingKey: 'size', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 6, h: 5 },
      buildOptions: ({ widget, rows }) => buildScatterOption({ widget, rows, bubble: true }),
    }),
    createPlugin({
      id: 'heatmap',
      name: 'Heatmap',
      category: 'Heatmap',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'x', label: 'Columns', required: true, acceptedTypes: DIMENSION_FIELD_TYPES },
        { key: 'y', label: 'Rows', required: true, acceptedTypes: DIMENSION_FIELD_TYPES },
        { key: 'value', label: 'Value', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      compatibleFieldTypes: [
        { mappingKey: 'x', acceptedTypes: DIMENSION_FIELD_TYPES },
        { mappingKey: 'y', acceptedTypes: DIMENSION_FIELD_TYPES },
        { mappingKey: 'value', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 5, h: 5 },
      buildOptions: ({ widget, rows }) => buildHeatmapOption({ widget, rows }),
    }),
    createPlugin({
      id: 'radar-chart',
      name: 'Radar Chart',
      category: 'Radar and polar',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'label', label: 'Axis Label', required: true, acceptedTypes: DIMENSION_FIELD_TYPES },
        { key: 'value', label: 'Value', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      compatibleFieldTypes: [
        { mappingKey: 'label', acceptedTypes: DIMENSION_FIELD_TYPES },
        { mappingKey: 'value', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 5, h: 5 },
      buildOptions: ({ widget, rows }) => buildRadarOption({ widget, rows }),
    }),
    createPlugin({
      id: 'gauge',
      name: 'Gauge',
      category: 'Gauge and progress',
      renderer: 'echarts',
      requiredMappings: [{ key: 'value', label: 'Value', required: true, acceptedTypes: NUMERIC_FIELD_TYPES }],
      compatibleFieldTypes: [{ mappingKey: 'value', acceptedTypes: NUMERIC_FIELD_TYPES }],
      defaultSize: { w: 4, h: 4 },
      buildOptions: ({ widget, rows }) => buildGaugeOption({ widget, rows }),
    }),
    createPlugin({
      id: 'funnel',
      name: 'Funnel',
      category: 'Flow',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'label', label: 'Stage', required: true, acceptedTypes: DIMENSION_FIELD_TYPES },
        { key: 'value', label: 'Value', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      compatibleFieldTypes: [
        { mappingKey: 'label', acceptedTypes: DIMENSION_FIELD_TYPES },
        { mappingKey: 'value', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 4, h: 5 },
      buildOptions: ({ widget, rows }) => buildPieOption({ widget, rows, funnel: true }),
    }),
    createPlugin({
      id: 'treemap',
      name: 'Treemap',
      category: 'Hierarchical',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'category', label: 'Category Path', required: true, acceptedTypes: DIMENSION_FIELD_TYPES, multiple: true },
        { key: 'value', label: 'Value', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      compatibleFieldTypes: [
        { mappingKey: 'category', acceptedTypes: DIMENSION_FIELD_TYPES },
        { mappingKey: 'value', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 5, h: 5 },
      buildOptions: ({ widget, rows }) => buildTreemapOption({ widget, rows }),
    }),
    createPlugin({
      id: 'data-table',
      name: 'Data Table',
      category: 'Table',
      renderer: 'table',
      requiredMappings: [],
      optionalMappings: [
        { key: 'columns', label: 'Columns', acceptedTypes: [...DIMENSION_FIELD_TYPES, ...NUMERIC_FIELD_TYPES], multiple: true },
      ],
      compatibleFieldTypes: [],
      defaultSize: { w: 6, h: 5 },
    }),
    createPlugin({
      id: 'sankey-diagram',
      name: 'Sankey Diagram',
      category: 'Flow',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'source', label: 'Source', required: true, acceptedTypes: DIMENSION_FIELD_TYPES },
        { key: 'target', label: 'Target', required: true, acceptedTypes: DIMENSION_FIELD_TYPES },
        { key: 'value', label: 'Value', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      compatibleFieldTypes: [
        { mappingKey: 'source', acceptedTypes: DIMENSION_FIELD_TYPES },
        { mappingKey: 'target', acceptedTypes: DIMENSION_FIELD_TYPES },
        { mappingKey: 'value', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 6, h: 5 },
      buildOptions: ({ widget, rows }) => buildSankeyOption({ widget, rows }),
    }),
    createPlugin({
      id: 'timeline',
      name: 'Timeline',
      category: 'Timeline',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'start', label: 'Start', required: true, acceptedTypes: ['date', 'datetime'] },
        { key: 'label', label: 'Label', required: true, acceptedTypes: DIMENSION_FIELD_TYPES },
      ],
      compatibleFieldTypes: [
        { mappingKey: 'start', acceptedTypes: ['date', 'datetime'] },
        { mappingKey: 'label', acceptedTypes: DIMENSION_FIELD_TYPES },
      ],
      defaultSize: { w: 6, h: 4 },
      buildOptions: ({ widget, rows }) => buildTimelineOption({ widget, rows }),
    }),
    createPlugin({
      id: 'rich-text',
      name: 'Rich Text & Data',
      category: 'Custom',
      renderer: 'custom',
      requiredMappings: [],
      compatibleFieldTypes: [],
      defaultSize: { w: 6, h: 4 },
    }),
    createPlugin({
      id: 'advanced-chart',
      name: 'Advanced Composite Chart',
      category: 'Custom',
      renderer: 'echarts',
      requiredMappings: [],
      compatibleFieldTypes: [],
      defaultSize: { w: 8, h: 6 },
      buildOptions: ({ widget, rows }) => buildAdvancedOption({ widget, rows }),
    }),
    createPlugin({
      id: 'waterfall-chart',
      name: 'Revenue Bridge (Waterfall)',
      category: 'Financial',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'category', label: 'Category', required: true, acceptedTypes: DIMENSION_FIELD_TYPES },
        { key: 'value', label: 'Value', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      compatibleFieldTypes: [
        { mappingKey: 'category', acceptedTypes: DIMENSION_FIELD_TYPES },
        { mappingKey: 'value', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 6, h: 5 },
      buildOptions: ({ widget, rows }) => buildWaterfallOption({ widget, rows }),
    }),
    createPlugin({
      id: 'candlestick-chart',
      name: 'Candlestick (Stock)',
      category: 'Financial',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'date', label: 'Date', required: true, acceptedTypes: ['date', 'datetime', 'string'] },
        { key: 'open', label: 'Open', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
        { key: 'close', label: 'Close', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
        { key: 'lowest', label: 'Lowest', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
        { key: 'highest', label: 'Highest', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      compatibleFieldTypes: [
        { mappingKey: 'date', acceptedTypes: ['date', 'datetime', 'string'] },
        { mappingKey: 'open', acceptedTypes: NUMERIC_FIELD_TYPES },
        { mappingKey: 'close', acceptedTypes: NUMERIC_FIELD_TYPES },
        { mappingKey: 'lowest', acceptedTypes: NUMERIC_FIELD_TYPES },
        { mappingKey: 'highest', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 8, h: 5 },
      buildOptions: ({ widget, rows }) => buildCandlestickOption({ widget, rows }),
    }),
    createPlugin({
      id: 'boxplot',
      name: 'Boxplot',
      category: 'Statistical',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'category', label: 'Category', required: true, acceptedTypes: DIMENSION_FIELD_TYPES },
        { key: 'value', label: 'Value', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      compatibleFieldTypes: [
        { mappingKey: 'category', acceptedTypes: DIMENSION_FIELD_TYPES },
        { mappingKey: 'value', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 6, h: 5 },
      buildOptions: ({ widget, rows }) => buildBoxplotOption({ widget, rows }),
    }),
    createPlugin({
      id: 'sunburst-chart',
      name: 'Sunburst',
      category: 'Hierarchical',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'category', label: 'Hierarchy Path', required: true, acceptedTypes: DIMENSION_FIELD_TYPES, multiple: true },
        { key: 'value', label: 'Value', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      compatibleFieldTypes: [
        { mappingKey: 'category', acceptedTypes: DIMENSION_FIELD_TYPES },
        { mappingKey: 'value', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 6, h: 6 },
      buildOptions: ({ widget, rows }) => buildSunburstOption({ widget, rows }),
    }),
    createPlugin({
      id: 'calendar-heatmap',
      name: 'Calendar Heatmap',
      category: 'Product analytics',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'date', label: 'Date', required: true, acceptedTypes: ['date', 'datetime', 'string'] },
        { key: 'value', label: 'Value', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      compatibleFieldTypes: [
        { mappingKey: 'date', acceptedTypes: ['date', 'datetime', 'string'] },
        { mappingKey: 'value', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 8, h: 5 },
      buildOptions: ({ widget, rows }) => buildCalendarHeatmapOption({ widget, rows }),
    }),
    createPlugin({
      id: 'org-chart',
      name: 'Org Chart (Tree)',
      category: 'Diagram',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'category', label: 'Hierarchy Path', required: true, acceptedTypes: DIMENSION_FIELD_TYPES, multiple: true },
      ],
      optionalMappings: [
        { key: 'value', label: 'Value', acceptedTypes: NUMERIC_FIELD_TYPES }
      ],
      compatibleFieldTypes: [
        { mappingKey: 'category', acceptedTypes: DIMENSION_FIELD_TYPES },
        { mappingKey: 'value', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 8, h: 6 },
      buildOptions: ({ widget, rows }) => buildTreeOption({ widget, rows }),
    }),
    createPlugin({
      id: 'network-graph',
      name: 'Network Graph',
      category: 'Network',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'source', label: 'Source Node', required: true, acceptedTypes: DIMENSION_FIELD_TYPES },
        { key: 'target', label: 'Target Node', required: true, acceptedTypes: DIMENSION_FIELD_TYPES },
      ],
      compatibleFieldTypes: [
        { mappingKey: 'source', acceptedTypes: DIMENSION_FIELD_TYPES },
        { mappingKey: 'target', acceptedTypes: DIMENSION_FIELD_TYPES },
      ],
      defaultSize: { w: 8, h: 6 },
      buildOptions: ({ widget, rows }) => buildGraphOption({ widget, rows }),
    }),
    createPlugin({
      id: '3d-scatter',
      name: '3D Scatter Plot',
      category: '3D',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'x', label: 'X Axis', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
        { key: 'y', label: 'Y Axis', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
        { key: 'z', label: 'Z Axis', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      compatibleFieldTypes: [
        { mappingKey: 'x', acceptedTypes: NUMERIC_FIELD_TYPES },
        { mappingKey: 'y', acceptedTypes: NUMERIC_FIELD_TYPES },
        { mappingKey: 'z', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 6, h: 6 },
      buildOptions: ({ widget, rows }) => build3DScatterOption({ widget, rows }),
    }),
    createPlugin({
      id: '3d-surface',
      name: '3D Surface',
      category: '3D',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'x', label: 'X Axis', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
        { key: 'y', label: 'Y Axis', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
        { key: 'z', label: 'Z (Height)', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      compatibleFieldTypes: [
        { mappingKey: 'x', acceptedTypes: NUMERIC_FIELD_TYPES },
        { mappingKey: 'y', acceptedTypes: NUMERIC_FIELD_TYPES },
        { mappingKey: 'z', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 8, h: 8 },
      buildOptions: ({ widget, rows }) => build3DSurfaceOption({ widget, rows }),
    }),
    createPlugin({
      id: 'scatter-map',
      name: 'Scatter Map',
      category: 'Geographic',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'lat', label: 'Latitude', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
        { key: 'lon', label: 'Longitude', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      optionalMappings: [
        { key: 'value', label: 'Value (Size)', acceptedTypes: NUMERIC_FIELD_TYPES },
        { key: 'label', label: 'Point Label', acceptedTypes: DIMENSION_FIELD_TYPES },
      ],
      compatibleFieldTypes: [
        { mappingKey: 'lat', acceptedTypes: NUMERIC_FIELD_TYPES },
        { mappingKey: 'lon', acceptedTypes: NUMERIC_FIELD_TYPES },
        { mappingKey: 'value', acceptedTypes: NUMERIC_FIELD_TYPES },
        { mappingKey: 'label', acceptedTypes: DIMENSION_FIELD_TYPES },
      ],
      defaultSize: { w: 8, h: 6 },
      buildOptions: ({ widget, rows }) => buildScatterMapOption({ widget, rows }),
    }),
    createPlugin({
      id: 'geo-map',
      name: 'Choropleth Map',
      category: 'Geographic',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'location', label: 'Country / Location', required: true, acceptedTypes: DIMENSION_FIELD_TYPES },
        { key: 'value', label: 'Value', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      compatibleFieldTypes: [
        { mappingKey: 'location', acceptedTypes: DIMENSION_FIELD_TYPES },
        { mappingKey: 'value', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 8, h: 6 },
      buildOptions: ({ widget, rows }) => buildChoroplethMapOption({ widget, rows }),
    }),
    createPlugin({
      id: 'globe-flight-map',
      name: '3D Globe (Flight Routes)',
      category: 'Geographic',
      renderer: 'echarts',
      requiredMappings: [
        { key: 'startLat', label: 'Start Latitude', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
        { key: 'startLon', label: 'Start Longitude', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
        { key: 'endLat', label: 'End Latitude', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
        { key: 'endLon', label: 'End Longitude', required: true, acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      compatibleFieldTypes: [
        { mappingKey: 'startLat', acceptedTypes: NUMERIC_FIELD_TYPES },
        { mappingKey: 'startLon', acceptedTypes: NUMERIC_FIELD_TYPES },
        { mappingKey: 'endLat', acceptedTypes: NUMERIC_FIELD_TYPES },
        { mappingKey: 'endLon', acceptedTypes: NUMERIC_FIELD_TYPES },
      ],
      defaultSize: { w: 8, h: 8 },
      buildOptions: ({ widget, rows }) => buildGlobeFlightOption({ widget, rows }),
    }),
  ]

  initialPlugins.forEach((plugin) => {
    visualRegistry.set(plugin.id, plugin)
  })
}

seedPlugins()

export const registerVisual = (plugin: VisualPlugin) => {
  visualRegistry.set(plugin.id, plugin)
}

export const unregisterVisual = (pluginId: string) => {
  visualRegistry.delete(pluginId)
}

export const getVisual = (pluginId: string) => visualRegistry.get(pluginId)

export const getVisualsByCategory = (category: VisualPlugin['category']) =>
  Array.from(visualRegistry.values()).filter((plugin) => plugin.category === category)

const satisfiesRequirement = (dataSource: DataSource, plugin: VisualPlugin) =>
  plugin.requiredMappings.every((requirement) => {
    if (!requirement.acceptedTypes || requirement.acceptedTypes.length === 0) {
      return dataSource.fields.length > 0
    }

    return dataSource.fields.some((field) => fieldMatchesAcceptedTypes(field.type, requirement.acceptedTypes))
  })

export const getCompatibleVisuals = (dataSource?: DataSource) => {
  const plugins = Array.from(visualRegistry.values())

  if (!dataSource) {
    return plugins
  }

  return plugins.filter((plugin) => satisfiesRequirement(dataSource, plugin))
}

export const listRegisteredVisuals = () => Array.from(visualRegistry.values())

export const supportsVisualFieldType = (plugin: VisualPlugin, fieldType: DataFieldType) => {
  const mappings = getPluginMappings(plugin)

  if (mappings.length === 0) {
    return true
  }

  return mappings.some((mapping) => fieldMatchesAcceptedTypes(fieldType, mapping.acceptedTypes))
}

export const createWidgetFromPlugin = (
  pluginId: string,
  dataSourceOrId?: DataSource | string,
  preferredFieldType?: DataFieldType,
): DashboardWidgetConfig => {
  const plugin = getVisual(pluginId)
  const dataSource = typeof dataSourceOrId === 'string' ? undefined : dataSourceOrId
  const dataSourceId = typeof dataSourceOrId === 'string' ? dataSourceOrId : dataSourceOrId?.id
  const style = {
    ...createDefaultWidgetStyle(),
    ...plugin?.defaultStyle,
  }

  return {
    id: uniqueId(pluginId),
    type: pluginId,
    title: plugin?.name ?? 'Widget',
    layout: {
      x: 0,
      y: Number.MAX_SAFE_INTEGER,
      w: plugin?.defaultSize.w ?? 4,
      h: plugin?.defaultSize.h ?? 4,
      minW: plugin?.minSize?.w,
      minH: plugin?.minSize?.h,
    },
    data: {
      dataSourceId,
      mappings: plugin ? createSuggestedMappings(plugin, dataSource, preferredFieldType) : {},
      filters: [],
      sort: [],
    },
    labels: {},
    style,
    pluginConfig: {},
    layers: [],
  }
}
