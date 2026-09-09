import type { DashboardRow, DataField, DataFieldType } from './types'

const SAMPLE_VALUE_LIMIT = 5
const PREFERRED_ARRAY_KEYS = ['rows', 'data', 'items', 'records', 'results']

export const toTitleCase = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())

export const isRecord = (value: unknown): value is DashboardRow => typeof value === 'object' && value !== null && !Array.isArray(value)

const looksLikeDate = (value: string) => {
  if (!value || Number.isFinite(Number(value))) {
    return false
  }

  const parsed = Date.parse(value)
  return Number.isFinite(parsed)
}

export const inferFieldType = (values: unknown[]): DataFieldType => {
  const cleaned = values.filter((value) => value !== null && value !== undefined && value !== '')
  if (cleaned.length === 0) {
    return 'unknown'
  }

  if (cleaned.every((value) => typeof value === 'boolean')) {
    return 'boolean'
  }

  if (cleaned.every((value) => typeof value === 'number')) {
    return cleaned.every((value) => Number.isInteger(value)) ? 'integer' : 'float'
  }

  if (cleaned.every((value) => Array.isArray(value))) {
    return 'array'
  }

  if (cleaned.every((value) => isRecord(value))) {
    return 'object'
  }

  if (cleaned.every((value) => typeof value === 'string')) {
    const strings = cleaned as string[]

    if (strings.every((value) => value.includes('@') && value.includes('.'))) {
      return 'email'
    }

    if (strings.every((value) => value.startsWith('http://') || value.startsWith('https://'))) {
      return 'url'
    }

    if (strings.every((value) => value.endsWith('%'))) {
      return 'percentage'
    }

    if (strings.every((value) => value.startsWith('$') || value.startsWith('£') || value.startsWith('€'))) {
      return 'currency'
    }

    if (strings.every((value) => looksLikeDate(value))) {
      return strings.some((value) => value.includes('T') || value.includes(':')) ? 'datetime' : 'date'
    }

    return 'string'
  }

  return 'unknown'
}

export const normaliseRows = (input: unknown): DashboardRow[] => {
  if (Array.isArray(input)) {
    return input.filter(isRecord)
  }

  if (isRecord(input)) {
    for (const key of PREFERRED_ARRAY_KEYS) {
      if (Array.isArray(input[key])) {
        return (input[key] as unknown[]).filter(isRecord)
      }
    }

    // Fallback: find the property with the largest array of objects
    let largestArray: DashboardRow[] = []
    for (const key of Object.keys(input)) {
      const val = input[key]
      if (Array.isArray(val)) {
        const recordArray = val.filter(isRecord)
        if (recordArray.length > largestArray.length) {
          largestArray = recordArray
        }
      }
    }

    if (largestArray.length > 0) {
      return largestArray
    }

    return [input]
  }

  return []
}

export const inferFields = (rows: DashboardRow[]): DataField[] => {
  if (rows.length === 0) {
    return []
  }

  const fieldNames = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key))
      return set
    }, new Set<string>()),
  )

  return fieldNames.map((fieldName) => {
    const values = rows.map((row) => row[fieldName])
    
    let nullable = false
    const uniqueValues: unknown[] = []
    const seen = new Set<unknown>()

    for (let i = 0; i < values.length; i++) {
      const val = values[i]
      if (val === null || val === undefined || val === '') {
        nullable = true
        continue
      }

      if (typeof val === 'object') {
        if (uniqueValues.length < SAMPLE_VALUE_LIMIT) {
          uniqueValues.push(val)
        }
        continue
      }

      const key = val as string | number | boolean
      
      if (!seen.has(key)) {
        seen.add(key)
        if (uniqueValues.length < 1000) {
          uniqueValues.push(val)
        }
      }
    }

    const type = inferFieldType(values)

    return {
      name: fieldName,
      label: toTitleCase(fieldName),
      type,
      nullable,
      uniqueCount: type === 'object' || type === 'array' ? undefined : seen.size,
      sampleValues: uniqueValues.slice(0, SAMPLE_VALUE_LIMIT),
    }
  })
}
