import { Maximize2, Minimize2, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AdvancedLayersPanel } from './AdvancedLayersPanel'
import { FilterPanel } from './panels/FilterPanel'
import { LayoutPanel } from './panels/LayoutPanel'
import { RichTextEditorPanel } from './panels/RichTextEditorPanel'
import { WidgetRenderer } from './WidgetRenderer'
import type { DashboardWidgetConfig, DataSource, VisualPlugin } from '../core/types'
import { adjustWidgetForTheme } from '../core/types'
import { useDashboardStore } from '../state/dashboardStore'
import { getWidgetSeriesNames, getWidgetRows } from '../core/widgetData'

type WidgetSettingsModalProps = {
  open: boolean
  widget?: DashboardWidgetConfig
  dataSource?: DataSource
  visuals: VisualPlugin[]
  availableDataSources: DataSource[]
  onClose: () => void
  onUpdateWidget: (widgetId: string, recipe: (widget: DashboardWidgetConfig) => DashboardWidgetConfig) => void
  onChangeWidgetType: (widgetId: string, pluginId: string) => void
  onSelectDataSource: (dataSourceId: string) => void
}

const TABS = [
  { id: 'data', label: 'Data & Mapping' },
  { id: 'style', label: 'Style & Fonts' },
  { id: 'refinements', label: 'Interactions' },
  { id: 'filters', label: 'Layout & Filters' },
] as const

type TabId = typeof TABS[number]['id'] | 'content'

const AXIS_CHART_TYPES = ['line-chart', 'bar-chart', 'horizontal-bar-chart', 'area-chart', 'scatter-plot', 'bubble-chart', 'radar-chart', 'heatmap']
const NON_AXIS_CHART_TYPES = ['pie-chart', 'donut-chart', 'funnel', 'treemap']


type FontSizeSliderProps = {
  label: string
  value: number
  min?: number
  max?: number
  disabled?: boolean
  onChange: (value: number) => void
}

const FontSizeSlider = ({ label, value, min = 8, max = 48, disabled = false, onChange }: FontSizeSliderProps) => (
  <div className={`space-y-1.5 transition-opacity ${disabled ? 'opacity-35 pointer-events-none' : ''}`}>
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full ${disabled ? 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800' : 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30'}`}>{value}px</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={1}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1.5 rounded-full appearance-none bg-slate-200 dark:bg-slate-700 accent-teal-500 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:dark:border-slate-800 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-teal-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:dark:border-slate-800 [&::-moz-range-thumb]:cursor-pointer disabled:cursor-not-allowed disabled:accent-slate-400"
    />
  </div>
)

const valueOf = (widget: DashboardWidgetConfig, key: string) => {
  const mapping = widget.data.mappings[key]
  return Array.isArray(mapping) ? mapping[0] : mapping ?? ''
}

const valuesOf = (widget: DashboardWidgetConfig, key: string): string[] => {
  const mapping = widget.data.mappings[key]
  if (!mapping) return []
  return Array.isArray(mapping) ? mapping : [mapping]
}

export function WidgetSettingsModal({
  open,
  widget,
  dataSource,
  visuals,
  availableDataSources,
  onClose,
  onUpdateWidget,
  onChangeWidgetType,
  onSelectDataSource,
}: WidgetSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('data')
  const [isExpanded, setIsExpanded] = useState(false)
  const themeMode = useDashboardStore((state) => state.themeMode)

  const rows = widget ? getWidgetRows(widget, dataSource) : []
  const seriesNames = widget ? getWidgetSeriesNames(widget, rows) : []

  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!widget) return
    setIsPanning(true)
    setPanStart({
      x: e.clientX - (widget.style.panX ?? 0),
      y: e.clientY - (widget.style.panY ?? 0),
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!widget || !isPanning) return
    const dx = e.clientX - panStart.x
    const dy = e.clientY - panStart.y

    onUpdateWidget(widget.id, (currentWidget) => ({
      ...currentWidget,
      style: {
        ...currentWidget.style,
        panX: dx,
        panY: dy,
      },
    }))
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  const handleDoubleClick = () => {
    if (!widget) return
    onUpdateWidget(widget.id, (currentWidget) => ({
      ...currentWidget,
      style: {
        ...currentWidget.style,
        panX: 0,
        panY: 0,
        graphicZoom: 1,
      },
    }))
  }

  useEffect(() => {
    if (!open) {
      return
    }

    setActiveTab(widget?.type === 'rich-text' ? 'content' : 'data')
  }, [open, widget?.id])

  useEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open || !widget) {
    return null
  }

  const adjustedWidget = adjustWidgetForTheme(widget, themeMode)
  const plugin = visuals.find((visual) => visual.id === widget.type)
  const mappingRequirements = [...(plugin?.requiredMappings ?? []), ...(plugin?.optionalMappings ?? [])]
  const availableFields = dataSource?.fields ?? []

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-md sm:px-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`flex w-full flex-col overflow-hidden rounded-[32px] border border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800 shadow-2xl dark:shadow-black/40 xl:flex-row transition-all duration-300 ease-in-out ${
          isExpanded
            ? 'max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)]'
            : 'max-h-[calc(100vh-3rem)] max-w-[1200px]'
        }`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="widget-settings-modal-title"
      >
        <div className={`flex flex-1 flex-col overflow-hidden xl:border-r xl:border-slate-200 dark:border-slate-700/50 transition-all duration-300 ${isExpanded ? 'xl:max-w-[700px]' : 'xl:max-w-[580px]'}`}>
          <header className="border-b border-slate-200 dark:border-slate-700/50 bg-white/95 dark:bg-slate-900/95 px-5 py-5 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 dark:bg-teal-900/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Widget editor
                </div>
                <h2 id="widget-settings-modal-title" className="mt-3 truncate font-display text-2xl font-semibold text-slate-950 dark:text-white">
                  {widget.title ?? 'Untitled Widget'}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Update configuration step-by-step to keep the builder layout focused and clean.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpanded((prev) => !prev)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 transition hover:border-slate-300 dark:hover:border-slate-600/50 hover:text-slate-900 dark:text-slate-50"
                  aria-label={isExpanded ? 'Collapse editor' : 'Expand editor'}
                >
                  {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 transition hover:border-slate-300 dark:hover:border-slate-600/50 hover:text-slate-900 dark:text-slate-50"
                  aria-label="Save and close widget editor"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="mt-5 border-b border-slate-200 dark:border-slate-700/50 flex overflow-x-auto hide-scrollbar">
              {(widget.type === 'rich-text' ? [{ id: 'content', label: 'Content Editor' }, ...TABS.filter(t => t.id === 'data' || t.id === 'filters')] : TABS).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as TabId)}
                  className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </header>

          <div className="flex-1 overflow-auto px-4 py-4 sm:px-6 sm:py-6 flex flex-col justify-between">
            <div className="space-y-4 flex-1">
              {activeTab === 'content' && (
                <div className="space-y-4">
                  <RichTextEditorPanel widget={widget} dataSource={dataSource} onUpdateWidget={onUpdateWidget} />
                  <div className="grid gap-3 grid-cols-2">
                    <label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>Hide widget name</span>
                      <input
                        type="checkbox"
                        checked={widget.style.hideWidgetName === true}
                        onChange={(event) =>
                          onUpdateWidget(widget.id, (currentWidget) => ({
                            ...currentWidget,
                            style: { ...currentWidget.style, hideWidgetName: event.target.checked },
                          }))
                        }
                        className="cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>Hide widget type</span>
                      <input
                        type="checkbox"
                        checked={widget.style.hideWidgetType === true}
                        onChange={(event) =>
                          onUpdateWidget(widget.id, (currentWidget) => ({
                            ...currentWidget,
                            style: { ...currentWidget.style, hideWidgetType: event.target.checked },
                          }))
                        }
                        className="cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>Transparent background</span>
                      <input
                        type="checkbox"
                        checked={widget.style.backgroundColor === 'transparent'}
                        onChange={(event) =>
                          onUpdateWidget(widget.id, (currentWidget) => ({
                            ...currentWidget,
                            style: { ...currentWidget.style, backgroundColor: event.target.checked ? 'transparent' : '' },
                          }))
                        }
                        className="cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              )}

              {activeTab === 'data' && (
                <div className="space-y-4">
                  <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300 flex flex-col">
                    <span>Widget Title</span>
                    <input
                      value={widget.title ?? ''}
                      onChange={(event) =>
                        onUpdateWidget(widget.id, (currentWidget) => ({
                          ...currentWidget,
                          title: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500 text-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300 flex flex-col">
                    <span>Dataset</span>
                    <select
                      value={widget.data.dataSourceId ?? ''}
                      onChange={(event) => {
                        const nextDataSourceId = event.target.value || undefined
                        if (nextDataSourceId) {
                          onSelectDataSource(nextDataSourceId)
                        }

                        onUpdateWidget(widget.id, (currentWidget) => ({
                          ...currentWidget,
                          data: {
                            ...currentWidget.data,
                            dataSourceId: nextDataSourceId,
                          },
                        }))
                      }}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500 text-slate-900 dark:text-slate-100"
                    >
                      <option value="">Select a dataset</option>
                      {availableDataSources.map((dataSourceOption) => (
                        <option key={dataSourceOption.id} value={dataSourceOption.id}>
                          {dataSourceOption.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {activeTab === 'data' && (
                <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300 flex flex-col">
                  <span>Widget Type</span>
                  <select
                    value={widget.type}
                    onChange={(event) => onChangeWidgetType(widget.id, event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500 text-slate-900 dark:text-slate-100"
                  >
                    {visuals.map((visual) => (
                      <option key={visual.id} value={visual.id}>
                        {visual.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {activeTab === 'data' && (
                <div className="space-y-3">
                  {widget.type === 'advanced-chart' ? (
                    <AdvancedLayersPanel widget={widget} availableFields={availableFields} onUpdateWidget={onUpdateWidget} />
                  ) : mappingRequirements.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">This widget can render without explicit field mappings.</p>
                  ) : (
                    mappingRequirements.map((requirement) => {
                      if (requirement.multiple) {
                        const selectedValues = valuesOf(widget, requirement.key);
                        const selects = [...selectedValues, ''];
                        
                        return (
                          <div key={requirement.key} className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300 flex flex-col">
                            <span>
                              {requirement.label} (Multi-level)
                              {requirement.required ? <span className="ml-1 text-rose-500">*</span> : null}
                            </span>
                            <div className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/30">
                              {selects.map((val, index) => (
                                <div key={index} className="flex gap-2 items-center">
                                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 w-12 shrink-0 text-right pr-1">Lvl {index + 1}</span>
                                  <select
                                    value={val}
                                    onChange={(event) => {
                                      const newVals = [...selectedValues];
                                      if (event.target.value) {
                                        newVals[index] = event.target.value;
                                      } else {
                                        newVals.splice(index, 1);
                                      }
                                      onUpdateWidget(widget.id, (currentWidget) => ({
                                        ...currentWidget,
                                        data: {
                                          ...currentWidget.data,
                                          mappings: {
                                            ...currentWidget.data.mappings,
                                            [requirement.key]: newVals.length > 0 ? newVals : undefined,
                                          },
                                        },
                                      }))
                                    }}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-3 py-2 outline-none transition focus:border-teal-400 dark:border-teal-500 text-slate-900 dark:text-slate-100 text-sm"
                                  >
                                    <option value="">{index < selectedValues.length ? 'Remove level...' : '+ Add level'}</option>
                                    {availableFields.map((field) => (
                                      <option key={field.name} value={field.name} disabled={selectedValues.includes(field.name) && val !== field.name}>
                                        {field.label} · {field.type}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <label key={requirement.key} className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300 flex flex-col">
                          <span>
                            {requirement.label}
                            {requirement.required ? <span className="ml-1 text-rose-500">*</span> : null}
                          </span>
                          <select
                            value={valueOf(widget, requirement.key)}
                            onChange={(event) =>
                              onUpdateWidget(widget.id, (currentWidget) => ({
                                ...currentWidget,
                                data: {
                                  ...currentWidget.data,
                                  mappings: {
                                    ...currentWidget.data.mappings,
                                    [requirement.key]: event.target.value || undefined,
                                  },
                                },
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500 text-slate-900 dark:text-slate-100"
                          >
                            <option value="">Select field</option>
                            {availableFields.map((field) => (
                              <option key={field.name} value={field.name}>
                                {field.label} · {field.type}
                              </option>
                            ))}
                          </select>
                        </label>
                      );
                    })
                  )}
                  
                  <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-700/50">
                    <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300 flex flex-col">
                      <span>Value Aggregation</span>
                      <select
                        value={widget.data.aggregation?.type || 'none'}
                        onChange={(event) =>
                          onUpdateWidget(widget.id, (currentWidget) => ({
                            ...currentWidget,
                            data: {
                              ...currentWidget.data,
                              aggregation: {
                                ...currentWidget.data.aggregation,
                                type: event.target.value as any,
                              },
                            },
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500 text-slate-900 dark:text-slate-100"
                      >
                        <option value="none">No Aggregation (First match)</option>
                        <option value="sum">Sum</option>
                        <option value="average">Average</option>
                        <option value="count">Count</option>
                        <option value="min">Minimum</option>
                        <option value="max">Maximum</option>
                      </select>
                    </label>
                  </div>
                </div>
              )}

              {activeTab === 'style' && (
                <div className="space-y-4">
                  <div className="grid gap-4 grid-cols-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="color"
                        value={widget.style.seriesColors[0] ?? '#0f766e'}
                        onChange={(event) =>
                          onUpdateWidget(widget.id, (currentWidget) => ({
                            ...currentWidget,
                            style: {
                              ...currentWidget.style,
                              seriesColors: [event.target.value, ...currentWidget.style.seriesColors.slice(1)],
                            },
                          }))
                        }
                        className="h-10 w-10 shrink-0 rounded-full border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 cursor-pointer p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-none"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">Series color</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono truncate">{widget.style.seriesColors[0] ?? '#0f766e'}</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="color"
                        value={widget.style.backgroundColor}
                        onChange={(event) =>
                          onUpdateWidget(widget.id, (currentWidget) => ({
                            ...currentWidget,
                            style: {
                              ...currentWidget.style,
                              backgroundColor: event.target.value,
                            },
                          }))
                        }
                        className="h-10 w-10 shrink-0 rounded-full border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 cursor-pointer p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-none"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">Background</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono truncate">{widget.style.backgroundColor}</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="color"
                        value={widget.style.titleColor}
                        onChange={(event) =>
                          onUpdateWidget(widget.id, (currentWidget) => ({
                            ...currentWidget,
                            style: {
                              ...currentWidget.style,
                              titleColor: event.target.value,
                            },
                          }))
                        }
                        className="h-10 w-10 shrink-0 rounded-full border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 cursor-pointer p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-none"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">Title color</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono truncate">{widget.style.titleColor}</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="color"
                        value={widget.style.gridLineColor}
                        onChange={(event) =>
                          onUpdateWidget(widget.id, (currentWidget) => ({
                            ...currentWidget,
                            style: {
                              ...currentWidget.style,
                              gridLineColor: event.target.value,
                            },
                          }))
                        }
                        className="h-10 w-10 shrink-0 rounded-full border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 cursor-pointer p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-none"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">Grid line color</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono truncate">{widget.style.gridLineColor}</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {activeTab === 'style' && (
                <div className="space-y-5">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Adjust the font size of each text element individually using the sliders below.</p>
                  <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 p-4">
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Widget Header</span>
                    <FontSizeSlider
                      label="Widget Title"
                      value={widget.style.fontSizeTitle ?? 14}
                      disabled={widget.style.hideWidgetName === true}
                      onChange={(v) =>
                        onUpdateWidget(widget.id, (w) => ({ ...w, style: { ...w.style, fontSizeTitle: v } }))
                      }
                    />
                    <FontSizeSlider
                      label="Widget Type Label"
                      value={widget.style.fontSizeSubtitle ?? 12}
                      disabled={widget.style.hideWidgetType === true}
                      onChange={(v) =>
                        onUpdateWidget(widget.id, (w) => ({ ...w, style: { ...w.style, fontSizeSubtitle: v } }))
                      }
                    />
                  </div>

                  {AXIS_CHART_TYPES.includes(widget.type) && (
                    <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 p-4">
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Axis Charts</span>
                      <FontSizeSlider
                        label="Axis Labels"
                        value={widget.style.fontSizeAxis ?? 12}
                        onChange={(v) =>
                          onUpdateWidget(widget.id, (w) => ({ ...w, style: { ...w.style, fontSizeAxis: v } }))
                        }
                      />
                      <FontSizeSlider
                        label="Legend"
                        value={widget.style.fontSizeLegend ?? 12}
                        onChange={(v) =>
                          onUpdateWidget(widget.id, (w) => ({ ...w, style: { ...w.style, fontSizeLegend: v } }))
                        }
                      />
                      <FontSizeSlider
                        label="Data Labels"
                        value={widget.style.fontSizeDataLabel ?? 12}
                        onChange={(v) =>
                          onUpdateWidget(widget.id, (w) => ({ ...w, style: { ...w.style, fontSizeDataLabel: v } }))
                        }
                      />
                      <FontSizeSlider
                        label="Tooltip"
                        value={widget.style.fontSizeTooltip ?? 14}
                        onChange={(v) =>
                          onUpdateWidget(widget.id, (w) => ({ ...w, style: { ...w.style, fontSizeTooltip: v } }))
                        }
                      />
                    </div>
                  )}

                  {NON_AXIS_CHART_TYPES.includes(widget.type) && (
                    <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 p-4">
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Chart Labels</span>
                      <FontSizeSlider
                        label="Legend"
                        value={widget.style.fontSizeLegend ?? 12}
                        onChange={(v) =>
                          onUpdateWidget(widget.id, (w) => ({ ...w, style: { ...w.style, fontSizeLegend: v } }))
                        }
                      />
                      <FontSizeSlider
                        label="Data Labels"
                        value={widget.style.fontSizeDataLabel ?? 12}
                        onChange={(v) =>
                          onUpdateWidget(widget.id, (w) => ({ ...w, style: { ...w.style, fontSizeDataLabel: v } }))
                        }
                      />
                      <FontSizeSlider
                        label="Tooltip"
                        value={widget.style.fontSizeTooltip ?? 14}
                        onChange={(v) =>
                          onUpdateWidget(widget.id, (w) => ({ ...w, style: { ...w.style, fontSizeTooltip: v } }))
                        }
                      />
                    </div>
                  )}

                  {widget.type === 'gauge' && (
                    <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 p-4">
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Gauge</span>
                      <FontSizeSlider
                        label="Value Display"
                        value={widget.style.fontSizeValue ?? 36}
                        min={12}
                        max={72}
                        onChange={(v) =>
                          onUpdateWidget(widget.id, (w) => ({ ...w, style: { ...w.style, fontSizeValue: v } }))
                        }
                      />
                      <FontSizeSlider
                        label="Tooltip"
                        value={widget.style.fontSizeTooltip ?? 14}
                        onChange={(v) =>
                          onUpdateWidget(widget.id, (w) => ({ ...w, style: { ...w.style, fontSizeTooltip: v } }))
                        }
                      />
                    </div>
                  )}

                  {widget.type === 'kpi-card' && (
                    <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 p-4">
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">KPI Card</span>
                      <FontSizeSlider
                        label="KPI Subtitle"
                        value={widget.style.fontSizeKpiSubtitle ?? 12}
                        onChange={(v) =>
                          onUpdateWidget(widget.id, (w) => ({ ...w, style: { ...w.style, fontSizeKpiSubtitle: v } }))
                        }
                      />
                      <FontSizeSlider
                        label="Metric Value"
                        value={widget.style.fontSizeValue ?? 36}
                        min={12}
                        max={72}
                        onChange={(v) =>
                          onUpdateWidget(widget.id, (w) => ({ ...w, style: { ...w.style, fontSizeValue: v } }))
                        }
                      />
                      <FontSizeSlider
                        label="Row Count"
                        value={widget.style.fontSizeRowCount ?? 14}
                        onChange={(v) =>
                          onUpdateWidget(widget.id, (w) => ({ ...w, style: { ...w.style, fontSizeRowCount: v } }))
                        }
                      />
                      <FontSizeSlider
                        label="Comparison Delta"
                        value={widget.style.fontSizeDelta ?? 12}
                        onChange={(v) =>
                          onUpdateWidget(widget.id, (w) => ({ ...w, style: { ...w.style, fontSizeDelta: v } }))
                        }
                      />
                    </div>
                  )}

                  {widget.type === 'data-table' && (
                    <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 p-4">
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Data Table</span>
                      <FontSizeSlider
                        label="Table Header"
                        value={widget.style.fontSizeTableHeader ?? 11}
                        onChange={(v) =>
                          onUpdateWidget(widget.id, (w) => ({ ...w, style: { ...w.style, fontSizeTableHeader: v } }))
                        }
                      />
                      <FontSizeSlider
                        label="Table Cell"
                        value={widget.style.fontSizeTableCell ?? 14}
                        onChange={(v) =>
                          onUpdateWidget(widget.id, (w) => ({ ...w, style: { ...w.style, fontSizeTableCell: v } }))
                        }
                      />
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'refinements' && (
                <div className="space-y-4">
                  {widget.type !== 'kpi-card' && widget.style.seriesColors && (
                    <div className="space-y-2 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 p-3">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Series Colors</span>
                      <div className="flex flex-wrap gap-3 mt-1">
                        {widget.style.seriesColors.map((color, colorIdx) => (
                          <label key={colorIdx} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="color"
                              value={color}
                              onChange={(event) =>
                                onUpdateWidget(widget.id, (currentWidget) => {
                                  const updatedColors = [...currentWidget.style.seriesColors]
                                  updatedColors[colorIdx] = event.target.value
                                  return {
                                    ...currentWidget,
                                    style: {
                                      ...currentWidget.style,
                                      seriesColors: updatedColors,
                                    },
                                  }
                                })
                              }
                              className="h-6 w-6 shrink-0 rounded-full border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 cursor-pointer p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-none"
                            />
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">
                              {seriesNames[colorIdx] ?? `#${colorIdx + 1}`}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 p-4">
                    <label className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Data Labels</span>
                      <input
                        type="checkbox"
                        checked={widget.style.showDataLabels}
                        onChange={(event) =>
                          onUpdateWidget(widget.id, (currentWidget) => ({
                            ...currentWidget,
                            style: {
                              ...currentWidget.style,
                              showDataLabels: event.target.checked,
                            },
                          }))
                        }
                        className="cursor-pointer"
                      />
                    </label>
                    
                    {widget.style.showDataLabels && (
                      <div className="space-y-4">
                        <div className="grid gap-3 grid-cols-2">
                          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300 flex flex-col">
                            <span>Position</span>
                            <select
                              value={widget.style.dataLabelPosition}
                              onChange={(event) =>
                                onUpdateWidget(widget.id, (w) => ({ ...w, style: { ...w.style, dataLabelPosition: event.target.value as any } }))
                              }
                              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500 text-slate-900 dark:text-slate-100"
                            >
                              <option value="top">Top</option>
                              <option value="bottom">Bottom</option>
                              <option value="left">Left</option>
                              <option value="right">Right</option>
                              <option value="inside">Inside</option>
                              <option value="center">Center</option>
                            </select>
                          </label>
                          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300 flex flex-col">
                            <span>Font Family</span>
                            <select
                              value={widget.style.dataLabelFontFamily ?? 'Manrope, Segoe UI, sans-serif'}
                              onChange={(event) =>
                                onUpdateWidget(widget.id, (w) => ({ ...w, style: { ...w.style, dataLabelFontFamily: event.target.value } }))
                              }
                              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500 text-slate-900 dark:text-slate-100"
                            >
                              <option value="Manrope, Segoe UI, sans-serif">Manrope</option>
                              <option value="Inter, sans-serif">Inter</option>
                              <option value="monospace">Monospace</option>
                            </select>
                          </label>
                        </div>
                        
                        <div className="grid gap-3 grid-cols-2">
                          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300 flex flex-col">
                            <span>Text Color</span>
                            <div className="flex h-[46px] items-center rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-3 transition focus-within:border-teal-400 dark:focus-within:border-teal-500">
                              <input
                                type="color"
                                value={widget.style.dataLabelColor?.slice(0,7) ?? '#f8fafc'}
                                onChange={(event) =>
                                  onUpdateWidget(widget.id, (w) => ({ ...w, style: { ...w.style, dataLabelColor: event.target.value } }))
                                }
                                className="h-6 w-6 shrink-0 rounded-full border border-slate-200 dark:border-slate-700/50 p-0 cursor-pointer bg-white"
                              />
                              <span className="ml-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 uppercase">{widget.style.dataLabelColor?.slice(0,7) ?? '#f8fafc'}</span>
                            </div>
                          </label>
                          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300 flex flex-col">
                            <span>Background</span>
                            <div className="flex h-[46px] items-center rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-3 transition focus-within:border-teal-400 dark:focus-within:border-teal-500">
                              <input
                                type="color"
                                value={widget.style.dataLabelBackgroundColor?.slice(0,7) ?? '#0f172a'}
                                onChange={(event) =>
                                  onUpdateWidget(widget.id, (w) => ({ ...w, style: { ...w.style, dataLabelBackgroundColor: event.target.value } }))
                                }
                                className="h-6 w-6 shrink-0 rounded-full border border-slate-200 dark:border-slate-700/50 p-0 cursor-pointer bg-white"
                              />
                              <span className="ml-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 uppercase">{widget.style.dataLabelBackgroundColor?.slice(0,7) ?? '#0f172a'}</span>
                            </div>
                          </label>
                        </div>

                        <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300 flex flex-col">
                          <span>Label Format</span>
                          <select
                            value={widget.style.dataLabelFormat ?? 'value'}
                            onChange={(event) =>
                              onUpdateWidget(widget.id, (w) => ({ ...w, style: { ...w.style, dataLabelFormat: event.target.value as any } }))
                            }
                            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500 text-slate-900 dark:text-slate-100"
                          >
                            <option value="value">Value</option>
                            <option value="category">Category / Series Name</option>
                            <option value="percent">Percentage</option>
                            <option value="both">Category & Value</option>
                          </select>
                        </label>

                        {seriesNames.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Visible Labels</span>
                            <div className="grid grid-cols-2 gap-2 mt-1 max-h-32 overflow-y-auto pr-1">
                              {seriesNames.map((name, idx) => {
                                const isHidden = widget.style.hiddenDataLabels?.includes(name) ?? false
                                return (
                                  <label key={idx} className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition">
                                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate" title={name}>{name}</span>
                                    <input
                                      type="checkbox"
                                      checked={!isHidden}
                                      onChange={(e) => {
                                        onUpdateWidget(widget.id, (w) => {
                                          const currentHidden = [...(w.style.hiddenDataLabels || [])]
                                          if (e.target.checked) {
                                            return { ...w, style: { ...w.style, hiddenDataLabels: currentHidden.filter(n => n !== name) } }
                                          } else {
                                            if (!currentHidden.includes(name)) currentHidden.push(name)
                                            return { ...w, style: { ...w.style, hiddenDataLabels: currentHidden } }
                                          }
                                        })
                                      }}
                                      className="cursor-pointer shrink-0"
                                    />
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="grid gap-3 grid-cols-2">
                    <label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>Show grid lines</span>
                      <input
                        type="checkbox"
                        checked={widget.style.showGridLines}
                        onChange={(event) =>
                          onUpdateWidget(widget.id, (currentWidget) => ({
                            ...currentWidget,
                            style: {
                              ...currentWidget.style,
                              showGridLines: event.target.checked,
                            },
                          }))
                        }
                        className="cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>Show legend</span>
                      <input
                        type="checkbox"
                        checked={widget.style.showLegend}
                        onChange={(event) =>
                          onUpdateWidget(widget.id, (currentWidget) => ({
                            ...currentWidget,
                            style: {
                              ...currentWidget.style,
                              showLegend: event.target.checked,
                            },
                          }))
                        }
                        className="cursor-pointer"
                      />
                    </label>
                  </div>
                  <div className="grid gap-3 grid-cols-2">
                    <label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>Hide widget name label</span>
                      <input
                        type="checkbox"
                        checked={widget.style.hideWidgetName === true}
                        onChange={(event) =>
                          onUpdateWidget(widget.id, (currentWidget) => ({
                            ...currentWidget,
                            style: {
                              ...currentWidget.style,
                              hideWidgetName: event.target.checked,
                            },
                          }))
                        }
                        className="cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>Hide widget type label</span>
                      <input
                        type="checkbox"
                        checked={widget.style.hideWidgetType === true}
                        onChange={(event) =>
                          onUpdateWidget(widget.id, (currentWidget) => ({
                            ...currentWidget,
                            style: {
                              ...currentWidget.style,
                              hideWidgetType: event.target.checked,
                            },
                          }))
                        }
                        className="cursor-pointer"
                      />
                    </label>
                  </div>
                  <div className="space-y-3">
                    {AXIS_CHART_TYPES.includes(widget.type) && (
                      <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300 flex flex-col">
                        <span>Stacking Mode</span>
                        <select
                          value={widget.style.stacking || 'none'}
                          onChange={(event) =>
                            onUpdateWidget(widget.id, (currentWidget) => ({
                              ...currentWidget,
                              style: {
                                ...currentWidget.style,
                                stacking: event.target.value as any,
                              },
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500 text-slate-900 dark:text-slate-100"
                        >
                          <option value="none">None</option>
                          <option value="normal">Stacked</option>
                          <option value="percent">100% Stacked</option>
                        </select>
                      </label>
                    )}
                    <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300 flex flex-col">
                      <span>Value Format</span>
                      <select
                        value={widget.style.valueFormat}
                        onChange={(event) =>
                          onUpdateWidget(widget.id, (currentWidget) => ({
                            ...currentWidget,
                            style: {
                              ...currentWidget.style,
                              valueFormat: event.target.value as any,
                            },
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500 text-slate-900 dark:text-slate-100"
                      >
                        <option value="number">Number</option>
                        <option value="currency">Currency</option>
                        <option value="percentage">Percentage</option>
                        <option value="compact">Compact (K/M/B)</option>
                      </select>
                    </label>

                    {widget.style.valueFormat === 'currency' && (
                      <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300 flex flex-col">
                        <span>Currency Symbol</span>
                        <select
                          value={widget.style.currencySymbol}
                          onChange={(event) =>
                            onUpdateWidget(widget.id, (currentWidget) => ({
                              ...currentWidget,
                              style: {
                                ...currentWidget.style,
                                currencySymbol: event.target.value,
                              },
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500 text-slate-900 dark:text-slate-100"
                        >
                          <option value="$">$ (USD)</option>
                          <option value="£">£ (GBP)</option>
                          <option value="€">€ (EUR)</option>
                        </select>
                      </label>
                    )}

                    {widget.style.showLegend && (
                      <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300 flex flex-col">
                        <span>Legend Position</span>
                        <select
                          value={widget.style.legendPosition}
                          onChange={(event) =>
                            onUpdateWidget(widget.id, (currentWidget) => ({
                              ...currentWidget,
                              style: {
                                ...currentWidget.style,
                                legendPosition: event.target.value as any,
                              },
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500 text-slate-900 dark:text-slate-100"
                        >
                          <option value="horizontal-top-left">Horizontal - Top left</option>
                          <option value="horizontal-top-center">Horizontal - top centered</option>
                          <option value="horizontal-top-right">Horizontal - top right</option>
                          <option value="horizontal-bottom-left">Horizontal - Bottom left</option>
                          <option value="horizontal-bottom-center">Horizontal - Bottom centered</option>
                          <option value="horizontal-bottom-right">Horizontal - Bottom right</option>
                          <option value="vertical-right">Vertical - right</option>
                          <option value="vertical-left">Vertical - left</option>
                        </select>
                      </label>
                    )}


                    {widget.type === 'kpi-card' && (
                      <>
                        <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300 flex flex-col">
                          <span>KPI Subtitle</span>
                          <input
                            value={widget.style.kpiSubtitle ?? ''}
                            placeholder="Live metric"
                            onChange={(event) =>
                              onUpdateWidget(widget.id, (currentWidget) => ({
                                ...currentWidget,
                                style: {
                                  ...currentWidget.style,
                                  kpiSubtitle: event.target.value,
                                },
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500 text-slate-900 dark:text-slate-100"
                          />
                        </label>
                        <div className="grid gap-3 grid-cols-2">
                          <label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <span>Show row count</span>
                            <input
                              type="checkbox"
                              checked={widget.style.showRowCount !== false}
                              onChange={(event) =>
                                onUpdateWidget(widget.id, (currentWidget) => ({
                                  ...currentWidget,
                                  style: {
                                    ...currentWidget.style,
                                    showRowCount: event.target.checked,
                                  },
                                }))
                              }
                              className="cursor-pointer"
                            />
                          </label>
                          <label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <span>Show comparison delta</span>
                            <input
                              type="checkbox"
                              checked={widget.style.showComparisonDelta !== false}
                              onChange={(event) =>
                                onUpdateWidget(widget.id, (currentWidget) => ({
                                  ...currentWidget,
                                  style: {
                                    ...currentWidget.style,
                                    showComparisonDelta: event.target.checked,
                                  },
                                }))
                              }
                              className="cursor-pointer"
                            />
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'filters' && <LayoutPanel widget={widget} onUpdateWidget={onUpdateWidget} />}

              {activeTab === 'filters' && (
                <FilterPanel widget={widget} dataSource={dataSource} onUpdateWidget={onUpdateWidget} />
              )}
            </div>
          </div>
        </div>

        <div className={`flex-1 flex-col bg-slate-50 dark:bg-slate-800/50 p-6 ${isExpanded ? 'flex' : 'hidden xl:flex'}`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-50">Live Preview</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Drag the bottom right corner to resize</span>
          </div>
          <div className="flex-1 overflow-auto rounded-[24px] border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 p-4 shadow-inner flex items-center justify-center">
            {(() => {
              const gridWidth = adjustedWidget.layout.w * 80 + (adjustedWidget.layout.w - 1) * 16
              const gridHeight = adjustedWidget.layout.h * 48 + (adjustedWidget.layout.h - 1) * 16
              const maxW = isExpanded ? 800 : 440
              const maxH = isExpanded ? 800 : 440
              const scale = Math.min(maxW / gridWidth, maxH / gridHeight, 1)
              const initialWidth = Math.round(gridWidth * scale)
              const initialHeight = Math.round(gridHeight * scale)

              return (
                <div
                  key={`${adjustedWidget.id}-${adjustedWidget.layout.w}-${adjustedWidget.layout.h}`}
                  className="resize overflow-hidden rounded-[20px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm dark:shadow-none transition-shadow hover:shadow-md flex flex-col"
                  style={{
                    width: `${initialWidth}px`,
                    height: `${initialHeight}px`,
                    minWidth: '200px',
                    minHeight: '200px',
                    backgroundColor: adjustedWidget.style.backgroundColor,
                  }}
                >
                  {!(adjustedWidget.style.hideWidgetName && adjustedWidget.style.hideWidgetType) && (
                    <div className="shrink-0 border-b border-slate-100 dark:border-slate-800 px-4 py-3">
                      <div className="min-w-0">
                        {!adjustedWidget.style.hideWidgetName && (
                          <h4
                            className="truncate font-display font-semibold"
                            style={{ color: adjustedWidget.style.titleColor, fontSize: adjustedWidget.style.fontSizeTitle ?? 14 }}
                          >
                            {adjustedWidget.title ?? 'Untitled Widget'}
                          </h4>
                        )}
                        {!adjustedWidget.style.hideWidgetType && (
                          <p className="truncate text-slate-500 dark:text-slate-400" style={{ fontSize: adjustedWidget.style.fontSizeSubtitle ?? 12 }}>
                            {adjustedWidget.type}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  <div
                    className="flex-1 overflow-hidden"
                    style={{ padding: `${adjustedWidget.style.padding}px` }}
                  >
                    <div
                      style={{
                        transform: `translate(${adjustedWidget.style.panX ?? 0}px, ${adjustedWidget.style.panY ?? 0}px) scale(${adjustedWidget.style.graphicZoom ?? 1})`,
                        transformOrigin: 'center center',
                        width: '100%',
                        height: '100%',
                        transition: isPanning ? 'none' : 'transform 0.2s ease-in-out',
                        cursor: isPanning ? 'grabbing' : ((adjustedWidget.style.graphicZoom ?? 1) > 1 ? 'grab' : 'default'),
                      }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onDoubleClick={handleDoubleClick}
                    >
                      <WidgetRenderer widget={adjustedWidget} dataSource={dataSource} />
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}
