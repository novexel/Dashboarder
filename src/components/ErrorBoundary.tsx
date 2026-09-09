import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

type Props = {
  children: ReactNode
  fallbackMessage?: string
}

type State = {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-[22px] border border-dashed border-rose-300 dark:border-rose-800/50 bg-rose-50/80 dark:bg-rose-900/20 px-6 text-center text-sm text-rose-800 dark:text-rose-200">
          <AlertTriangle className="mb-3 h-6 w-6 text-rose-500 dark:text-rose-400" />
          <p className="font-semibold">{this.props.fallbackMessage ?? 'Something went wrong.'}</p>
          <p className="mt-2 text-xs opacity-80 max-w-xs overflow-hidden text-ellipsis">{this.state.error?.message}</p>
        </div>
      )
    }

    return this.props.children
  }
}
