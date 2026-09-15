import React, { useState, useRef, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import client from '../api/client'

const SUGGESTIONS = [
  'List critical bugs',
  "What's the health score?",
  'Show similar bugs to #1',
]

export default function ChatAssistant() {
  const { id: bugIdFromRoute } = useParams()
  const [open, setOpen] = useState(false)

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text:
        "Hi! I can look up critical bugs, find similar past issues, explain a stack trace, suggest a fix, or check the project health score. What do you need?",
      relatedBugIds: [],
    },
  ])

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, open])

  const send = async (text) => {
    const message = (text ?? input).trim()

    if (!message || sending) return

    setMessages((current) => [
      ...current,
      {
        role: 'user',
        text: message,
      },
    ])

    setInput('')
    setSending(true)

    try {
      const contextBugId = bugIdFromRoute
        ? Number(bugIdFromRoute)
        : undefined

      const { data } = await client.post('/chat', {
        message,
        context_bug_id: contextBugId,
      })

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          text: data.reply,
          relatedBugIds: data.related_bug_ids || [],
        },
      ])
    } catch (err) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          text: "Sorry, I couldn't process that. Please try again.",
          relatedBugIds: [],
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    send()
  }

  return (
    <>
      {open && (
        <div
          className="fixed bottom-24 right-6 z-40 flex w-[350px] flex-col overflow-hidden rounded-3xl border border-violet-400/15 bg-[#0b0f1d]/95 shadow-[0_25px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:w-[390px]"
          style={{ maxHeight: '72vh' }}
        >
          <div className="relative overflow-hidden border-b border-white/[0.05]">
            <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-violet-500/[0.10] blur-3xl" />

            <div className="relative flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/15 bg-gradient-to-br from-violet-500/15 to-cyan-400/[0.06]">
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
                      d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"
                    />

                    <path
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"
                    />
                  </svg>

                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#0b0f1d] bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-100">
                      BugSense Copilot
                    </p>

                    <span className="rounded-full border border-violet-400/10 bg-violet-500/[0.06] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-violet-300">
                      AI
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,0.9)]" />

                    <span className="text-[9px] uppercase tracking-[0.13em] text-slate-600">
                      Diagnostic assistant online
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.04] bg-white/[0.02] text-slate-600 transition-all hover:border-violet-400/10 hover:bg-violet-500/[0.05] hover:text-slate-300"
                aria-label="Close assistant"
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
                    d="M18 6 6 18M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="min-h-[250px] flex-1 space-y-4 overflow-y-auto px-4 py-4"
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user'
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[86%] rounded-2xl px-3.5 py-3 text-xs leading-6 whitespace-pre-wrap ${
                    message.role === 'user'
                      ? 'rounded-br-md border border-violet-400/15 bg-gradient-to-br from-violet-500/20 to-violet-500/10 text-violet-100'
                      : 'rounded-bl-md border border-white/[0.05] bg-white/[0.025] text-slate-400'
                  }`}
                >
                  {message.text}

                  {message.relatedBugIds &&
                    message.relatedBugIds.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {message.relatedBugIds.map((id) => (
                          <Link
                            key={id}
                            to={`/bugs/${id}`}
                            className="rounded-full border border-cyan-400/10 bg-cyan-400/[0.04] px-2 py-0.5 font-mono text-[10px] text-cyan-300 transition-colors hover:bg-cyan-400/[0.08]"
                          >
                            Case #{id}
                          </Link>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-white/[0.05] bg-white/[0.025] px-3.5 py-3">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
                  <span
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400"
                    style={{ animationDelay: '120ms' }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400"
                    style={{ animationDelay: '240ms' }}
                  />

                  <span className="ml-1 text-[10px] text-slate-600">
                    Analyzing
                  </span>
                </div>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="border-t border-white/[0.04] px-4 py-3">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-700">
                Quick Prompts
              </p>

              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => send(suggestion)}
                    className="rounded-full border border-white/[0.05] bg-white/[0.02] px-2.5 py-1.5 text-[10px] text-slate-500 transition-all hover:border-violet-400/10 hover:bg-violet-500/[0.05] hover:text-violet-300"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="border-t border-white/[0.05] bg-black/10 p-3"
          >
            <div className="flex items-end gap-2">
              <textarea
                rows={1}
                className="input-field max-h-28 min-h-[42px] flex-1 resize-none py-2.5 text-xs"
                placeholder="Ask BugSense about this case..."
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey
                  ) {
                    event.preventDefault()
                    handleSubmit(event)
                  }
                }}
                disabled={sending}
              />

              <button
                type="submit"
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-[0_8px_20px_rgba(124,92,255,0.25)] transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                disabled={sending || !input.trim()}
                aria-label="Send message"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m5 12 14-7-5 14-2.5-5.5L5 12Z"
                  />
                </svg>
              </button>
            </div>

            <p className="mt-2 px-1 text-[9px] text-slate-700">
              Enter to send · Shift + Enter for new line
            </p>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`group fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-300/20 bg-gradient-to-br from-violet-500 to-[#6553e8] text-white shadow-[0_15px_40px_rgba(124,92,255,0.32)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(124,92,255,0.42)] ${
          open ? 'rotate-0' : ''
        }`}
        aria-label="Toggle BugSense Copilot"
      >
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.12] to-transparent" />

        {!open && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#080b15] bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.75)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#080b15]" />
          </span>
        )}

        {open ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="relative h-5 w-5"
          >
            <path
              strokeWidth="1.8"
              strokeLinecap="round"
              d="M18 6 6 18M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="relative h-5 w-5"
          >
            <path
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"
            />
            <path
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"
            />
          </svg>
        )}
      </button>
    </>
  )
}