import type { DashboardWidgetConfig, VisualLayer, DataField } from '../core/types'
import { Plus, Trash2 } from 'lucide-react'

type AdvancedLayersPanelProps = {
  widget: DashboardWidgetConfig
  availableFields: DataField[]
  onUpdateWidget: (id: string, updater: (widget: DashboardWidgetConfig) => DashboardWidgetConfig) => void
}

export function AdvancedLayersPanel({ widget, availableFields, onUpdateWidget }: AdvancedLayersPanelProps) {
  const layers = widget.layers || []

  const handleAddLayer = () => {
    onUpdateWidget(widget.id, (w) => {
      const newLayer: VisualLayer = {
        id: `layer-${Date.now()}`,
        type: 'line',
        mappings: {},
        style: { name: `Layer ${layers.length + 1}` },
        visible: true,
      }
      return { ...w, layers: [...(w.layers || []), newLayer] }
    })
  }

  const handleRemoveLayer = (layerId: string) => {
    onUpdateWidget(widget.id, (w) => ({
      ...w,
      layers: w.layers?.filter((l) => l.id !== layerId) || [],
    }))
  }

  const handleUpdateLayer = (layerId: string, updater: (layer: VisualLayer) => VisualLayer) => {
    onUpdateWidget(widget.id, (w) => ({
      ...w,
      layers: w.layers?.map((l) => (l.id === layerId ? updater(l) : l)) || [],
    }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Chart Layers</h3>
        <button
          onClick={handleAddLayer}
          className="flex items-center gap-1.5 rounded-lg bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-600 hover:bg-teal-500/20 dark:text-teal-400"
        >
          <Plus size={14} />
          Add Layer
        </button>
      </div>

      {layers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center text-sm text-slate-500">
          No layers added yet. Click "Add Layer" to build your chart.
        </div>
      ) : (
        <div className="space-y-3">
          {layers.map((layer, index) => (
            <div key={layer.id} className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-4 relative group">
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <button
                  onClick={() => handleRemoveLayer(layer.id)}
                  className="text-slate-400 hover:text-rose-500 transition"
                  title="Remove layer"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <label className="space-y-1.5 flex flex-col">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Layer Name</span>
                  <input
                    type="text"
                    value={String(layer.style.name || '')}
                    onChange={(e) => handleUpdateLayer(layer.id, (l) => ({ ...l, style: { ...l.style, name: e.target.value } }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-teal-400 text-slate-900 dark:text-slate-100"
                    placeholder={`Layer ${index + 1}`}
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1.5 flex flex-col">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Visualization Type</span>
                    <select
                      value={layer.type}
                      onChange={(e) => handleUpdateLayer(layer.id, (l) => ({ ...l, type: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm outline-none focus:border-teal-400 text-slate-900 dark:text-slate-100"
                    >
                      <option value="line">Line</option>
                      <option value="bar">Bar</option>
                      <option value="area">Area</option>
                      <option value="scatter">Scatter</option>
                    </select>
                  </label>
                  
                  <label className="space-y-1.5 flex flex-col">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Y-Axis Position</span>
                    <select
                      value={String(layer.style.yAxisPosition || 'left')}
                      onChange={(e) => handleUpdateLayer(layer.id, (l) => ({ ...l, style: { ...l.style, yAxisPosition: e.target.value } }))}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm outline-none focus:border-teal-400 text-slate-900 dark:text-slate-100"
                    >
                      <option value="left">Left Axis</option>
                      <option value="right">Right Axis</option>
                    </select>
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3">
                  <label className="space-y-1.5 flex flex-col">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">X-Axis Field</span>
                    <select
                      value={String(layer.mappings.x || '')}
                      onChange={(e) => handleUpdateLayer(layer.id, (l) => ({ ...l, mappings: { ...l.mappings, x: e.target.value } }))}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm outline-none focus:border-teal-400 text-slate-900 dark:text-slate-100"
                    >
                      <option value="">Select X field</option>
                      {availableFields.map((f) => (
                        <option key={f.name} value={f.name}>{f.label}</option>
                      ))}
                    </select>
                  </label>
                  
                  <label className="space-y-1.5 flex flex-col">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Y-Axis Field</span>
                    <select
                      value={String(layer.mappings.y || '')}
                      onChange={(e) => handleUpdateLayer(layer.id, (l) => ({ ...l, mappings: { ...l.mappings, y: e.target.value } }))}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm outline-none focus:border-teal-400 text-slate-900 dark:text-slate-100"
                    >
                      <option value="">Select Y field</option>
                      {availableFields.map((f) => (
                        <option key={f.name} value={f.name}>{f.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1.5 flex flex-col">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Split by (Series)</span>
                    <select
                      value={String(layer.mappings.series || '')}
                      onChange={(e) => handleUpdateLayer(layer.id, (l) => ({ ...l, mappings: { ...l.mappings, series: e.target.value } }))}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm outline-none focus:border-teal-400 text-slate-900 dark:text-slate-100"
                    >
                      <option value="">No splitting</option>
                      {availableFields.map((f) => (
                        <option key={f.name} value={f.name}>{f.label}</option>
                      ))}
                    </select>
                  </label>
                  
                  <label className="space-y-1.5 flex flex-col">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Color Overlay</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={String(layer.style.color || '#0ea5e9')}
                        onChange={(e) => handleUpdateLayer(layer.id, (l) => ({ ...l, style: { ...l.style, color: e.target.value } }))}
                        className="h-8 w-8 rounded cursor-pointer border-none p-0 bg-transparent"
                      />
                      <span className="text-xs text-slate-500 font-mono">{String(layer.style.color || 'Auto')}</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
