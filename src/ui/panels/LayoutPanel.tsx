import type { DashboardWidgetConfig } from '../../core/types'

type LayoutPanelProps = {
  widget?: DashboardWidgetConfig
  onUpdateWidget: (widgetId: string, recipe: (widget: DashboardWidgetConfig) => DashboardWidgetConfig) => void
}

export function LayoutPanel({ widget, onUpdateWidget }: LayoutPanelProps) {
  if (!widget) {
    return (
      <section className="rounded-[28px] border border-slate-200 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/90 p-5 shadow-soft dark:shadow-none">
        <h2 className="font-display text-xl font-semibold text-slate-950 dark:text-white dark:text-slate-950">Layout</h2>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">Drag and resize a widget on the canvas, or select one to fine-tune its layout numbers here.</p>
      </section>
    )
  }

  const updateNumber = (key: 'x' | 'y' | 'w' | 'h', value: number) => {
    onUpdateWidget(widget.id, (currentWidget) => ({
      ...currentWidget,
      layout: {
        ...currentWidget.layout,
        [key]: Number.isFinite(value) ? value : currentWidget.layout[key],
      },
    }))
  }

  return (
    <section className="rounded-[28px] border border-slate-200 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/90 p-5 shadow-soft dark:shadow-none">
      <h2 className="font-display text-xl font-semibold text-slate-950 dark:text-white dark:text-slate-950">Layout</h2>
      <div className="mt-4 grid gap-3 grid-cols-2">
        {(['x', 'y', 'w', 'h'] as const).map((key) => (
          <label key={key} className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <span className="uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">{key}</span>
            <input
              type="number"
              value={widget.layout[key]}
              onChange={(event) => updateNumber(key, Number(event.target.value))}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500"
            />
          </label>
        ))}
      </div>
      <label className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">
        <span>Lock widget position</span>
        <input
          type="checkbox"
          checked={widget.layout.static ?? false}
          onChange={(event) =>
            onUpdateWidget(widget.id, (currentWidget) => ({
              ...currentWidget,
              layout: {
                ...currentWidget.layout,
                static: event.target.checked,
              },
            }))
          }
        />
      </label>
    </section>
  )
}
