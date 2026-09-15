import React from 'react'

const STYLES = {
  Critical: 'bg-alert-critical/15 text-alert-critical ring-1 ring-alert-critical/30',
  High: 'bg-alert-high/15 text-alert-high ring-1 ring-alert-high/30',
  Medium: 'bg-alert-medium/15 text-alert-medium ring-1 ring-alert-medium/30',
  Low: 'bg-alert-low/15 text-alert-low ring-1 ring-alert-low/30',
}

export default function SeverityBadge({ severity }) {
  return (
    <span className={`badge ${STYLES[severity] || STYLES.Low}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {severity}
    </span>
  )
}
