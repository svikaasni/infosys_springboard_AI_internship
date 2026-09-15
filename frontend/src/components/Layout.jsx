import React from 'react'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'
import ChatAssistant from './ChatAssistant.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-6xl">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
      <ChatAssistant />
    </div>
  )
}
