import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext.jsx'
import SeverityBadge from '../components/SeverityBadge.jsx'
import StatusBadge from '../components/StatusBadge.jsx'

function MetricCard({ label, value, helper, tone = 'violet', icon }) {
  const tones = {
    violet: 'from-violet-500/15 to-violet-500/[0.03] border-violet-400/10 text-violet-300',
    cyan: 'from-cyan-400/15 to-cyan-400/[0.03] border-cyan-400/10 text-cyan-300',
    amber: 'from-amber-400/15 to-amber-400/[0.03] border-amber-400/10 text-amber-300',
    red: 'from-red-500/15 to-red-500/[0.03] border-red-400/10 text-red-300',
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 ${tones[tone]}`}>
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/[0.02] blur-2xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
            {label}
          </p>

          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {value}
          </p>

          <p className="mt-1.5 text-[11px] text-slate-600">
            {helper}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.05] bg-white/[0.025]">
          {icon}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()

  const [summary, setSummary] = useState(null)
  const [recentBugs, setRecentBugs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [summaryRes, bugsRes] = await Promise.all([
          client.get('/analytics/summary'),
          client.get('/bugs', {
            params: {
              page: 1,
              page_size: 6,
            },
          }),
        ])

        if (!cancelled) {
          setSummary(summaryRes.data)
          setRecentBugs(bugsRes.data.items)
        }
      } catch (err) {
        if (!cancelled) {
          setError('Could not load dashboard data. Is the backend running?')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  const resolutionRate = useMemo(() => {
    if (!summary?.total_bugs) return 0

    return Math.round(
      ((summary.resolved_bugs || 0) / summary.total_bugs) * 100
    )
  }, [summary])

  const firstName = user?.full_name?.split(' ')[0] || 'Developer'

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.09] via-[#0c1020] to-cyan-400/[0.035] p-6 lg:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-120px] left-[25%] h-56 w-56 rounded-full bg-cyan-400/[0.06] blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full border border-violet-400/15 bg-violet-500/[0.08] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-violet-300">
                Diagnostic Command Center
              </span>

              <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/10 bg-emerald-400/[0.05] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                Systems Operational
              </span>
            </div>

            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Welcome back, {firstName}
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
              Monitor defect activity, launch AI-assisted investigations, and
              track engineering risk from one workspace.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/submit-bug"
              className="btn-primary"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3l1.4 4L17 8.4l-3.6 1.4L12 14l-1.4-4.2L7 8.4 10.6 7 12 3Z"
                />
                <path
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 15v6M15 18h6"
                />
              </svg>

              Start Diagnosis
            </Link>

            <Link
              to="/analytics"
              className="btn-secondary"
            >
              View Insights
            </Link>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-400/15 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricCard
          label="Total Cases"
          value={loading ? '—' : summary?.total_bugs ?? 0}
          helper="All reported defects"
          tone="violet"
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-5 w-5 text-violet-300"
            >
              <rect x="4" y="4" width="16" height="16" rx="3" strokeWidth="1.6" />
              <path strokeWidth="1.6" d="M8 9h8M8 13h8M8 17h5" />
            </svg>
          }
        />

        <MetricCard
          label="Active Queue"
          value={loading ? '—' : summary?.open_bugs ?? 0}
          helper="Awaiting resolution"
          tone="amber"
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-5 w-5 text-amber-300"
            >
              <circle cx="12" cy="12" r="8" strokeWidth="1.6" />
              <path
                strokeWidth="1.6"
                strokeLinecap="round"
                d="M12 8v5l3 2"
              />
            </svg>
          }
        />

        <MetricCard
          label="Resolved"
          value={loading ? '—' : summary?.resolved_bugs ?? 0}
          helper={`${resolutionRate}% closure rate`}
          tone="cyan"
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-5 w-5 text-cyan-300"
            >
              <circle cx="12" cy="12" r="8" strokeWidth="1.6" />
              <path
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m8.5 12 2.2 2.2 4.8-5"
              />
            </svg>
          }
        />

        <MetricCard
          label="Critical Risk"
          value={loading ? '—' : summary?.critical_bugs ?? 0}
          helper="Requires immediate attention"
          tone="red"
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-5 w-5 text-red-300"
            >
              <path
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3 3.5 19h17L12 3Z"
              />
              <path
                strokeWidth="1.6"
                strokeLinecap="round"
                d="M12 9v4M12 16h.01"
              />
            </svg>
          }
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.65fr_0.85fr]">
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
                Live Queue
              </p>

              <h3 className="mt-1 text-sm font-semibold text-slate-200">
                Recent Diagnostic Cases
              </h3>
            </div>

            <Link
              to="/bugs"
              className="rounded-lg border border-violet-400/10 bg-violet-500/[0.04] px-3 py-1.5 text-xs font-medium text-violet-300 transition-colors hover:bg-violet-500/[0.08]"
            >
              Open history
            </Link>
          </div>

          {loading ? (
            <div className="px-5 py-14 text-center text-sm text-slate-600">
              Loading recent cases…
            </div>
          ) : recentBugs.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/10 bg-violet-500/[0.05]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="h-5 w-5 text-violet-300"
                >
                  <path
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 5v14M5 12h14"
                  />
                </svg>
              </div>

              <p className="mt-3 text-sm text-slate-400">
                No diagnostic cases yet.
              </p>

              <Link
                to="/submit-bug"
                className="btn-primary mt-4 inline-flex"
              >
                Launch first diagnosis
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.045]">
              {recentBugs.map((bug) => (
                <Link
                  key={bug.id}
                  to={`/bugs/${bug.id}`}
                  className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-violet-500/[0.025]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.05] bg-white/[0.025] font-mono text-[11px] text-slate-500 transition-colors group-hover:border-violet-400/10 group-hover:text-violet-300">
                      #{bug.id}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200 transition-colors group-hover:text-white">
                        {bug.title}
                      </p>

                      <p className="mt-1 truncate text-[11px] text-slate-600">
                        Reporter: {bug.reporter.full_name}
                        {bug.project ? ` · ${bug.project}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <SeverityBadge severity={bug.severity} />
                    <StatusBadge status={bug.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="panel p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
                  Resolution Signal
                </p>

                <h3 className="mt-1 text-sm font-semibold text-slate-200">
                  Engineering Health
                </h3>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[0.05]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="h-4 w-4 text-cyan-300"
                >
                  <path
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m4 15 4-4 3 3 6-7 3 3"
                  />
                </svg>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-semibold tracking-tight text-white">
                    {loading ? '—' : `${resolutionRate}%`}
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    Cases successfully resolved
                  </p>
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.04]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${resolutionRate}%` }}
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                  Resolved
                </p>

                <p className="mt-1 text-lg font-semibold text-cyan-300">
                  {loading ? '—' : summary?.resolved_bugs ?? 0}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                  Open
                </p>

                <p className="mt-1 text-lg font-semibold text-amber-300">
                  {loading ? '—' : summary?.open_bugs ?? 0}
                </p>
              </div>
            </div>
          </div>

          <div className="panel p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
              Quick Actions
            </p>

            <div className="mt-4 space-y-2.5">
              <Link
                to="/submit-bug"
                className="group flex items-center justify-between rounded-xl border border-violet-400/10 bg-violet-500/[0.04] px-4 py-3 transition-colors hover:bg-violet-500/[0.08]"
              >
                <div>
                  <p className="text-sm font-medium text-slate-200 group-hover:text-white">
                    Run AI Diagnosis
                  </p>

                  <p className="mt-0.5 text-[11px] text-slate-600">
                    Analyze code, logs, traces, or reports
                  </p>
                </div>

                <span className="text-violet-300">→</span>
              </Link>

              <Link
                to="/knowledge-base"
                className="group flex items-center justify-between rounded-xl border border-cyan-400/10 bg-cyan-400/[0.035] px-4 py-3 transition-colors hover:bg-cyan-400/[0.07]"
              >
                <div>
                  <p className="text-sm font-medium text-slate-200 group-hover:text-white">
                    Search Knowledge Vault
                  </p>

                  <p className="mt-0.5 text-[11px] text-slate-600">
                    Review resolved cases and proven fixes
                  </p>
                </div>

                <span className="text-cyan-300">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}