/**
 * Standalone Verification & Unit Test Suite for @novexel/dashboarder
 */
const assert = require('assert')
const path = require('path')

// Resolve compiled dist files
const {
  // Core
  getWidgetRows,
  aggregateValues,
  inferFields,
  normaliseRows,
  createEmptyDashboardConfig,
  createDefaultWidgetStyle,
  dashboardConfigSchema,
  migrateDashboardConfig,

  // Registry
  registerVisual,
  unregisterVisual,
  getVisual,
  listRegisteredVisuals,
  getCompatibleVisuals,
  createWidgetFromPlugin,

  // State
  createDashboardStore,

  // Adapters
  parseJsonText,
  parseCsvText,
  LocalStorageDashboardAdapter,
  defaultApiFetchHandler,
  fetchApiDataSource,
} = require('../dist/index.js')

async function runTests() {
  console.log('====================================================')
  console.log('Running @novexel/dashboarder Enterprise Test Suite')
  console.log('====================================================\n')

  let passed = 0
  let failed = 0

  async function test(name, fn) {
    try {
      await fn()
      console.log(`  ✓ ${name}`)
      passed++
    } catch (err) {
      console.error(`  ✗ ${name}`)
      console.error(`    ${err.stack || err.message}`)
      failed++
    }
  }

  const mockDataSource = {
    id: 'ds-test-1',
    name: 'Test Sales',
    type: 'csv',
    fields: [
      { name: 'region', label: 'Region', type: 'string' },
      { name: 'revenue', label: 'Revenue', type: 'number' },
      { name: 'date', label: 'Date', type: 'date' },
    ],
    rows: [
      { region: 'EMEA', revenue: 120, date: '2026-01-01' },
      { region: 'APAC', revenue: 250, date: '2026-02-01' },
      { region: 'EMEA', revenue: 180, date: '2026-03-01' },
      { region: 'AMER', revenue: null, date: null },
      { region: 'LATAM', revenue: undefined, date: '2026-04-01' },
    ],
  }

  const createMockWidget = (dataConfig = {}) => ({
    id: 'widget-1',
    title: 'Test Bar',
    type: 'bar-chart',
    layout: { x: 0, y: 0, w: 4, h: 4 },
    labels: {},
    data: {
      dataSourceId: 'ds-test-1',
      mappings: {},
      ...dataConfig,
    },
    style: createDefaultWidgetStyle(),
  })

  // 1. Data Engine Tests
  await test('1. getWidgetRows: returns unfiltered rows when no filters applied', () => {
    const widget = createMockWidget()
    const rows = getWidgetRows(widget, mockDataSource)
    assert.strictEqual(rows.length, 5)
    assert.strictEqual(rows[0].region, 'EMEA')
  })

  await test('2. getWidgetRows: correctly evaluates equals filter', () => {
    const widget = createMockWidget({
      filters: [{ id: 'f-1', field: 'region', operator: 'equals', value: 'EMEA' }],
    })
    const rows = getWidgetRows(widget, mockDataSource)
    assert.strictEqual(rows.length, 2)
    assert.ok(rows.every((r) => r.region === 'EMEA'))
  })

  await test('3. getWidgetRows: correctly evaluates inList filter', () => {
    const widget = createMockWidget({
      filters: [{ id: 'f-2', field: 'region', operator: 'inList', value: 'EMEA, APAC' }],
    })
    const rows = getWidgetRows(widget, mockDataSource)
    assert.strictEqual(rows.length, 3)
  })

  await test('4. getWidgetRows: correctly sorts with null values placed at the end', () => {
    const widgetAsc = createMockWidget({
      sort: [{ field: 'revenue', direction: 'asc' }],
    })
    const ascRows = getWidgetRows(widgetAsc, mockDataSource)
    assert.strictEqual(ascRows[0].revenue, 120)
    assert.strictEqual(ascRows[1].revenue, 180)
    assert.strictEqual(ascRows[2].revenue, 250)
    assert.strictEqual(ascRows[3].revenue, null)
    assert.strictEqual(ascRows[4].revenue, undefined)

    const widgetDesc = createMockWidget({
      sort: [{ field: 'revenue', direction: 'desc' }],
    })
    const descRows = getWidgetRows(widgetDesc, mockDataSource)
    assert.strictEqual(descRows[0].revenue, 250)
    assert.strictEqual(descRows[1].revenue, 180)
    assert.strictEqual(descRows[2].revenue, 120)
    assert.strictEqual(descRows[3].revenue, null)
  })

  await test('5. getWidgetRows: aggregates sum and groups by dimension', () => {
    const widget = createMockWidget({
      aggregation: {
        type: 'sum',
        field: 'revenue',
        groupBy: ['region'],
      },
    })
    const rows = getWidgetRows(widget, mockDataSource)
    const emea = rows.find((r) => r.region === 'EMEA')
    const apac = rows.find((r) => r.region === 'APAC')
    const amer = rows.find((r) => r.region === 'AMER')
    assert.strictEqual(emea.revenue, 300) // 120 + 180
    assert.strictEqual(apac.revenue, 250)
    assert.strictEqual(amer.revenue, 0)
  })

  await test('6. aggregateValues: calculates sum, average, min, max, count', () => {
    const rows = [{ val: 10 }, { val: 20 }, { val: 30 }]
    assert.strictEqual(aggregateValues(rows, 'val', 'sum'), 60)
    assert.strictEqual(aggregateValues(rows, 'val', 'average'), 20)
    assert.strictEqual(aggregateValues(rows, 'val', 'min'), 10)
    assert.strictEqual(aggregateValues(rows, 'val', 'max'), 30)
    assert.strictEqual(aggregateValues(rows, 'val', 'count'), 3)
  })

  // 2. Zustand State Management Tests
  await test('7. dashboardStore: initializes with empty config and seed datasources', () => {
    const store = createDashboardStore({
      dataSources: [mockDataSource],
    })
    const state = store.getState()
    assert.strictEqual(state.dataSources.length, 1)
    assert.strictEqual(state.activeDataSourceId, 'ds-test-1')
    assert.strictEqual(state.config.widgets.length, 0)
  })

  await test('8. dashboardStore: toggles, tracks, and clears cross-filters', () => {
    const store = createDashboardStore({
      dataSources: [mockDataSource],
    })
    const filter = { id: 'cf-1', field: 'region', operator: 'equals', value: 'EMEA', sourceWidgetId: 'w-1' }

    store.getState().toggleCrossFilter('ds-test-1', filter)
    assert.strictEqual(store.getState().crossFilters['ds-test-1'].length, 1)

    store.getState().toggleCrossFilter('ds-test-1', filter)
    assert.strictEqual(store.getState().crossFilters['ds-test-1'].length, 0)

    store.getState().toggleCrossFilter('ds-test-1', filter)
    store.getState().clearCrossFilters('ds-test-1')
    assert.strictEqual(store.getState().crossFilters['ds-test-1'].length, 0)
  })

  await test('9. dashboardStore: supports widget addition, update, targeting, and removal', () => {
    const store = createDashboardStore({ dataSources: [mockDataSource] })
    const widget = createMockWidget()

    store.getState().addWidget(widget)
    assert.strictEqual(store.getState().config.widgets.length, 1)

    store.getState().setTargetWidgetId(widget.id)
    assert.strictEqual(store.getState().config.targetWidgetId, widget.id)

    store.getState().updateWidget(widget.id, (w) => ({ ...w, title: 'Updated Title' }))
    assert.strictEqual(store.getState().config.widgets[0].title, 'Updated Title')

    store.getState().removeWidget(widget.id)
    assert.strictEqual(store.getState().config.widgets.length, 0)
  })

  // 3. Schema & Validation Tests
  await test('10. dashboardSchema: parses valid config and rejects malformed inputs', () => {
    const empty = createEmptyDashboardConfig()
    const parsed = dashboardConfigSchema.safeParse(empty)
    assert.ok(parsed.success, 'Empty config should be valid according to schema')

    const invalid = dashboardConfigSchema.safeParse({ version: '1.0.0', widgets: [{ invalidField: true }] })
    assert.ok(!invalid.success, 'Malformed widget config should fail schema validation')
  })

  await test('11. migrateDashboardConfig: upgrades and normalizes legacy configs', () => {
    const legacyConfig = {
      version: '0.1.0',
      widgets: [
        {
          id: 'w-legacy',
          type: 'line-chart',
          layout: { x: 0, y: 0, w: 6, h: 4 },
          data: { mappings: {} },
          labels: {},
          style: {},
        },
      ],
    }
    const migrated = migrateDashboardConfig(legacyConfig)
    assert.ok(migrated.widgets[0].style.backgroundColor, 'Migrated widget has default style properties')
    assert.strictEqual(migrated.widgets[0].id, 'w-legacy')
  })

  // 4. Registry & Visual Plugins
  await test('12. visualRegistry: registers, lists, and queries visual plugins', () => {
    const initialList = listRegisteredVisuals()
    assert.ok(initialList.length >= 20, 'Built-in visual plugins catalogue is populated')

    const customPlugin = {
      id: 'custom-gauge-test',
      name: 'Test Gauge',
      category: 'Custom',
      renderer: 'custom',
      requiredMappings: [{ key: 'val', label: 'Value', acceptedTypes: ['number', 'float', 'integer'] }],
      compatibleFieldTypes: [{ mappingKey: 'val', acceptedTypes: ['number', 'float', 'integer'] }],
      defaultSize: { w: 3, h: 3 },
    }

    registerVisual(customPlugin)
    const retrieved = getVisual('custom-gauge-test')
    assert.strictEqual(retrieved.name, 'Test Gauge')

    const createdWidget = createWidgetFromPlugin('custom-gauge-test', mockDataSource)
    assert.strictEqual(createdWidget.type, 'custom-gauge-test')
    assert.strictEqual(createdWidget.layout.w, 3)

    unregisterVisual('custom-gauge-test')
    assert.strictEqual(getVisual('custom-gauge-test'), undefined)
  })

  // 5. Ingestion & Storage Adapters
  await test('13. parseJsonText: normalizes record array and infers field types', () => {
    const jsonStr = JSON.stringify([
      { name: 'Alice', age: 30, active: true },
      { name: 'Bob', age: 25, active: false },
    ])
    const ds = parseJsonText(jsonStr, 'users.json')
    assert.strictEqual(ds.name, 'users')
    assert.strictEqual(ds.rows.length, 2)
    assert.strictEqual(ds.fields.find((f) => f.name === 'age').type, 'integer')
    assert.strictEqual(ds.fields.find((f) => f.name === 'active').type, 'boolean')
  })

  await test('14. parseCsvText: parses CSV string with dynamic typing', () => {
    const csvStr = 'country,population,gdp\nUK,67000000,3.1\nUS,330000000,25.4\n'
    const ds = parseCsvText(csvStr, 'countries.csv')
    assert.strictEqual(ds.rows.length, 2)
    assert.strictEqual(ds.rows[0].country, 'UK')
    assert.strictEqual(ds.rows[0].population, 67000000)
    assert.strictEqual(ds.rows[0].gdp, 3.1)
  })

  await test('15. fetchApiDataSource: validates safe protocols and blocks SSRF vectors (file:, ftp:)', async () => {
    let blocked = false
    try {
      await fetchApiDataSource({
        name: 'Malicious Target',
        url: 'file:///etc/passwd',
        method: 'GET',
        authType: 'none',
      })
    } catch (err) {
      blocked = true
      assert.ok(err.message.includes('protocol'), 'Should reject file: protocol')
    }
    assert.ok(blocked, 'Non-http(s) protocol was safely blocked')
  })

  console.log(`\n====================================================`)
  console.log(`Test Results: ${passed} passed, ${failed} failed.`)
  console.log(`====================================================\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

runTests()
