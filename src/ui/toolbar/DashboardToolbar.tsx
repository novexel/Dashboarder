import { Download, FileJson, HardDriveDownload, HardDriveUpload, Layers3, Moon, Plus, RefreshCcw, RotateCcw, Save, Sun, Wifi } from 'lucide-react'
import { useRef } from 'react'
import type { DashboardBuilderMode, DashboardConfig, DataSource } from '../../core/types'
import { useDashboardStore } from '../../state/dashboardStore'

type DashboardToolbarProps = {
  mode: DashboardBuilderMode
  config: DashboardConfig
  dataSources: DataSource[]
  onAddWidget: () => void
  onUploadJson: (file: File) => void
  onUploadCsv: (file: File) => void
  onImportConfig: (file: File) => void
  onExportConfig: () => void
  onSave: () => void
  onLoad: () => void
  onResetDashboard: () => void
  onResetEverything: () => void
  onSetMode: (mode: DashboardBuilderMode) => void
  onToggleMode: () => void
  onOpenApiConnector: () => void
}

const ToolbarButton = ({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
}: {
  icon: typeof Plus
  label: string
  onClick: () => void
  variant?: 'default' | 'primary'
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
      variant === 'primary'
        ? 'border-teal-600 bg-teal-600 text-white dark:text-slate-950 hover:bg-teal-700'
        : 'border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:border-slate-600/50 hover:bg-slate-50 dark:bg-slate-800/50'
    }`}
  >
    <Icon className="h-4 w-4" />
    <span>{label}</span>
  </button>
)

const SegmentedGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-1.5 rounded-2xl border border-slate-250 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-1">
    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 select-none">{label}</span>
    <div className="flex items-center gap-1">
      {children}
    </div>
  </div>
)

const GroupButton = ({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
}: {
  icon: typeof Plus
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
      variant === 'danger'
        ? 'text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/30'
        : 'text-slate-600 dark:text-slate-350 hover:bg-slate-250/50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white'
    }`}
  >
    <Icon className="h-3.5 w-3.5" />
    <span>{label}</span>
  </button>
)

export function DashboardToolbar({
  mode,
  config,
  dataSources,
  onAddWidget,
  onUploadJson,
  onUploadCsv,
  onImportConfig,
  onExportConfig,
  onSave,
  onLoad,
  onResetDashboard,
  onResetEverything,
  onSetMode,
  onOpenApiConnector,
}: DashboardToolbarProps) {
  const jsonInputRef = useRef<HTMLInputElement | null>(null)
  const csvInputRef = useRef<HTMLInputElement | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  
  const themeMode = useDashboardStore((state) => state.themeMode)
  const setThemeMode = useDashboardStore((state) => state.setThemeMode)

  const toggleTheme = () => {
    const nextTheme = themeMode === 'dark' ? 'light' : 'dark'
    setThemeMode(nextTheme)
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <div className="rounded-[32px] border border-slate-200 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 p-4 shadow-panel dark:shadow-black/20 backdrop-blur">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-teal-50 dark:bg-teal-900/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-teal-700 dark:text-teal-300">Builder core</div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{config.widgets.length} widgets - {dataSources.length} data sources</p>
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{config.name ?? 'Dashboard Builder'}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Reusable, embeddable, data-driven widgets backed by serializable config instead of a one-off dashboard page.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 p-1">
          <button
            type="button"
            onClick={() => onSetMode('builder')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === 'builder' ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-soft dark:shadow-none' : 'text-slate-500 dark:text-slate-400'}`}
          >
            Builder mode
          </button>
          <button
            type="button"
            onClick={() => onSetMode('preview')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === 'preview' ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-soft dark:shadow-none' : 'text-slate-500 dark:text-slate-400'}`}
          >
            Preview mode
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <ToolbarButton icon={Plus} label="Add New Widget" onClick={onAddWidget} variant="primary" />

        <SegmentedGroup label="Data">
          <GroupButton icon={HardDriveUpload} label="CSV" onClick={() => csvInputRef.current?.click()} />
          <GroupButton icon={FileJson} label="JSON" onClick={() => jsonInputRef.current?.click()} />
          <GroupButton icon={Wifi} label="API" onClick={onOpenApiConnector} />
        </SegmentedGroup>

        <SegmentedGroup label="Browser Store">
          <GroupButton icon={Save} label="Save" onClick={onSave} />
          <GroupButton icon={HardDriveDownload} label="Load" onClick={onLoad} />
        </SegmentedGroup>

        <SegmentedGroup label="Config File">
          <GroupButton icon={Layers3} label="Import" onClick={() => importInputRef.current?.click()} />
          <GroupButton icon={Download} label="Export" onClick={onExportConfig} />
        </SegmentedGroup>

        <SegmentedGroup label="Reset">
          <GroupButton icon={RotateCcw} label="Layout" onClick={onResetDashboard} />
          <GroupButton icon={RefreshCcw} label="Everything" onClick={onResetEverything} variant="danger" />
        </SegmentedGroup>

        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-full p-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {themeMode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            onUploadJson(file)
          }
          event.currentTarget.value = ''
        }}
      />
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            onUploadCsv(file)
          }
          event.currentTarget.value = ''
        }}
      />
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            onImportConfig(file)
          }
          event.currentTarget.value = ''
        }}
      />
    </div>
  )
}
