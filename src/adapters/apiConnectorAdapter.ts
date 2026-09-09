import type {
  ApiConnectorConfig,
  DashboardRow,
  DataSource,
  DataSourceType,
} from '../core/types'
import { isRecord, normaliseRows, inferFields } from '../core/dataUtils'
import Papa from 'papaparse'

const uniqueId = (prefix: string) => {
  const suffix =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${suffix.slice(0, 8)}`
}

export const createDataSource = ({
  id,
  name,
  type,
  rows,
  metadata,
  connector,
}: {
  id?: string
  name: string
  type: DataSourceType
  rows: DashboardRow[]
  metadata?: Record<string, unknown>
  connector?: ApiConnectorConfig
}): DataSource => ({
  id: id ?? uniqueId(type),
  name,
  type,
  rows,
  fields: inferFields(rows),
  metadata,
  connector,
})

export const parseJsonText = (text: string, fileName = 'dataset.json'): DataSource => {
  const parsed = JSON.parse(text) as unknown
  const rows = normaliseRows(parsed)

  if (rows.length === 0) {
    throw new Error('The JSON source did not contain an array of records or a valid record object.')
  }

  return createDataSource({
    name: fileName.replace(/\.json$/i, ''),
    type: 'json',
    rows,
    metadata: {
      sourceFile: fileName,
    },
  })
}

export const parseCsvText = (csvString: string, fileName = 'dataset.csv'): DataSource => {
  const results = Papa.parse<Record<string, unknown>>(csvString, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  })

  const rows = results.data.filter((row) => isRecord(row) && Object.keys(row).length > 0) as DashboardRow[]
  if (rows.length === 0) {
    throw new Error('The CSV source did not contain any valid rows.')
  }

  return createDataSource({
    name: fileName.replace(/\.csv$/i, ''),
    type: 'csv',
    rows,
    metadata: {
      sourceFile: fileName,
    },
  })
}

export const parseJsonFile = async (file: File): Promise<DataSource> => {
  const text = await file.text()
  return parseJsonText(text, file.name)
}

export const parseCsvFile = async (file: File): Promise<DataSource> => {
  const text = await file.text()
  return parseCsvText(text, file.name)
}

const getResponseAtPath = (value: unknown, path?: string) => {
  if (!path) {
    return value
  }

  return path
    .split('.')
    .filter(Boolean)
    .reduce<unknown>((currentValue, segment) => {
      if (!isRecord(currentValue) && !Array.isArray(currentValue)) {
        return undefined
      }

      return (currentValue as Record<string, unknown>)[segment]
    }, value)
}

const parseHeadersInput = (headers?: Record<string, string>) => {
  const output = new Headers()

  Object.entries(headers ?? {}).forEach(([key, value]) => {
    if (key && value) {
      output.set(key, value)
    }
  })

  return output
}

export interface ApiConnectorFetchHandler {
  fetch(url: URL, init: RequestInit): Promise<Response>
}

/**
 * Standard fetch handler with security validation
 */
export const defaultApiFetchHandler: ApiConnectorFetchHandler = {
  async fetch(url: URL, init: RequestInit): Promise<Response> {
    // Protocol whitelist: only HTTPS and HTTP allowed
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error(`Unsupported URL protocol: ${url.protocol}`)
    }
    return fetch(url.toString(), init)
  },
}

export const fetchApiDataSource = async (
  config: ApiConnectorConfig & { name: string; id?: string },
  fetchHandler: ApiConnectorFetchHandler = defaultApiFetchHandler,
): Promise<DataSource> => {
  const url = new URL(config.url)
  const headers = parseHeadersInput(config.headers)
  const requestInit: RequestInit = {
    method: config.method,
  }

  if (config.authType === 'bearer' && config.bearerToken) {
    headers.set('Authorization', `Bearer ${config.bearerToken}`)
  }

  if (config.authType === 'apiKeyHeader' && config.apiKeyName && config.apiKeyValue) {
    headers.set(config.apiKeyName, config.apiKeyValue)
  }

  if (config.authType === 'apiKeyQuery' && config.apiKeyName && config.apiKeyValue) {
    url.searchParams.set(config.apiKeyName, config.apiKeyValue)
  }

  if (config.authType === 'basic' && config.username && config.password) {
    const basicAuth =
      typeof btoa === 'function'
        ? btoa(`${config.username}:${config.password}`)
        : Buffer.from(`${config.username}:${config.password}`).toString('base64')
    headers.set('Authorization', `Basic ${basicAuth}`)
  }

  if (config.method === 'POST') {
    headers.set('Content-Type', 'application/json')
    requestInit.body = config.body || '{}'
  }

  requestInit.headers = headers

  const response = await fetchHandler.fetch(url, requestInit)

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}.`)
  }

  const payload = (await response.json()) as unknown
  const rows = normaliseRows(getResponseAtPath(payload, config.responsePath))

  if (rows.length === 0) {
    throw new Error('The API response path did not resolve to an array of records.')
  }

  return createDataSource({
    id: config.id,
    name: config.name,
    type: 'api',
    rows,
    connector: config,
    metadata: {
      refreshedAt: new Date().toISOString(),
      sourceUrl: config.url,
    },
  })
}
