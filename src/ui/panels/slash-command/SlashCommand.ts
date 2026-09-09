import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import type { GetReferenceClientRect } from 'tippy.js'
import { SlashCommandList } from './SlashCommandList'
import type { SlashCommandItem } from './SlashCommandList'

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range })
        },
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})

export const getSuggestionOptions = (items: SlashCommandItem[]) => {
  return {
    items: ({ query }: { query: string }) => {
      return items.filter(item => item.title.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
    },
    render: () => {
      let component: ReactRenderer<any>
      let popup: any

      return {
        onStart: (props: any) => {
          component = new ReactRenderer(SlashCommandList, {
            props,
            editor: props.editor,
          })

          if (!props.clientRect) {
            return
          }

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect as GetReferenceClientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          })
        },

        onUpdate(props: any) {
          component.updateProps(props)

          if (!props.clientRect) {
            return
          }

          popup[0].setProps({
            getReferenceClientRect: props.clientRect as GetReferenceClientRect,
          })
        },

        onKeyDown(props: any) {
          if (props.event.key === 'Escape') {
            popup[0].hide()
            return true
          }

          return component.ref?.onKeyDown(props)
        },

        onExit() {
          if (popup && popup[0]) {
            popup[0].destroy()
          }
          if (component) {
            component.destroy()
          }
        },
      }
    },
  }
}
