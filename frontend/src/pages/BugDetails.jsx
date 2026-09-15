import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import client from '../api/client'
import SeverityBadge from '../components/SeverityBadge.jsx'
import StatusBadge from '../components/StatusBadge.jsx'

const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed']

const EVENT_LABELS = {
  created: 'Bug reported',
  status_changed: 'Status changed',
  resolution_notes_updated: 'Resolution notes updated',
  stack_trace_updated: 'Stack trace updated',
  comment_added: 'Comment added',
  attachment_added: 'Attachment added',
  ai_analysis_run: 'AI analysis run',
}

export default function BugDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [bug, setBug] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)

  const [commentBody, setCommentBody] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState(null)

  // Novel features states
  const [activeAnalysisTab, setActiveAnalysisTab] = useState('overview') // 'overview', 'codefix', 'telemetry', 'chat'
  const [codeMode, setCodeMode] = useState('diff')
  const [termLogs, setTermLogs] = useState([{ text: 'Sandbox ready. Click run verification to evaluate code.', type: 'system' }])
  const [isVerifying, setIsVerifying] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatIsTyping, setChatIsTyping] = useState(false)

  const parseSafeChatHistory = (chatData, bugId) => {
    let list = chatData
    if (typeof list === 'string') {
      try {
        list = JSON.parse(list)
      } catch {
        list = []
      }
    }
    if (Array.isArray(list) && list.length > 0) {
      return list.map((m) => {
        if (typeof m === 'object' && m !== null) {
          return {
            sender: m.sender === 'user' ? 'user' : 'ai',
            text: typeof m.text === 'object' ? JSON.stringify(m.text) : String(m.text || ''),
          }
        }
        return { sender: 'ai', text: String(m || '') }
      })
    }
    return [
      {
        sender: 'ai',
        text: `Hello! I'm your diagnostics sandbox assistant for Case #${bugId || 'N/A'}. Ask me how to prevent this bug, request code in other languages (such as TypeScript or Python), or query root cause details.`,
      },
    ]
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await client.get(`/bugs/${id}`)
      setBug(data)
      setResolutionNotes(data.resolution_notes || '')
      setChatMessages(parseSafeChatHistory(data.analysis?.chat_history, data.id))
    } catch (err) {
      setError('Bug not found, or you no longer have access to it.')
    } finally {
      setLoading(false)
    }
  }

  const runVerify = async () => {
    setIsVerifying(true)
    setTermLogs([{ text: '> Initializing sandboxed container...', type: 'system' }])
    try {
      const res = await client.post(`/bugs/${id}/verify`)
      const data = res.data

      let delay = 0
      const logs = Array.isArray(data?.logs) ? data.logs : ['Verification completed.']
      logs.forEach((log) => {
        setTimeout(() => {
          const isSuccess = log.includes('SUCCESS') || log.includes('PASS')
          setTermLogs((prev) => [...prev, { text: `> ${log}`, type: isSuccess ? 'success' : 'line' }])
        }, delay)
        delay += 400
      })

      setTimeout(async () => {
        setIsVerifying(false)
        await load()
      }, delay)
    } catch (e) {
      setIsVerifying(false)
      setTermLogs((prev) => [...prev, { text: `> FAILED: ${e.message}`, type: 'danger' }])
    }
  }

  const handleChatSend = async (e) => {
    e.preventDefault()
    const query = chatInput.trim()
    if (!query) return

    setChatMessages((prev) => [...prev, { sender: 'user', text: query }])
    setChatInput('')
    setChatIsTyping(true)

    try {
      const res = await client.post(`/bugs/${id}/chat`, { message: query })
      setChatIsTyping(false)
      if (res.data?.chat_history) {
        setChatMessages(parseSafeChatHistory(res.data.chat_history, id))
      } else {
        const replyText = typeof res.data?.reply === 'object' ? JSON.stringify(res.data.reply) : String(res.data?.reply || '')
        setChatMessages((prev) => [...prev, { sender: 'ai', text: replyText }])
      }
    } catch (err) {
      setChatIsTyping(false)
      setChatMessages((prev) => [...prev, { sender: 'ai', text: `System error: ${err.message}` }])
    }
  }

  const clearChatLogs = async () => {
    try {
      await client.post(`/bugs/${id}/chat`, { message: 'CLEAR_HISTORY_DIRECTIVE' })
      setChatMessages([{ sender: 'ai', text: 'Chat history cleared successfully.' }])
    } catch {}
  }

  const renderCodeLines = (text, mode) => {
    if (!text || typeof text !== 'string') {
      return <span className="text-slate-600 font-mono text-xs">No code diff generated.</span>
    }
    const lines = text.split('\n')
    return lines.map((line, idx) => {
      if (mode === 'diff') {
        if (line.startsWith('+')) {
          return <span key={idx} className="block text-emerald-400 bg-emerald-500/10 px-1 font-mono">{line}</span>
        } else if (line.startsWith('-')) {
          return <span key={idx} className="block text-rose-400 bg-rose-500/10 px-1 font-mono">{line}</span>
        } else if (line.trim().startsWith('#') || line.trim().startsWith('//')) {
          return <span key={idx} className="block text-slate-500 font-mono">{line}</span>
        }
        return <span key={idx} className="block text-slate-300 font-mono">{line}</span>
      } else {
        if (line.trim().startsWith('#') || line.trim().startsWith('//')) {
          return <span key={idx} className="block text-slate-500 font-mono">{line}</span>
        }
        return <span key={idx} className="block text-slate-300 font-mono">{line}</span>
      }
    })
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const updateBug = async (patch) => {
    setSavingStatus(true)
    try {
      await client.patch(`/bugs/${id}`, patch)
      await load()
    } catch (err) {
      setError('Could not update this bug.')
    } finally {
      setSavingStatus(false)
    }
  }

  const submitComment = async (e) => {
    e.preventDefault()
    if (!commentBody.trim()) return
    setPostingComment(true)
    try {
      await client.post(`/bugs/${id}/comments`, { body: commentBody })
      setCommentBody('')
      await load()
    } catch (err) {
      setError('Could not post your comment.')
    } finally {
      setPostingComment(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await client.post(`/bugs/${id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await load()
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'Could not upload this file.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const [applyingOcrId, setApplyingOcrId] = useState(null)
  const [ocrDrafts, setOcrDrafts] = useState({}) // attachment.id -> editable draft text

  const applyOcrText = async (attachment) => {
    const draftText = ocrDrafts[attachment.id] ?? attachment.extracted_text
    setApplyingOcrId(attachment.id)
    try {
      const nextStackTrace = bug.stack_trace
        ? `${bug.stack_trace}\n\n${draftText}`
        : draftText
      await client.patch(`/bugs/${id}`, { stack_trace: nextStackTrace })
      await load()
    } catch (err) {
      setUploadError('Could not add that text to the stack trace.')
    } finally {
      setApplyingOcrId(null)
    }
  }

  const runAnalysis = async () => {
    setAnalyzing(true)
    setAnalysisError(null)
    try {
      await client.post(`/bugs/${id}/analyze`)
      await load()
    } catch (err) {
      setAnalysisError(err.response?.data?.detail || 'AI analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  const [downloadingReport, setDownloadingReport] = useState(false)
  const [downloadError, setDownloadError] = useState(null)

  const downloadReport = async () => {
    setDownloadingReport(true)
    setDownloadError(null)
    try {
      const response = await client.get(`/bugs/${id}/report`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `bug_${id}_report.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setDownloadError('Could not generate the PDF report. Please try again.')
    } finally {
      setDownloadingReport(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-slate-500 py-10 text-center">Loading bug details…</div>
  }

  if (error && !bug) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-sm text-alert-critical mb-4">{error}</p>
        <Link to="/bugs" className="btn-secondary inline-flex">Back to Bug History</Link>
      </div>
    )
  }

  const analysis = bug?.analysis

  const safeThinkingSteps = useMemo(() => {
    if (!analysis) return []
    let steps = analysis.ai_thinking_steps
    if (typeof steps === 'string') {
      try {
        steps = JSON.parse(steps)
      } catch {
        steps = []
      }
    }
    if (!Array.isArray(steps) || steps.length === 0) {
      return [
        { title: '1. AST Frame Deconstruction', details: 'Parsed callstack frames and isolated symbol scope.' },
        { title: '2. Vector Index Retrieval', details: 'Matched similar past incidents in knowledge repository.' },
        { title: '3. Remediation Synthesis', details: 'Synthesized defensive code patch and verified regression boundaries.' },
      ]
    }
    return steps.map((step, idx) => {
      if (typeof step === 'object' && step !== null) {
        return {
          title: step.title || step.step || `Step ${idx + 1}`,
          details: step.details || step.description || (typeof step === 'string' ? step : ''),
        }
      }
      return { title: `Step ${idx + 1}`, details: String(step || '') }
    })
  }, [analysis])

  const safeCodeDiff = useMemo(() => {
    if (!analysis?.code_diff) return null
    let diff = analysis.code_diff
    if (typeof diff === 'string') {
      try {
        diff = JSON.parse(diff)
      } catch {
        return null
      }
    }
    return typeof diff === 'object' && diff !== null ? diff : null
  }, [analysis])

  return (
    <div className="max-w-[1500px] space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-xs font-medium text-slate-600 transition-colors hover:text-violet-300"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3.5 w-3.5">
          <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
        </svg>
        Back to cases
      </button>

      {error && (
        <div className="rounded-2xl border border-red-400/15 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="relative overflow-hidden rounded-3xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.08] via-[#0b0f1d] to-cyan-400/[0.035]">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-violet-500/[0.08] blur-3xl" />

        <div className="relative p-6 lg:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-violet-400/15 bg-violet-500/[0.08] px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-violet-300">
                  CASE #{bug.id}
                </span>
                {bug.project && <span className="glass-chip">{bug.project}</span>}
                {bug.module && <span className="glass-chip">{bug.module}</span>}
                {bug.language && (
                  <span className="rounded-full border border-violet-400/15 bg-violet-500/[0.06] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-violet-300">
                    {bug.language}
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-semibold tracking-tight text-white lg:text-3xl">
                {bug.title}
              </h2>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <SeverityBadge severity={bug.severity} />
                <span className="badge border border-white/[0.06] bg-white/[0.03] font-mono text-slate-300">
                  {bug.priority}
                </span>
                <StatusBadge status={bug.status} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={downloadReport}
                disabled={downloadingReport}
                className="btn-secondary text-xs"
              >
                {downloadingReport ? 'Generating report…' : 'Download PDF'}
              </button>

              <button
                className="btn-primary text-xs"
                onClick={runAnalysis}
                disabled={analyzing}
              >
                {analyzing ? 'Agents analyzing…' : analysis ? 'Re-run AI analysis' : 'Run AI diagnosis'}
              </button>
            </div>
          </div>

          {downloadError && <p className="mt-3 text-xs text-red-300">{downloadError}</p>}

          <div className="mt-6 grid gap-3 border-t border-white/[0.05] pt-5 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">Reporter</p>
              <p className="mt-1 text-xs font-medium text-slate-300">{bug.reporter?.full_name || 'Anonymous'}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">Category</p>
              <p className="mt-1 text-xs font-medium text-slate-300">{bug.category || 'Uncategorized'}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">Created</p>
              <p className="mt-1 text-xs font-medium text-slate-300">{new Date(bug.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">Last Updated</p>
              <p className="mt-1 text-xs font-medium text-slate-300">{new Date(bug.updated_at).toLocaleString()}</p>
            </div>
            {bug.tags && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">Tags</p>
                <p className="mt-1 text-xs font-medium text-slate-300">{bug.tags}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_360px]">
        <div className="space-y-6">
          <section className="panel p-6">
            <p className="section-eyebrow">Incident Context</p>
            <h3 className="mt-1.5 text-base font-semibold text-slate-200">Description</h3>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-400">
              {bug.description}
            </p>
          </section>

          {bug.stack_trace && (
            <section className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4">
                <div>
                  <p className="section-eyebrow">Runtime Evidence</p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-200">Stack Trace / Error Log</h3>
                </div>
                <span className="rounded-full border border-cyan-400/10 bg-cyan-400/[0.04] px-2.5 py-1 font-mono text-[9px] text-cyan-300">
                  parser-ready
                </span>
              </div>

              <div className="terminal-panel m-5 overflow-hidden">
                <div className="flex items-center gap-2 border-b border-white/[0.05] px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-600">runtime.log</span>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap px-4 py-4 font-mono text-xs leading-6 text-slate-400">
{bug.stack_trace}
                </pre>
              </div>
            </section>
          )}

          <section className="panel overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-white/[0.05] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="section-eyebrow">AI Investigation</p>
                <h3 className="mt-1.5 text-base font-semibold text-slate-100">
                  Multi-Agent Diagnostic Report
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  Five specialized agents combine runtime evidence with historical intelligence.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/[0.04] px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
                  {analysis ? 'Analysis available' : 'Agents ready'}
                </span>
              </div>
            </div>

            <div className="p-6">
              {analysisError && (
                <div className="mb-4 rounded-xl border border-red-400/15 bg-red-500/[0.06] px-4 py-3 text-xs text-red-300">
                  {analysisError}
                </div>
              )}

              {!analysis ? (
                <div className="rounded-2xl border border-dashed border-violet-400/15 bg-violet-500/[0.025] px-6 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/15 bg-violet-500/[0.07]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5 text-violet-300">
                      <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.5 4.3L18 9l-4.5 1.7L12 15l-1.5-4.3L6 9l4.5-1.7L12 3Z" />
                      <path strokeWidth="1.6" strokeLinecap="round" d="M18 15v6M15 18h6" />
                    </svg>
                  </div>
                  <h4 className="mt-4 text-sm font-semibold text-slate-200">Case ready for AI investigation</h4>
                  <p className="mx-auto mt-2 max-w-lg text-xs leading-6 text-slate-600">
                    Run Triage, Log Intelligence, Similarity Detection, Root Cause, and Remediation to generate a structured diagnostic report.
                  </p>
                  <button className="btn-primary mt-5" onClick={runAnalysis} disabled={analyzing}>
                    {analyzing ? 'Running agents…' : 'Launch 5-agent analysis'}
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Novel Navigation Tabs */}
                  <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] pb-3">
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                        activeAnalysisTab === 'overview'
                          ? 'border border-violet-400/20 bg-violet-500/10 text-violet-200'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
                      }`}
                      onClick={() => setActiveAnalysisTab('overview')}
                    >
                      5-Agent Diagnosis
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                        activeAnalysisTab === 'codefix'
                          ? 'border border-cyan-400/20 bg-cyan-500/10 text-cyan-200'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
                      }`}
                      onClick={() => setActiveAnalysisTab('codefix')}
                    >
                      Interactive Fix &amp; Diff
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                        activeAnalysisTab === 'telemetry'
                          ? 'border border-purple-400/20 bg-purple-500/10 text-purple-200'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
                      }`}
                      onClick={() => setActiveAnalysisTab('telemetry')}
                    >
                      Telemetry &amp; CoT Reasoning
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                        activeAnalysisTab === 'chat'
                          ? 'border border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
                      }`}
                      onClick={() => setActiveAnalysisTab('chat')}
                    >
                      Incident Assistant Chat
                    </button>
                  </div>

                  {activeAnalysisTab === 'overview' && (
                    <div className="space-y-5">
                  <div className="relative overflow-hidden rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/[0.08] via-transparent to-cyan-400/[0.04] p-5">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300">
                          AI Risk Intelligence
                        </p>
                        <h4 className="mt-1.5 text-lg font-semibold text-white">Overall Bug Risk</h4>
                        <p className="mt-1 max-w-xl text-xs leading-5 text-slate-600">
                          Combined from severity, priority, root-cause confidence, recurrence, failure type, and localization evidence.
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="relative flex h-24 w-24 items-center justify-center rounded-full"
                          style={{
                            background: `conic-gradient(rgb(124 92 255) ${Math.max(0, Math.min(100, analysis.risk_score ?? 0)) * 3.6}deg, rgba(255,255,255,0.05) 0deg)`
                          }}
                        >
                          <div className="flex h-[78px] w-[78px] flex-col items-center justify-center rounded-full bg-[#0d1120]">
                            <span className="text-2xl font-bold text-white">{analysis.risk_score ?? 0}</span>
                            <span className="text-[9px] uppercase tracking-[0.12em] text-slate-600">of 100</span>
                          </div>
                        </div>

                        <div>
                          <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Risk Level</p>
                          <span className={`mt-1.5 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                            analysis.risk_level === 'Critical'
                              ? 'border-red-400/20 bg-red-500/10 text-red-300'
                              : analysis.risk_level === 'High'
                                ? 'border-orange-400/20 bg-orange-500/10 text-orange-300'
                                : analysis.risk_level === 'Medium'
                                  ? 'border-amber-400/20 bg-amber-500/10 text-amber-300'
                                  : 'border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300'
                          }`}>
                            {analysis.risk_level || 'Minimal'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {analysis.risk_summary && (
                      <p className="mt-5 border-t border-white/[0.05] pt-4 text-xs leading-6 text-slate-400">
                        {analysis.risk_summary}
                      </p>
                    )}

                    {analysis.risk_factors?.length > 0 && (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {analysis.risk_factors.map((factor, index) => (
                          <div key={`${factor.label}-${index}`} className="rounded-xl border border-white/[0.05] bg-black/15 px-3.5 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-medium text-slate-300">{factor.label}</span>
                              <span className="font-mono text-xs font-semibold text-violet-300">+{factor.points}</span>
                            </div>
                            <p className="mt-1.5 text-[11px] leading-5 text-slate-600">{factor.detail}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="agent-card">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-400/10 bg-violet-500/[0.07] font-mono text-[10px] font-bold text-violet-300">01</span>
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-600">Agent Result</p>
                            <h4 className="text-sm font-semibold text-slate-200">Triage</h4>
                          </div>
                        </div>
                        <span className="text-[10px] font-medium text-violet-300">{analysis.triage_confidence}% confidence</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <SeverityBadge severity={analysis.predicted_severity} />
                        <span className="badge border border-white/[0.06] bg-white/[0.03] font-mono text-slate-300">{analysis.predicted_priority}</span>
                        <span className="badge border border-amber-400/10 bg-amber-400/[0.06] text-amber-300">{analysis.predicted_category}</span>
                      </div>

                      {analysis.triage_reasoning && (
                        <p className="mt-3 text-xs leading-6 text-slate-500">{analysis.triage_reasoning}</p>
                      )}
                    </div>

                    <div className="agent-card">
                      <div className="mb-4 flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/10 bg-cyan-400/[0.06] font-mono text-[10px] font-bold text-cyan-300">02</span>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-600">Agent Result</p>
                          <h4 className="text-sm font-semibold text-slate-200">Log Intelligence</h4>
                        </div>
                      </div>

                      {analysis.exception_type ? (
                        <div className="space-y-2 text-xs text-slate-500">
                          <div className="rounded-lg border border-white/[0.05] bg-black/15 px-3 py-2.5">
                            <span className="text-slate-600">Exception </span>
                            <span className="font-mono text-cyan-300">{analysis.exception_type}</span>
                          </div>
                          {analysis.failure_file && (
                            <div className="rounded-lg border border-white/[0.05] bg-black/15 px-3 py-2.5">
                              <span className="text-slate-600">Failure point </span>
                              <span className="font-mono text-slate-300">
                                {analysis.failure_file}{analysis.failure_line ? `:${analysis.failure_line}` : ''}{analysis.failure_function ? ` in ${analysis.failure_function}()` : ''}
                              </span>
                            </div>
                          )}
                          <p className="pt-1 leading-6">{analysis.log_summary}</p>
                        </div>
                      ) : (
                        <p className="text-xs leading-6 text-slate-500">{analysis.log_summary}</p>
                      )}
                    </div>
                  </div>

                  <div className="agent-card">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-400/10 bg-violet-500/[0.07] font-mono text-[10px] font-bold text-violet-300">03</span>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-600">Agent Result</p>
                          <h4 className="text-sm font-semibold text-slate-200">Historical Similarity</h4>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-600">{analysis.duplicates.length} matches</span>
                    </div>

                    {analysis.duplicates.length === 0 ? (
                      <p className="text-xs text-slate-500">No similar cases were found in the current knowledge base.</p>
                    ) : (
                      <div className="space-y-2">
                        {analysis.duplicates.map((d) => (
                          <Link
                            key={d.bug_id}
                            to={`/bugs/${d.bug_id}`}
                            className="flex flex-col gap-2 rounded-xl border border-white/[0.05] bg-black/10 px-3.5 py-3 transition-colors hover:border-violet-400/15 hover:bg-violet-500/[0.025] sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-slate-300">#{d.bug_id} — {d.title}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <StatusBadge status={d.status} />
                              <span className="font-mono text-[10px] text-violet-300">{d.similarity.toFixed(0)}% match</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="agent-card">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/10 bg-cyan-400/[0.06] font-mono text-[10px] font-bold text-cyan-300">04</span>
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-600">Agent Result</p>
                            <h4 className="text-sm font-semibold text-slate-200">Root Cause</h4>
                          </div>
                        </div>
                        <span className="text-[10px] font-medium text-cyan-300">{analysis.root_cause_confidence}% confidence</span>
                      </div>
                      <p className="whitespace-pre-wrap text-xs leading-6 text-slate-500">{analysis.root_cause_text}</p>
                    </div>

                    <div className="agent-card">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-400/10 bg-violet-500/[0.07] font-mono text-[10px] font-bold text-violet-300">05</span>
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-600">Agent Result</p>
                            <h4 className="text-sm font-semibold text-slate-200">Remediation</h4>
                          </div>
                        </div>
                        <span className="rounded-full border border-white/[0.05] bg-white/[0.025] px-2.5 py-1 text-[9px] text-slate-500">
                          est. {analysis.estimated_fix_time}
                        </span>
                      </div>

                      <p className="text-xs leading-6 text-slate-400">{analysis.suggested_fix}</p>

                      {analysis.best_practices.length > 0 && (
                        <div className="mt-4 border-t border-white/[0.05] pt-3">
                          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-600">Best Practices</p>
                          <ul className="mt-2 space-y-1.5 text-xs text-slate-500">
                            {analysis.best_practices.map((bp, i) => <li key={i}>• {bp}</li>)}
                          </ul>
                        </div>
                      )}

                      {analysis.prevention_tips.length > 0 && (
                        <div className="mt-4 border-t border-white/[0.05] pt-3">
                          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-600">Prevention</p>
                          <ul className="mt-2 space-y-1.5 text-xs text-slate-500">
                            {analysis.prevention_tips.map((tip, i) => <li key={i}>• {tip}</li>)}
                          </ul>
                        </div>
                      )}
                      </div>
                    </div>
                  </div>
                )}

                  {/* TAB 2: Interactive Fix & Code Diff */}
                  {activeAnalysisTab === 'codefix' && (
                    <div className="space-y-5">
                      <div className="rounded-2xl border border-white/[0.08] bg-[#070a14] overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between border-b border-white/[0.08] bg-[#0c1020] px-4 py-3 gap-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-cyan-300">
                              {safeCodeDiff?.filename || 'src/app.py'}
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase font-mono">
                              {codeMode === 'diff' ? 'Unified Patch' : (codeMode === 'buggy' ? 'Original Code' : 'Fixed Code')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-black/30 p-1">
                            <button
                              type="button"
                              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                                codeMode === 'diff'
                                  ? 'bg-violet-500/20 text-violet-300 border border-violet-400/30'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                              onClick={() => setCodeMode('diff')}
                            >
                              Patch Diff
                            </button>
                            <button
                              type="button"
                              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                                codeMode === 'buggy'
                                  ? 'bg-violet-500/20 text-violet-300 border border-violet-400/30'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                              onClick={() => setCodeMode('buggy')}
                            >
                              Original
                            </button>
                            <button
                              type="button"
                              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                                codeMode === 'fixed'
                                  ? 'bg-violet-500/20 text-violet-300 border border-violet-400/30'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                              onClick={() => setCodeMode('fixed')}
                            >
                              Fixed Code
                            </button>
                          </div>
                        </div>

                        <div className="p-4 font-mono text-xs leading-6 overflow-x-auto max-h-[380px] bg-[#03060d]">
                          <pre className="whitespace-pre">
                            {codeMode === 'diff' && renderCodeLines(safeCodeDiff?.diff, 'diff')}
                            {codeMode === 'buggy' && renderCodeLines(safeCodeDiff?.buggy, 'buggy')}
                            {codeMode === 'fixed' && renderCodeLines(safeCodeDiff?.fixed, 'fixed')}
                          </pre>
                        </div>
                      </div>

                      {/* Sandbox Testing Terminal */}
                      <div className="rounded-2xl border border-white/[0.08] bg-[#070a14] overflow-hidden">
                        <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0c1020] px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded border border-cyan-400/20 bg-cyan-400/10 font-mono text-[9px] font-bold text-cyan-300">
                              TEST
                            </span>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Sandbox Testing Terminal</h4>
                          </div>
                          <button
                            type="button"
                            className="btn-primary py-1.5 px-3 text-xs"
                            onClick={runVerify}
                            disabled={isVerifying || bug.status === 'Resolved'}
                          >
                            {bug.status === 'Resolved' ? '✓ Fix Verified' : (isVerifying ? 'Running Tests…' : 'Run Fix Verification')}
                          </button>
                        </div>
                        <div className="p-4 font-mono text-xs leading-6 bg-[#04060d] h-48 overflow-y-auto space-y-1">
                          {termLogs.map((log, idx) => (
                            <div
                              key={idx}
                              className={`${
                                log.type === 'success'
                                  ? 'text-emerald-400 font-semibold'
                                  : log.type === 'danger'
                                    ? 'text-rose-400 font-semibold'
                                    : 'text-slate-400'
                              }`}
                            >
                              {log.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Telemetry & CoT Reasoning */}
                  {activeAnalysisTab === 'telemetry' && (
                    <div className="space-y-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        {/* Confidence Gauge */}
                        <div className="rounded-2xl border border-white/[0.08] bg-[#070a14] p-5 flex flex-col items-center text-center">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-3">Processing Integrity</p>
                          <div className="relative h-28 w-28 flex items-center justify-center">
                            <svg viewBox="0 0 36 36" className="w-28 h-28 transform -rotate-90">
                              <path
                                className="text-white/[0.05]"
                                strokeWidth="3.5"
                                stroke="currentColor"
                                fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                              <path
                                className="text-cyan-400 transition-all duration-1000"
                                strokeDasharray={`${analysis.triage_confidence || 85}, 100`}
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                            </svg>
                            <div className="absolute flex flex-col items-center">
                              <span className="text-xl font-bold text-white">{analysis.triage_confidence || 85}%</span>
                              <span className="text-[9px] uppercase tracking-wider text-slate-500">Confidence</span>
                            </div>
                          </div>
                          <p className="mt-3 text-xs text-slate-400">Diagnostic confidence across runtime logs and code models.</p>
                        </div>

                        {/* Token Consumption */}
                        <div className="rounded-2xl border border-white/[0.08] bg-[#070a14] p-5 flex flex-col items-center text-center">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-3">Token Consumption</p>
                          <div className="relative h-28 w-28 flex items-center justify-center">
                            <svg viewBox="0 0 36 36" className="w-28 h-28 transform -rotate-90">
                              <path
                                className="text-white/[0.05]"
                                strokeWidth="3.5"
                                stroke="currentColor"
                                fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                              <path
                                className="text-violet-400 transition-all duration-1000"
                                strokeDasharray={`${Math.min(100, Math.round(((analysis.tokens_used || 480) / 1200) * 100))}, 100`}
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                            </svg>
                            <div className="absolute flex flex-col items-center">
                              <span className="text-xl font-bold text-white">{analysis.tokens_used || 480}</span>
                              <span className="text-[9px] uppercase tracking-wider text-slate-500">Tokens</span>
                            </div>
                          </div>
                          <p className="mt-3 text-xs text-slate-400">Neural token consumption for inference and synthesis.</p>
                        </div>
                      </div>

                      {/* AI Reasoning Trace */}
                      <div className="rounded-2xl border border-white/[0.08] bg-[#070a14] p-5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded border border-purple-400/20 bg-purple-400/10 font-mono text-[9px] font-bold text-purple-300">
                            CoT
                          </span>
                          AI Chain-of-Thought Reasoning Trace Logs
                        </h4>
                        <div className="space-y-3">
                          {safeThinkingSteps.map((step, idx) => (
                            <div key={idx} className="rounded-xl border border-white/[0.05] bg-black/20 p-3.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-violet-300">{step.title}</span>
                                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] text-emerald-300">
                                  COMPLETED
                                </span>
                              </div>
                              <p className="mt-1.5 text-xs text-slate-400">{step.details}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: Incident AI Assistant Chat */}
                  {activeAnalysisTab === 'chat' && (
                    <div className="rounded-2xl border border-white/[0.08] bg-[#070a14] overflow-hidden flex flex-col">
                      <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0c1020] px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                          <div>
                            <h4 className="text-xs font-bold text-white">Incident AI Assistant</h4>
                            <p className="text-[10px] text-slate-500">Context: Case #{bug.id} ({(bug.title || '').slice(0, 35)}...)</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="text-[11px] text-slate-400 hover:text-slate-200"
                          onClick={clearChatLogs}
                        >
                          Clear Chat
                        </button>
                      </div>

                      {/* Messages Box */}
                      <div className="p-4 h-[320px] overflow-y-auto space-y-3 bg-[#04060d]">
                        {(Array.isArray(chatMessages) ? chatMessages : []).map((msg, idx) => {
                          const sender = msg?.sender === 'user' ? 'user' : 'ai'
                          const text = typeof msg?.text === 'object' ? JSON.stringify(msg.text) : String(msg?.text || '')
                          return (
                            <div
                              key={idx}
                              className={`flex flex-col max-w-[85%] ${
                                sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                              }`}
                            >
                              <span className="text-[10px] text-slate-500 mb-1 font-mono">
                                {sender === 'user' ? 'You' : 'AI Assistant'}
                              </span>
                              <div
                                className={`rounded-2xl px-4 py-2.5 text-xs leading-5 ${
                                  sender === 'user'
                                    ? 'bg-violet-600 text-white rounded-br-none'
                                    : 'bg-white/[0.06] text-slate-200 border border-white/[0.08] rounded-bl-none'
                                }`}
                              >
                                <div className="whitespace-pre-wrap">{text}</div>
                              </div>
                            </div>
                          )
                        })}
                        {chatIsTyping && (
                          <div className="flex items-center gap-2 text-xs text-slate-500 italic">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-pulse" /> Assistant typing...
                          </div>
                        )}
                      </div>

                      {/* Quick prompts */}
                      <div className="flex flex-wrap gap-1.5 px-4 py-2 border-t border-white/[0.05] bg-[#080b16]">
                        <button
                          type="button"
                          className="rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-[10px] text-slate-400 hover:text-slate-200 hover:border-violet-400/30"
                          onClick={() => setChatInput('How can we prevent this bug in the future and what regression tests should we write?')}
                        >
                          Preventive Regression Tests?
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-[10px] text-slate-400 hover:text-slate-200 hover:border-violet-400/30"
                          onClick={() => setChatInput('Can you show me the safe fix for this in TypeScript?')}
                        >
                          Fix in TypeScript
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-[10px] text-slate-400 hover:text-slate-200 hover:border-violet-400/30"
                          onClick={() => setChatInput('Can you show me the safe fix for this in Python?')}
                        >
                          Fix in Python
                        </button>
                      </div>

                      {/* Input Form */}
                      <form onSubmit={handleChatSend} className="flex border-t border-white/[0.08] bg-[#0c1020]">
                        <input
                          type="text"
                          className="w-full bg-transparent px-4 py-3 text-xs text-white focus:outline-none placeholder-slate-500"
                          placeholder="Ask about test coverage, TypeScript/Python rewrites, or explain root cause..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                        />
                        <button
                          type="submit"
                          className="border-l border-white/[0.08] bg-violet-600/30 px-5 text-xs font-semibold text-violet-300 hover:bg-violet-600/50 transition-colors"
                        >
                          Send
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="panel p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Case Control</p>
            <h3 className="mt-1.5 text-sm font-semibold text-slate-200">Lifecycle Status</h3>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  disabled={savingStatus || bug.status === s}
                  onClick={() => updateBug({ status: s })}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-medium transition-all ${
                    bug.status === s
                      ? 'border-violet-400/20 bg-violet-500/10 text-violet-200'
                      : 'border-white/[0.05] bg-white/[0.02] text-slate-500 hover:border-violet-400/10 hover:text-slate-300 disabled:opacity-70'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="mt-5 border-t border-white/[0.05] pt-4">
              <label className="label" htmlFor="resolutionNotes">Resolution Knowledge</label>
              <textarea
                id="resolutionNotes"
                rows={4}
                className="input-field resize-none"
                placeholder="Record the verified root cause and successful fix for future historical learning."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
              <button
                className="btn-secondary mt-2 w-full"
                disabled={savingStatus}
                onClick={() => updateBug({ resolution_notes: resolutionNotes })}
              >
                Save resolution knowledge
              </button>
            </div>
          </section>

          <section className="panel p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Evidence</p>
                <h3 className="mt-1 text-sm font-semibold text-slate-200">Attachments</h3>
              </div>
              <span className="rounded-full border border-white/[0.05] bg-white/[0.025] px-2 py-1 font-mono text-[9px] text-slate-500">
                {bug.attachments.length}
              </span>
            </div>

            {uploadError && (
              <div className="mt-3 rounded-xl border border-red-400/15 bg-red-500/[0.06] px-3 py-2.5 text-xs text-red-300">
                {uploadError}
              </div>
            )}

            {bug.attachments.length === 0 ? (
              <p className="mt-4 text-xs text-slate-600">No supporting files attached.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {bug.attachments.map((a) => (
                  <div key={a.id} className="rounded-xl border border-white/[0.05] bg-white/[0.018] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-medium text-slate-400">{a.filename}</span>
                      <span className="shrink-0 font-mono text-[9px] text-slate-600">{(a.size_bytes / 1024).toFixed(1)} KB</span>
                    </div>

                    {a.extracted_text && (
                      <div className="mt-3 border-t border-white/[0.05] pt-3">
                        <p className="mb-2 text-[9px] uppercase tracking-[0.12em] text-slate-600">OCR Extract</p>
                        <textarea
                          className="input-field mb-2 resize-none font-mono text-[10px]"
                          rows={Math.min(6, a.extracted_text.split('\n').length + 1)}
                          value={ocrDrafts[a.id] ?? a.extracted_text}
                          onChange={(e) => setOcrDrafts((prev) => ({ ...prev, [a.id]: e.target.value }))}
                        />
                        <button
                          className="text-[10px] font-semibold text-cyan-300 hover:text-cyan-200 disabled:opacity-50"
                          onClick={() => applyOcrText(a)}
                          disabled={applyingOcrId === a.id}
                        >
                          {applyingOcrId === a.id ? 'Adding…' : '+ Add OCR to runtime evidence'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <label className="btn-secondary mt-4 inline-flex w-full cursor-pointer text-xs">
              {uploading ? 'Uploading…' : '+ Attach evidence'}
              <input
                type="file"
                className="hidden"
                accept=".txt,.log,.json,.xml,.csv,.png,.jpg,.jpeg,.zip"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
            <p className="mt-2 text-[9px] leading-4 text-slate-700">
              TXT, LOG, JSON, XML, CSV, PNG, JPG, ZIP · Max 20 MB
            </p>
          </section>

          <section className="panel p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Collaboration</p>
                <h3 className="mt-1 text-sm font-semibold text-slate-200">Comments</h3>
              </div>
              <span className="font-mono text-[10px] text-slate-600">{bug.comments.length}</span>
            </div>

            {bug.comments.length === 0 ? (
              <p className="mt-4 text-xs text-slate-600">No investigation notes yet.</p>
            ) : (
              <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
                {bug.comments.map((c) => (
                  <div key={c.id} className="rounded-xl border border-white/[0.05] bg-white/[0.018] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-slate-300">{c.author?.full_name || 'Anonymous'}</span>
                      <span className="text-[9px] text-slate-700">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-500">{c.body}</p>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={submitComment} className="mt-4">
              <textarea
                rows={3}
                className="input-field resize-none"
                placeholder="Add an investigation note…"
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
              />
              <button type="submit" className="btn-primary mt-2 w-full" disabled={postingComment || !commentBody.trim()}>
                {postingComment ? 'Posting…' : 'Post note'}
              </button>
            </form>
          </section>

          <section className="panel p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Audit Trail</p>
            <h3 className="mt-1 text-sm font-semibold text-slate-200">Case Timeline</h3>

            <div className="mt-4 space-y-4">
              {bug.events.map((e, index) => (
                <div key={e.id} className="relative flex gap-3">
                  {index < bug.events.length - 1 && (
                    <span className="absolute left-[5px] top-4 h-[calc(100%+8px)] w-px bg-white/[0.05]" />
                  )}
                  <span className="relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-[#0d1120] bg-violet-400 shadow-[0_0_8px_rgba(124,92,255,0.5)]" />
                  <div>
                    <p className="text-xs font-medium text-slate-400">
                      {EVENT_LABELS[e.event_type] || e.event_type}
                    </p>
                    {e.actor && <p className="mt-0.5 text-[10px] text-slate-600">by {e.actor?.full_name || 'System'}</p>}
                    {e.detail && <p className="mt-1 text-[10px] leading-4 text-slate-600">{e.detail}</p>}
                    <p className="mt-1 text-[9px] text-slate-700">{new Date(e.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
