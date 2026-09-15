import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext.jsx'

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low']
const CATEGORIES = ['Frontend', 'Backend', 'Database', 'Infra', 'API', 'Mobile', 'Security', 'Other']
const LANGUAGES = [
  'Python',
  'JavaScript',
  'TypeScript',
  'Java',
  'C#',
  'C / C++',
  'Go',
  'Rust',
  'SQL',
  'DevOps / Docker',
  'Other',
]

const EMPTY_FORM = {
  title: '',
  description: '',
  language: 'Python',
  category: 'Backend',
  severity: 'Medium',
  tags: '',
  root_cause: '',
  fix_recommendation: '',
}

export default function AddPastDefect() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const canAdd = user?.role === 'Admin' || user?.role === 'Team Lead'

  const update = (key) => (e) =>
    setForm((current) => ({ ...current, [key]: e.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!form.title.trim() || !form.root_cause.trim() || !form.fix_recommendation.trim()) {
      setError('Title, root cause, and fix recommendation are required.')
      return
    }

    setSubmitting(true)
    try {
      const { data } = await client.post('/bugs/manual-resolved', {
        title: form.title.trim(),
        description: form.description.trim(),
        language: form.language,
        category: form.category,
        severity: form.severity,
        tags: form.tags.trim() || undefined,
        root_cause: form.root_cause.trim(),
        fix_recommendation: form.fix_recommendation.trim(),
      })

      setSuccess(`Defect #${data.id} added to the Knowledge Vault.`)
      setForm(EMPTY_FORM)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Could not save this defect. Please make sure the backend is running and try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!canAdd) {
    return (
      <div className="max-w-2xl">
        <section className="panel p-8 text-center">
          <p className="text-sm font-medium text-slate-300">Team Lead / Admin access required</p>
          <p className="mt-2 text-sm text-slate-600">
            Adding historical defects directly to the Knowledge Vault is restricted to Team
            Leads and Admins, since it writes into the team's resolved-defect record without
            going through triage.
          </p>
          <button className="btn-secondary mt-5" onClick={() => navigate('/knowledge-base')}>
            Back to Knowledge Vault
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-cyan-400/10 bg-gradient-to-br from-cyan-400/[0.05] via-[#0b0f1d] to-violet-500/[0.06] p-6 lg:p-7">
        <span className="rounded-full border border-cyan-400/15 bg-cyan-400/[0.06] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-300">
          Historical Intelligence
        </span>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Add a Past Defect
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Register a defect that was already resolved before it was tracked here — migrated
          from a spreadsheet, another tool, or team memory — so it's immediately searchable
          for duplicate detection and root-cause grounding.
        </p>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-400/15 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-300">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <section className="panel space-y-5 p-6">
          <div>
            <label className="label" htmlFor="title">
              Defect title
            </label>
            <input
              id="title"
              className="input-field"
              placeholder="e.g. KeyError in Auth Module"
              value={form.title}
              onChange={update('title')}
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              className="input-field resize-none"
              placeholder="What was happening, when it occurred, and any relevant context."
              value={form.description}
              onChange={update('description')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="language">
                Language / Technology
              </label>
              <select id="language" className="input-field" value={form.language} onChange={update('language')}>
                {LANGUAGES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="category">
                Category
              </label>
              <select id="category" className="input-field" value={form.category} onChange={update('category')}>
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="severity">
                Severity
              </label>
              <select id="severity" className="input-field" value={form.severity} onChange={update('severity')}>
                {SEVERITIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="tags">
              Tags <span className="text-slate-600">(comma-separated, optional)</span>
            </label>
            <input
              id="tags"
              className="input-field"
              placeholder="e.g. auth, race-condition, legacy-migration"
              value={form.tags}
              onChange={update('tags')}
            />
          </div>

          <div>
            <label className="label" htmlFor="root_cause">
              Root cause *
            </label>
            <textarea
              id="root_cause"
              rows={3}
              className="input-field resize-none"
              placeholder="What actually caused this defect?"
              value={form.root_cause}
              onChange={update('root_cause')}
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="fix_recommendation">
              Fix recommendation *
            </label>
            <textarea
              id="fix_recommendation"
              rows={3}
              className="input-field resize-none"
              placeholder="How was it fixed, or how should it be fixed?"
              value={form.fix_recommendation}
              onChange={update('fix_recommendation')}
              required
            />
          </div>
        </section>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={submitting} className="btn-primary min-w-[190px]">
            {submitting ? 'Saving…' : 'Add to Knowledge Vault'}
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/knowledge-base')}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
