import GridLayout, { WidthProvider, type Layout } from 'react-grid-layout'
import { LayoutDashboard } from 'lucide-react'
import type { DashboardConfig, DashboardWidgetConfig, DataSource } from '../core/types'
import { WidgetFrame } from './WidgetFrame'
import { WidgetRenderer } from './WidgetRenderer'
import { adjustWidgetForTheme } from '../core/types'
import { useDashboardStore } from '../state/dashboardStore'

const AutoWidthGrid = WidthProvider(GridLayout)

type DashboardGridProps = {
  config: DashboardConfig
  dataSources: DataSource[]
  selectedWidgetId: string | null
  readOnly?: boolean
  onSelectWidget: (widgetId: string) => void
  onEditWidget: (widgetId: string) => void
  onDuplicateWidget: (widgetId: string) => void
  onDeleteWidget: (widgetId: string) => void
  onLayoutsChange: (layouts: Layout[]) => void
  onZoomInWidget?: (widgetId: string) => void
  onZoomOutWidget?: (widgetId: string) => void
}

const toLayout = (widgets: DashboardWidgetConfig[]): Layout[] =>
  widgets.map((widget) => ({
    i: widget.id,
    ...widget.layout,
  }))

export function DashboardGrid({
  config,
  dataSources,
  selectedWidgetId,
  readOnly = false,
  onSelectWidget,
  onEditWidget,
  onDuplicateWidget,
  onDeleteWidget,
  onLayoutsChange,
  onZoomInWidget,
  onZoomOutWidget,
}: DashboardGridProps) {
  const themeMode = useDashboardStore((state) => state.themeMode)

  if (config.widgets.length === 0) {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center rounded-[32px] border border-dashed border-slate-300 dark:border-slate-600/50 bg-white/70 dark:bg-slate-900/70 px-10 text-center shadow-soft dark:shadow-none">
        <LayoutDashboard className="mb-4 h-10 w-10 text-teal-600 dark:text-teal-400" />
        <h2 className="font-display text-2xl font-semibold text-slate-950 dark:text-white">Start with a visual plugin</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Upload data, add a widget, then open the widget editor to map fields and tune the visual. Every widget in this
          grid is driven by a serialized config object rather than hardcoded visuals.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-[32px] border border-slate-200 dark:border-slate-700/50/80 bg-white/60 dark:bg-slate-900/60 p-4 shadow-panel dark:shadow-black/20 backdrop-blur">
      <AutoWidthGrid
        className={`layout ${readOnly ? 'grid-preview-mode' : ''}`}
        layout={toLayout(config.widgets)}
        cols={config.layout?.columns ?? 12}
        rowHeight={config.layout?.rowHeight ?? 48}
        isDraggable={!readOnly}
        isResizable={!readOnly}
        resizeHandles={['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne']}
        compactType={config.layout?.compactType ?? 'vertical'}
        containerPadding={[0, 0]}
        margin={[16, 16]}
        draggableHandle=".widget-drag-handle"
        draggableCancel=".widget-frame-action"
        onLayoutChange={onLayoutsChange}
      >
        {config.widgets.map((widget) => {
          const adjustedWidget = adjustWidgetForTheme(widget, themeMode)
          return (
            <div key={widget.id}>
              <WidgetFrame
                widget={widget}
                selected={widget.id === selectedWidgetId}
                readOnly={readOnly}
                onSelect={() => onSelectWidget(widget.id)}
                onEdit={() => onEditWidget(widget.id)}
                onDuplicate={() => onDuplicateWidget(widget.id)}
                onDelete={() => onDeleteWidget(widget.id)}
                onZoomIn={() => onZoomInWidget?.(widget.id)}
                onZoomOut={() => onZoomOutWidget?.(widget.id)}
              >
                <WidgetRenderer
                  widget={adjustedWidget}
                  dataSource={dataSources.find((dataSource) => dataSource.id === widget.data.dataSourceId)}
                />
              </WidgetFrame>
            </div>
          )
        })}
      </AutoWidthGrid>
    </div>
  )
}
