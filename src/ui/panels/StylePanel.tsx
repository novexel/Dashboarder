import type { DashboardWidgetConfig, DataSource, VisualPlugin } from '../../core/types'

type StylePanelProps = {
  widget?: DashboardWidgetConfig
  dataSource?: DataSource
  visuals: VisualPlugin[]
  onUpdateWidget: (widgetId: string, recipe: (widget: DashboardWidgetConfig) => DashboardWidgetConfig) => void
  onChangeWidgetType: (widgetId: string, pluginId: string) => void
  onSelectDataSource: (dataSourceId: string) => void
  availableDataSources: DataSource[]
}

const valueOf = (widget: DashboardWidgetConfig, key: string) => {
  const mapping = widget.data.mappings[key]
  return Array.isArray(mapping) ? mapping[0] : mapping ?? ''
}

export function StylePanel({
  widget,
  dataSource,
  visuals,
  onUpdateWidget,
  onChangeWidgetType,
  onSelectDataSource,
  availableDataSources,
}: StylePanelProps) {
  if (!widget) {
    return (
      <section className="rounded-[28px] border border-slate-200 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/90 p-5 shadow-soft dark:shadow-none">
        <h2 className="font-display text-xl font-semibold text-slate-950 dark:text-white dark:text-slate-950">Widget settings</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400 dark:text-slate-500">Select a widget from the canvas to edit its title, dataset, mappings, and styling.</p>
      </section>
    )
  }

  const plugin = visuals.find((visual) => visual.id === widget.type)
  const mappingRequirements = [...(plugin?.requiredMappings ?? []), ...(plugin?.optionalMappings ?? [])]
  const availableFields = dataSource?.fields ?? []

  return (
    <section className="rounded-[28px] border border-slate-200 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/90 p-5 shadow-soft dark:shadow-none">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Selected widget</p>
      <h2 className="mt-2 font-display text-xl font-semibold text-slate-950 dark:text-white dark:text-slate-950">{widget.title ?? plugin?.name ?? 'Widget'}</h2>

      <div className="mt-5 space-y-4">
        <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <span>Title</span>
          <input
            value={widget.title ?? ''}
            onChange={(event) =>
              onUpdateWidget(widget.id, (currentWidget) => ({
                ...currentWidget,
                title: event.target.value,
              }))
            }
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <span>Widget type</span>
            <select
              value={widget.type}
              onChange={(event) => onChangeWidgetType(widget.id, event.target.value)}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500"
            >
              {visuals.map((visual) => (
                <option key={visual.id} value={visual.id}>
                  {visual.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
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
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500"
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

        <div className="rounded-[22px] border border-slate-200 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/80 p-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-50">Field mappings</h3>
          <div className="mt-4 space-y-3">
            {mappingRequirements.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">This widget can render without explicit field mappings.</p>
            ) : (
              mappingRequirements.map((requirement) => (
                <label key={requirement.key} className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
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
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500"
                  >
                    <option value="">Select field</option>
                    {availableFields.map((field) => (
                      <option key={field.name} value={field.name}>
                        {field.label} · {field.type}
                      </option>
                    ))}
                  </select>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[22px] border border-slate-200 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/80 p-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-50">Visual style</h3>
          <div className="mt-4 grid gap-4 grid-cols-2">
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
          <div className="mt-4 space-y-3">
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

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300">
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
              <label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300">
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
          </div>
        </div>
      </div>
    </section>
  )
}
