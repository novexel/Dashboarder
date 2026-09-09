import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

export type SlashCommandItem = {
  title: string
  command: ({ editor, range }: { editor: any; range: any }) => void
}

export const SlashCommandList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) {
      props.command(item)
    }
  }

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => {
    setSelectedIndex(0)
  }, [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: any) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }
      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }
      if (event.key === 'Enter') {
        enterHandler()
        return true
      }
      return false
    },
  }))

  if (!props.items || props.items.length === 0) {
    return null
  }

  return (
    <div className="z-50 min-w-[220px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-panel overflow-hidden py-1">
      {props.items.map((item: SlashCommandItem, index: number) => (
        <button
          className={`flex w-full items-center space-x-2 px-3 py-2 text-sm text-left transition-colors ${
            index === selectedIndex
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
          key={index}
          onClick={() => selectItem(index)}
        >
          {item.title}
        </button>
      ))}
    </div>
  )
})

SlashCommandList.displayName = 'SlashCommandList'
