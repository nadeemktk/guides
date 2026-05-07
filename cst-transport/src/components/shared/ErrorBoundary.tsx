import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackLabel?: string
  inline?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
  info: ErrorInfo | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info })
    console.error('[ErrorBoundary]', error, info)
  }

  reset = () => this.setState({ hasError: false, error: null, info: null })

  render() {
    if (!this.state.hasError) return this.props.children

    const { inline, fallbackLabel } = this.props
    const msg = this.state.error?.message || 'Unknown error'

    if (inline) {
      return (
        <div className="flex flex-col items-center justify-center p-8 gap-3">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
          <p className="text-slate-400 text-sm text-center">{fallbackLabel || 'This section failed to load.'}</p>
          <p className="text-slate-600 text-xs font-mono text-center max-w-sm truncate">{msg}</p>
          <button onClick={this.reset} className="btn-secondary text-xs flex items-center gap-1.5 mt-1">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )
    }

    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="max-w-lg w-full">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-8 text-center shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-100 mb-2">Something went wrong</h2>
            <p className="text-slate-400 text-sm mb-4">
              {fallbackLabel || 'This module encountered an unexpected error.'}
            </p>
            <div className="bg-slate-950 rounded-xl p-3 mb-6 text-left overflow-auto max-h-32">
              <p className="text-red-400 text-xs font-mono break-all">{msg}</p>
              {this.state.info?.componentStack && (
                <p className="text-slate-600 text-[10px] font-mono mt-2 whitespace-pre-wrap">
                  {this.state.info.componentStack.split('\n').slice(0, 8).join('\n')}
                </p>
              )}
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={this.reset} className="btn-primary flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
              <button onClick={() => window.location.reload()} className="btn-secondary text-sm">
                Reload App
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
