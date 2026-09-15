import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import StatusBadge from '../components/StatusBadge.jsx'

export default function DuplicateIssues() {
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const handleCheck = async (e) => {
    e.preventDefault()
    if (!inputText.trim()) return

    setLoading(true)
    setError(null)

    try {
      const { data } = await client.post('/bugs/duplicate-check', {
        text: inputText,
        duplicate_threshold: 0.75,
        similar_threshold: 0.35,
      })
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to analyze semantic duplicates.')
    } finally {
      setLoading(false)
    }
  }

  const handleSampleClick = (sample) => {
    setInputText(sample)
  }

  return (
    <div className="max-w-[1400px] space-y-6">
      {/* Header section */}
      <section className="relative overflow-hidden rounded-3xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.08] via-[#0b0f1d] to-cyan-400/[0.035] p-6 lg:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/[0.08] blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-violet-400/15 bg-violet-500/[0.08] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-violet-300">
                Semantic Vector RAG
              </span>
              <span className="glass-chip">Real-time Cosine Analysis</span>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-white lg:text-3xl">
              Duplicate & Similar Defect Detection
            </h1>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-400">
              Identify recurring bugs, detect duplicate incident submissions, and cross-reference solutions using persistent 384-dimensional semantic embeddings.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/knowledge-base" className="btn-secondary text-xs">
              Knowledge Vault
            </Link>
            <Link to="/submit-bug" className="btn-primary text-xs">
              + Report New Defect
            </Link>
          </div>
        </div>
      </section>

      {/* Main Analysis Form */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_380px]">
        <div className="panel p-6 space-y-5">
          <div className="border-b border-white/[0.05] pb-4">
            <p className="section-eyebrow">Input Payload</p>
            <h2 className="mt-1 text-base font-semibold text-slate-200">
              Query or Defect Description
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Paste an error log, stack trace, or defect summary to compute similarity vectors.
            </p>
          </div>

          <form onSubmit={handleCheck} className="space-y-4">
            <textarea
              rows={6}
              className="input-field font-mono text-xs leading-6"
              placeholder="e.g. TypeError: Cannot read properties of undefined (reading 'token') at AuthGuard.tsx:42"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-slate-600">Sample inputs:</span>
                <button
                  type="button"
                  onClick={() => handleSampleClick("NullPointerException in payment processing webhook handler")}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[11px] text-slate-400 hover:text-violet-300 hover:border-violet-400/20"
                >
                  Payment webhook crash
                </button>
                <button
                  type="button"
                  onClick={() => handleSampleClick("Database connection pool timeout exhausted during peak sync")}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[11px] text-slate-400 hover:text-cyan-300 hover:border-cyan-400/20"
                >
                  DB pool timeout
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="btn-primary min-w-[160px] text-xs"
              >
                {loading ? 'Analyzing vectors…' : 'Scan Duplicates'}
              </button>
            </div>
          </form>

          {error && (
            <div className="rounded-2xl border border-red-400/15 bg-red-500/[0.06] px-4 py-3 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Result Output */}
          {result && (
            <div className="mt-6 border-t border-white/[0.05] pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
                    Detection Summary
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-200">
                    {result.is_likely_duplicate ? (
                      <span className="text-red-400 font-semibold">
                        ⚠️ High Duplicate Probability Detected
                      </span>
                    ) : result.similar_bugs?.length > 0 ? (
                      <span className="text-amber-300 font-semibold">
                        💡 Similar Defect Patterns Found
                      </span>
                    ) : (
                      <span className="text-emerald-300 font-semibold">
                        ✓ Unique Defect — No High-Similarity Matches
                      </span>
                    )}
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[9px] uppercase tracking-wider text-slate-600">Max Similarity</span>
                    <p className="font-mono text-sm font-bold text-violet-300">
                      {result.highest_similarity}%
                    </p>
                  </div>
                </div>
              </div>

              {result.similar_bugs?.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.08] p-6 text-center text-xs text-slate-500">
                  No matching historical defects found in the vector index above the similarity threshold.
                </div>
              ) : (
                <div className="space-y-3">
                  {result.similar_bugs.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-2xl border border-white/[0.06] bg-black/15 p-4 transition-all hover:border-violet-400/20"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-violet-300">
                              #{b.id}
                            </span>
                            <StatusBadge status={b.status} />
                            {b.category && <span className="glass-chip text-[10px]">{b.category}</span>}
                          </div>
                          <h4 className="mt-1.5 truncate text-xs font-semibold text-slate-200">
                            {b.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 rounded-full bg-white/[0.05] overflow-hidden">
                              <div
                                className={`h-full ${
                                  b.similarity_score >= 75
                                    ? 'bg-red-400'
                                    : b.similarity_score >= 50
                                    ? 'bg-amber-400'
                                    : 'bg-cyan-400'
                                }`}
                                style={{ width: `${Math.min(100, b.similarity_score)}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs font-bold text-slate-300">
                              {b.similarity_score}%
                            </span>
                          </div>

                          <Link
                            to={`/bugs/${b.id}`}
                            className="btn-secondary px-2.5 py-1 text-[10px]"
                          >
                            View Case
                          </Link>
                        </div>
                      </div>

                      {b.resolution_notes && (
                        <div className="mt-3 border-t border-white/[0.05] pt-3">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                            className="text-[10px] font-medium text-cyan-300 hover:text-cyan-200"
                          >
                            {expandedId === b.id ? '▼ Hide Knowledge Solution' : '▶ View Verified Fix & Resolution Notes'}
                          </button>
                          {expandedId === b.id && (
                            <div className="mt-2 rounded-xl bg-[#0b0f1d] p-3 text-xs leading-6 text-slate-400 whitespace-pre-wrap font-mono">
                              {b.resolution_notes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-5">
          <section className="panel p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
              Vector Grounding
            </p>
            <h3 className="mt-1 text-sm font-semibold text-slate-200">How It Works</h3>
            <div className="mt-4 space-y-3 text-xs leading-6 text-slate-500">
              <p>
                <strong className="text-slate-300">1. Real-time Embedding:</strong> Transforms text inputs into 384-dimensional dense vectors using MiniLM-L6.
              </p>
              <p>
                <strong className="text-slate-300">2. Cosine Similarity:</strong> Measures high-dimensional angular distance across historical issues and Knowledge Vault entries.
              </p>
              <p>
                <strong className="text-slate-300">3. Resolution Guidance:</strong> Recommends previous successful code patches and prevention tips directly from matching cases.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.04] to-cyan-400/[0.03] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-300">
              Automated Intake Triage
            </p>
            <p className="mt-2 text-xs leading-6 text-slate-400">
              New submissions through the <strong>+ Report Defect</strong> portal are automatically scanned against the persistent vector store during triage.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
