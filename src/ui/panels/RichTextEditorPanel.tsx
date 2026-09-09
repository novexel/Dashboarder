import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Image from '@tiptap/extension-image'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  ImageIcon,
  Code2,
} from 'lucide-react'
import { useEffect, useRef, useMemo, useState } from 'react'
import type { DashboardWidgetConfig, DataSource } from '../../core/types'
import { FontSize } from './extensions/FontSize'
import { SlashCommand, getSuggestionOptions } from './slash-command/SlashCommand'
import type { SlashCommandItem } from './slash-command/SlashCommandList'

type RichTextEditorPanelProps = {
  widget: DashboardWidgetConfig
  dataSource?: DataSource
  onUpdateWidget: (widgetId: string, recipe: (widget: DashboardWidgetConfig) => DashboardWidgetConfig) => void
}

const FONTS = [
  'Inter, sans-serif',
  'ui-sans-serif, system-ui, sans-serif',
  'ui-serif, Georgia, serif',
  'ui-monospace, SFMono-Regular, Menlo, monospace',
  'Comic Sans MS, Comic Sans, cursive',
]

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px']

export function RichTextEditorPanel({ widget, dataSource, onUpdateWidget }: RichTextEditorPanelProps) {
  const content = (widget.pluginConfig?.content as string) || '<p>Type here... use {{ sum(field) }} or type / for dynamic data!</p>'
  
  const [isHtmlMode, setIsHtmlMode] = useState(false)
  const [htmlContent, setHtmlContent] = useState(content)

  const suggestionItems = useMemo<SlashCommandItem[]>(() => {
    const items: SlashCommandItem[] = [
      {
        title: 'Count of rows',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).insertContent('{{ count() }}').run()
        },
      },
    ]

    if (dataSource?.fields && dataSource.fields.length > 0) {
      dataSource.fields.forEach((field) => {
        items.push({
          title: `Count of ${field.label || field.name}`,
          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent(`{{ count(${field.name}) }}`).run()
          },
        })

        let isNumeric = field.type === 'number'
        if (!isNumeric && dataSource.rows && dataSource.rows.length > 0) {
           isNumeric = typeof dataSource.rows[0][field.name] === 'number'
        }

        if (isNumeric) {
          items.push({
            title: `Sum of ${field.label || field.name}`,
            command: ({ editor, range }) => {
              editor.chain().focus().deleteRange(range).insertContent(`{{ sum(${field.name}) }}`).run()
            },
          })
          items.push({
            title: `Average of ${field.label || field.name}`,
            command: ({ editor, range }) => {
              editor.chain().focus().deleteRange(range).insertContent(`{{ average(${field.name}) }}`).run()
            },
          })
          items.push({
            title: `Max of ${field.label || field.name}`,
            command: ({ editor, range }) => {
              editor.chain().focus().deleteRange(range).insertContent(`{{ max(${field.name}) }}`).run()
            },
          })
        }
        
        items.push({
          title: `First ${field.label || field.name}`,
          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent(`{{ first(${field.name}) }}`).run()
          },
        })
      })
    }

    return items
  }, [dataSource])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image,
      TextStyle,
      FontFamily,
      Color,
      Highlight.configure({ multicolor: true }),
      FontSize,
      SlashCommand.configure({
        suggestion: {
          char: '/',
          command: ({ editor, range, props }: any) => {
            props.command({ editor, range })
          },
          ...getSuggestionOptions(suggestionItems),
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      if (!isHtmlMode) {
        setHtmlContent(editor.getHTML())
        onUpdateWidget(widget.id, (currentWidget) => ({
          ...currentWidget,
          pluginConfig: {
            ...currentWidget.pluginConfig,
            content: editor.getHTML(),
          },
        }))
      }
    },
    editorProps: {
      attributes: {
        className: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
  }, [suggestionItems, isHtmlMode])

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editor && !isHtmlMode && editor.getHTML() !== (widget.pluginConfig?.content || '')) {
      if (!widget.pluginConfig?.content) {
        onUpdateWidget(widget.id, (currentWidget) => ({
          ...currentWidget,
          pluginConfig: {
            ...currentWidget.pluginConfig,
            content: editor.getHTML(),
          },
        }))
      }
    }
  }, [editor, widget.id, widget.pluginConfig?.content, onUpdateWidget, isHtmlMode])

  if (!editor) return null

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const url = e.target?.result as string
        editor.chain().focus().setImage({ src: url }).run()
      }
      reader.readAsDataURL(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newHtml = e.target.value
    setHtmlContent(newHtml)
    onUpdateWidget(widget.id, (currentWidget) => ({
      ...currentWidget,
      pluginConfig: {
        ...currentWidget.pluginConfig,
        content: newHtml,
      },
    }))
  }

  const toggleHtmlMode = () => {
    if (isHtmlMode) {
      editor.commands.setContent(htmlContent)
    } else {
      setHtmlContent(editor.getHTML())
    }
    setIsHtmlMode(!isHtmlMode)
  }

  const ToolbarButton = ({ onClick, isActive, icon: Icon, title, disabled }: any) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        disabled
          ? 'opacity-50 cursor-not-allowed text-slate-400 dark:text-slate-600'
          : isActive
          ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  )

  return (
    <div className="flex flex-col border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
        <ToolbarButton onClick={toggleHtmlMode} isActive={isHtmlMode} icon={Code2} title="Toggle HTML View" />
        
        <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />

        <select
          disabled={isHtmlMode}
          onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
          className="text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 focus:outline-none focus:border-teal-500 disabled:opacity-50"
        >
          <option value="">Default Font</option>
          {FONTS.map(font => (
            <option key={font} value={font}>{font.split(',')[0]}</option>
          ))}
        </select>

        <select
          disabled={isHtmlMode}
          onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
          className="text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 focus:outline-none focus:border-teal-500 disabled:opacity-50"
        >
          <option value="">Size</option>
          {FONT_SIZES.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        
        <input
          disabled={isHtmlMode}
          type="color"
          onInput={(e: any) => editor.chain().focus().setColor(e.target.value).run()}
          value={editor.getAttributes('textStyle').color || '#000000'}
          className="w-6 h-6 p-0 border-0 rounded cursor-pointer disabled:opacity-50"
          title="Text Color"
        />
        
        <input
          disabled={isHtmlMode}
          type="color"
          onInput={(e: any) => editor.chain().focus().setHighlight({ color: e.target.value }).run()}
          value={editor.getAttributes('highlight').color || '#ffffff'}
          className="w-6 h-6 p-0 border-0 rounded cursor-pointer disabled:opacity-50"
          title="Background Color"
        />

        <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />

        <ToolbarButton disabled={isHtmlMode} onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} icon={Bold} title="Bold" />
        <ToolbarButton disabled={isHtmlMode} onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} icon={Italic} title="Italic" />
        <ToolbarButton disabled={isHtmlMode} onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} icon={UnderlineIcon} title="Underline" />

        <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />

        <ToolbarButton disabled={isHtmlMode} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} icon={Heading1} title="Heading 1" />
        <ToolbarButton disabled={isHtmlMode} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} icon={Heading2} title="Heading 2" />

        <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />

        <ToolbarButton disabled={isHtmlMode} onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} icon={AlignLeft} title="Align Left" />
        <ToolbarButton disabled={isHtmlMode} onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} icon={AlignCenter} title="Align Center" />
        <ToolbarButton disabled={isHtmlMode} onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} icon={AlignRight} title="Align Right" />
        <ToolbarButton disabled={isHtmlMode} onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} icon={AlignJustify} title="Justify" />

        <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />

        <ToolbarButton disabled={isHtmlMode} onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} icon={List} title="Bullet List" />
        <ToolbarButton disabled={isHtmlMode} onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} icon={ListOrdered} title="Ordered List" />

        <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />

        <button
          disabled={isHtmlMode}
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Insert Image"
          className="p-1.5 rounded transition-colors text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />
      </div>

      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-[300px] relative flex flex-col">
        {isHtmlMode ? (
          <textarea
            value={htmlContent}
            onChange={handleHtmlChange}
            className="w-full h-full min-h-[300px] p-4 font-mono text-sm bg-slate-900 text-teal-400 focus:outline-none resize-none"
            spellCheck={false}
          />
        ) : (
          <EditorContent editor={editor} className="flex-1" />
        )}
      </div>

      <div className="bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700/50 p-3 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <div>
          <strong>Pro tip:</strong> Type <code className="bg-white dark:bg-slate-900 px-1 rounded border border-slate-200 dark:border-slate-700">/</code> to insert variables inline!
        </div>
        {isHtmlMode && <span className="text-teal-600 dark:text-teal-400 font-semibold">Editing Raw HTML</span>}
      </div>
    </div>
  )
}
