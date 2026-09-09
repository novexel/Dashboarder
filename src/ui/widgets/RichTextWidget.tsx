import { useMemo } from 'react'
import type { DashboardWidgetConfig, DashboardRow, AggregationType } from '../../core/types'
import { aggregateValues } from '../../registry/visualRegistry'
// DOMPurify is used to sanitize HTML content and prevent XSS attacks
import DOMPurify from 'dompurify'

type RichTextWidgetProps = {
  widget: DashboardWidgetConfig
  rows: DashboardRow[]
}

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Only allows safe tags (span, p) and attributes (class) to be rendered.
 * This protects against malicious scripts being injected into the rich text content.
 */
function sanitizeHtml(html: string | null | undefined) {
  return html
    ? DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['span', 'p'],
        ALLOWED_ATTR: ['class'],
      })
    : '';
}

export function RichTextWidget({ widget, rows }: RichTextWidgetProps) {
  const content = (widget.pluginConfig?.content as string) || ''

  const processedHtml = useMemo(() => {
    if (!content) return ''

    // Regex to match {{ agg(field) }} or {{ agg() }} or {{ field }}
    // Examples: {{ sum(revenue) }}, {{ count() }}, {{ count }}
    return content.replace(/\{\{\s*([a-zA-Z0-9_]+)(?:\(([^)]*)\))?\s*\}\}/gi, (_match, fnOrField, innerField) => {
      const aggFuncs = ['sum', 'average', 'min', 'max', 'count', 'first', 'last']
      const isAggFunc = aggFuncs.includes(fnOrField.toLowerCase())

      let aggType: AggregationType = 'sum'
      let field = ''

      if (isAggFunc) {
        aggType = fnOrField.toLowerCase() as AggregationType
        field = innerField?.trim() || ''
      } else {
        // If it's just {{ sales }}, assume sum(sales)
        aggType = 'sum'
        field = fnOrField.trim()
      }

      if (rows.length === 0) return '0'

      if (aggType === 'count') {
        return rows.length.toString()
      }

      if (!field) return '0'

      // Custom pseudo-aggregations for strings
      if (aggType === 'first' as any) {
        return rows[0]?.[field]?.toString() || ''
      }
      if (aggType === 'last' as any) {
        return rows[rows.length - 1]?.[field]?.toString() || ''
      }

      const val = aggregateValues(rows, field, aggType)
      
      // Formatting
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(val)
    })
  }, [content, rows])

  return (
    <div 
      className="prose prose-sm dark:prose-invert max-w-none break-words h-full w-full overflow-y-auto"
      style={{
        color: widget.style.axisLabelColor,
        fontSize: widget.style.fontSizeSubtitle,
      }}
      // Sanitize HTML before rendering to prevent XSS vulnerabilities
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(processedHtml) }}
    />
  )
}
