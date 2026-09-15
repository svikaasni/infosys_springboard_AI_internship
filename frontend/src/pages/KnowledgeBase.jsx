import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import SeverityBadge from '../components/SeverityBadge.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const PAGE_SIZE = 10

export default function KnowledgeBase() {
  const { user } = useAuth()
  const canAddPastDefect = user?.role === 'Admin' || user?.role === 'Team Lead'

  const [entries, setEntries] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [language, setLanguage] = useState('')
  const [languages, setLanguages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data } = await client.get('/knowledge-base', {
        params: {
          page,
          page_size: PAGE_SIZE,
          search: search || undefined,
          language: language || undefined,
        },
      })

      setEntries(data.items)
      setTotal(data.total)
    } catch (err) {
      setError('Could not load the knowledge base.')
    } finally {
      setLoading(false)
    }
  }, [page, search, language])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    client
      .get('/knowledge-base/languages')
      .then(({ data }) => setLanguages(data))
      .catch(() => setLanguages([]))
  }, [])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="max-w-[1500px] space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-cyan-400/10 bg-gradient-to-br from-cyan-400/[0.05] via-[#0b0f1d] to-violet-500/[0.06] p-6 lg:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/[0.06] blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-400/15 bg-cyan-400/[0.06] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                Historical Intelligence
              </span>

              <span className="glass-chip">
                {loading ? 'Loading memory' : `${total} validated cases`}
              </span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Knowledge Vault
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              A reusable memory of resolved defects, verified fixes, and historical
              evidence used to strengthen duplicate detection and root-cause analysis.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[0.05]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="h-5 w-5 text-cyan-300"
                >
                  <ellipse cx="12" cy="5" rx="7" ry="3" strokeWidth="1.6" />
                  <path
                    strokeWidth="1.6"
                    d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"
                  />
                </svg>
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-600">
                  Learning Source
                </p>
                <p className="mt-0.5 text-xs font-medium text-slate-300">
                  Resolved cases only
                </p>
              </div>
            </div>

            {canAddPastDefect && (
              <Link to="/knowledge-base/add" className="btn-primary whitespace-nowrap">
                + Add Past Defect
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="panel space-y-3 p-4">
        <div className="relative">
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
            placeholder="Search historical bugs, fixes, projects, or root causes..."
            value={search}
            onChange={(e) => {
              setPage(1)
              setSearch(e.target.value)
            }}
          />
        </div>

        {languages.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
              Language
            </span>

            <button
              className={`glass-chip transition-colors ${language === '' ? 'border-cyan-400/30 text-cyan-300' : ''}`}
              onClick={() => {
                setPage(1)
                setLanguage('')
              }}
            >
              All
            </button>

            {languages.map((lang) => (
              <button
                key={lang}
                className={`glass-chip transition-colors ${language === lang ? 'border-cyan-400/30 text-cyan-300' : ''}`}
                onClick={() => {
                  setPage(1)
                  setLanguage(lang)
                }}
              >
                {lang}
              </button>
            ))}
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-2xl border border-red-400/15 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <section className="panel px-6 py-16 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />

          <p className="mt-4 text-sm text-slate-600">
            Loading historical intelligence...
          </p>
        </section>
      ) : entries.length === 0 ? (
        <section className="panel px-6 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.04]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-5 w-5 text-cyan-300"
            >
              <ellipse cx="12" cy="5" rx="7" ry="3" strokeWidth="1.6" />
              <path
                strokeWidth="1.6"
                d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5"
              />
            </svg>
          </div>

          <p className="mt-4 text-sm font-medium text-slate-400">
            {search
              ? 'No historical cases match this search.'
              : 'The knowledge vault is empty.'}
          </p>

          <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-slate-600">
            Resolve a bug and record its resolution knowledge to make it
            available for future duplicate detection and grounded root-cause analysis.
          </p>
        </section>
      ) : (
        <section className="space-y-4">
          {entries.map((entry) => (
            <Link
              key={entry.id}
              to={`/bugs/${entry.id}`}
              className="group panel block overflow-hidden transition-all hover:border-cyan-400/15"
            >
              <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
                <div className="p-5 lg:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-lg border border-white/[0.05] bg-white/[0.025] px-2 py-1 font-mono text-[9px] text-slate-600">
                          CASE #{entry.id}
                        </span>

                        {entry.category && (
                          <span className="glass-chip">
                            {entry.category}
                          </span>
                        )}

                        {entry.language && (
                          <span className="rounded-full border border-violet-400/15 bg-violet-500/[0.06] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-violet-300">
                            {entry.language}
                          </span>
                        )}

                        {entry.project && (
                          <span className="glass-chip">
                            {entry.project}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-semibold text-slate-100 transition-colors group-hover:text-white">
                        {entry.title}
                      </h3>
                    </div>

                    <SeverityBadge severity={entry.severity} />
                  </div>

                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                    {entry.description}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-3 text-[10px] text-slate-600">
                    {entry.resolved_at && (
                      <span>
                        Resolved {new Date(entry.resolved_at).toLocaleDateString()}
                      </span>
                    )}

                    {entry.category && (
                      <>
                        <span className="h-1 w-1 rounded-full bg-slate-700" />
                        <span>{entry.category}</span>
                      </>
                    )}

                    <span className="ml-auto hidden items-center gap-1 text-cyan-300 transition-transform group-hover:translate-x-1 sm:flex">
                      Open case
                      <span>→</span>
                    </span>
                  </div>
                </div>

                <div className="border-t border-white/[0.05] bg-gradient-to-br from-cyan-400/[0.035] to-violet-500/[0.025] p-5 lg:border-l lg:border-t-0 lg:p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-400/10 bg-cyan-400/[0.05]">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className="h-3.5 w-3.5 text-cyan-300"
                      >
                        <path
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m7 12 3 3 7-7"
                        />
                      </svg>
                    </div>

                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">
                      Validated Resolution
                    </p>
                  </div>

                  <p className="text-xs leading-6 text-slate-400">
                    {entry.resolution_notes}
                  </p>

                  <div className="mt-4 border-t border-white/[0.05] pt-3">
                    <p className="text-[9px] uppercase tracking-[0.14em] text-slate-700">
                      Available to AI agents
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full border border-violet-400/10 bg-violet-500/[0.05] px-2 py-1 text-[9px] text-violet-300">
                        Duplicate Search
                      </span>

                      <span className="rounded-full border border-cyan-400/10 bg-cyan-400/[0.04] px-2 py-1 text-[9px] text-cyan-300">
                        Root Cause
                      </span>

                      <span className="rounded-full border border-violet-400/10 bg-violet-500/[0.05] px-2 py-1 text-[9px] text-violet-300">
                        Fix Guidance
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}

          <div className="panel flex flex-col gap-3 px-5 py-4 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {total} historical entr{total === 1 ? 'y' : 'ies'}
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
      )}
    </div>
  )
}