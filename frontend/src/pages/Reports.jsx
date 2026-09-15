import React, { useState, useEffect } from 'react'
import client from '../api/client'
import SeverityBadge from '../components/SeverityBadge.jsx'
import StatusBadge from '../components/StatusBadge.jsx'

export default function Reports() {
  const [reportType, setReportType] = useState('weekly')
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [downloadingCsv, setDownloadingCsv] = useState(false)

  const loadReport = async (type) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await client.get(`/reports/generate?report_type=${type}`)
      setReportData(data)
    } catch (err) {
      setError('Could not generate intelligence report.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport(reportType)
  }, [reportType])

  const handleExportCsv = async () => {
    setDownloadingCsv(true)
    try {
      const response = await client.get('/reports/export-csv', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `bugsense_${reportType}_report.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Failed to export CSV.')
    } finally {
      setDownloadingCsv(false)
    }
  }

  return (
    <div className="max-w-[1400px] space-y-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.08] via-[#0b0f1d] to-cyan-400/[0.035] p-6 lg:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/[0.08] blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-violet-400/15 bg-violet-500/[0.08] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-violet-300">
                Executive Intelligence
              </span>
              <span className="glass-chip">Multi-Agent Synthesis</span>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-white lg:text-3xl">
              Defect Reports & Analytics Export
            </h1>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-400">
              Structured summaries, resolution rate metrics, and engineering audit exports across all tracked bugs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCsv}
              disabled={downloadingCsv}
              className="btn-secondary text-xs"
            >
              {downloadingCsv ? 'Exporting CSV…' : '📥 Export CSV'}
            </button>
            <button
              onClick={() => window.print()}
              className="btn-primary text-xs"
            >
              🖨️ Print / Save PDF
            </button>
          </div>
        </div>
      </section>

      {/* Scope Selector */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'daily', label: 'Daily Brief' },
          { id: 'weekly', label: 'Weekly Summary' },
          { id: 'monthly', label: 'Monthly Review' },
          { id: 'project', label: 'Project Breakdown' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id)}
            className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${
              reportType === tab.id
                ? 'border-violet-400/30 bg-violet-500/15 text-violet-200'
                : 'border-white/[0.06] bg-white/[0.02] text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-400/15 bg-red-500/[0.06] px-4 py-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="panel p-12 text-center text-xs text-slate-500">
          Synthesizing {reportType} intelligence report…
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="panel p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Defect Reports</p>
              <p className="mt-2 text-2xl font-bold text-white">{reportData?.summary?.total_bugs ?? 0}</p>
            </div>
            <div className="panel p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Resolved Defects</p>
              <p className="mt-2 text-2xl font-bold text-emerald-400">{reportData?.summary?.resolved_bugs ?? 0}</p>
            </div>
            <div className="panel p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Critical Incidents</p>
              <p className="mt-2 text-2xl font-bold text-red-400">{reportData?.summary?.critical_bugs ?? 0}</p>
            </div>
            <div className="panel p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Resolution Rate</p>
              <p className="mt-2 text-2xl font-bold text-cyan-300">{reportData?.summary?.resolution_rate ?? 0}%</p>
            </div>
            <div className="panel p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Indexed KB Records</p>
              <p className="mt-2 text-2xl font-bold text-violet-300">{reportData?.summary?.kb_entries ?? 0}</p>
            </div>
          </div>

          {/* Key Findings */}
          <section className="panel p-6 space-y-3">
            <p className="section-eyebrow">Executive Insights</p>
            <h3 className="text-sm font-semibold text-slate-200">Key Diagnostic Findings</h3>
            <ul className="mt-3 space-y-2 text-xs leading-6 text-slate-400">
              {(reportData?.findings || []).map((f, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Defect Item Log Table */}
          <div className="panel overflow-hidden">
            <div className="border-b border-white/[0.05] px-6 py-4">
              <p className="section-eyebrow">Audit Stream</p>
              <h3 className="text-sm font-semibold text-slate-200">Defect Roster</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.05] bg-black/20 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3">Case</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Module</th>
                    <th className="px-6 py-3">Diagnosis & Fix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {(reportData?.items || []).map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.01]">
                      <td className="px-6 py-4">
                        <span className="font-mono text-[10px] text-violet-300">#{item.id}</span>
                        <p className="font-medium text-slate-200 mt-0.5">{item.title || 'Untitled'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <SeverityBadge severity={item.severity} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-4 text-slate-400">
                        {item.module || 'Core'}
                      </td>
                      <td className="px-6 py-4 text-slate-400 max-w-md">
                        <p className="text-[11px] text-slate-300 font-medium truncate">{item.root_cause || 'Under diagnosis'}</p>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.recommended_fix || 'Standard remediation'}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
