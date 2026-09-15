import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught a render exception:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    if (this.props.onReset) {
      this.props.onReset()
    } else {
      window.location.href = '/dashboard'
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-2xl border border-red-500/20 bg-[#0d1120] p-6 shadow-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400 text-2xl mb-4">
              ⚠️
            </div>
            <h3 className="text-base font-semibold text-white mb-2">
              Unable to display this view
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              An unexpected error occurred while rendering this tab or component. We prevented the screen from blanking out.
            </p>
            {this.state.error?.message && (
              <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3 mb-5 text-left font-mono text-[11px] text-red-300 overflow-x-auto max-h-28">
                {this.state.error.message}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="btn-primary py-2 px-4 text-xs"
              >
                Return to Dashboard
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-secondary py-2 px-4 text-xs"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
