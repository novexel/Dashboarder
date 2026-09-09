import { useState } from 'react'
import { DashboardGrid } from './DashboardGrid'
import { DashboardStoreContext, createDashboardStore, useDashboardStore, type DashboardStoreApi } from '../state/dashboardStore'
import type { DashboardRendererProps } from '../core/types'

function RendererSurface() {
  const config = useDashboardStore((state) => state.config)
  const dataSources = useDashboardStore((state) => state.dataSources)
  const selectedWidgetId = useDashboardStore((state) => state.selectedWidgetId)
  const selectWidget = useDashboardStore((state) => state.selectWidget)

  return (
    <DashboardGrid
      config={config}
      dataSources={dataSources}
      selectedWidgetId={selectedWidgetId}
      readOnly
      onSelectWidget={selectWidget}
      onEditWidget={() => undefined}
      onDuplicateWidget={() => undefined}
      onDeleteWidget={() => undefined}
      onLayoutsChange={() => undefined}
    />
  )
}

export function DashboardRenderer({ dataSources = [], config, className }: DashboardRendererProps) {
  const [store] = useState<DashboardStoreApi>(() =>
    createDashboardStore({
      dataSources,
      config,
      mode: 'preview',
    }),
  )

  return (
    <div className={className}>
      <DashboardStoreContext.Provider value={store}>
        <RendererSurface />
      </DashboardStoreContext.Provider>
    </div>
  )
}
