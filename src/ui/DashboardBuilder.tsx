import { startTransition, useEffect, useEffectEvent, useRef, useState } from 'react'
import { ChevronDown, Database, Layers3 } from 'lucide-react'
import type { Layout } from 'react-grid-layout'
import { DashboardGrid } from './DashboardGrid'
import { DataPanel } from './panels/DataPanel'
import { WidgetPanel } from './panels/WidgetPanel'
import { WidgetSettingsModal } from './WidgetSettingsModal'
import { createWidgetFromPlugin, getCompatibleVisuals, getVisual, listRegisteredVisuals } from '../registry/visualRegistry'
import { DashboardStoreContext, createDashboardStore, useDashboardStore, type DashboardStoreApi } from '../state/dashboardStore'
import { DashboardToolbar } from './toolbar/DashboardToolbar'
import type { DashboardBuilderProps, DashboardConfig, DataFieldType, DataSource } from '../core/types'
import { createEmptyDashboardConfig } from '../core/types'
import { migrateDashboardConfig } from '../core/dashboardSchema'
import { parseCsvFile, parseJsonFile, fetchApiDataSource, createDataSource } from '../adapters/apiConnectorAdapter'
import { isRecord } from '../core/dataUtils'
import { downloadJson } from '../core/download'
import { loadDashboardState, saveDashboardState } from '../adapters/storageAdapter'

const DEFAULT_STORAGE_KEY = 'dashboarder.demo'
type WidgetAddMode = 'widget' | 'data'

function StripButton({
  icon: Icon,
  title,
  description,
  active = false,
  disabled = false,
  onClick,
}: {
  icon: typeof Database
  title: string
  description: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group flex w-full items-center gap-4 rounded-[28px] border px-5 py-4 text-left shadow-soft dark:shadow-none transition ${
        disabled
          ? 'cursor-not-allowed border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
          : active
            ? 'border-teal-300 dark:border-teal-400 bg-white dark:bg-slate-900 text-slate-950 dark:text-white dark:text-slate-950'
            : 'border-slate-200 dark:border-slate-700/50 bg-white/85 text-slate-950 dark:text-white dark:text-slate-950 hover:border-slate-300 dark:border-slate-600/50 hover:bg-white dark:bg-slate-900'
      }`}
    >
      <div
        className={`rounded-2xl p-3 transition ${
          disabled
            ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
            : active
              ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500 group-hover:bg-slate-200 dark:bg-slate-700 group-hover:text-slate-700 dark:text-slate-300'
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className={`mt-1 text-sm ${disabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500'}`}>{description}</p>
      </div>
      <ChevronDown
        className={`h-4 w-4 shrink-0 transition ${active ? 'rotate-180 text-teal-600 dark:text-teal-400' : disabled ? 'text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}
      />
    </button>
  )
}

function BuilderSurface({
  storageKey,
  onSave,
  onChange,
  onReset,
  loaderComponent,
}: {
  storageKey: string
  onSave?: (config: DashboardConfig) => void
  onChange?: (config: DashboardConfig) => void
  onReset?: () => void
  loaderComponent?: React.ReactNode
}) {
  const [notice, setNotice] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [apiConnectorOpen, setApiConnectorOpen] = useState(false)
  const [dataStripOpen, setDataStripOpen] = useState(false)
  const [widgetStripOpen, setWidgetStripOpen] = useState(false)
  const [widgetPanelOpen, setWidgetPanelOpen] = useState(true)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [widgetAddMode, setWidgetAddMode] = useState<WidgetAddMode>('widget')
  const widgetPanelRef = useRef<HTMLDivElement | null>(null)

  const config = useDashboardStore((state) => state.config)
  const dataSources = useDashboardStore((state) => state.dataSources)
  const mode = useDashboardStore((state) => state.mode)
  const selectedWidgetId = useDashboardStore((state) => state.selectedWidgetId)
  const activeDataSourceId = useDashboardStore((state) => state.activeDataSourceId)

  const updateLayouts = useDashboardStore((state) => state.updateLayouts)
  const addWidget = useDashboardStore((state) => state.addWidget)
  const updateWidget = useDashboardStore((state) => state.updateWidget)
  const duplicateWidget = useDashboardStore((state) => state.duplicateWidget)
  const removeWidget = useDashboardStore((state) => state.removeWidget)
  const selectWidget = useDashboardStore((state) => state.selectWidget)
  const setMode = useDashboardStore((state) => state.setMode)
  const upsertDataSource = useDashboardStore((state) => state.upsertDataSource)
  const removeDataSource = useDashboardStore((state) => state.removeDataSource)
  const renameDataSource = useDashboardStore((state) => state.renameDataSource)
  const cloneDataSource = useDashboardStore((state) => state.cloneDataSource)
  const updateDataSourceFieldType = useDashboardStore((state) => state.updateDataSourceFieldType)
  const setActiveDataSource = useDashboardStore((state) => state.setActiveDataSource)
  const replaceState = useDashboardStore((state) => state.replaceState)
  const resetDashboard = useDashboardStore((state) => state.resetDashboard)
  const resetDashboardAndData = useDashboardStore((state) => state.resetDashboardAndData)

  const selectedWidget = config.widgets.find((widget) => widget.id === selectedWidgetId)
  const selectedWidgetDataSource = dataSources.find((dataSource) => dataSource.id === selectedWidget?.data.dataSourceId)
  const activeDataSource =
    dataSources.find((dataSource) => dataSource.id === activeDataSourceId) ??
    selectedWidgetDataSource ??
    dataSources[0]
  const visuals = getCompatibleVisuals(activeDataSource)
  const allVisuals = listRegisteredVisuals()

  const emitChange = useEffectEvent((nextConfig: DashboardConfig) => {
    onChange?.(nextConfig)
  })

  useEffect(() => {
    emitChange(config)
  }, [config])

  const withNotice = (message: string) => {
    setNotice(message)
    window.clearTimeout((withNotice as unknown as { timeout?: number }).timeout)
    ;(withNotice as unknown as { timeout?: number }).timeout = window.setTimeout(() => setNotice(null), 3000)
  }

  const openWidgetPanel = (mode: WidgetAddMode = 'widget') => {
    setWidgetAddMode(mode)
    setWidgetStripOpen(true)
    setWidgetPanelOpen(true)
    window.requestAnimationFrame(() => {
      widgetPanelRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  const addWidgetFromPlugin = ({
    pluginId = 'line-chart',
    preferredFieldType,
  }: {
    pluginId?: string
    preferredFieldType?: DataFieldType
  } = {}) => {
    const widget = createWidgetFromPlugin(pluginId, activeDataSource, preferredFieldType)
    addWidget(widget)
    setWidgetStripOpen(false)
    setWidgetPanelOpen(false)
    setSettingsModalOpen(true)
    withNotice(
      activeDataSource
        ? `${widget.title ?? 'Widget'} added with ${Object.keys(widget.data.mappings).length > 0 ? 'suggested field mappings' : 'the active dataset selected'}.`
        : `${widget.title ?? 'Widget'} added. Select a dataset and map fields in the widget editor to render it.`,
    )
  }

  const replaceWidgetType = (widgetId: string, pluginId: string) => {
    const nextPlugin = getVisual(pluginId)
    const currentWidget = config.widgets.find((widget) => widget.id === widgetId)
    const widgetDataSource = dataSources.find((dataSource) => dataSource.id === currentWidget?.data.dataSourceId)
    const widgetTemplate = createWidgetFromPlugin(pluginId, widgetDataSource)
    updateWidget(widgetId, (widget) => ({
      ...widget,
      type: pluginId,
      title: nextPlugin?.name ?? widget.title,
      layout: {
        ...widget.layout,
        w: nextPlugin?.defaultSize.w ?? widget.layout.w,
        h: nextPlugin?.defaultSize.h ?? widget.layout.h,
      },
      data: {
        ...widget.data,
        mappings: widgetTemplate.data.mappings,
      },
    }))
  }

  const handleUpload = async (kind: 'json' | 'csv', file: File) => {
    setIsLoading(true)
    try {
      const nextDataSource = kind === 'json' ? await parseJsonFile(file) : await parseCsvFile(file)
      upsertDataSource(nextDataSource)
      withNotice(`${nextDataSource.name} imported successfully.`)
    } catch (error) {
      withNotice(error instanceof Error ? error.message : 'Unable to import that data source.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImportConfig = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = migrateDashboardConfig(JSON.parse(text))
      startTransition(() => {
        replaceState({
          config: parsed,
        })
      })
      withNotice('Dashboard config imported.')
    } catch (error) {
      withNotice(error instanceof Error ? error.message : 'Unable to import that dashboard config.')
    }
  }

  const handleSave = () => {
    saveDashboardState(storageKey, {
      config,
      dataSources,
    })
    onSave?.(config)
    withNotice('Dashboard state saved to local storage.')
  }

  const handleLoad = () => {
    const savedState = loadDashboardState(storageKey)
    if (!savedState) {
      withNotice('No saved dashboard state was found in local storage.')
      return
    }

    startTransition(() => {
      replaceState({
        config: migrateDashboardConfig(savedState.config),
        dataSources: savedState.dataSources,
      })
    })
    withNotice('Saved dashboard state loaded.')
  }

  const handleCreateApiDataSource = async (connectorConfig: DataSource['connector'] & { name: string }) => {
    const dataSource = await fetchApiDataSource(connectorConfig)
    upsertDataSource(dataSource)
    withNotice(`${dataSource.name} connected.`)
  }

  const handleUnnestField = (dataSourceId: string, fieldName: string) => {
    setIsLoading(true)
    setTimeout(() => {
      try {
        const dataSource = dataSources.find((ds) => ds.id === dataSourceId)
        if (!dataSource) return

        const newRows = dataSource.rows.flatMap((row) => {
          const arr = row[fieldName]
          if (Array.isArray(arr)) {
            return arr.map((item) => {
              const cleanRow = { ...row }
              delete cleanRow[fieldName]

              if (isRecord(item)) {
                return { ...cleanRow, ...item }
              }
              return { ...cleanRow, [fieldName]: item }
            })
          }
          return []
        })

        if (newRows.length === 0) {
          withNotice('No array records found to unnest.')
          return
        }

        const newDataSource = createDataSource({
          id: `ds-${Math.random().toString(36).slice(2, 10)}`,
          name: `${dataSource.name} (${fieldName})`,
          type: dataSource.type,
          rows: newRows,
          connector: dataSource.connector,
        })
        
        upsertDataSource(newDataSource)
        withNotice(`Unnested ${fieldName} into ${newRows.length} rows.`)
      } catch (e) {
        withNotice('Failed to unnest array field.')
      } finally {
        setIsLoading(false)
      }
    }, 10)
  }

  const handleRefreshDataSource = async (dataSource: DataSource) => {
    if (!dataSource.connector) {
      return
    }

    try {
      const refreshed = await fetchApiDataSource({
        ...dataSource.connector,
        name: dataSource.name,
        id: dataSource.id,
      })
      upsertDataSource(refreshed)
      withNotice(`${dataSource.name} refreshed.`)
    } catch (error) {
      withNotice(error instanceof Error ? error.message : 'Unable to refresh that API source.')
    }
  }

  const handleRenameDataSource = (dataSourceId: string, name: string) => {
    renameDataSource(dataSourceId, name)
    withNotice(`Dataset renamed to ${name.trim()}.`)
  }

  const handleCloneDataSource = (dataSourceId: string) => {
    const sourceDataSource = dataSources.find((dataSource) => dataSource.id === dataSourceId)
    cloneDataSource(dataSourceId)
    if (sourceDataSource) {
      withNotice(`${sourceDataSource.name} cloned.`)
    }
  }

  const handleUpdateDataSourceFieldType = (dataSourceId: string, fieldName: string, nextType: DataSource['fields'][number]['type']) => {
    updateDataSourceFieldType(dataSourceId, fieldName, nextType)
    withNotice(`${fieldName} set to ${nextType}.`)
  }

  const askReset = (includeData: boolean) => {
    const approved = window.confirm(
      includeData
        ? 'Reset the full dashboard and remove imported data sources?'
        : 'Reset the dashboard layout and widgets?',
    )

    if (!approved) {
      return
    }

    if (includeData) {
      resetDashboardAndData()
    } else {
      resetDashboard()
    }

    onReset?.()
  }

  const openWidgetEditor = (widgetId: string) => {
    selectWidget(widgetId)
    setSettingsModalOpen(true)
  }

  useEffect(() => {
    if (mode !== 'builder') {
      setSettingsModalOpen(false)
    }
  }, [mode])

  return (
    <div className="space-y-5">
      <DashboardToolbar
        mode={mode}
        config={config}
        dataSources={dataSources}
        onAddWidget={() => openWidgetPanel('widget')}
        onUploadJson={(file) => void handleUpload('json', file)}
        onUploadCsv={(file) => void handleUpload('csv', file)}
        onImportConfig={(file) => void handleImportConfig(file)}
        onExportConfig={() => downloadJson(`${(config.name ?? 'dashboard').replace(/\s+/g, '-').toLowerCase()}.config.json`, config)}
        onSave={handleSave}
        onLoad={handleLoad}
        onResetDashboard={() => askReset(false)}
        onResetEverything={() => askReset(true)}
        onSetMode={setMode}
        onToggleMode={() => setMode(mode === 'builder' ? 'preview' : 'builder')}
        onOpenApiConnector={() => setApiConnectorOpen((currentValue) => !currentValue)}
      />

      {notice ? (
        <div className="rounded-[22px] border border-teal-200 dark:border-teal-500/50 bg-teal-50 dark:bg-teal-900/30 px-4 py-3 text-sm font-medium text-teal-800">{notice}</div>
      ) : null}

      {mode === 'builder' ? (
        <div className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-2">
            <StripButton
              icon={Database}
              title="Data sources"
              description={
                dataSources.length > 0
                  ? `${dataSources.length} connected dataset${dataSources.length === 1 ? '' : 's'}${activeDataSource ? `, active: ${activeDataSource.name}` : ''}`
                  : 'Upload CSV or JSON data, or connect an API source.'
              }
              active={dataStripOpen}
              onClick={() => setDataStripOpen((currentValue) => !currentValue)}
            />
            <StripButton
              icon={Layers3}
              title="Widget library"
              description={
                activeDataSource
                  ? `${visuals.length} compatible visuals ready for ${activeDataSource.name}`
                  : `${allVisuals.length} visuals available. Add one first, then wire the data.`
              }
              active={widgetStripOpen}
              onClick={() => {
                setWidgetStripOpen((currentValue) => !currentValue)
                setWidgetPanelOpen(true)
              }}
            />
          </div>

          {dataStripOpen ? (
            <DataPanel
              dataSources={dataSources}
              activeDataSourceId={activeDataSource?.id ?? null}
              apiConnectorOpen={apiConnectorOpen}
              onToggleApiConnector={() => setApiConnectorOpen((currentValue) => !currentValue)}
              onSelectDataSource={setActiveDataSource}
              onRemoveDataSource={removeDataSource}
              onRenameDataSource={handleRenameDataSource}
              onCloneDataSource={handleCloneDataSource}
              onUpdateFieldType={handleUpdateDataSourceFieldType}
              onRefreshDataSource={(dataSource) => void handleRefreshDataSource(dataSource)}
              onCreateApiDataSource={handleCreateApiDataSource}
              onUnnestField={handleUnnestField}
            />
          ) : null}

          {widgetStripOpen ? (
            <div ref={widgetPanelRef}>
              <WidgetPanel
                visuals={visuals}
                allVisuals={allVisuals}
                activeDataSource={activeDataSource}
                open={widgetPanelOpen}
                mode={widgetAddMode}
                onModeChange={setWidgetAddMode}
                onOpenChange={setWidgetPanelOpen}
                onAddWidget={addWidgetFromPlugin}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5">
        <DashboardGrid
          config={config}
          dataSources={dataSources}
          selectedWidgetId={selectedWidgetId}
          readOnly={mode !== 'builder'}
          onSelectWidget={selectWidget}
          onEditWidget={openWidgetEditor}
          onDuplicateWidget={duplicateWidget}
          onDeleteWidget={removeWidget}
          onLayoutsChange={(layouts: Layout[]) => updateLayouts(layouts)}
          onZoomInWidget={(widgetId) => {
            updateWidget(widgetId, (w) => ({
              ...w,
              style: {
                ...w.style,
                graphicZoom: Math.min(2.5, Math.round(((w.style.graphicZoom ?? 1) + 0.1) * 10) / 10),
              },
            }))
          }}
          onZoomOutWidget={(widgetId) => {
            updateWidget(widgetId, (w) => ({
              ...w,
              style: {
                ...w.style,
                graphicZoom: Math.max(0.4, Math.round(((w.style.graphicZoom ?? 1) - 0.1) * 10) / 10),
              },
            }))
          }}
        />
      </div>

      <WidgetSettingsModal
        open={settingsModalOpen && mode === 'builder'}
        widget={selectedWidget}
        dataSource={dataSources.find((dataSource) => dataSource.id === selectedWidget?.data.dataSourceId)}
        visuals={allVisuals}
        availableDataSources={dataSources}
        onClose={() => setSettingsModalOpen(false)}
        onUpdateWidget={updateWidget}
        onChangeWidgetType={replaceWidgetType}
        onSelectDataSource={setActiveDataSource}
      />

      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          {loaderComponent ?? (
            <div className="flex flex-col items-center gap-4 rounded-3xl bg-white dark:bg-slate-900 p-8 shadow-xl">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-teal-500 dark:border-slate-700 dark:border-t-teal-400"></div>
              <p className="font-medium text-slate-900 dark:text-slate-100">Loading dataset...</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function DashboardBuilder({
  dataSources = [],
  initialConfig,
  config,
  mode = 'builder',
  onSave,
  onChange,
  onReset,
  storageKey = DEFAULT_STORAGE_KEY,
  loaderComponent,
}: DashboardBuilderProps) {
  const [store] = useState<DashboardStoreApi>(() =>
    createDashboardStore({
      dataSources,
      config: config ?? initialConfig ?? createEmptyDashboardConfig(),
      mode,
    }),
  )

  useEffect(() => {
    store.getState().setDataSources(dataSources)
  }, [dataSources, store])

  useEffect(() => {
    if (config) {
      store.getState().syncExternalConfig(config)
    }
  }, [config, store])

  useEffect(() => {
    store.getState().setMode(mode)
  }, [mode, store])

  return (
    <DashboardStoreContext.Provider value={store}>
      <BuilderSurface storageKey={storageKey} onSave={onSave} onChange={onChange} onReset={onReset} loaderComponent={loaderComponent} />
    </DashboardStoreContext.Provider>
  )
}
