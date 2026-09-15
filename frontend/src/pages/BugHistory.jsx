import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import SeverityBadge from '../components/SeverityBadge.jsx'
import StatusBadge from '../components/StatusBadge.jsx'

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low']
const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed']
const PAGE_SIZE = 10

export default function BugHistory() {
  const [bugs, setBugs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [severity, setSeverity] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data } = await client.get('/bugs', {
        params: {
          page,
          page_size: PAGE_SIZE,
          search: search || undefined,
          severity: severity || undefined,
          status: status || undefined,
        },
      })

      setBugs(data.items)
      setTotal(data.total)
    } catch (err) {
      setError('Could not load bug history.')
    } finally {
      setLoading(false)
    }
  }, [page, search, severity, status])

  useEffect(() => {
    load()
  }, [load])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const clearFilters = () => {
    setPage(1)
    setSearch('')
    setSeverity('')
    setStatus('')
  }

  const hasFilters = search || severity || status

  return (
    <div className="max-w-[1500px] space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.07] via-[#0b0f1d] to-cyan-400/[0.03] p-6 lg:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/[0.07] blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-violet-400/15 bg-violet-500/[0.08] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-violet-300">
                Case Intelligence
              </span>

              <span className="glass-chip">
                {loading ? 'Loading cases' : `${total} total cases`}
              </span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Investigation Archive
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Search previously diagnosed defects, inspect historical evidence,
              and reopen cases for deeper analysis.
            </p>
          </div>

          <Link
            to="/submit-bug"
            className="btn-primary shrink-0"
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
                d="M12 5v14M5 12h14"
              />
            </svg>

            New Diagnosis
          </Link>
        </div>
      </section>

      <section className="panel p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-[240px] flex-1">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600"
            >
              <path
                strokeWidth="1.6"
                strokeLinecap="round"
                d="m21 21-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
              />
            </svg>

            <input
              className="input-field pl-10"
              placeholder="Search title or description..."
              value={search}
              onChange={(e) => {
                setPage(1)
                setSearch(e.target.value)
              }}
            />
          </div>

          <select
            className="input-field xl:w-[185px]"
            value={severity}
            onChange={(e) => {
              setPage(1)
              setSeverity(e.target.value)
            }}
          >
            <option value="">All severities</option>

            {SEVERITIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            className="input-field xl:w-[185px]"
            value={status}
            onChange={(e) => {
              setPage(1)
              setStatus(e.target.value)
            }}
          >
            <option value="">All statuses</option>

            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              type="button"
              className="btn-secondary shrink-0 text-xs"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-400/15 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
              Diagnostic Cases
            </p>

            <h2 className="mt-1 text-sm font-semibold text-slate-200">
              Investigation Records
            </h2>
          </div>

          <div className="hidden items-center gap-2 text-[10px] text-slate-600 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            Live archive
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet-400/20 border-t-violet-400" />

            <p className="mt-4 text-sm text-slate-600">
              Loading investigation records...
            </p>
          </div>
        ) : bugs.length === 0 ? (
          <div className="px-6 py-16 text-center">
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
                  d="M4 6h16M4 12h16M4 18h10"
                />
              </svg>
            </div>

            <p className="mt-4 text-sm font-medium text-slate-400">
              No matching cases found.
            </p>

            <p className="mt-1 text-xs text-slate-600">
              Adjust your filters or create a new diagnosis.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.045]">
            {bugs.map((bug) => (
              <Link
                key={bug.id}
                to={`/bugs/${bug.id}`}
                className="group block px-5 py-4 transition-colors hover:bg-violet-500/[0.025]"
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_140px_110px_140px_130px] lg:items-center">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.05] bg-white/[0.025] font-mono text-[10px] text-slate-600 transition-all group-hover:border-violet-400/15 group-hover:bg-violet-500/[0.05] group-hover:text-violet-300">
                      #{bug.id}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-200 transition-colors group-hover:text-white">
                        {bug.title}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-600">
                        <span>
                          {bug.category || 'Uncategorized'}
                        </span>

                        {bug.project && (
                          <>
                            <span>•</span>
                            <span>{bug.project}</span>
                          </>
                        )}

                        {bug.module && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{bug.module}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-700 lg:hidden">
                      Severity
                    </p>
                    <SeverityBadge severity={bug.severity} />
                  </div>

                  <div>
                    <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-700 lg:hidden">
                      Priority
                    </p>

                    <span className="inline-flex rounded-lg border border-white/[0.05] bg-white/[0.025] px-2.5 py-1 font-mono text-xs text-slate-400">
                      {bug.priority}
                    </span>
                  </div>

                  <div>
                    <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-700 lg:hidden">
                      Status
                    </p>
                    <StatusBadge status={bug.status} />
                  </div>

                  <div className="flex items-center justify-between gap-3 lg:justify-end">
                    <div>
                      <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-700 lg:hidden">
                        Reported
                      </p>

                      <p className="text-xs text-slate-600">
                        {new Date(bug.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className="h-4 w-4 text-slate-700 transition-all group-hover:translate-x-1 group-hover:text-violet-300"
                    >
                      <path
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m9 18 6-6-6-6"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-white/[0.05] px-5 py-4 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {total === 0
              ? 'No results'
              : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                  page * PAGE_SIZE,
                  total
                )} of ${total}`}
          </span>

          <div className="flex items-center gap-2">
            <button
              className="btn-secondary px-3 py-1.5 text-xs"
              disabled={page <= 1}
              onClick={() =>
                setPage((current) => Math.max(1, current - 1))
              }
            >
              Previous
            </button>

            <span className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 font-mono text-[10px] text-slate-500">
              {page} / {totalPages}
            </span>

            <button
              className="btn-secondary px-3 py-1.5 text-xs"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) =>
                  Math.min(totalPages, current + 1)
                )
              }
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}