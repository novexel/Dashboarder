import type {
  AggregationType,
  DashboardRow,
  DashboardWidgetConfig,
  DataSource,
  FilterConfig,
  SortConfig,
} from './types'
import { isBefore, isAfter, parseISO, isValid } from 'date-fns'

const toDate = (value: unknown): Date | null => {
  if (value instanceof Date && isValid(value)) return value
  if (typeof value === 'number') return new Date(value)
  if (typeof value === 'string') {
    const parsed = parseISO(value)
    if (isValid(parsed)) return parsed
    const jsParsed = new Date(value)
    if (isValid(jsParsed)) return jsParsed
  }
  return null
}

const compareValues = (left: unknown, right: unknown) => {
  if (left === right) return 0

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right
  }

  // Handle date sorting
  const leftDate = toDate(left)
  const rightDate = toDate(right)
  if (leftDate && rightDate) {
    return leftDate.getTime() - rightDate.getTime()
  }

  return String(left ?? '').localeCompare(String(right ?? ''))
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/[,$%]/g, '')
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const passesFilter = (row: DashboardRow, filter: FilterConfig) => {
  const fieldValue = row[filter.field]
  const isRowEmpty = fieldValue === null || fieldValue === undefined || fieldValue === ''

  if (filter.operator === 'isEmpty') return isRowEmpty
  if (filter.operator === 'isNotEmpty') return !isRowEmpty

  const strRow = String(fieldValue ?? '').toLowerCase()
  const strTarget = String(filter.value ?? '').toLowerCase()

  switch (filter.operator) {
    case 'equals':
      return String(fieldValue ?? '') === String(filter.value ?? '')
    case 'notEquals':
      return String(fieldValue ?? '') !== String(filter.value ?? '')
    case 'contains':
      return strRow.includes(strTarget)
    case 'doesNotContain':
      return !strRow.includes(strTarget)
    case 'startsWith':
      return strRow.startsWith(strTarget)
    case 'endsWith':
      return strRow.endsWith(strTarget)
    case 'greaterThan':
      return compareValues(fieldValue, filter.value) > 0
    case 'greaterThanOrEqual':
      return compareValues(fieldValue, filter.value) >= 0
    case 'lessThan':
      return compareValues(fieldValue, filter.value) < 0
    case 'lessThanOrEqual':
      return compareValues(fieldValue, filter.value) <= 0
    case 'between':
      return compareValues(fieldValue, filter.value) >= 0 && compareValues(fieldValue, filter.valueTo) <= 0
    case 'inList': {
      const list = String(filter.value ?? '').split(',').map(s => s.trim().toLowerCase())
      return list.includes(strRow)
    }
    case 'notInList': {
      const list = String(filter.value ?? '').split(',').map(s => s.trim().toLowerCase())
      return !list.includes(strRow)
    }
    case 'dateBefore': {
      const rowDate = toDate(fieldValue)
      const targetDate = toDate(filter.value)
      if (!rowDate || !targetDate) return false
      return isBefore(rowDate, targetDate)
    }
    case 'dateAfter': {
      const rowDate = toDate(fieldValue)
      const targetDate = toDate(filter.value)
      if (!rowDate || !targetDate) return false
      return isAfter(rowDate, targetDate)
    }
    case 'dateRange': {
      const rowDate = toDate(fieldValue)
      const start = toDate(filter.value)
      const end = toDate(filter.valueTo)
      if (!rowDate || !start || !end) return false
      return (isAfter(rowDate, start) || rowDate.getTime() === start.getTime()) && 
             (isBefore(rowDate, end) || rowDate.getTime() === end.getTime())
    }
    default:
      return true
  }
}

const aggregateNumbers = (numbers: number[], type: AggregationType): number => {
  if (numbers.length === 0) {
    return 0
  }

  switch (type) {
    case 'sum':
      return numbers.reduce((total, value) => total + value, 0)
    case 'average':
      return numbers.reduce((total, value) => total + value, 0) / numbers.length
    case 'median': {
      const sorted = [...numbers].sort((left, right) => left - right)
      const midpoint = Math.floor(sorted.length / 2)
      return sorted.length % 2 === 0 ? (sorted[midpoint - 1] + sorted[midpoint]) / 2 : sorted[midpoint]
    }
    case 'min':
      return Math.min(...numbers)
    case 'max':
      return Math.max(...numbers)
    case 'count':
      return numbers.length
    case 'first':
      return numbers[0]
    case 'last':
      return numbers[numbers.length - 1]
    case 'countDistinct':
      return new Set(numbers).size
    case 'variance': {
      const mean: number = aggregateNumbers(numbers, 'average')
      return numbers.reduce((total, value) => total + (value - mean) ** 2, 0) / numbers.length
    }
    case 'standardDeviation':
      return Math.sqrt(aggregateNumbers(numbers, 'variance'))
    case 'percentile': {
      const sorted = [...numbers].sort((left, right) => left - right)
      const index = Math.floor((sorted.length - 1) * 0.9)
      return sorted[index]
    }
    default:
      return numbers[0]
  }
}

const applySort = (rows: DashboardRow[], sortRules?: SortConfig[]) => {
  if (!sortRules || sortRules.length === 0) {
    return rows
  }

  return [...rows].sort((leftRow, rightRow) => {
    for (const rule of sortRules) {
      const leftVal = leftRow[rule.field]
      const rightVal = rightRow[rule.field]

      const isLeftEmpty = leftVal === null || leftVal === undefined || leftVal === ''
      const isRightEmpty = rightVal === null || rightVal === undefined || rightVal === ''

      if (isLeftEmpty && !isRightEmpty) return 1 // left empty goes bottom
      if (!isLeftEmpty && isRightEmpty) return -1 // right empty goes bottom
      if (isLeftEmpty && isRightEmpty) continue

      const comparison = compareValues(leftVal, rightVal)
      if (comparison !== 0) {
        return rule.direction === 'asc' ? comparison : -comparison
      }
    }

    return 0
  })
}

const applyAggregation = (rows: DashboardRow[], widget: DashboardWidgetConfig) => {
  if (!widget.data.aggregation?.field || !widget.data.aggregation.groupBy?.length) {
    return rows
  }

  const { field, groupBy, type } = widget.data.aggregation
  const groups = new Map<string, DashboardRow[]>()

  rows.forEach((row) => {
    const groupKey = groupBy.map((key) => String(row[key] ?? '')).join('::')
    const current = groups.get(groupKey) ?? []
    current.push(row)
    groups.set(groupKey, current)
  })

  return Array.from(groups.entries()).map(([groupKey, groupRows]) => {
    const values = groupRows.map((row) => toNumber(row[field])).filter((value): value is number => value !== null)
    const baseRow: DashboardRow = {}

    groupBy.forEach((groupKeyField) => {
      baseRow[groupKeyField] = groupRows[0][groupKeyField]
    })

    baseRow[field] = aggregateNumbers(values, type)
    baseRow.__groupKey = groupKey

    return baseRow
  })
}

export const getDataSourceById = (dataSources: DataSource[], dataSourceId?: string) =>
  dataSources.find((dataSource) => dataSource.id === dataSourceId)

export const getWidgetRows = (widget: DashboardWidgetConfig, dataSource?: DataSource) => {
  if (!dataSource) {
    return []
  }

  let rows = [...dataSource.rows]

  if (widget.data.filters?.length) {
    rows = rows.filter((row) => widget.data.filters?.every((filter) => passesFilter(row, filter)))
  }

  rows = applyAggregation(rows, widget)
  rows = applySort(rows, widget.data.sort)

  if (widget.data.limit && widget.data.limit > 0) {
    rows = rows.slice(0, widget.data.limit)
  }

  return rows
}

export const getMappingKeys = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value
  }

  return value ? [value] : []
}

export const getPreferredFieldOptions = (widget: DashboardWidgetConfig, dataSource?: DataSource) => {
  if (!dataSource) {
    return []
  }

  const usedFields = Object.values(widget.data.mappings).flatMap((mapping) => getMappingKeys(mapping))
  return dataSource.fields.filter((field) => usedFields.includes(field.name))
}

export const getWidgetSeriesNames = (widget: DashboardWidgetConfig, rows: DashboardRow[]): string[] => {
  const mappings = widget.data.mappings
  let targetField: string | undefined

  if (mappings.series && typeof mappings.series === 'string') {
    targetField = mappings.series
  } else if (mappings.label && typeof mappings.label === 'string') {
    targetField = mappings.label
  } else if (mappings.category && typeof mappings.category === 'string') {
    targetField = mappings.category
  } else if (mappings.x && typeof mappings.x === 'string') {
    targetField = mappings.x
  }

  if (!targetField) return []

  const uniqueValues = new Set<string>()
  rows.forEach(row => {
    const val = row[targetField!]
    if (val !== undefined && val !== null) {
      uniqueValues.add(String(val))
    }
  })

  return Array.from(uniqueValues)
}
