import React, { useEffect, useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import client from '../api/client'

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
)

const SEVERITY_COLORS = {
  Critical: '#f87171',
  High: '#fb923c',
  Medium: '#fbbf24',
  Low: '#64748b',
}

const STATUS_COLORS = {
  Open: '#38bdf8',
  'In Progress': '#a78bfa',
  Resolved: '#34d399',
  Closed: '#64748b',
}

const legendTextColor = '#94a3b8'
const gridColor = 'rgba(148, 163, 184, 0.08)'

function MetricCard({ label, value, helper, tone = 'violet', icon }) {
  const tones = {
    violet:
      'border-violet-400/10 bg-gradient-to-br from-violet-500/[0.10] to-violet-500/[0.025]',
    cyan:
      'border-cyan-400/10 bg-gradient-to-br from-cyan-400/[0.08] to-cyan-400/[0.02]',
    amber:
      'border-amber-400/10 bg-gradient-to-br from-amber-400/[0.08] to-amber-400/[0.02]',
    red:
      'border-red-400/10 bg-gradient-to-br from-red-500/[0.08] to-red-500/[0.02]',
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 ${tones[tone]}`}
    >
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/[0.02] blur-2xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">
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

export default function Analytics() {
  const [summary, setSummary] = useState(null)
  const [health, setHealth] = useState(null)
  const [teamPerf, setTeamPerf] = useState([])
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [summaryRes, healthRes, teamRes, overviewRes] = await Promise.all([
          client.get('/analytics/summary'),
          client.get('/analytics/health-score'),
          client.get('/analytics/team-performance'),
          client.get('/analytics/overview').catch(() => ({ data: null })),
        ])

        if (!cancelled) {
          setSummary(summaryRes.data)
          setHealth(healthRes.data)
          setTeamPerf(teamRes.data)
          setOverview(overviewRes.data)
        }
      } catch (err) {
        if (!cancelled) {
          setError('Could not load analytics data.')
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

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet-400/20 border-t-violet-400" />

        <p className="mt-4 text-sm text-slate-600">
          Loading engineering intelligence...
        </p>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="rounded-2xl border border-red-400/15 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">
        {error || 'No data available.'}
      </div>
    )
  }

  const severityData = {
    labels: summary.by_severity.map((item) => item.label),
    datasets: [
      {
        data: summary.by_severity.map((item) => item.count),
        backgroundColor: summary.by_severity.map(
          (item) => SEVERITY_COLORS[item.label] || '#64748b'
        ),
        borderWidth: 0,
        hoverOffset: 5,
      },
    ],
  }

  const statusData = {
    labels: summary.by_status.map((item) => item.label),
    datasets: [
      {
        data: summary.by_status.map((item) => item.count),
        backgroundColor: summary.by_status.map(
          (item) => STATUS_COLORS[item.label] || '#64748b'
        ),
        borderWidth: 0,
        hoverOffset: 5,
      },
    ],
  }

  const categoryData = {
    labels: summary.by_category.map((item) => item.label),
    datasets: [
      {
        label: 'Cases',
        data: summary.by_category.map((item) => item.count),
        backgroundColor: 'rgba(124, 92, 255, 0.72)',
        borderColor: 'rgba(167, 139, 250, 0.9)',
        borderWidth: 1,
        borderRadius: 7,
        maxBarThickness: 34,
      },
    ],
  }

  const trendData = {
    labels: summary.trend_last_30_days.map((point) =>
      new Date(point.date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    ),

    datasets: [
      {
        label: 'Cases reported',
        data: summary.trend_last_30_days.map((point) => point.count),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(124, 92, 255, 0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#22d3ee',
        borderWidth: 2,
      },
    ],
  }

  const teamData = {
    labels: teamPerf.map((item) => item.label),

    datasets: [
      {
        label: 'Cases resolved',
        data: teamPerf.map((item) => item.count),
        backgroundColor: 'rgba(34, 211, 238, 0.65)',
        borderColor: 'rgba(103, 232, 249, 0.9)',
        borderWidth: 1,
        borderRadius: 7,
        maxBarThickness: 30,
      },
    ],
  }

  const doughnutOptions = {
    maintainAspectRatio: false,

    plugins: {
      legend: {
        position: 'bottom',

        labels: {
          color: legendTextColor,
          boxWidth: 9,
          boxHeight: 9,
          padding: 18,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 10,
          },
        },
      },

      tooltip: {
        backgroundColor: '#0d1120',
        borderColor: 'rgba(148,163,184,0.12)',
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#94a3b8',
        padding: 10,
      },
    },

    cutout: '72%',
  }

  const barOptions = {
    maintainAspectRatio: false,

    plugins: {
      legend: {
        display: false,
      },

      tooltip: {
        backgroundColor: '#0d1120',
        borderColor: 'rgba(148,163,184,0.12)',
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#94a3b8',
      },
    },

    scales: {
      x: {
        ticks: {
          color: legendTextColor,
          font: {
            size: 10,
          },
        },

        grid: {
          display: false,
        },

        border: {
          display: false,
        },
      },

      y: {
        beginAtZero: true,

        ticks: {
          color: legendTextColor,
          precision: 0,
          font: {
            size: 10,
          },
        },

        grid: {
          color: gridColor,
        },

        border: {
          display: false,
        },
      },
    },
  }

  const lineOptions = {
    maintainAspectRatio: false,

    interaction: {
      intersect: false,
      mode: 'index',
    },

    plugins: {
      legend: {
        display: false,
      },

      tooltip: {
        backgroundColor: '#0d1120',
        borderColor: 'rgba(148,163,184,0.12)',
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#94a3b8',
      },
    },

    scales: {
      x: {
        ticks: {
          color: legendTextColor,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
          font: {
            size: 10,
          },
        },

        grid: {
          display: false,
        },

        border: {
          display: false,
        },
      },

      y: {
        beginAtZero: true,

        ticks: {
          color: legendTextColor,
          precision: 0,
          font: {
            size: 10,
          },
        },

        grid: {
          color: gridColor,
        },

        border: {
          display: false,
        },
      },
    },
  }

  const healthColor =
    health?.score >= 70
      ? '#22d3ee'
      : health?.score >= 50
        ? '#fbbf24'
        : health?.score >= 30
          ? '#fb923c'
          : '#f87171'

  return (
    <div className="max-w-[1500px] space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.07] via-[#0b0f1d] to-cyan-400/[0.035] p-6 lg:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/[0.07] blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-violet-400/15 bg-violet-500/[0.08] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-violet-300">
                Engineering Intelligence
              </span>

              <span className="flex items-center gap-1.5 rounded-full border border-cyan-400/10 bg-cyan-400/[0.04] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-cyan-300">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
                Live Metrics
              </span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Engineering Insights
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Explore defect volume, severity distribution, resolution health,
              recurring categories, and team performance across the workspace.
            </p>
          </div>

          {health && (
            <div className="flex items-center gap-4 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
              <div
                className="relative flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(${healthColor} ${health.score * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
                }}
              >
                <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#0d1120]">
                  <span className="text-lg font-semibold text-white">
                    {health.score}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">
                  Project Health
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-200">
                  {health.status}
                </p>

                <p className="mt-0.5 text-[10px] text-slate-600">
                  Overall quality signal
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard
          label="Total Cases"
          value={summary.total_bugs}
          helper="All recorded defects"
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
          value={summary.open_bugs}
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
              <path strokeWidth="1.6" strokeLinecap="round" d="M12 8v5l3 2" />
            </svg>
          }
        />

        <MetricCard
          label="Resolved"
          value={summary.resolved_bugs}
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
          value={summary.critical_bugs}
          helper="High-priority engineering risk"
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
              <path strokeWidth="1.6" strokeLinecap="round" d="M12 9v4M12 16h.01" />
            </svg>
          }
        />

        <MetricCard
          label="Duplicate Rate"
          value={`${overview?.duplicate_rate ?? 0}%`}
          helper="Recurring semantic matches"
          tone="violet"
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-5 w-5 text-violet-300"
            >
              <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 0 0 2 2h6M8 7V5a2 2 0 0 1 2-2h4.586a1 1 0 0 1 .707.293l4.414 4.414a1 1 0 0 1 .293.707V15a2 2 0 0 1-2 2h-2M8 7H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2" />
            </svg>
          }
        />
      </section>

      {health && (
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
                Quality Signal
              </p>

              <h2 className="mt-1 text-sm font-semibold text-slate-200">
                Project Health Analysis
              </h2>
            </div>

            <div className="text-right">
              <p className="text-2xl font-semibold text-white">
                {health.score}
                <span className="ml-1 text-xs font-medium text-slate-600">
                  /100
                </span>
              </p>

              <p className="text-[10px] font-medium text-cyan-300">
                {health.status}
              </p>
            </div>
          </div>

          <div className="p-5">
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.04]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${health.score}%`,
                  background: `linear-gradient(90deg, #8b5cf6, ${healthColor})`,
                }}
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {health.breakdown.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between gap-4 rounded-xl border border-white/[0.05] bg-white/[0.018] p-3.5"
                >
                  <div>
                    <p className="text-xs font-medium text-slate-300">
                      {item.label}
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-slate-600">
                      {item.detail}
                    </p>
                  </div>

                  {item.penalty !== 0 && (
                    <span className="shrink-0 rounded-lg border border-orange-400/10 bg-orange-400/[0.05] px-2 py-1 font-mono text-[10px] text-orange-300">
                      {item.penalty}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="panel p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
              Activity Trend
            </p>

            <h2 className="mt-1 text-sm font-semibold text-slate-200">
              Cases Reported — Last 30 Days
            </h2>
          </div>

          <span className="glass-chip">
            30 day window
          </span>
        </div>

        <div className="h-64">
          <Line data={trendData} options={lineOptions} />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="panel p-5">
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
              Risk Distribution
            </p>

            <h2 className="mt-1 text-sm font-semibold text-slate-200">
              Cases by Severity
            </h2>
          </div>

          <div className="relative h-72">
            <Doughnut data={severityData} options={doughnutOptions} />

            <div className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 text-center">
              <p className="text-2xl font-semibold text-white">
                {summary.total_bugs}
              </p>

              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">
                Cases
              </p>
            </div>
          </div>
        </div>

        <div className="panel p-5">
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
              Lifecycle
            </p>

            <h2 className="mt-1 text-sm font-semibold text-slate-200">
              Cases by Status
            </h2>
          </div>

          <div className="relative h-72">
            <Doughnut data={statusData} options={doughnutOptions} />

            <div className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 text-center">
              <p className="text-2xl font-semibold text-white">
                {resolutionRate}%
              </p>

              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">
                Resolved
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-5">
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
            Defect Surface
          </p>

          <h2 className="mt-1 text-sm font-semibold text-slate-200">
            Cases by Category
          </h2>
        </div>

        <div className="h-72">
          <Bar data={categoryData} options={barOptions} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="panel p-5">
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
              Component Surface
            </p>
            <h2 className="mt-1 text-sm font-semibold text-slate-200">
              Defects by Module
            </h2>
          </div>
          <div className="h-72">
            <Bar
              data={{
                labels: (overview?.modules_data || []).map((m) => m.name),
                datasets: [
                  {
                    label: 'Cases',
                    data: (overview?.modules_data || []).map((m) => m.count),
                    backgroundColor: '#8b5cf6',
                    borderRadius: 6,
                  },
                ],
              }}
              options={barOptions}
            />
          </div>
        </div>

        <div className="panel p-5">
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
              Classification
            </p>
            <h2 className="mt-1 text-sm font-semibold text-slate-200">
              Runtime Error Types
            </h2>
          </div>
          <div className="relative h-72">
            <Doughnut
              data={{
                labels: (overview?.error_types_data || []).map((e) => e.name),
                datasets: [
                  {
                    data: (overview?.error_types_data || []).map((e) => e.value),
                    backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'],
                    borderWidth: 0,
                  },
                ],
              }}
              options={doughnutOptions}
            />
          </div>
        </div>
      </section>

      <section className="panel p-5">
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
            Turnaround
          </p>
          <h2 className="mt-1 text-sm font-semibold text-slate-200">
            Resolution Time Distribution
          </h2>
        </div>
        <div className="h-72">
          <Bar
            data={{
              labels: (overview?.resolution_data || []).map((r) => r.name),
              datasets: [
                {
                  label: 'Resolved Bugs',
                  data: (overview?.resolution_data || []).map((r) => r.count),
                  backgroundColor: '#34d399',
                  borderRadius: 6,
                },
              ],
            }}
            options={barOptions}
          />
        </div>
      </section>

      {teamPerf.length > 0 && (
        <section className="panel p-5">
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
              Team Signal
            </p>

            <h2 className="mt-1 text-sm font-semibold text-slate-200">
              Resolution Performance
            </h2>
          </div>

          <div className="h-72">
            <Bar data={teamData} options={barOptions} />
          </div>
        </section>
      )}
    </div>
  )
}