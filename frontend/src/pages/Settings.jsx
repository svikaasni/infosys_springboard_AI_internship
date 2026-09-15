import React, { useState } from 'react'
import client from '../api/client'
import { useAuth } from '../context/AuthContext.jsx'

const SELF_SERVICE_ROLES = [
  'Developer',
  'Team Lead',
  'QA Engineer',
  'Engineering Manager',
]

export default function Settings() {
  const { user, updateUser } = useAuth()

  const [fullName, setFullName] = useState(user?.full_name || '')
  const [role, setRole] = useState(user?.role || 'Developer')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const [notifyEmail, setNotifyEmail] = useState(true)
  const [notifyCritical, setNotifyCritical] = useState(true)
  const [notifyDigest, setNotifyDigest] = useState(false)

  const handleSaveProfile = async (event) => {
    event.preventDefault()

    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      const payload = {
        full_name: fullName,
        role,
      }

      if (password) {
        payload.password = password
      }

      const { data } = await client.put('/auth/me', payload)

      updateUser(data)
      setPassword('')
      setMessage('Profile updated successfully.')
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Could not update your profile.'
      )
    } finally {
      setSaving(false)
    }
  }

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((name) => name[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U'

  return (
    <div className="max-w-[1300px] space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.07] via-[#0b0f1d] to-cyan-400/[0.03] p-6 lg:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/[0.08] blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-violet-400/15 bg-violet-500/[0.08] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-violet-300">
                Workspace Configuration
              </span>

              <span className="glass-chip">
                Personal settings
              </span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Preferences
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage your BugSense identity, engineering role, authentication,
              and notification preferences.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/15 bg-gradient-to-br from-violet-500/15 to-cyan-400/[0.05] text-sm font-semibold text-violet-200">
              {initials}

              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0b0f1d] bg-emerald-400" />
            </div>

            <div>
              <p className="text-sm font-medium text-slate-200">
                {user?.full_name || 'User'}
              </p>

              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                {user?.role || 'Developer'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-300">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-400/15 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_380px]">
        <form
          onSubmit={handleSaveProfile}
          className="panel overflow-hidden"
        >
          <div className="border-b border-white/[0.05] px-6 py-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
              Identity
            </p>

            <h2 className="mt-1.5 text-base font-semibold text-slate-200">
              Profile Configuration
            </h2>

            <p className="mt-1 text-xs text-slate-600">
              Update your display name, engineering role, and account password.
            </p>
          </div>

          <div className="space-y-5 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  className="label"
                  htmlFor="fullName"
                >
                  Full name
                </label>

                <input
                  id="fullName"
                  className="input-field"
                  value={fullName}
                  onChange={(event) =>
                    setFullName(event.target.value)
                  }
                />
              </div>

              <div>
                <label
                  className="label"
                  htmlFor="email"
                >
                  Account email
                </label>

                <input
                  id="email"
                  className="input-field cursor-not-allowed opacity-55"
                  value={user?.email || ''}
                  disabled
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  className="label"
                  htmlFor="role"
                >
                  Engineering role
                </label>

                <select
                  id="role"
                  className="input-field"
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value)
                  }
                  disabled={user?.role === 'Admin'}
                >
                  {(user?.role === 'Admin'
                    ? ['Admin', ...SELF_SERVICE_ROLES]
                    : SELF_SERVICE_ROLES
                  ).map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>

                {user?.role === 'Admin' && (
                  <p className="mt-2 text-[10px] leading-5 text-slate-600">
                    Administrator roles are protected. Another administrator
                    must change this role from the Control Center.
                  </p>
                )}
              </div>

              <div>
                <label
                  className="label"
                  htmlFor="password"
                >
                  New password
                </label>

                <input
                  id="password"
                  type="password"
                  className="input-field"
                  placeholder="Leave blank to keep current password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                />
              </div>
            </div>

            <div className="rounded-2xl border border-violet-400/10 bg-violet-500/[0.03] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/10 bg-violet-500/[0.06]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="h-4 w-4 text-violet-300"
                  >
                    <path
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z"
                    />

                    <path
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m9.5 12 1.6 1.6 3.4-3.6"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-300">
                    Account security
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-slate-600">
                    Password changes take effect immediately after your profile
                    is saved.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-white/[0.05] pt-5">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary min-w-[150px]"
              >
                {saving
                  ? 'Saving profile…'
                  : 'Save changes'}
              </button>

              {password && (
                <span className="text-[10px] text-amber-300">
                  Password will be updated
                </span>
              )}
            </div>
          </div>
        </form>

        <div className="space-y-6">
          <section className="panel p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
              Account Snapshot
            </p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-white/[0.018] px-3.5 py-3">
                <span className="text-xs text-slate-600">
                  Role
                </span>

                <span className="text-xs font-medium text-violet-300">
                  {user?.role || 'Developer'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-white/[0.018] px-3.5 py-3">
                <span className="text-xs text-slate-600">
                  Identity
                </span>

                <span className="max-w-[180px] truncate text-xs font-medium text-slate-300">
                  {user?.email || '—'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-white/[0.018] px-3.5 py-3">
                <span className="text-xs text-slate-600">
                  Session
                </span>

                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Active
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-cyan-400/10 bg-gradient-to-br from-cyan-400/[0.04] to-violet-500/[0.03] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">
              Access Model
            </p>

            <p className="mt-3 text-xs leading-6 text-slate-500">
              Role-based access determines which platform controls and
              administrative capabilities are available in your workspace.
            </p>
          </section>
        </div>
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-white/[0.05] px-6 py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
            Communication
          </p>

          <h2 className="mt-1.5 text-base font-semibold text-slate-200">
            Notification Preferences
          </h2>

          <p className="mt-1 text-xs text-slate-600">
            Configure which engineering events should surface as notifications.
          </p>
        </div>

        <div className="divide-y divide-white/[0.05] px-6">
          <ToggleRow
            label="New bug activity"
            description="Receive an alert when a teammate submits a new diagnostic case."
            checked={notifyEmail}
            onChange={setNotifyEmail}
          />

          <ToggleRow
            label="Critical risk alerts"
            description="Prioritize immediate notification when a case is marked Critical."
            checked={notifyCritical}
            onChange={setNotifyCritical}
          />

          <ToggleRow
            label="Weekly engineering digest"
            description="Receive a summarized view of active, resolved, and recurring defects."
            checked={notifyDigest}
            onChange={setNotifyDigest}
          />
        </div>

        <div className="border-t border-white/[0.05] bg-white/[0.012] px-6 py-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-amber-400/10 bg-amber-400/[0.05] text-[10px] text-amber-300">
              i
            </span>

            <p className="text-[10px] leading-5 text-slate-600">
              Notification preference controls are currently a UI preview.
              Delivery integration is not enabled in this build.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}) {
  return (
    <div className="flex items-center justify-between gap-5 py-5">
      <div>
        <p className="text-sm font-medium text-slate-300">
          {label}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-600">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition-all ${
          checked
            ? 'border-violet-400/20 bg-violet-500/25 shadow-[0_0_18px_rgba(124,92,255,0.12)]'
            : 'border-white/[0.07] bg-white/[0.04]'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-[3px] flex h-5 w-5 items-center justify-center rounded-full transition-all ${
            checked
              ? 'translate-x-[24px] bg-violet-300 shadow-[0_0_10px_rgba(167,139,250,0.45)]'
              : 'translate-x-[3px] bg-slate-600'
          }`}
        />
      </button>
    </div>
  )
}