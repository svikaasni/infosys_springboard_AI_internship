import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import NotificationBell from './NotificationBell.jsx'
import client from '../api/client'

const TITLES = {
  '/dashboard': [
    'Overview',
    'System health, bug activity, AI insights, and engineering signals',
  ],
  '/submit-bug': [
    'New Diagnosis',
    'Submit code, logs, stack traces, files, and bug reports for AI analysis',
  ],
  '/bugs': [
    'Case History',
    'Browse previously analyzed defects and investigation results',
  ],
  '/neural-sandbox': [
    'Neural Sandbox',
    'Central Neural System (CNS) particle grid and live glitch purging simulation',
  ],
  '/terminal': [
    'Cognitive Terminal',
    'Interactive developer CLI shell for bug diagnosis, scanning, and patching',
  ],
  '/knowledge-base': [
    'Knowledge Vault',
    'Resolved bugs, historical fixes, and reusable diagnostic intelligence',
  ],
  '/analytics': [
    'Insights',
    'Analyze defect trends, recurrence patterns, severity, and resolution data',
  ],
  '/admin': [
    'Control Center',
    'Manage users, access levels, roles, and platform administration',
  ],
  '/settings': [
    'Preferences',
    'Configure your account, workspace, and application experience',
  ],
}

export default function Topbar() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Global Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setSearchOpen(false)
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await client.get(`/search?q=${encodeURIComponent(searchQuery)}`)
        setSearchResults(data.results || [])
        setSearchOpen(true)
      } catch (err) {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSelectResult = (url) => {
    setSearchOpen(false)
    setSearchQuery('')
    navigate(url)
  }

  const matched = Object.keys(TITLES).find((path) =>
    location.pathname.startsWith(path)
  )

  const [title, subtitle] = matched
    ? TITLES[matched]
    : ['BugSense AI', 'Autonomous Diagnostic Intelligence']

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((name) => name[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U'

  return (
    <header className="relative z-[100] flex min-h-[82px] items-center justify-between border-b border-white/[0.05] bg-[#080b15]/95 px-6 py-4 backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />

      <div className="min-w-0 pr-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="truncate text-xl font-semibold leading-tight text-white">
            {title}
          </h1>

          {location.pathname.startsWith('/submit-bug') && (
            <span className="hidden items-center gap-1.5 rounded-full border border-violet-400/15 bg-violet-500/[0.08] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-violet-300 md:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
              AI Lab
            </span>
          )}
        </div>

        {subtitle && (
          <p className="mt-1.5 truncate text-xs text-slate-500">
            {subtitle}
          </p>
        )}
      </div>

      {/* Global Search Center Bar */}
      <div className="relative mx-4 hidden max-w-md flex-1 md:block">
        <div className="relative flex items-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-500"
          >
            <circle cx="11" cy="11" r="7" strokeWidth="1.6" />
            <path strokeWidth="1.6" strokeLinecap="round" d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="text"
            placeholder="Search defects, KB solutions, error logs, members… (Ctrl+K)"
            className="w-full rounded-xl border border-white/[0.07] bg-white/[0.025] py-2 pl-9.5 pr-4 text-xs text-slate-200 outline-none transition-all placeholder:text-slate-600 focus:border-violet-400/30 focus:bg-white/[0.04]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim() && setSearchOpen(true)}
          />
          {searching && (
            <div className="absolute right-3 h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-400" />
          )}
        </div>

        {/* Global Search Dropdown Results */}
        {searchOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-[9990] cursor-default bg-transparent"
              onClick={() => setSearchOpen(false)}
            />
            <div className="absolute left-0 right-0 top-full z-[9991] mt-2 max-h-96 overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#0b0f1d] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.8)]">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No matching defects, knowledge base records, or team members found.
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((item, idx) => (
                    <button
                      key={`${item.type}-${item.id}-${idx}`}
                      type="button"
                      onClick={() => handleSelectResult(item.url)}
                      className="flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-white/[0.035]"
                    >
                      <span className={`mt-0.5 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                        item.type === 'bug'
                          ? 'border border-cyan-400/20 bg-cyan-400/10 text-cyan-300'
                          : item.type === 'knowledge'
                          ? 'border border-violet-400/20 bg-violet-500/10 text-violet-300'
                          : 'border border-amber-400/20 bg-amber-400/10 text-amber-300'
                      }`}>
                        {item.type}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-200">
                          {item.title}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-slate-500">
                          {item.snippet}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3.5 py-2 xl:flex">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/10 bg-cyan-400/[0.05]">
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
                d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"
              />
              <circle cx="12" cy="12" r="3" strokeWidth="1.6" />
            </svg>

            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full border border-[#080b15] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
          </div>

          <div className="leading-tight">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Diagnostic Engine
            </p>

            <p className="mt-0.5 text-xs font-medium text-slate-300">
              Online
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="group flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.05] bg-white/[0.02] transition-all hover:border-violet-400/15 hover:bg-violet-500/[0.06]"
          aria-label={
            theme === 'dark'
              ? 'Switch to light mode'
              : 'Switch to dark mode'
          }
          title={
            theme === 'dark'
              ? 'Switch to light mode'
              : 'Switch to dark mode'
          }
        >
          {theme === 'dark' ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-[18px] w-[18px] text-slate-500 transition-colors group-hover:text-violet-300"
            >
              <circle cx="12" cy="12" r="4" strokeWidth="1.6" />

              <path
                strokeWidth="1.6"
                strokeLinecap="round"
                d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
              />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-[18px] w-[18px] text-slate-500 transition-colors group-hover:text-violet-300"
            >
              <path
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
              />
            </svg>
          )}
        </button>

        <div className="relative z-[120] rounded-xl border border-white/[0.05] bg-white/[0.02]">
          <NotificationBell />
        </div>

        <div className="relative z-[150]">
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="group flex items-center gap-3 rounded-xl border border-transparent px-2 py-1.5 transition-all hover:border-white/[0.05] hover:bg-white/[0.025]"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/15 bg-gradient-to-br from-violet-500/15 to-cyan-400/[0.05] text-xs font-semibold text-violet-200">
              {initials}

              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#080b15] bg-emerald-400" />
            </div>

            <div className="hidden text-left leading-tight sm:block">
              <p className="max-w-[150px] truncate text-sm font-medium text-slate-200">
                {user?.full_name || 'User'}
              </p>

              <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-slate-600">
                {user?.role || 'Developer'}
              </p>
            </div>

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className={`h-4 w-4 text-slate-600 transition-transform duration-200 ${
                menuOpen ? 'rotate-180' : ''
              }`}
            >
              <path
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m6 9 6 6 6-6"
              />
            </svg>
          </button>

          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Close profile menu"
                className="fixed inset-0 z-[9998] cursor-default bg-transparent"
                onClick={() => setMenuOpen(false)}
              />

              <div className="absolute right-0 top-full z-[9999] mt-3 w-60 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0f1d] p-1.5 shadow-[0_28px_90px_rgba(0,0,0,0.8)]">
                <div className="border-b border-white/[0.05] px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/10 text-xs font-semibold text-violet-200">
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">
                        {user?.full_name || 'User'}
                      </p>

                      <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-slate-600">
                        {user?.role || 'Developer'}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    navigate('/profile')
                  }}
                  className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-slate-400 transition-colors hover:bg-white/[0.035] hover:text-slate-200"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
                    <circle cx="12" cy="8" r="4" strokeWidth="1.6" />
                    <path strokeWidth="1.6" strokeLinecap="round" d="M6 20v-1a6 6 0 0 1 12 0v1" />
                  </svg>
                  My Profile
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    navigate('/settings')
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-slate-400 transition-colors hover:bg-white/[0.035] hover:text-slate-200"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="h-4 w-4"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      strokeWidth="1.6"
                    />

                    <path
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 13.5v-3l-2-.7a7 7 0 0 0-.8-1.8l.9-1.9-2.2-2.2-1.9.9a7 7 0 0 0-1.8-.8L10.5 2h-3"
                    />
                  </svg>

                  Preferences
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    logout()
                    navigate('/login')
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/[0.07] hover:text-red-300"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="h-4 w-4"
                  >
                    <path
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 17l5-5-5-5M15 12H3M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"
                    />
                  </svg>

                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}