import React from 'react'

export default function StatCard({ label, value, hint, accent = 'signal' }) {
  const accentClasses = {
    signal: 'text-signal-400',
    critical: 'text-alert-critical',
    high: 'text-alert-high',
    medium: 'text-alert-medium',
  }
  return (
    <div className="panel p-5">
      <p className="label mb-2">{label}</p>
      <p className={`font-display text-3xl font-semibold ${accentClasses[accent] || accentClasses.signal}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
