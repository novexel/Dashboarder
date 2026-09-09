import type { DashboardWidgetConfig, DataSource, FilterConfig } from '../../core/types'

type FilterPanelProps = {
  widget?: DashboardWidgetConfig
  dataSource?: DataSource
  onUpdateWidget: (widgetId: string, recipe: (widget: DashboardWidgetConfig) => DashboardWidgetConfig) => void
}

const createFilter = (): FilterConfig => ({
  id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10),
  field: '',
  operator: 'equals',
  value: '',
})

export function FilterPanel({ widget, dataSource, onUpdateWidget }: FilterPanelProps) {
  if (!widget) {
    return (
      <section className="rounded-[28px] border border-slate-200 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/90 p-5 shadow-soft dark:shadow-none">
        <h2 className="font-display text-xl font-semibold text-slate-950 dark:text-white dark:text-slate-950">Filters & sorting</h2>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">Select a widget to add row-level filters, limit results, or sort the incoming data before rendering.</p>
      </section>
    )
  }

  const filters = widget.data.filters ?? []
  const sortRule = widget.data.sort?.[0]

  return (
    <section className="rounded-[28px] border border-slate-200 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/90 p-5 shadow-soft dark:shadow-none">
      <h2 className="font-display text-xl font-semibold text-slate-950 dark:text-white dark:text-slate-950">Filters & sorting</h2>
      <div className="mt-4 space-y-4">
        <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <span>Limit rows</span>
          <input
            type="number"
            value={widget.data.limit ?? ''}
            onChange={(event) =>
              onUpdateWidget(widget.id, (currentWidget) => ({
                ...currentWidget,
                data: {
                  ...currentWidget.data,
                  limit: event.target.value ? Number(event.target.value) : undefined,
                },
              }))
            }
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500 text-slate-900 dark:text-slate-100"
          />
        </label>

        <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={widget.interactions?.ignoreCrossFilters ?? false}
            onChange={(event) =>
              onUpdateWidget(widget.id, (currentWidget) => ({
                ...currentWidget,
                interactions: {
                  ...currentWidget.interactions,
                  ignoreCrossFilters: event.target.checked,
                },
              }))
            }
            className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-teal-600 focus:ring-teal-500"
          />
          <span>Ignore cross-filters from other widgets</span>
        </label>

        <div className="rounded-[22px] border border-slate-200 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-900 dark:text-slate-50">Sort rule</h3>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <select
              value={sortRule?.field ?? ''}
              onChange={(event) =>
                onUpdateWidget(widget.id, (currentWidget) => ({
                  ...currentWidget,
                  data: {
                    ...currentWidget.data,
                    sort: event.target.value ? [{ field: event.target.value, direction: sortRule?.direction ?? 'desc' }] : [],
                  },
                }))
              }
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500 text-slate-900 dark:text-slate-100"
            >
              <option value="">No sorting</option>
              {dataSource?.fields.map((field) => (
                <option key={field.name} value={field.name}>
                  {field.label}
                </option>
              ))}
            </select>
            <select
              value={sortRule?.direction ?? 'desc'}
              onChange={(event) =>
                onUpdateWidget(widget.id, (currentWidget) => ({
                  ...currentWidget,
                  data: {
                    ...currentWidget.data,
                    sort: sortRule ? [{ field: sortRule.field, direction: event.target.value as 'asc' | 'desc' }] : currentWidget.data.sort,
                  },
                }))
              }
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500 text-slate-900 dark:text-slate-100"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>

        <div className="rounded-[22px] border border-slate-200 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-900 dark:text-slate-50">Row filters</h3>
            <button
              type="button"
              onClick={() =>
                onUpdateWidget(widget.id, (currentWidget) => ({
                  ...currentWidget,
                  data: {
                    ...currentWidget.data,
                    filters: [...(currentWidget.data.filters ?? []), createFilter()],
                  },
                }))
              }
              className="rounded-full border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:bg-slate-800/50"
            >
              Add filter
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {filters.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">No widget-level filters yet.</p>
            ) : (
              filters.map((filter) => (
                <div key={filter.id} className="grid gap-3 rounded-[20px] border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <select
                      value={filter.field}
                      onChange={(event) =>
                        onUpdateWidget(widget.id, (currentWidget) => ({
                          ...currentWidget,
                          data: {
                            ...currentWidget.data,
                            filters: (currentWidget.data.filters ?? []).map((currentFilter) =>
                              currentFilter.id === filter.id ? { ...currentFilter, field: event.target.value } : currentFilter,
                            ),
                          },
                        }))
                      }
                      className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500 text-slate-900 dark:text-slate-100"
                    >
                      <option value="">Field</option>
                      {dataSource?.fields.map((field) => (
                        <option key={field.name} value={field.name}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filter.operator}
                      onChange={(event) =>
                        onUpdateWidget(widget.id, (currentWidget) => ({
                          ...currentWidget,
                          data: {
                            ...currentWidget.data,
                            filters: (currentWidget.data.filters ?? []).map((currentFilter) =>
                              currentFilter.id === filter.id ? { ...currentFilter, operator: event.target.value as FilterConfig['operator'] } : currentFilter,
                            ),
                          },
                        }))
                      }
                      className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500 text-slate-900 dark:text-slate-100"
                    >
                      <option value="equals">Equals</option>
                      <option value="contains">Contains</option>
                      <option value="doesNotContain">Does not contain</option>
                      <option value="greaterThan">Greater than</option>
                      <option value="lessThan">Less than</option>
                      <option value="between">Between</option>
                    </select>
                    <input
                      value={String(filter.value ?? '')}
                      onChange={(event) =>
                        onUpdateWidget(widget.id, (currentWidget) => ({
                          ...currentWidget,
                          data: {
                            ...currentWidget.data,
                            filters: (currentWidget.data.filters ?? []).map((currentFilter) =>
                              currentFilter.id === filter.id ? { ...currentFilter, value: event.target.value } : currentFilter,
                            ),
                          },
                        }))
                      }
                      placeholder="Value"
                      className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateWidget(widget.id, (currentWidget) => ({
                        ...currentWidget,
                        data: {
                          ...currentWidget.data,
                          filters: (currentWidget.data.filters ?? []).filter((currentFilter) => currentFilter.id !== filter.id),
                        },
                      }))
                    }
                    className="justify-self-end rounded-full border border-rose-200 bg-rose-50 dark:bg-rose-900/30 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 transition hover:bg-rose-100 dark:bg-rose-900/50"
                  >
                    Remove filter
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
