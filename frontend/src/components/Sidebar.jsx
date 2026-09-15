import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', icon: 'dashboard' },
  { to: '/submit-bug', label: 'New Diagnosis', icon: 'spark' },
  { to: '/bugs', label: 'Case History', icon: 'history' },
  { to: '/duplicate-issues', label: 'Duplicate Issues', icon: 'duplicate' },
  { to: '/neural-sandbox', label: 'Neural Sandbox', icon: 'sandbox' },
  { to: '/terminal', label: 'Cognitive Terminal', icon: 'terminal' },
  { to: '/knowledge-base', label: 'Knowledge Vault', icon: 'database' },
  { to: '/reports', label: 'Reports & Audits', icon: 'report' },
  { to: '/analytics', label: 'Insights', icon: 'analytics' },
  { to: '/bug-prediction', label: 'Bug Prediction', icon: 'spark' },
  { to: '/team', label: 'Team', icon: 'team' },
  { to: '/settings', label: 'Preferences', icon: 'settings' },
]

const ADMIN_NAV_ITEM = {
  to: '/admin',
  label: 'Control Center',
  icon: 'shield',
}

const ICONS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth="1.6" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" strokeWidth="1.6" />
      <rect x="14" y="11" width="7" height="10" rx="1.5" strokeWidth="1.6" />
      <rect x="3" y="13" width="7" height="8" rx="1.5" strokeWidth="1.6" />
    </>
  ),

  spark: (
    <>
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
        d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"
      />
      <path
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 15l.7 1.8 1.8.7-1.8.7L5 20l-.7-1.8-1.8-.7 1.8-.7L5 15Z"
      />
    </>
  ),

  history: (
    <>
      <path
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6v5h5"
      />
      <path
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.5 15.5A8 8 0 1 0 4 11"
      />
      <path
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 7v5l3 2"
      />
    </>
  ),

  duplicate: (
    <>
      <path
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7v8a2 2 0 0 0 2 2h6M8 7V5a2 2 0 0 1 2-2h4.586a1 1 0 0 1 .707.293l4.414 4.414a1 1 0 0 1 .293.707V15a2 2 0 0 1-2 2h-2M8 7H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2"
      />
    </>
  ),

  database: (
    <>
      <ellipse cx="12" cy="5" rx="7" ry="3" strokeWidth="1.6" />
      <path
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5"
      />
      <path
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"
      />
    </>
  ),

  report: (
    <>
      <path
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z"
      />
    </>
  ),

  analytics: (
    <>
      <path
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 19V10"
      />
      <path
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 19V5"
      />
      <path
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 19v-6"
      />
      <path
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 19V8"
      />
    </>
  ),

  team: (
    <>
      <path
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
      />
      <circle cx="9" cy="7" r="4" strokeWidth="1.6" />
      <path
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
      />
    </>
  ),

  settings: (
    <>
      <circle cx="12" cy="12" r="3" strokeWidth="1.6" />
      <path
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 13.5v-3l-2-.7a7 7 0 0 0-.8-1.8l.9-1.9-2.2-2.2-1.9.9a7 7 0 0 0-1.8-.8L10.5 2h-3l-.7 2a7 7 0 0 0-1.8.8l-1.9-.9L.9 6.1 1.8 8a7 7 0 0 0-.8 1.8l-2 .7v3l2 .7a7 7 0 0 0 .8 1.8l-.9 1.9 2.2 2.2 1.9-.9a7 7 0 0 0 1.8.8l.7 2h3l.7-2a7 7 0 0 0 1.8-.8l1.9.9 2.2-2.2-.9-1.9a7 7 0 0 0 .8-1.8l2-.7Z"
        transform="translate(2 0)"
      />
    </>
  ),

  shield: (
    <path
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z"
    />
  ),

  sandbox: (
    <>
      <polygon points="12 2 2 7 12 12 22 7 12 2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="2 17 12 22 22 17" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="2 12 12 17 22 12" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  terminal: (
    <>
      <polyline points="4 17 10 11 4 5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="19" x2="20" y2="19" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
}

export default function Sidebar() {
  const { user } = useAuth()

  const navItems =
    user?.role === 'Admin'
      ? [...NAV_ITEMS, ADMIN_NAV_ITEM]
      : NAV_ITEMS

  return (
    <aside className="hidden lg:flex w-[278px] shrink-0 flex-col border-r border-white/[0.06] bg-[#090c17]/95 backdrop-blur-2xl">
      <div className="px-5 pt-5 pb-4">
        <div className="rounded-2xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.08] via-transparent to-cyan-400/[0.05] p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 shadow-[0_0_30px_rgba(124,92,255,0.10)]">
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
                  d="M12 3 4 7v5c0 4.4 3.1 7.4 8 9 4.9-1.6 8-4.6 8-9V7l-8-4Z"
                />
                <path
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6M12 9v6"
                />
              </svg>

              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#090c17] bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate font-display text-[15px] font-semibold text-white">
                  BugSense AI
                </p>
                <span className="rounded-md border border-violet-400/15 bg-violet-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.18em] text-violet-300">
                  Pro
                </span>
              </div>

              <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-600">
                Diagnostic Intelligence
              </p>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-2">
        <div className="mb-4 flex items-center justify-between px-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-600">
            Command Center
          </p>

          <div className="flex items-center gap-1.5 rounded-full border border-cyan-400/10 bg-cyan-400/[0.04] px-2 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-cyan-300">
              Live
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 overflow-hidden rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'border border-violet-400/15 bg-gradient-to-r from-violet-500/15 to-cyan-400/[0.04] text-white shadow-[0_0_25px_rgba(124,92,255,0.06)]'
                    : 'border border-transparent text-slate-500 hover:border-white/[0.05] hover:bg-white/[0.025] hover:text-slate-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute bottom-2 left-0 top-2 w-[2px] rounded-full bg-gradient-to-b from-violet-400 to-cyan-400 shadow-[0_0_10px_rgba(124,92,255,0.8)]" />
                  )}

                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-violet-500/10 text-violet-300 ring-1 ring-violet-400/10'
                        : 'bg-white/[0.025] text-slate-600 group-hover:bg-white/[0.04] group-hover:text-slate-300'
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className="h-[17px] w-[17px]"
                    >
                      {ICONS[item.icon]}
                    </svg>
                  </span>

                  <span className="flex-1">
                    {item.label}
                  </span>

                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="px-4 pb-5 pt-3">
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.025] to-transparent p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                AI Memory
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-300">
                Historical Learning
              </p>
            </div>

            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[0.05]">
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
                  d="M12 4a4 4 0 0 0-4 4v1H7a3 3 0 0 0 0 6h1v1a4 4 0 0 0 8 0v-1h1a3 3 0 0 0 0-6h-1V8a4 4 0 0 0-4-4Z"
                />
                <path
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 10h6M10 13h4"
                />
              </svg>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-600">
            Resolved cases continuously improve similarity matching,
            root-cause grounding, and future fix recommendations.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-[10px] font-medium text-emerald-300">
              Learning engine active
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}