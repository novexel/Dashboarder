import { Copy, Download, GripHorizontal, Pencil, Target, ToggleLeft, ToggleRight, Trash2, ZoomIn, ZoomOut } from 'lucide-react'
import { useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { DashboardWidgetConfig } from '../core/types'
import { adjustWidgetForTheme } from '../core/types'
import { useDashboardStore } from '../state/dashboardStore'
import html2canvas from 'html2canvas'

type WidgetFrameProps = PropsWithChildren<{
  widget: DashboardWidgetConfig
  selected: boolean
  readOnly?: boolean
  onSelect: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  children: React.ReactNode
}>

export function WidgetFrame({
  widget,
  selected,
  readOnly = false,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onZoomIn,
  onZoomOut,
  children,
}: WidgetFrameProps) {
  const themeMode = useDashboardStore((state) => state.themeMode)
  const adjustedWidget = adjustWidgetForTheme(widget, themeMode)
  const updateWidget = useDashboardStore((state) => state.updateWidget)
  const targetWidgetId = useDashboardStore((state) => state.config.targetWidgetId)
  const setTargetWidgetId = useDashboardStore((state) => state.setTargetWidgetId)

  const isTarget = targetWidgetId === widget.id
  const isFollowing = !widget.interactions?.ignoreCrossFilters

  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return
    if (
      (e.target as HTMLElement).closest('.widget-frame-action') ||
      (e.target as HTMLElement).closest('.widget-drag-handle')
    ) {
      return
    }

    setIsPanning(true)
    setPanStart({
      x: e.clientX - (widget.style.panX ?? 0),
      y: e.clientY - (widget.style.panY ?? 0),
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return
    const dx = e.clientX - panStart.x
    const dy = e.clientY - panStart.y

    updateWidget(widget.id, (w) => ({
      ...w,
      style: {
        ...w.style,
        panX: dx,
        panY: dy,
      },
    }))
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  const handleDownloadPng = async () => {
    const element = document.getElementById(`widget-container-${widget.id}`)
    if (!element) return

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: adjustedWidget.style.backgroundColor || '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      })
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `${widget.title || 'widget'}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Error generating widget PNG:', error)
    }
  }

  const handleDoubleClick = () => {
    if (readOnly) return
    updateWidget(widget.id, (w) => ({
      ...w,
      style: {
        ...w.style,
        panX: 0,
        panY: 0,
        graphicZoom: 1,
      },
    }))
  }

  return (
    <section
      id={`widget-container-${widget.id}`}
      className={`relative group flex h-full flex-col overflow-hidden rounded-[28px] border transition ${
        selected
          ? 'border-teal-400 dark:border-teal-500 ring-2 ring-teal-100 dark:ring-teal-900/30'
          : 'border-slate-200 dark:border-slate-700/50'
      } ${
        !readOnly
          ? 'hover:border-dashed hover:border-teal-500/80 dark:hover:border-teal-400/80'
          : ''
      }`}
      style={{
        backgroundColor: adjustedWidget.style.backgroundColor,
      }}
      onClick={onSelect}
    >
      {!(readOnly && widget.style.hideWidgetName && widget.style.hideWidgetType) ? (
        <header className="widget-drag-handle flex cursor-grab select-none items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-4 active:cursor-grabbing">
          <div className="flex min-w-0 items-center gap-3">
            {!readOnly ? <GripHorizontal className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" /> : null}
            <div className="min-w-0">
              {!widget.style.hideWidgetName && (
                <h3
                  className="truncate font-display font-semibold"
                  style={{ color: adjustedWidget.style.titleColor, fontSize: adjustedWidget.style.fontSizeTitle ?? 14 }}
                >
                  {adjustedWidget.title ?? 'Untitled Widget'}
                </h3>
              )}
              {!widget.style.hideWidgetType && (
                <p className="truncate text-slate-500 dark:text-slate-400" style={{ fontSize: adjustedWidget.style.fontSizeSubtitle ?? 12 }}>{adjustedWidget.type}</p>
              )}
            </div>
          </div>
          {!readOnly ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setTargetWidgetId(isTarget ? null : widget.id)
                }}
                className={`widget-frame-action rounded-full p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
                  isTarget
                    ? 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                title={isTarget ? "Leader Widget (Driving Filters)" : "Set as Leader Widget"}
                aria-label="Toggle Leader Widget"
              >
                <Target className="h-4 w-4" />
              </button>
              
              {!isTarget && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    updateWidget(widget.id, (w) => ({
                      ...w,
                      interactions: {
                        ...w.interactions,
                        ignoreCrossFilters: isFollowing, // If it WAS following, we now ignore
                      },
                    }))
                  }}
                  className={`widget-frame-action rounded-full p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    isFollowing
                      ? 'text-teal-600 dark:text-teal-400'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                  title={isFollowing ? "Following Leader (Click to Ignore)" : "Ignoring Leader (Click to Follow)"}
                  aria-label="Toggle Follow Target"
                >
                  {isFollowing ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                </button>
              )}

              <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700"></div>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onEdit()
                }}
                className="widget-frame-action rounded-full p-2 text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
                aria-label={`Edit ${adjustedWidget.title ?? 'widget'}`}
              >
                <Pencil className="h-4 w-4" />
              </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onZoomIn?.()
              }}
              className="widget-frame-action rounded-full p-2 text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label={`Zoom in ${adjustedWidget.title ?? 'widget'}`}
              disabled={(widget.style.graphicZoom ?? 1) >= 2.5}
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onZoomOut?.()
              }}
              className="widget-frame-action rounded-full p-2 text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label={`Zoom out ${adjustedWidget.title ?? 'widget'}`}
              disabled={(widget.style.graphicZoom ?? 1) <= 0.4}
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onDuplicate()
              }}
              className="widget-frame-action rounded-full p-2 text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
              aria-label={`Duplicate ${adjustedWidget.title ?? 'widget'}`}
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onDelete()
              }}
              className="widget-frame-action rounded-full p-2 text-slate-400 dark:text-slate-500 transition hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-700 dark:hover:text-rose-400"
              aria-label={`Delete ${adjustedWidget.title ?? 'widget'}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </header>
      ) : null}
      <div
        className="flex-1 overflow-hidden"
        style={{
          padding: `${adjustedWidget.style.padding}px`,
        }}
      >
        <div
          className={!readOnly ? 'transition-opacity duration-200 group-hover:opacity-40' : ''}
          style={{
            transform: `translate(${widget.style.panX ?? 0}px, ${widget.style.panY ?? 0}px) scale(${widget.style.graphicZoom ?? 1})`,
            transformOrigin: 'center center',
            width: '100%',
            height: '100%',
            transition: isPanning ? 'none' : 'transform 0.2s ease-in-out, opacity 0.2s ease-in-out',
            cursor: !readOnly ? (isPanning ? 'grabbing' : ((widget.style.graphicZoom ?? 1) > 1 ? 'grab' : 'default')) : 'default',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        >
          {children}
        </div>
      </div>
      {readOnly ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            handleDownloadPng()
          }}
          className="widget-frame-action absolute right-4 top-4 z-40 rounded-full p-2.5 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition opacity-0 group-hover:opacity-100 shadow-md"
          title="Download visual as PNG"
          aria-label="Download visual as PNG"
        >
          <Download className="h-4.5 w-4.5" />
        </button>
      ) : null}
    </section>
  )
}
