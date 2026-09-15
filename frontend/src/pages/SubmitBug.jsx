import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low']
const PRIORITIES = ['P0', 'P1', 'P2', 'P3']
const CATEGORIES = ['Frontend', 'Backend', 'Database', 'Infra', 'API', 'Mobile', 'Security', 'Other']
const LANGUAGES = ['Auto Detect', 'Python', 'JavaScript', 'TypeScript', 'Java', 'C', 'C++', 'Go', 'Rust', 'SQL', 'Other']

const SAMPLE_BUGS = [
  {
    title: 'ZeroDivisionError in calculation service',
    description: 'The calculation service crashes when the denominator is zero. The failure occurs while executing the divide function.',
    stack_trace: `Traceback (most recent call last):\n  File "calculator.py", line 24, in divide\n    return a / b\nZeroDivisionError: division by zero`,
    category: 'Backend', module: 'calculation-service', project: 'BugSense Demo',
    severity: 'High', priority: 'P1', language: 'Python',
    sourceCode: `def divide(a, b):\n    return a / b\n\nprint(divide(10, 0))`,
  },
  {
    title: 'NullPointerException in UserService after OAuth token refresh',
    description: 'All users are unable to fetch their profile after an OAuth token refresh. The service crashes with a NullPointerException when accessing accountId.',
    stack_trace: `NullPointerException at UserService.java:142\n  at com.app.service.UserService.getProfile(UserService.java:142)\n  at com.app.controller.UserController.fetchUser(UserController.java:67)\nCaused by: java.lang.NullPointerException\n  -- user.getAccountId() returned null after OAuth token refresh`,
    category: 'Backend', module: 'auth-service', project: 'BugSense Demo',
    severity: 'Critical', priority: 'P0', language: 'Java',
    sourceCode: '',
  },
  {
    title: 'Database connection pool exhausted under load',
    description: 'The API returns 500 errors for all requests during peak traffic. Investigation shows all connections in the HikariCP pool are exhausted.',
    stack_trace: `TimeoutException: Unable to acquire connection from pool after 30000ms\n  at com.zaxxer.hikari.pool.HikariPool.getConnection(HikariPool.java:213)\n  at com.zaxxer.hikari.HikariDataSource.getConnection(HikariDataSource.java:128)\nCaused by: Connection pool exhausted -- max-size=10`,
    category: 'Database', module: 'core-api', project: 'BugSense Demo',
    severity: 'Critical', priority: 'P0', language: 'Java',
    sourceCode: '',
  },
  {
    title: 'React TypeError on null user profile after logout',
    description: 'The frontend crashes with a TypeError when a user logs out and back in. The Redux store retains the old user object.',
    stack_trace: `TypeError: Cannot read properties of null (reading 'displayName')\n    at UserProfile (UserProfile.jsx:34)\n    at renderWithHooks (react-dom.development.js:14985)\n  -- user object is null after logout, Redux store not cleared`,
    category: 'Frontend', module: 'user-profile', project: 'BugSense Demo',
    severity: 'High', priority: 'P1', language: 'JavaScript',
    sourceCode: '',
  },
]
const SAMPLE_BUG = SAMPLE_BUGS[0]

export default function SubmitBug() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [mode, setMode] = useState('report')
  const [form, setForm] = useState({
    title: '',
    description: '',
    stack_trace: '',
    category: 'Backend',
    module: '',
    project: '',
    tags: '',
    severity: 'Medium',
    priority: 'P2',
  })

  // Novel Integration: Neural Agent Tuning & Dry-Run
  const [aiModel, setAiModel] = useState('Nexus-Pro')
  const [temperature, setTemperature] = useState(0.7)
  const [topP, setTopP] = useState(0.9)
  const [deepReasoning, setDeepReasoning] = useState(true)
  const [dryRunning, setDryRunning] = useState(false)
  const [dryRunResult, setDryRunResult] = useState(null)
  const [showDryRunModal, setShowDryRunModal] = useState(false)
  const [dryRunCodeMode, setDryRunCodeMode] = useState('diff')

  const [language, setLanguage] = useState('Auto Detect')
  const [sourceCode, setSourceCode] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileContent, setFileContent] = useState('')
  const [pastedImage, setPastedImage] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile()
          if (file) {
            const reader = new FileReader()
            reader.onload = (event) => {
              setPastedImage({
                name: `screenshot_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`,
                dataUrl: event.target.result,
                file,
              })
            }
            reader.readAsDataURL(file)
            break
          }
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  const update = (key) => (e) =>
    setForm((current) => ({
      ...current,
      [key]: e.target.value,
    }))

  const inputSummary = useMemo(() => {
    const items = []

    if (form.description.trim()) items.push('description')
    if (form.stack_trace.trim()) items.push('logs')
    if (sourceCode.trim()) items.push('source code')
    if (selectedFile) items.push('file')
    if (pastedImage) items.push('screenshot')

    return items.length ? items.join(' + ') : 'waiting for input'
  }, [form.description, form.stack_trace, sourceCode, selectedFile, pastedImage])

  const handleSample = (bug = SAMPLE_BUG) => {
    setMode('code')
    setForm({
      title: bug.title,
      description: bug.description,
      stack_trace: bug.stack_trace,
      category: bug.category,
      module: bug.module || '',
      project: bug.project || '',
      tags: '',
      severity: bug.severity,
      priority: bug.priority,
    })
    setLanguage(bug.language || 'Auto Detect')
    setSourceCode(bug.sourceCode || '')
    setSelectedFile(null)
    setFileContent('')
    setPastedImage(null)
    setError(null)
  }

  const handleClear = () => {
    setMode('report')
    setForm({
      title: '',
      description: '',
      stack_trace: '',
      category: 'Backend',
      module: '',
      project: '',
      tags: '',
      severity: 'Medium',
      priority: 'P2',
    })
    setLanguage('Auto Detect')
    setSourceCode('')
    setSelectedFile(null)
    setFileContent('')
    setPastedImage(null)
    setError(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const processFile = async (file) => {
    if (!file) return

    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name)
    if (isImage) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Please choose an image smaller than 10 MB.')
        return
      }
      const reader = new FileReader()
      reader.onload = (event) => {
        setPastedImage({
          name: file.name,
          dataUrl: event.target.result,
          file,
        })
      }
      reader.readAsDataURL(file)
      setError(null)
      return
    }

    const allowedExtensions = ['txt', 'log', 'json', 'xml', 'csv', 'py', 'js', 'jsx', 'ts', 'tsx', 'java', 'c', 'cpp']
    const extension = file.name.split('.').pop()?.toLowerCase()

    if (!allowedExtensions.includes(extension)) {
      setError(
        'Supported file types: text/code files (.txt, .log, .json, .py, .js, etc.) or screenshot images (.png, .jpg).'
      )
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Please choose a file smaller than 5 MB.')
      return
    }

    try {
      const text = await file.text()
      setSelectedFile(file)
      setFileContent(text)
      setError(null)
    } catch {
      setError('Could not read this file. Please paste its contents manually.')
    }
  }

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    if (file) {
      await processFile(file)
    }
  }

  const buildDescription = () => {
    const parts = [form.description.trim()]

    if (mode === 'code' && sourceCode.trim()) {
      parts.push(
        `Programming Language: ${language}`,
        `Source Code:\n${sourceCode.trim()}`
      )
    }

    if (selectedFile && fileContent.trim()) {
      parts.push(
        `Uploaded File: ${selectedFile.name}`,
        `Uploaded File Content:\n${fileContent.trim()}`
      )
    }

    return parts.filter(Boolean).join('\n\n')
  }

  const buildStackTrace = () => {
    const parts = []

    if (form.stack_trace.trim()) {
      parts.push(form.stack_trace.trim())
    }

    if (mode === 'code' && sourceCode.trim()) {
      parts.push(`--- SOURCE CODE ---\n${sourceCode.trim()}`)
    }

    return parts.join('\n\n')
  }

  const handleDryRun = async () => {
    if (!form.title.trim()) {
      setError('Please enter a bug title before running a dry-run scan.')
      return
    }
    if (!form.description.trim() && !sourceCode.trim() && !fileContent.trim()) {
      setError('Please provide a description, source code, or file before running a dry-run scan.')
      return
    }

    setDryRunning(true)
    setError(null)
    try {
      const payload = {
        title: form.title.trim(),
        description: buildDescription(),
        stack_trace: buildStackTrace() || '',
        category: form.category,
        ai_model: aiModel,
        temperature,
        top_p: topP,
        deep_reasoning: deepReasoning,
      }
      const { data } = await client.post('/bugs/dry-run', payload)
      setDryRunResult(data)
      setShowDryRunModal(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Dry-run analysis failed. Please check backend connection.')
    } finally {
      setDryRunning(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)

    if (!form.title.trim()) {
      setError('Please enter a bug title.')
      return
    }

    if (!form.description.trim() && !sourceCode.trim() && !fileContent.trim() && !pastedImage) {
      setError('Please provide a bug description, source code, screenshot, or an input file.')
      return
    }

    setSubmitting(true)

    try {
      const payload = {
        title: form.title.trim(),
        description: buildDescription(),
        stack_trace: buildStackTrace() || undefined,
        category: form.category,
        module: form.module.trim() || undefined,
        project: form.project.trim() || undefined,
        language: mode === 'code' && language !== 'Auto Detect' ? language : undefined,
        tags: form.tags.trim() || undefined,
        severity: form.severity,
        priority: form.priority,
      }

      const { data } = await client.post('/bugs', payload)

      if (pastedImage?.file) {
        try {
          const formData = new FormData()
          formData.append('file', pastedImage.file)
          await client.post(`/bugs/${data.id}/attachments`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        } catch (uploadErr) {
          console.warn('Screenshot upload notice:', uploadErr)
        }
      }

      // Pre-run analysis with user's tuned hyperparameters
      try {
        await client.post(`/bugs/${data.id}/analyze`, {
          ai_model: aiModel,
          temperature,
          top_p: topP,
          deep_reasoning: deepReasoning,
        })
      } catch (analyzeErr) {
        console.warn('Analysis pre-run notice:', analyzeErr)
      }

      navigate(`/bugs/${data.id}`)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Could not create this diagnosis. Please make sure the backend is running and try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-[1500px]">
      <div className="mb-7 overflow-hidden rounded-3xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.08] via-[#0b0f1d] to-cyan-400/[0.035]">
        <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
          <div className="p-6 lg:p-7">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-violet-400/15 bg-violet-500/[0.08] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-violet-300">
                Diagnostic Lab
              </span>

              <span className="flex items-center gap-1.5 rounded-full border border-cyan-400/10 bg-cyan-400/[0.045] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-300">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
                5 Agents Ready
              </span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Launch a new diagnosis
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Feed BugSense AI a report, source file, stack trace, or raw code.
              The case is stored first, then the multi-agent engine performs
              triage, log analysis, duplicate search, root-cause analysis, and remediation.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="glass-chip">Source-aware</span>
              <span className="glass-chip">Historical matching</span>
              <span className="glass-chip">Risk scoring</span>
              <span className="glass-chip">Root-cause grounding</span>
            </div>
          </div>

          <div className="border-t border-white/[0.05] bg-white/[0.015] p-6 lg:border-l lg:border-t-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
              Session Controls
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Load a sample case to demo the complete diagnosis flow instantly.
            </p>

            <div className="mt-3 flex flex-col gap-1.5">
              {SAMPLE_BUGS.map((bug, i) => (
                <button
                  key={i}
                  type="button"
                  className="text-left text-xs px-2.5 py-1.5 rounded border border-slate-600 text-slate-300 hover:border-blue-500 hover:text-blue-400 transition-colors"
                  onClick={() => handleSample(bug)}
                  disabled={submitting}
                >
                  {bug.title.length > 40 ? bug.title.slice(0, 40) + '...' : bug.title}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleSample()}
                disabled={submitting}
              >
                Load demo case
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={handleClear}
                disabled={submitting}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-red-400/15 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="panel overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-white/[0.05] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="section-eyebrow">01 / Intake</p>
                  <h2 className="mt-1.5 text-base font-semibold text-slate-100">
                    Diagnostic Input
                  </h2>
                  <p className="mt-1 text-xs text-slate-600">
                    Select the type of evidence you want to analyze.
                  </p>
                </div>

                <div className="inline-flex rounded-xl border border-white/[0.06] bg-black/20 p-1">
                  <button
                    type="button"
                    onClick={() => setMode('report')}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                      mode === 'report'
                        ? 'bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/15'
                        : 'text-slate-500 hover:bg-white/[0.03] hover:text-slate-200'
                    }`}
                  >
                    Bug Report
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('code')}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                      mode === 'code'
                        ? 'bg-cyan-400/[0.10] text-cyan-200 ring-1 ring-cyan-400/15'
                        : 'text-slate-500 hover:bg-white/[0.03] hover:text-slate-200'
                    }`}
                  >
                    Source Code
                  </button>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <div>
                  <label className="label" htmlFor="title">
                    Case title
                  </label>
                  <input
                    id="title"
                    className="input-field"
                    placeholder="e.g. Checkout crashes when payment API times out"
                    value={form.title}
                    onChange={update('title')}
                  />
                </div>

                <div>
                  <label className="label" htmlFor="description">
                    Incident description
                  </label>
                  <textarea
                    id="description"
                    rows={5}
                    className="input-field resize-none"
                    placeholder="Describe what happened, the expected behaviour, reproduction steps, and relevant context."
                    value={form.description}
                    onChange={update('description')}
                  />
                </div>

                {mode === 'code' && (
                  <div className="terminal-panel overflow-hidden">
                    <div className="flex flex-col gap-3 border-b border-white/[0.05] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                        <span className="ml-2 text-[10px] font-mono uppercase tracking-[0.12em] text-slate-600">
                          source.input
                        </span>
                      </div>

                      <select
                        id="language"
                        className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 outline-none"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                      >
                        {LANGUAGES.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>

                    <textarea
                      id="sourceCode"
                      rows={15}
                      spellCheck={false}
                      className="w-full resize-y bg-transparent px-4 py-4 font-mono text-xs leading-6 text-slate-300 outline-none placeholder:text-slate-700"
                      placeholder={`def divide(a, b):
    return a / b

print(divide(10, 0))`}
                      value={sourceCode}
                      onChange={(e) => setSourceCode(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <label className="label" htmlFor="stack_trace">
                    Runtime evidence
                  </label>

                  <div className="terminal-panel overflow-hidden">
                    <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
                      <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-slate-600">
                        error.log
                      </span>

                      <span className="text-[10px] font-mono text-cyan-400/70">
                        parser-ready
                      </span>
                    </div>

                    <textarea
                      id="stack_trace"
                      rows={9}
                      spellCheck={false}
                      className="w-full resize-y bg-transparent px-4 py-4 font-mono text-xs leading-6 text-slate-300 outline-none placeholder:text-slate-700"
                      placeholder={`Traceback (most recent call last):
  File "service.py", line 42, in process
    ...
RuntimeError: example failure`}
                      value={form.stack_trace}
                      onChange={update('stack_trace')}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="project">
                      Project
                    </label>
                    <input
                      id="project"
                      className="input-field"
                      placeholder="e.g. Storefront"
                      value={form.project}
                      onChange={update('project')}
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor="module">
                      Component / module
                    </label>
                    <input
                      id="module"
                      className="input-field"
                      placeholder="e.g. payment-service"
                      value={form.module}
                      onChange={update('module')}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="panel p-6">
              <div className="mb-5">
                <p className="section-eyebrow">02 / Evidence</p>
                <h2 className="mt-1.5 text-base font-semibold text-slate-100">
                  Supporting Files & Screenshots
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Drag and drop files, browse from device, or press <kbd className="rounded border border-white/[0.1] bg-white/[0.05] px-1 py-0.5 font-mono text-[10px] text-violet-300">Ctrl+V</kbd> to paste screenshots.
                </p>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  const file = e.dataTransfer?.files?.[0]
                  if (file) processFile(file)
                }}
                className={`relative group flex flex-col items-center justify-center rounded-2xl border border-dashed transition-all p-6 text-center ${
                  dragOver
                    ? 'border-violet-400 bg-violet-500/10'
                    : 'border-violet-400/15 bg-violet-500/[0.025] hover:border-violet-400/30 hover:bg-violet-500/[0.05]'
                }`}
              >
                <label
                  htmlFor="bug-file"
                  className="cursor-pointer flex flex-col items-center w-full"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/15 bg-violet-500/[0.08] text-violet-300 transition-transform group-hover:-translate-y-0.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                      <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" d="M12 16V4M7 9l5-5 5 5" />
                      <path strokeWidth="1.6" strokeLinecap="round" d="M5 20h14" />
                    </svg>
                  </div>

                  <p className="text-sm font-medium text-slate-200">
                    {selectedFile ? selectedFile.name : 'Drop diagnostic evidence or paste screenshot here'}
                  </p>

                  <p className="mt-1.5 text-xs text-slate-600">
                    TXT, LOG, JSON, XML, CSV, PNG, JPG, CODE · Max 10 MB
                  </p>

                  {selectedFile && (
                    <span className="mt-3 rounded-full border border-cyan-400/10 bg-cyan-400/[0.05] px-2.5 py-1 text-[10px] font-semibold text-cyan-300">
                      {(selectedFile.size / 1024).toFixed(1)} KB text loaded
                    </span>
                  )}
                </label>

                {pastedImage && (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-violet-400/20 bg-black/40 p-2.5 max-w-full">
                    <img
                      src={pastedImage.dataUrl}
                      alt="Pasted screenshot"
                      className="h-14 w-20 object-cover rounded-lg border border-white/[0.08]"
                    />
                    <div className="text-left text-xs min-w-0 pr-2">
                      <p className="font-semibold text-violet-200 truncate max-w-[180px]">{pastedImage.name}</p>
                      <span className="text-[10px] text-emerald-400">✓ Screenshot attached (ready for OCR)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPastedImage(null)}
                      className="text-slate-500 hover:text-red-400 px-2 text-xs"
                      title="Remove screenshot"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                id="bug-file"
                type="file"
                className="hidden"
                onChange={handleFile}
                accept=".txt,.log,.json,.xml,.csv,.py,.js,.jsx,.ts,.tsx,.java,.c,.cpp,.png,.jpg,.jpeg"
              />
            </section>

            <section className="panel p-6">
              <div className="mb-5">
                <p className="section-eyebrow">03 / Context</p>
                <h2 className="mt-1.5 text-base font-semibold text-slate-100">
                  Initial Classification
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Provide your first assessment. The AI pipeline will generate its own classification after analysis.
                </p>
              </div>

              <div className="mb-4">
                <label className="label" htmlFor="tags">
                  Tags <span className="text-slate-600">(comma-separated, optional)</span>
                </label>
                <input
                  id="tags"
                  className="input-field"
                  placeholder="e.g. auth, race-condition, timeout"
                  value={form.tags}
                  onChange={update('tags')}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label" htmlFor="category">
                    Category
                  </label>
                  <select
                    id="category"
                    className="input-field"
                    value={form.category}
                    onChange={update('category')}
                  >
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
                  <select
                    id="severity"
                    className="input-field"
                    value={form.severity}
                    onChange={update('severity')}
                  >
                    {SEVERITIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label" htmlFor="priority">
                    Priority
                  </label>
                  <select
                    id="priority"
                    className="input-field"
                    value={form.priority}
                    onChange={update('priority')}
                  >
                    {PRIORITIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* AI Agent Hyperparameter Tuning Panel */}
            <section className="panel p-6 border border-violet-500/20 bg-gradient-to-br from-violet-950/20 via-slate-900/40 to-slate-950/60 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">AI Agent Hyperparameter Tuning</h3>
                    <p className="text-[11px] text-slate-400">Configure LLM engine, temperature, and reasoning depth for this diagnostic case</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-violet-400/20 bg-violet-500/10 text-violet-300">
                  Adaptive Orchestrator
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1.5 block">
                    Diagnostic Model Engine
                  </label>
                  <select
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    className="input-field text-xs font-mono"
                  >
                    <option value="Nexus-Pro">Nexus-Pro (Standard Reasoning)</option>
                    <option value="Aegis-Agent">Aegis-Agent (Security & Hardening)</option>
                    <option value="Quantum-7B">Quantum-7B (Deterministic Fast Path)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-medium text-slate-300">Temperature</label>
                    <span className="text-xs font-mono text-cyan-400 font-semibold">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Deterministic (0.0)</span>
                    <span>Creative (1.0)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-medium text-slate-300">Top-P Sampling</label>
                    <span className="text-xs font-mono text-violet-400 font-semibold">{topP}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={topP}
                    onChange={(e) => setTopP(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Focused (0.1)</span>
                    <span>Broad (1.0)</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deepReasoning}
                    onChange={(e) => setDeepReasoning(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-violet-600 focus:ring-violet-500"
                  />
                  <div>
                    <span className="text-xs font-medium text-slate-200">Deep Chain-of-Thought (CoT) Mode</span>
                    <p className="text-[10px] text-slate-500">Injects 5-stage reflection trace into agent pipeline</p>
                  </div>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {deepReasoning ? 'Enabled (5 CoT Steps)' : 'Standard'}
                </span>
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-3 pb-4">
              <button
                type="submit"
                disabled={submitting || dryRunning}
                className="btn-primary min-w-[190px]"
              >
                {submitting ? 'Creating case…' : 'Create diagnostic case'}
              </button>

              <button
                type="button"
                onClick={handleDryRun}
                disabled={submitting || dryRunning}
                className="px-4 py-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-cyan-950/30"
              >
                {dryRunning ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-cyan-400" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Executing Dry-Run...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Dry-Run Scan (Preview)
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate('/dashboard')}
                disabled={submitting || dryRunning}
              >
                Cancel
              </button>
            </div>
          </div>

          <aside className="space-y-5">
            <section className="panel overflow-hidden">
              <div className="border-b border-white/[0.05] p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
                  Pipeline Preview
                </p>

                <div className="mt-2 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-100">
                    Multi-Agent Engine
                  </h3>

                  <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                    Ready
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="relative space-y-2.5">
                  {[
                    ['01', 'Triage Agent', 'Severity, priority & category', 'violet'],
                    ['02', 'Log Intelligence', 'Exception & failure point', 'cyan'],
                    ['03', 'Similarity Agent', 'Historical duplicate search', 'violet'],
                    ['04', 'Root Cause Agent', 'Grounded cause & confidence', 'cyan'],
                    ['05', 'Remediation Agent', 'Fix, prevention & effort', 'violet'],
                  ].map(([number, title, description, tone], index) => (
                    <div
                      key={number}
                      className="relative flex gap-3 rounded-xl border border-white/[0.05] bg-white/[0.018] p-3.5"
                    >
                      {index < 4 && (
                        <span className="absolute left-[29px] top-[49px] h-[14px] w-px bg-gradient-to-b from-violet-400/20 to-transparent" />
                      )}

                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border font-mono text-[10px] font-semibold ${
                          tone === 'cyan'
                            ? 'border-cyan-400/10 bg-cyan-400/[0.05] text-cyan-300'
                            : 'border-violet-400/10 bg-violet-500/[0.06] text-violet-300'
                        }`}
                      >
                        {number}
                      </div>

                      <div>
                        <p className="text-sm font-medium text-slate-300">{title}</p>
                        <p className="mt-0.5 text-[11px] leading-5 text-slate-600">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="panel p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
                Intake Monitor
              </p>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-3">
                  <span className="text-xs text-slate-600">Mode</span>
                  <span className="text-xs font-medium text-slate-300">
                    {mode === 'report' ? 'Bug Report' : 'Source Code'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-3">
                  <span className="text-xs text-slate-600">Language</span>
                  <span className="text-xs font-medium text-slate-300">{language}</span>
                </div>

                <div className="rounded-xl border border-violet-400/10 bg-violet-500/[0.035] px-3.5 py-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                    Detected Evidence
                  </p>
                  <p className="mt-1.5 text-sm font-medium capitalize text-violet-300">
                    {inputSummary}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-cyan-400/10 bg-gradient-to-br from-cyan-400/[0.05] to-violet-500/[0.035] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[0.05]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 text-cyan-300">
                    <ellipse cx="12" cy="5" rx="7" ry="3" strokeWidth="1.6" />
                    <path strokeWidth="1.6" d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
                  </svg>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">
                    Historical Intelligence
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Resolved cases can be reused as evidence for similarity matching,
                    root-cause grounding, and future fix recommendations.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </form>

      {/* Dry Run Preview Modal */}
      {showDryRunModal && dryRunResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs uppercase font-bold">
                  Dry-Run Analysis Preview
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Engine: {dryRunResult.telemetry?.ai_model || aiModel} | Temp: {dryRunResult.telemetry?.temperature ?? temperature}
                </span>
              </div>
              <button
                onClick={() => setShowDryRunModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-4 pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-800/60 rounded-xl border border-white/[0.04]">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Predicted Severity</p>
                  <p className="text-sm font-bold text-amber-400 mt-1">{dryRunResult.predicted_severity}</p>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl border border-white/[0.04]">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Predicted Category</p>
                  <p className="text-sm font-bold text-cyan-300 mt-1">{dryRunResult.predicted_category}</p>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl border border-white/[0.04]">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Diagnosis Confidence</p>
                  <p className="text-sm font-bold text-emerald-400 mt-1">{Math.round((dryRunResult.confidence_score || 0.85) * 100)}%</p>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl border border-white/[0.04]">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Tokens Simulated</p>
                  <p className="text-sm font-bold text-violet-400 mt-1">{dryRunResult.telemetry?.estimated_tokens || 850}</p>
                </div>
              </div>

              <div className="p-4 bg-slate-800/40 rounded-xl border border-white/[0.05]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Root Cause Hypothesis</h4>
                <p className="text-sm text-slate-200 leading-relaxed">{dryRunResult.root_cause_hypothesis}</p>
              </div>

              {dryRunResult.recommended_patch && (
                <div className="p-4 bg-slate-800/40 rounded-xl border border-white/[0.05]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Proposed Fix Description</h4>
                  <p className="text-sm text-slate-200 leading-relaxed">{dryRunResult.recommended_patch}</p>
                </div>
              )}

              {dryRunResult.code_diff && (
                <div className="rounded-xl border border-white/[0.08] overflow-hidden">
                  <div className="bg-slate-800/80 px-4 py-2 border-b border-white/[0.06] flex items-center justify-between">
                    <span className="font-mono text-xs text-violet-300">
                      Target: {dryRunResult.code_diff.filename || 'remediation_patch.py'}
                    </span>
                    <div className="flex gap-1.5">
                      {['diff', 'fixed', 'buggy'].map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setDryRunCodeMode(mode)}
                          className={`px-2 py-0.5 text-[10px] rounded uppercase font-mono transition ${
                            dryRunCodeMode === mode
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                  <pre className="p-4 bg-slate-950 font-mono text-xs overflow-x-auto text-slate-300 max-h-56 leading-relaxed">
                    {dryRunCodeMode === 'diff' && (dryRunResult.code_diff.diff || 'No unified diff generated.')}
                    {dryRunCodeMode === 'fixed' && (dryRunResult.code_diff.fixed || 'No fixed code preview.')}
                    {dryRunCodeMode === 'buggy' && (dryRunResult.code_diff.buggy || 'No buggy code sample.')}
                  </pre>
                </div>
              )}

              {dryRunResult.thinking_steps && dryRunResult.thinking_steps.length > 0 && (
                <div className="p-4 bg-slate-800/40 rounded-xl border border-white/[0.05]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Simulated CoT Reasoning Path</h4>
                  <div className="space-y-1.5">
                    {dryRunResult.thinking_steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs font-mono text-slate-300">
                        <span className="text-cyan-400 font-bold">{idx + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/[0.08] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDryRunModal(false)}
                className="btn-secondary text-xs"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={(e) => {
                  setShowDryRunModal(false)
                  handleSubmit(e)
                }}
                disabled={submitting}
                className="btn-primary text-xs"
              >
                {submitting ? 'Submitting...' : 'Proceed with Case Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
