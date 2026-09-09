import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts'
if (typeof window !== 'undefined') { try { require('echarts-gl') } catch (_) {} }
import { AlertTriangle, DatabaseZap, Layers3 } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { DashboardRow, DashboardWidgetConfig, DataSource } from '../core/types'
import { getVisual } from '../registry/visualRegistry'
import { getWidgetRows } from '../core/widgetData'
import { useDashboardStore } from '../state/dashboardStore'
import { RichTextWidget } from './widgets/RichTextWidget'
import { ErrorBoundary } from '../components/ErrorBoundary'

type WidgetRendererProps = {
  widget: DashboardWidgetConfig
  dataSource?: DataSource
}

const formatValue = (value: number, widget: DashboardWidgetConfig) => {
  switch (widget.style.valueFormat) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: widget.style.currencySymbol === '£' ? 'GBP' : widget.style.currencySymbol === '€' ? 'EUR' : 'USD',
        maximumFractionDigits: 0,
      }).format(value)
    case 'percentage':
      return `${value.toFixed(1)}%`
    case 'compact':
      return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(value)
    default:
      return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 1,
      }).format(value)
  }
}

const getSingleMapping = (widget: DashboardWidgetConfig, key: string) => {
  const value = widget.data.mappings[key]
  return Array.isArray(value) ? value[0] : value
}

const MissingState = ({ message }: { message: string }) => (
  <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-300 dark:border-slate-600/50 bg-slate-50/80 dark:bg-slate-800/80 px-6 text-center text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
    <AlertTriangle className="mb-3 h-6 w-6 text-orange-500 dark:text-orange-400" />
    <p>{message}</p>
  </div>
)

const PlaceholderVisual = ({ widget }: { widget: DashboardWidgetConfig }) => (
  <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-[22px] border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-900/30 px-8 text-center text-sm text-amber-900 dark:text-amber-100">
    <Layers3 className="mb-3 h-7 w-7 text-amber-600 dark:text-amber-400" />
    <p className="font-semibold">Plugin placeholder</p>
    <p className="mt-2 max-w-xs text-amber-800/80">
      {widget.title ?? 'This visual'} is registered in the visual catalogue, but its renderer is still a future plugin extension point.
    </p>
  </div>
)

const KpiCardVisual = ({ widget, rows, onPointClick }: { widget: DashboardWidgetConfig; rows: DashboardRow[]; onPointClick?: (field: string, value: string) => void }) => {
  const metricField = getSingleMapping(widget, 'metric') ?? getSingleMapping(widget, 'value')
  const comparisonField = getSingleMapping(widget, 'comparison')

  if (!metricField) {
    return <MissingState message="Pick a metric field to render this KPI card." />
  }

  const metricValues = rows.map((row) => Number(row[metricField] ?? 0)).filter((value) => Number.isFinite(value))
  const comparisonValues = comparisonField
    ? rows.map((row) => Number(row[comparisonField] ?? 0)).filter((value) => Number.isFinite(value))
    : []

  const total = metricValues.reduce((sum, value) => sum + value, 0)
  const average = metricValues.length > 0 ? total / metricValues.length : 0
  const comparisonAverage =
    comparisonValues.length > 0 ? comparisonValues.reduce((sum, value) => sum + value, 0) / comparisonValues.length : null
  const delta = comparisonAverage ? ((average - comparisonAverage) / comparisonAverage) * 100 : null

  return (
    <div 
      className={`flex h-full flex-col justify-between rounded-[22px] p-2 ${onPointClick ? 'cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''}`}
      onClick={() => {
        if (onPointClick && metricField) {
          onPointClick(metricField, String(average))
        }
      }}
    >
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500" style={{ fontSize: widget.style.fontSizeKpiSubtitle ?? 12 }}>
          {widget.style.kpiSubtitle || 'Live metric'}
        </p>
        <p className="mt-4 font-semibold tracking-tight text-slate-950 dark:text-white dark:text-slate-950" style={{ fontSize: widget.style.fontSizeValue ?? 36 }}>{formatValue(average, widget)}</p>
      </div>
      {(widget.style.showRowCount !== false || (widget.style.showComparisonDelta !== false && delta !== null)) && (
        <div className="space-y-2">
          {widget.style.showRowCount !== false && (
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500" style={{ fontSize: widget.style.fontSizeRowCount ?? 14 }}>{metricValues.length} rows included</p>
          )}
          {widget.style.showComparisonDelta !== false && delta !== null && (
            <div className={`inline-flex rounded-full px-3 py-1 font-semibold ${delta >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300'}`} style={{ fontSize: widget.style.fontSizeDelta ?? 12 }}>
              {delta >= 0 ? '+' : ''}
              {delta.toFixed(1)}% vs comparison
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const DataTableVisual = ({ widget, dataSource, rows, onPointClick }: { widget: DashboardWidgetConfig; dataSource?: DataSource; rows: DashboardRow[]; onPointClick?: (field: string, value: string) => void }) => {
  const mappedColumns = widget.data.mappings.columns
  const explicitColumns = Array.isArray(mappedColumns) ? mappedColumns : []
  const fieldNames =
    explicitColumns.length > 0
      ? explicitColumns
      : dataSource?.fields.slice(0, 6).map((field) => field.name) ?? Object.keys(rows[0] ?? {}).slice(0, 6)

  const columns: ColumnDef<DashboardRow>[] = fieldNames.map((fieldName) => ({
    accessorKey: fieldName,
    header: dataSource?.fields.find((field) => field.name === fieldName)?.label ?? fieldName,
    cell: (info) => String(info.getValue() ?? ''),
  }))

  const table = useReactTable({
    data: rows.slice(0, widget.data.limit ?? 12),
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (fieldNames.length === 0) {
    return <MissingState message="Choose a dataset with rows to render the table." />
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[18px] border border-slate-200 dark:border-slate-700/50">
      <div className="overflow-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 dark:text-slate-500" style={{ fontSize: widget.style.fontSizeTableHeader ?? 11 }}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:bg-slate-900">
            {table.getRowModel().rows.map((row) => (
              <tr 
                key={row.id} 
                className={`hover:bg-slate-50/80 dark:bg-slate-800/80 ${onPointClick ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (onPointClick && fieldNames.length > 0) {
                    onPointClick(fieldNames[0], String(row.getValue(fieldNames[0])))
                  }
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-top" style={{ fontSize: widget.style.fontSizeTableCell ?? 14 }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function WidgetRenderer({ widget, dataSource }: WidgetRendererProps) {
  const plugin = getVisual(widget.type)
  const toggleCrossFilter = useDashboardStore((state) => state.toggleCrossFilter)
  const globalCrossFilters = useDashboardStore((state) => dataSource ? state.crossFilters[dataSource.id] : undefined)

  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    if ((widget.type === 'geo-map' || widget.type === 'globe-flight' || widget.type === 'scatter-map') && !mapLoaded) {
      fetch('/world.json')
        .then((res) => res.json())
        .then((geoJson) => {
          echarts.registerMap('world', geoJson)
          setMapLoaded(true)
        })
        .catch((err) => console.error('Failed to load map data:', err))
    }
  }, [widget.type, mapLoaded])

  if ((widget.type === 'geo-map' || widget.type === 'globe-flight' || widget.type === 'scatter-map') && !mapLoaded) {
    return (
      <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-300 dark:border-slate-600/50 bg-slate-50 dark:bg-slate-800/50 px-8 text-center text-sm text-slate-500 dark:text-slate-400">
        <p className="font-semibold animate-pulse">Loading Map Data...</p>
      </div>
    )
  }

  const handlePointClick = (field: string, value: string) => {
    if (!dataSource) return

    // 1. Drilldown / URL Redirects
    if (widget.interactions?.clickAction?.type === 'link' && widget.interactions.clickAction.url) {
       window.open(widget.interactions.clickAction.url, '_blank')
       return
    }

    // 2. Cross Filtering
    toggleCrossFilter(dataSource.id, {
      id: `cross-${widget.id}`,
      field,
      operator: 'equals',
      value,
      sourceWidgetId: widget.id
    })
  }

  const onEchartsEvents = {
    click: (params: any) => {
      const categoryField = getSingleMapping(widget, 'category') || getSingleMapping(widget, 'x') || getSingleMapping(widget, 'label')
      if (categoryField && params.name) {
        handlePointClick(categoryField, params.name)
      }
    }
  }

  if (!plugin) {
    return <MissingState message="This widget type is not registered in the visual registry." />
  }

  if (plugin.requiredMappings.some((requirement) => requirement.required && !widget.data.mappings[requirement.key])) {
    return <MissingState message="Finish the required field mappings in the right sidebar to render this widget." />
  }

  if (!dataSource && plugin.requiredMappings.length > 0) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-300 dark:border-slate-600/50 bg-slate-50 dark:bg-slate-800/50 px-6 text-center text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
        <DatabaseZap className="mb-3 h-6 w-6 text-teal-600 dark:text-teal-400" />
        <p>Select a dataset for this widget to start rendering.</p>
      </div>
    )
  }

  const activeCrossFilters = widget.interactions?.ignoreCrossFilters 
    ? [] 
    : (globalCrossFilters ?? []).filter((f) => f.sourceWidgetId !== widget.id)
  
  const mergedFilters = [
    ...(widget.data.filters ?? []),
    ...activeCrossFilters,
  ]

  const dataConfigWithCrossFilters = {
    ...widget,
    data: {
      ...widget.data,
      filters: mergedFilters
    }
  }

  const rows = getWidgetRows(dataConfigWithCrossFilters, dataSource)

  if (plugin.renderer === 'kpi') {
    return <KpiCardVisual widget={widget} rows={rows} onPointClick={handlePointClick} />
  }

  if (plugin.renderer === 'table') {
    return <DataTableVisual widget={widget} dataSource={dataSource} rows={rows} onPointClick={handlePointClick} />
  }

  if (plugin.renderer === 'placeholder') {
    return <PlaceholderVisual widget={widget} />
  }

  if (widget.type === 'rich-text') {
    return <RichTextWidget widget={widget} rows={rows} />
  }

  const option = plugin.buildOptions?.({
    widget,
    rows,
    dataSource,
  })

  if (!option) {
    return <MissingState message="This visual plugin did not produce a renderable chart option." />
  }

  return (
    <ErrorBoundary fallbackMessage={`Unable to render ${plugin.name}`}>
      <ReactECharts option={option} onEvents={onEchartsEvents} style={{ height: '100%', width: '100%' }} notMerge lazyUpdate />
    </ErrorBoundary>
  )
}
