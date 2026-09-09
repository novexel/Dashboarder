import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import type { Layout } from 'react-grid-layout'
import type { DashboardBuilderMode, DashboardConfig, DashboardWidgetConfig, DataFieldType, DataSource, FilterConfig } from '../core/types'
import { createEmptyDashboardConfig } from '../core/types'

const cloneConfig = (config: DashboardConfig): DashboardConfig => structuredClone(config)

const stampConfig = (config: DashboardConfig) => ({
  ...config,
  updatedAt: new Date().toISOString(),
})

const createCopyId = (prefix: string) =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `${prefix}-${crypto.randomUUID().slice(0, 8)}`
    : `${prefix}-${Math.random().toString(36).slice(2, 10)}`

const createClonedDataSource = (dataSource: DataSource): DataSource => ({
  ...structuredClone(dataSource),
  id: createCopyId(dataSource.type),
  name: `${dataSource.name} Copy`,
  metadata: {
    ...dataSource.metadata,
    clonedFrom: dataSource.id,
    clonedAt: new Date().toISOString(),
  },
})

const upsertFieldTypeOverride = (
  metadata: DataSource['metadata'],
  fieldName: string,
  nextType: DataFieldType,
): Record<string, unknown> => {
  const currentOverrides =
    metadata && typeof metadata.fieldTypeOverrides === 'object' && metadata.fieldTypeOverrides !== null
      ? (metadata.fieldTypeOverrides as Record<string, unknown>)
      : {}

  return {
    ...(metadata ?? {}),
    fieldTypeOverrides: {
      ...currentOverrides,
      [fieldName]: nextType,
    },
  }
}

export type DashboardStoreState = {
  seedDataSources: DataSource[]
  dataSources: DataSource[]
  config: DashboardConfig
  selectedWidgetId: string | null
  activeDataSourceId: string | null
  mode: DashboardBuilderMode
  themeMode: 'light' | 'dark'
  setThemeMode: (themeMode: 'light' | 'dark') => void
  initialize: (args: { dataSources?: DataSource[]; config?: DashboardConfig; mode?: DashboardBuilderMode }) => void
  syncExternalConfig: (config: DashboardConfig) => void
  setMode: (mode: DashboardBuilderMode) => void
  setDataSources: (dataSources: DataSource[]) => void
  upsertDataSource: (dataSource: DataSource) => void
  removeDataSource: (dataSourceId: string) => void
  renameDataSource: (dataSourceId: string, name: string) => void
  cloneDataSource: (dataSourceId: string) => void
  updateDataSourceFieldType: (dataSourceId: string, fieldName: string, nextType: DataFieldType) => void
  setActiveDataSource: (dataSourceId: string | null) => void
  setConfig: (config: DashboardConfig) => void
  replaceState: (args: { config: DashboardConfig; dataSources?: DataSource[] }) => void
  addWidget: (widget: DashboardWidgetConfig) => void
  updateWidget: (widgetId: string, recipe: (widget: DashboardWidgetConfig) => DashboardWidgetConfig) => void
  updateLayouts: (layouts: Layout[]) => void
  duplicateWidget: (widgetId: string) => void
  removeWidget: (widgetId: string) => void
  selectWidget: (widgetId: string | null) => void
  setTargetWidgetId: (widgetId: string | null) => void
  resetDashboard: () => void
  resetDashboardAndData: () => void
  crossFilters: Record<string, FilterConfig[]>
  toggleCrossFilter: (dataSourceId: string, filter: FilterConfig) => void
  clearCrossFilters: (dataSourceId?: string) => void
}

export type DashboardStoreApi = ReturnType<typeof createDashboardStore>

export const createDashboardStore = (initial?: {
  dataSources?: DataSource[]
  config?: DashboardConfig
  mode?: DashboardBuilderMode
}) =>
  createStore<DashboardStoreState>((set) => ({
    seedDataSources: initial?.dataSources ?? [],
    dataSources: initial?.dataSources ?? [],
    config: initial?.config ? cloneConfig(initial.config) : createEmptyDashboardConfig(),
    selectedWidgetId: initial?.config?.widgets[0]?.id ?? null,
    activeDataSourceId: initial?.dataSources?.[0]?.id ?? null,
    mode: initial?.mode ?? 'builder',
    themeMode: (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) ? 'dark' : 'light',
    crossFilters: {},
    setThemeMode: (themeMode) => set((state) => ({ ...state, themeMode })),
    initialize: ({ dataSources, config, mode }) =>
      set(() => ({
        seedDataSources: dataSources ?? [],
        dataSources: dataSources ?? [],
        config: config ? cloneConfig(config) : createEmptyDashboardConfig(),
        selectedWidgetId: config?.widgets[0]?.id ?? null,
        activeDataSourceId: dataSources?.[0]?.id ?? null,
        mode: mode ?? 'builder',
        themeMode: (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) ? 'dark' : 'light',
        crossFilters: {},
      })),
    syncExternalConfig: (config) =>
      set((state) => ({
        ...state,
        config: cloneConfig(config),
      })),
    setMode: (mode) => set((state) => ({ ...state, mode })),
    toggleCrossFilter: (dataSourceId, filter) =>
      set((state) => {
        const currentFilters = state.crossFilters[dataSourceId] || []
        const existingIndex = currentFilters.findIndex((f) => f.field === filter.field && f.value === filter.value && f.sourceWidgetId === filter.sourceWidgetId)
        
        let nextFilters
        if (existingIndex >= 0) {
          nextFilters = [...currentFilters]
          nextFilters.splice(existingIndex, 1)
        } else {
          nextFilters = [...currentFilters, filter]
        }

        return {
          ...state,
          crossFilters: {
            ...state.crossFilters,
            [dataSourceId]: nextFilters,
          },
        }
      }),
    clearCrossFilters: (dataSourceId) =>
      set((state) => {
        if (!dataSourceId) {
          return { ...state, crossFilters: {} }
        }
        return {
          ...state,
          crossFilters: {
            ...state.crossFilters,
            [dataSourceId]: [],
          },
        }
      }),
    setDataSources: (dataSources) =>
      set((state) => ({
        ...state,
        seedDataSources: dataSources,
        dataSources,
        activeDataSourceId: dataSources[0]?.id ?? null,
      })),
    upsertDataSource: (dataSource) =>
      set((state) => {
        const existing = state.dataSources.find((item) => item.id === dataSource.id)
        const dataSources = existing
          ? state.dataSources.map((item) => (item.id === dataSource.id ? dataSource : item))
          : [...state.dataSources, dataSource]

        return {
          ...state,
          dataSources,
          activeDataSourceId: dataSource.id,
        }
      }),
    removeDataSource: (dataSourceId) =>
      set((state) => {
        const nextDataSources = state.dataSources.filter((item) => item.id !== dataSourceId)

        return {
          ...state,
          dataSources: nextDataSources,
          activeDataSourceId: nextDataSources[0]?.id ?? null,
          config: stampConfig({
            ...state.config,
            widgets: state.config.widgets.map((widget) =>
              widget.data.dataSourceId === dataSourceId
                ? {
                    ...widget,
                    data: {
                      ...widget.data,
                      dataSourceId: undefined,
                    },
                  }
                : widget,
            ),
          }),
        }
      }),
    renameDataSource: (dataSourceId, name) =>
      set((state) => {
        const trimmedName = name.trim()
        if (!trimmedName) {
          return state
        }

        return {
          ...state,
          dataSources: state.dataSources.map((dataSource) =>
            dataSource.id === dataSourceId
              ? {
                  ...dataSource,
                  name: trimmedName,
                }
              : dataSource,
          ),
        }
      }),
    cloneDataSource: (dataSourceId) =>
      set((state) => {
        const sourceDataSource = state.dataSources.find((dataSource) => dataSource.id === dataSourceId)
        if (!sourceDataSource) {
          return state
        }

        const clonedDataSource = createClonedDataSource(sourceDataSource)

        return {
          ...state,
          dataSources: [...state.dataSources, clonedDataSource],
          activeDataSourceId: clonedDataSource.id,
        }
      }),
    updateDataSourceFieldType: (dataSourceId, fieldName, nextType) =>
      set((state) => ({
        ...state,
        dataSources: state.dataSources.map((dataSource) =>
          dataSource.id === dataSourceId
            ? {
                ...dataSource,
                fields: dataSource.fields.map((field) =>
                  field.name === fieldName
                    ? {
                        ...field,
                        type: nextType,
                      }
                    : field,
                ),
                metadata: upsertFieldTypeOverride(dataSource.metadata, fieldName, nextType),
              }
            : dataSource,
        ),
      })),
    setActiveDataSource: (activeDataSourceId) => set((state) => ({ ...state, activeDataSourceId })),
    setConfig: (config) =>
      set((state) => ({
        ...state,
        config: stampConfig(cloneConfig(config)),
      })),
    replaceState: ({ config, dataSources }) =>
      set((state) => ({
        ...state,
        config: stampConfig(cloneConfig(config)),
        dataSources: dataSources ?? state.dataSources,
        activeDataSourceId: (dataSources ?? state.dataSources)[0]?.id ?? null,
        selectedWidgetId: config.widgets[0]?.id ?? null,
      })),
    addWidget: (widget) =>
      set((state) => ({
        ...state,
        config: stampConfig({
          ...state.config,
          widgets: [...state.config.widgets, widget],
        }),
        selectedWidgetId: widget.id,
      })),
    updateWidget: (widgetId, recipe) =>
      set((state) => ({
        ...state,
        config: stampConfig({
          ...state.config,
          widgets: state.config.widgets.map((widget) => (widget.id === widgetId ? recipe(widget) : widget)),
        }),
      })),
    updateLayouts: (layouts) =>
      set((state) => ({
        ...state,
        config: stampConfig({
          ...state.config,
          widgets: state.config.widgets.map((widget) => {
            const layout = layouts.find((item) => item.i === widget.id)
            if (!layout) {
              return widget
            }

            return {
              ...widget,
              layout: {
                ...widget.layout,
                x: layout.x,
                y: layout.y,
                w: layout.w,
                h: layout.h,
              },
            }
          }),
        }),
      })),
    duplicateWidget: (widgetId) =>
      set((state) => {
        const sourceWidget = state.config.widgets.find((widget) => widget.id === widgetId)
        if (!sourceWidget) {
          return state
        }

        const duplicate: DashboardWidgetConfig = {
          ...structuredClone(sourceWidget),
          id:
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `${sourceWidget.id}-copy`,
          title: `${sourceWidget.title ?? 'Widget'} Copy`,
          layout: {
            ...sourceWidget.layout,
            x: sourceWidget.layout.x + 1,
            y: sourceWidget.layout.y + 1,
          },
        }

        return {
          ...state,
          config: stampConfig({
            ...state.config,
            widgets: [...state.config.widgets, duplicate],
          }),
          selectedWidgetId: duplicate.id,
        }
      }),
    removeWidget: (widgetId) =>
      set((state) => {
        const widgets = state.config.widgets.filter((widget) => widget.id !== widgetId)
        return {
          ...state,
          config: stampConfig({
            ...state.config,
            widgets,
          }),
          selectedWidgetId: widgets[0]?.id ?? null,
        }
      }),
    selectWidget: (selectedWidgetId) => set((state) => ({ ...state, selectedWidgetId })),
    setTargetWidgetId: (widgetId) =>
      set((state) => ({
        ...state,
        config: stampConfig({
          ...state.config,
          targetWidgetId: widgetId || undefined,
        }),
      })),
    resetDashboard: () =>
      set((state) => ({
        ...state,
        config: stampConfig({
          ...state.config,
          widgets: [],
        }),
        selectedWidgetId: null,
      })),
    resetDashboardAndData: () =>
      set((state) => ({
        ...state,
        dataSources: state.seedDataSources,
        activeDataSourceId: state.seedDataSources[0]?.id ?? null,
        config: stampConfig({
          ...createEmptyDashboardConfig(state.config.name ?? 'Untitled Dashboard'),
          theme: state.config.theme,
        }),
        selectedWidgetId: null,
      })),
  }))

export const DashboardStoreContext = createContext<DashboardStoreApi | null>(null)

export const useDashboardStore = <T,>(selector: (state: DashboardStoreState) => T) => {
  const store = useContext(DashboardStoreContext)

  if (!store) {
    throw new Error('Dashboard store is not available outside of DashboardBuilder.')
  }

  return useStore(store, selector)
}
