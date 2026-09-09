import { useEffect, useState, useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, CopyPlus, RefreshCcw, ServerCrash, Trash2, UploadCloud, Wifi, ChevronRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { ApiConnectorConfig, DataFieldType, DataSource } from '../../core/types'

const apiConnectorSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  url: z.string().url('Enter a valid URL'),
  method: z.enum(['GET', 'POST']),
  authType: z.enum(['none', 'bearer', 'apiKeyHeader', 'apiKeyQuery', 'basic']),
  bearerToken: z.string().optional(),
  apiKeyName: z.string().optional(),
  apiKeyValue: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  headersJson: z.string().optional(),
  body: z.string().optional(),
  responsePath: z.string().optional(),
})

type ApiConnectorFormValues = z.infer<typeof apiConnectorSchema>

type DataPanelProps = {
  dataSources: DataSource[]
  activeDataSourceId: string | null
  apiConnectorOpen: boolean
  onToggleApiConnector: () => void
  onSelectDataSource: (dataSourceId: string) => void
  onRemoveDataSource: (dataSourceId: string) => void
  onRenameDataSource: (dataSourceId: string, name: string) => void
  onCloneDataSource: (dataSourceId: string) => void
  onUpdateFieldType: (dataSourceId: string, fieldName: string, nextType: DataFieldType) => void
  onRefreshDataSource: (dataSource: DataSource) => void
  onCreateApiDataSource: (config: ApiConnectorConfig & { name: string }) => Promise<void>
  onUnnestField?: (dataSourceId: string, fieldName: string) => void
}

const FIELD_TYPE_OPTIONS: DataFieldType[] = [
  'string',
  'number',
  'integer',
  'float',
  'date',
  'datetime',
  'boolean',
  'category',
  'currency',
  'percentage',
  'geo',
  'latitude',
  'longitude',
  'url',
  'email',
  'json',
  'array',
  'object',
  'unknown',
]

const parseHeaders = (headersJson?: string) => {
  if (!headersJson?.trim()) {
    return {}
  }

  return JSON.parse(headersJson) as Record<string, string>
}

export function DataPanel({
  dataSources,
  activeDataSourceId,
  apiConnectorOpen,
  onToggleApiConnector,
  onSelectDataSource,
  onRemoveDataSource,
  onRenameDataSource,
  onCloneDataSource,
  onUpdateFieldType,
  onRefreshDataSource,
  onCreateApiDataSource,
  onUnnestField,
}: DataPanelProps) {
  const selectedDataSource = dataSources.find((dataSource) => dataSource.id === activeDataSourceId)
  const [datasetName, setDatasetName] = useState(selectedDataSource?.name ?? '')
  const form = useForm<ApiConnectorFormValues>({
    resolver: zodResolver(apiConnectorSchema),
    defaultValues: {
      name: 'API Dataset',
      method: 'GET',
      authType: 'none',
      headersJson: '{}',
      body: '{}',
      responsePath: '',
    },
  })

  useEffect(() => {
    setDatasetName(selectedDataSource?.name ?? '')
  }, [selectedDataSource?.id, selectedDataSource?.name])

  const trimmedDatasetName = datasetName.trim()
  const canSaveDatasetName = Boolean(
    selectedDataSource && trimmedDatasetName.length > 0 && trimmedDatasetName !== selectedDataSource.name,
  )

  const previewText = useMemo(() => {
    if (!selectedDataSource) return ''
    try {
      const text = JSON.stringify(selectedDataSource.rows.slice(0, 3), null, 2)
      return text.length > 5000 ? text.slice(0, 5000) + '\n\n... [truncated for preview]' : text
    } catch (e) {
      return 'Preview unavailable'
    }
  }, [selectedDataSource])

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-slate-200 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/90 p-5 shadow-soft dark:shadow-none">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Data sources</p>
            <h2 className="mt-2 font-display text-xl font-semibold text-slate-950 dark:text-white dark:text-slate-950">Connected datasets</h2>
          </div>
          <button
            type="button"
            onClick={onToggleApiConnector}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700/50 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:bg-slate-800/50"
          >
            <Wifi className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            {apiConnectorOpen ? 'Hide API form' : 'Connect API'}
          </button>
        </div>

        <div className="mt-4 flex flex-row gap-4 overflow-x-auto pb-4">
          {dataSources.map((dataSource) => (
            <article
              key={dataSource.id}
              className={`min-w-[300px] shrink-0 rounded-[20px] border p-4 transition ${
                dataSource.id === activeDataSourceId ? 'border-teal-400 dark:border-teal-500 bg-teal-50/60 dark:bg-teal-900/40' : 'border-slate-200 dark:border-slate-700/50 bg-slate-50/70 dark:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <button type="button" className="flex-1 text-left" onClick={() => onSelectDataSource(dataSource.id)}>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-50">{dataSource.name}</h3>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    {dataSource.type} - {dataSource.rows.length} rows
                  </p>
                </button>
                <div className="flex items-center gap-1">
                  {dataSource.type === 'api' ? (
                    <button
                      type="button"
                      onClick={() => onRefreshDataSource(dataSource)}
                      className="rounded-full p-2 text-slate-400 dark:text-slate-500 transition hover:bg-white dark:bg-slate-900 hover:text-slate-700 dark:text-slate-300"
                      aria-label={`Refresh ${dataSource.name}`}
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onRemoveDataSource(dataSource.id)}
                    className="rounded-full p-2 text-slate-400 dark:text-slate-500 transition hover:bg-white dark:bg-slate-900 hover:text-rose-700 dark:text-rose-400"
                    aria-label={`Remove ${dataSource.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {!selectedDataSource ? (
          <div className="mt-4 rounded-[20px] border border-dashed border-slate-300 dark:border-slate-600/50 bg-slate-50 dark:bg-slate-800/50 px-4 py-5 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
            <UploadCloud className="mb-2 h-5 w-5 text-slate-400 dark:text-slate-500" />
            Upload JSON or CSV from the toolbar, or connect an API source here.
          </div>
        ) : (
          <div className="mt-5 space-y-4 rounded-[22px] border border-slate-200 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/80 p-4">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Dataset management</p>
                  <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-50">Rename, clone, and tune field types</h3>
                </div>
                <button
                  type="button"
                  onClick={() => onCloneDataSource(selectedDataSource.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 transition hover:border-slate-300 dark:border-slate-600/50 hover:bg-slate-100 dark:bg-slate-800"
                >
                  <CopyPlus className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  Clone
                </button>
              </div>

              <form
                className="mt-4 flex flex-col gap-3 md:flex-row"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (canSaveDatasetName) {
                    onRenameDataSource(selectedDataSource.id, trimmedDatasetName)
                  }
                }}
              >
                <label className="flex-1 space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <span>Dataset name</span>
                  <input
                    value={datasetName}
                    onChange={(event) => setDatasetName(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!canSaveDatasetName}
                  className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition md:self-end ${
                    canSaveDatasetName ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <Check className="h-4 w-4" />
                  Save name
                </button>
              </form>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Field inventory</p>
              <div className="mt-3 grid gap-3">
                {selectedDataSource.fields.map((field) => (
                  <article key={field.name} className="rounded-[18px] border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{field.label}</h4>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{field.name}</p>
                      </div>
                      <select
                        value={field.type}
                        onChange={(event) =>
                          onUpdateFieldType(selectedDataSource.id, field.name, event.target.value as DataFieldType)
                        }
                        className="min-w-[150px] rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 outline-none transition focus:border-teal-400 dark:border-teal-500"
                      >
                        {FIELD_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                      {field.uniqueCount !== undefined ? (
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1">{field.uniqueCount} unique</span>
                      ) : null}
                      {field.nullable ? <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1">nullable</span> : null}
                      {(field.sampleValues ?? []).slice(0, 3).map((sampleValue, index) => (
                        <span key={`${field.name}-${index}`} className="rounded-full bg-teal-50 dark:bg-teal-900/30 px-2.5 py-1 text-teal-700 dark:text-teal-300">
                          {String(sampleValue)}
                        </span>
                      ))}

                      {field.type === 'array' && onUnnestField && (
                        <button
                          type="button"
                          onClick={() => onUnnestField(selectedDataSource.id, field.name)}
                          className="ml-auto inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 text-indigo-700 dark:text-indigo-300 transition hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-medium"
                        >
                          <ChevronRight className="h-3 w-3" />
                          Unnest array
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Preview</p>
              <pre className="mt-3 max-h-48 overflow-auto rounded-[18px] bg-slate-950 dark:bg-white p-4 font-mono text-xs leading-6 text-slate-100 dark:text-slate-900">
                {previewText}
              </pre>
            </div>
          </div>
        )}
      </section>

      {apiConnectorOpen ? (
        <section className="rounded-[28px] border border-slate-200 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/90 p-5 shadow-soft dark:shadow-none">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-teal-50 dark:bg-teal-900/30 p-2 text-teal-700 dark:text-teal-300">
              <Wifi className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white dark:text-slate-950">API connector</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                Supports GET, POST, auth headers, query keys, basic auth, custom headers, request body, and
                response path mapping.
              </p>
            </div>
          </div>

          <form
            className="mt-5 space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              try {
                await onCreateApiDataSource({
                  name: values.name,
                  url: values.url,
                  method: values.method,
                  authType: values.authType,
                  bearerToken: values.bearerToken,
                  apiKeyName: values.apiKeyName,
                  apiKeyValue: values.apiKeyValue,
                  username: values.username,
                  password: values.password,
                  headers: parseHeaders(values.headersJson),
                  body: values.body,
                  responsePath: values.responsePath,
                })
                form.reset({
                  ...values,
                  name: `${values.name} copy`,
                })
              } catch (error) {
                form.setError('root', {
                  message: error instanceof Error ? error.message : 'Unable to connect to the API dataset.',
                })
              }
            })}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <span>Name</span>
                <input
                  {...form.register('name')}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none ring-0 transition focus:border-teal-400 dark:border-teal-500"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <span>Method</span>
                <select
                  {...form.register('method')}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </label>
            </div>
            <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <span>URL</span>
              <input
                {...form.register('url')}
                placeholder="https://api.example.com/v1/records"
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500"
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <span>Auth type</span>
                <select
                  {...form.register('authType')}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500"
                >
                  <option value="none">No auth</option>
                  <option value="bearer">Bearer token</option>
                  <option value="apiKeyHeader">API key in header</option>
                  <option value="apiKeyQuery">API key in query param</option>
                  <option value="basic">Basic auth</option>
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <span>Response path</span>
                <input
                  {...form.register('responsePath')}
                  placeholder="data.items"
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500"
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <span>Bearer token / Username</span>
                <input
                  {...form.register(form.watch('authType') === 'basic' ? 'username' : 'bearerToken')}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <span>{form.watch('authType') === 'basic' ? 'Password' : 'API key / Secret'}</span>
                <input
                  {...form.register(
                    form.watch('authType') === 'basic'
                      ? 'password'
                      : form.watch('authType') === 'none' || form.watch('authType') === 'bearer'
                        ? 'apiKeyValue'
                        : 'apiKeyValue',
                  )}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500"
                />
              </label>
            </div>
            {(form.watch('authType') === 'apiKeyHeader' || form.watch('authType') === 'apiKeyQuery') && (
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <span>API key field name</span>
                <input
                  {...form.register('apiKeyName')}
                  placeholder="x-api-key"
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 outline-none transition focus:border-teal-400 dark:border-teal-500"
                />
              </label>
            )}
            <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <span>Custom headers JSON</span>
              <textarea
                {...form.register('headersJson')}
                rows={4}
                className="w-full rounded-[22px] border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 font-mono text-xs outline-none transition focus:border-teal-400 dark:border-teal-500"
              />
            </label>
            {form.watch('method') === 'POST' ? (
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <span>Request body</span>
                <textarea
                  {...form.register('body')}
                  rows={5}
                  className="w-full rounded-[22px] border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-4 py-3 font-mono text-xs outline-none transition focus:border-teal-400 dark:border-teal-500"
                />
              </label>
            ) : null}
            {form.formState.errors.root?.message ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">
                <div className="flex items-start gap-2">
                  <ServerCrash className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{form.formState.errors.root.message}</span>
                </div>
              </div>
            ) : null}
            <button
              type="submit"
              className="w-full rounded-full bg-slate-950 dark:bg-white px-4 py-3 text-sm font-semibold text-white dark:text-slate-950 transition hover:bg-slate-800 dark:hover:bg-slate-200"
            >
              Fetch API dataset
            </button>
          </form>
        </section>
      ) : null}
    </div>
  )
}
