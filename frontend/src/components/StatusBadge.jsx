import React from 'react'

const STYLES = {
  Open: 'bg-alert-medium/15 text-alert-medium ring-1 ring-alert-medium/30',
  'In Progress': 'bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30',
  Resolved: 'bg-signal-500/15 text-signal-400 ring-1 ring-signal-500/30',
  Closed: 'bg-overlay/10 text-slate-400 ring-1 ring-overlay/10',
}

export default function StatusBadge({ status }) {
  return <span className={`badge ${STYLES[status] || STYLES.Open}`}>{status}</span>
}
