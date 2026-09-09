import { useDeferredValue, useEffect, useState, useMemo } from 'react'
import { ChevronDown, Database, Layers3, Search, Sparkles } from 'lucide-react'
import { supportsVisualFieldType, createWidgetFromPlugin } from '../../registry/visualRegistry'
import { WidgetRenderer } from '../WidgetRenderer'
import type { DataFieldType, DataSource, VisualPlugin } from '../../core/types'

type WidgetPanelProps = {
  visuals: VisualPlugin[]
  allVisuals: VisualPlugin[]
  activeDataSource?: DataSource
  open: boolean
  mode: 'widget' | 'data'
  onModeChange: (mode: 'widget' | 'data') => void
  onOpenChange: (open: boolean) => void
  onAddWidget: (args: { pluginId: string; preferredFieldType?: DataFieldType }) => void
}

const FIELD_TYPE_LABELS: Partial<Record<DataFieldType, string>> = {
  string: 'Text',
  number: 'Number',
  integer: 'Whole Number',
  float: 'Decimal',
  date: 'Date',
  datetime: 'Date & Time',
  boolean: 'Boolean',
  category: 'Category',
  currency: 'Currency',
  percentage: 'Percentage',
  geo: 'Geography',
  latitude: 'Latitude',
  longitude: 'Longitude',
  url: 'URL',
  email: 'Email',
  json: 'JSON',
  array: 'Array',
  object: 'Object',
  unknown: 'Unknown',
}

const matchesVisualQuery = (visual: VisualPlugin, query: string) => {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  return [visual.name, visual.category, visual.description ?? ''].some((value) => value.toLowerCase().includes(normalizedQuery))
}

const formatFieldTypeLabel = (fieldType: DataFieldType) => FIELD_TYPE_LABELS[fieldType] ?? fieldType

type WidgetCardProps = {
  visual: VisualPlugin
  canAdd: boolean
  preferredFieldType?: DataFieldType
  activeDataSource?: DataSource
  onAddWidget: (args: { pluginId: string; preferredFieldType?: DataFieldType }) => void
}

function WidgetCard({
  visual,
  canAdd,
  preferredFieldType,
  activeDataSource,
  onAddWidget,
}: WidgetCardProps) {
  const dummyWidget = useMemo(
    () => createWidgetFromPlugin(visual.id, activeDataSource, preferredFieldType),
    [visual.id, activeDataSource, preferredFieldType]
  )

  return (
    <button
      key={`${preferredFieldType ?? 'all'}-${visual.id}`}
      type="button"
      disabled={!canAdd}
      onClick={() => onAddWidget({ pluginId: visual.id, preferredFieldType })}
      className={`flex min-w-[280px] max-w-[320px] shrink-0 flex-col overflow-hidden rounded-[22px] border text-left transition ${
        canAdd
          ? 'border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 hover:-translate-y-0.5 hover:border-teal-300 dark:border-teal-400'
          : 'cursor-not-allowed border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
      }`}
    >
      <div className="h-[140px] w-full border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2 pointer-events-none overflow-hidden relative">
         <div className="absolute inset-0 bg-transparent z-10" />
         <WidgetRenderer widget={dummyWidget} dataSource={activeDataSource} />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-50 line-clamp-1">{visual.name}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{visual.category}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                canAdd ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
              }`}
            >
              {canAdd ? 'Ready' : 'Planned'}
            </span>
          </div>
        </div>
        {visual.description ? <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400 line-clamp-2">{visual.description}</p> : null}
      </div>
    </button>
  )
}

export function WidgetPanel({
  visuals,
  allVisuals,
  activeDataSource,
  open,
  mode,
  onModeChange,
  onOpenChange,
  onAddWidget,
}: WidgetPanelProps) {
  const [query, setQuery] = useState('')
  const [selectedFieldType, setSelectedFieldType] = useState<DataFieldType | null>(null)
  const deferredQuery = useDeferredValue(query)
  const fieldTypeMap = new Map<DataFieldType, { type: DataFieldType; count: number; fields: string[] }>()

  ;(activeDataSource?.fields ?? []).forEach((field) => {
    const existing = fieldTypeMap.get(field.type) ?? { type: field.type, count: 0, fields: [] }
    existing.count += 1
    existing.fields.push(field.label)
    fieldTypeMap.set(field.type, existing)
  })

  const fieldTypeOptions = Array.from(fieldTypeMap.values()).sort((left, right) => left.type.localeCompare(right.type))
  const fieldTypeSignature = fieldTypeOptions.map((option) => option.type).join('|')

  useEffect(() => {
    if (fieldTypeOptions.length === 0) {
      setSelectedFieldType(null)
      return
    }

    if (!selectedFieldType || !fieldTypeMap.has(selectedFieldType)) {
      setSelectedFieldType(fieldTypeOptions[0]?.type ?? null)
    }
  }, [fieldTypeSignature, fieldTypeOptions, fieldTypeMap, selectedFieldType])

  const widgetVisuals = allVisuals
    .filter((visual) => matchesVisualQuery(visual, deferredQuery))
    .sort((left, right) => Number(right.implemented ?? true) - Number(left.implemented ?? true) || left.name.localeCompare(right.name))

  const filteredByDataType = selectedFieldType
    ? visuals
        .filter((visual) => supportsVisualFieldType(visual, selectedFieldType))
        .filter((visual) => matchesVisualQuery(visual, deferredQuery))
        .sort((left, right) => Number(right.implemented ?? true) - Number(left.implemented ?? true) || left.name.localeCompare(right.name))
    : []

  return (
    <section className="rounded-[28px] border border-slate-200 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/90 p-5 shadow-soft dark:shadow-none">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Widget library</p>
          <h2 className="mt-2 font-display text-xl font-semibold text-slate-950 dark:text-white">Add a widget</h2>
        </div>
        <div className="rounded-2xl bg-orange-50 dark:bg-orange-900/30 p-2 text-orange-600 dark:text-orange-400">
          <Layers3 className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
          Start by widget to browse every sample, or start by data to narrow the choices to visuals that fit the selected field type.
        </p>
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 dark:bg-white px-4 py-3 text-sm font-semibold text-white dark:text-slate-950 transition hover:bg-slate-800 dark:hover:bg-slate-200"
        >
          <span>{open ? 'Hide chooser' : 'Add New Widget'}</span>
          <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {!open ? (
        <div className="mt-4 rounded-[22px] border border-dashed border-slate-300 dark:border-slate-600/50 bg-slate-50 dark:bg-slate-800/50 px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
          Open the chooser to add by widget sample or by dataset field type.
        </div>
      ) : (
        <div className="mt-4 space-y-4 rounded-[24px] border border-slate-200 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/80 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => onModeChange('widget')}
              className={`rounded-[20px] border px-4 py-4 text-left transition ${
                mode === 'widget' ? 'border-teal-400 dark:border-teal-500 bg-white dark:bg-slate-900 shadow-soft dark:shadow-none' : 'border-slate-200 dark:border-slate-700/50 bg-white/70 dark:bg-slate-900/70 hover:border-slate-300 dark:border-slate-600/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sparkles className={`h-5 w-5 ${mode === 'widget' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-50">By Widget</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Pick a widget sample first, then fine-tune its title, fields, and dataset in the editor.
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onModeChange('data')}
              className={`rounded-[20px] border px-4 py-4 text-left transition ${
                mode === 'data' ? 'border-teal-400 dark:border-teal-500 bg-white dark:bg-slate-900 shadow-soft dark:shadow-none' : 'border-slate-200 dark:border-slate-700/50 bg-white/70 dark:bg-slate-900/70 hover:border-slate-300 dark:border-slate-600/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Database className={`h-5 w-5 ${mode === 'data' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-50">By Data</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Choose a field type first to filter the widget samples to visuals that support that data.
                  </p>
                </div>
              </div>
            </button>
          </div>

          <label className="flex items-center gap-3 rounded-full border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
            <Search className="h-4 w-4" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={mode === 'widget' ? 'Search widget samples or categories' : 'Search filtered widget samples'}
              className="w-full bg-transparent outline-none"
            />
          </label>

          {mode === 'widget' ? (
            <div className="space-y-4">
              <div className="rounded-[20px] border border-teal-100 dark:border-teal-900 bg-teal-50 dark:bg-teal-900/30 px-4 py-3 text-sm text-teal-900 dark:text-teal-100">
                {activeDataSource
                  ? `${visuals.length} widget samples can auto-map against ${activeDataSource.name}. You can still add any implemented sample and finish configuration later.`
                  : 'All widget samples are available. Add one first, then connect a dataset and map fields from the right sidebar.'}
              </div>

              <div className="flex flex-row gap-4 overflow-x-auto pb-4">
                {widgetVisuals.map((visual) => {
                  const canAdd = visual.implemented ?? true
                  return (
                    <WidgetCard
                      key={visual.id}
                      visual={visual}
                      canAdd={canAdd}
                      activeDataSource={activeDataSource}
                      onAddWidget={onAddWidget}
                    />
                  )
                })}
              </div>
            </div>
          ) : !activeDataSource ? (
            <div className="rounded-[22px] border border-dashed border-slate-300 dark:border-slate-600/50 bg-white dark:bg-slate-900 px-4 py-5 text-sm text-slate-500 dark:text-slate-400">
              Select or upload a dataset first, then return here to add a widget by data type.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-[20px] border border-sky-100 dark:border-sky-900 bg-sky-50 dark:bg-sky-900/30 px-4 py-3 text-sm text-sky-900 dark:text-sky-100">
                Choose a field type from {activeDataSource.name}. The widget list will shrink to visuals that support that data.
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {fieldTypeOptions.map((option) => {
                  const selected = option.type === selectedFieldType

                  return (
                    <button
                      key={option.type}
                      type="button"
                      onClick={() => setSelectedFieldType(option.type)}
                      className={`rounded-[20px] border px-4 py-4 text-left transition ${
                        selected ? 'border-teal-400 dark:border-teal-500 bg-white dark:bg-slate-900 shadow-soft dark:shadow-none' : 'border-slate-200 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 hover:border-slate-300 dark:border-slate-600/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-50">{formatFieldTypeLabel(option.type)}</p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {option.count} field{option.count === 1 ? '' : 's'}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                            selected ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {option.type}
                        </span>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{option.fields.slice(0, 3).join(', ')}</p>
                    </button>
                  )
                })}
              </div>

              <div className="flex flex-row gap-4 overflow-x-auto pb-4">
                {filteredByDataType.map((visual) => {
                  const canAdd = visual.implemented ?? true
                  return (
                    <WidgetCard
                      key={visual.id}
                      visual={visual}
                      canAdd={canAdd}
                      preferredFieldType={selectedFieldType ?? undefined}
                      activeDataSource={activeDataSource}
                      onAddWidget={onAddWidget}
                    />
                  )
                })}

                {filteredByDataType.length === 0 ? (
                  <div className="rounded-[20px] border border-dashed border-slate-300 dark:border-slate-600/50 bg-white dark:bg-slate-900 px-4 py-5 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    No widget samples matched this field type and search combination.
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
