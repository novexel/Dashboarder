import React, { useState } from 'react'
import {
  DashboardBuilder,
  DashboardRenderer,
  type DashboardConfig,
  type DataSource,
  createDefaultWidgetStyle
} from '@novexel/dashboarder'

const initialDataSources: DataSource[] = [
  {
    id: 'ds-sales',
    name: 'Q3 Enterprise Sales',
    type: 'static',
    fields: [
      { name: 'region', label: 'Region', type: 'string' },
      { name: 'revenue', label: 'Revenue', type: 'currency' },
      { name: 'deals', label: 'Deals', type: 'integer' },
    ],
    rows: [
      { region: 'North America', revenue: 1450000, deals: 42 },
      { region: 'Europe', revenue: 980000, deals: 29 },
      { region: 'Asia Pacific', revenue: 620000, deals: 18 },
    ],
  },
]

const baseStyle = createDefaultWidgetStyle()

const sampleConfig: DashboardConfig = {
  version: '1.0.0',
  name: 'Executive Revenue Overview',
  widgets: [
    {
      id: 'w-kpi-1',
      type: 'kpi-card',
      title: 'Total Revenue',
      layout: { x: 0, y: 0, w: 4, h: 3 },
      data: {
        dataSourceId: 'ds-sales',
        mappings: { metric: 'revenue' },
        aggregation: { type: 'sum', field: 'revenue' },
      },
      labels: {},
      style: { ...baseStyle, valueFormat: 'currency' },
    },
    {
      id: 'w-bar-1',
      type: 'bar-chart',
      title: 'Revenue by Region',
      layout: { x: 4, y: 0, w: 8, h: 5 },
      data: {
        dataSourceId: 'ds-sales',
        mappings: { x: 'region', y: 'revenue' },
      },
      labels: {},
      style: baseStyle,
    },
  ],
  globalFilters: [],
}

export function App() {
  const [config, setConfig] = useState<DashboardConfig>(sampleConfig)
  const [mode, setMode] = useState<'builder' | 'preview'>('builder')

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1>Novexel Analytics Portal</h1>
        <button onClick={() => setMode(mode === 'builder' ? 'preview' : 'builder')}>
          Switch to {mode === 'builder' ? 'Preview' : 'Builder'}
        </button>
      </header>

      {mode === 'builder' ? (
        <DashboardBuilder
          dataSources={initialDataSources}
          initialConfig={config}
          onChange={(nextConfig) => setConfig(nextConfig)}
        />
      ) : (
        <DashboardRenderer
          dataSources={initialDataSources}
          config={config}
        />
      )}
    </div>
  )
}
