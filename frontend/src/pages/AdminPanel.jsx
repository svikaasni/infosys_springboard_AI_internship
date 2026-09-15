import React, { useCallback, useEffect, useState } from 'react'
import client from '../api/client'
import { useAuth } from '../context/AuthContext.jsx'

const ASSIGNABLE_ROLES = [
  'Admin',
  'Team Lead',
  'Developer',
  'QA Engineer',
  'Engineering Manager',
]

export default function AdminPanel() {
  const { user: currentUser } = useAuth()

  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyUserId, setBusyUserId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data } = await client.get('/admin/users', {
        params: {
          page: 1,
          page_size: 100,
        },
      })

      setUsers(data.items)
      setTotal(data.total)
    } catch (err) {
      setError(
        err.response?.status === 403
          ? 'You need Admin access to view this page.'
          : 'Could not load users.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const changeRole = async (userId, role) => {
    setBusyUserId(userId)
    setError(null)

    try {
      await client.patch(`/admin/users/${userId}/role`, {
        role,
      })

      await load()
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Could not update that user's role."
      )
    } finally {
      setBusyUserId(null)
    }
  }

  const removeUser = async (userId, name) => {
    const confirmed = window.confirm(
      `Remove ${name}? Their reported bugs will be deleted; bugs they're only assigned to will be unassigned.`
    )

    if (!confirmed) return

    setBusyUserId(userId)
    setError(null)

    try {
      await client.delete(`/admin/users/${userId}`)
      await load()
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Could not remove that user.'
      )
    } finally {
      setBusyUserId(null)
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet-400/20 border-t-violet-400" />

        <p className="mt-4 text-sm text-slate-600">
          Loading access control...
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-[1500px] space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.07] via-[#0b0f1d] to-cyan-400/[0.03] p-6 lg:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/[0.08] blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-violet-400/15 bg-violet-500/[0.08] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-violet-300">
                Administrative Access
              </span>

              <span className="glass-chip">
                {total} account{total === 1 ? '' : 's'}
              </span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Control Center
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage workspace identities, engineering roles, and account access
              across the BugSense environment.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/[0.08]">
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
                  d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z"
                />

                <path
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6M12 9v6"
                />
              </svg>
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-600">
                Current Access
              </p>

              <p className="mt-0.5 text-xs font-medium text-violet-300">
                Administrator
              </p>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-400/15 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.08] to-transparent p-5">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">
            Accounts
          </p>

          <p className="mt-3 text-3xl font-semibold text-white">
            {total}
          </p>

          <p className="mt-1 text-[11px] text-slate-600">
            Registered workspace users
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/10 bg-gradient-to-br from-cyan-400/[0.06] to-transparent p-5">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">
            Administrators
          </p>

          <p className="mt-3 text-3xl font-semibold text-white">
            {users.filter((item) => item.role === 'Admin').length}
          </p>

          <p className="mt-1 text-[11px] text-slate-600">
            Elevated access accounts
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-5">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">
            Access Model
          </p>

          <p className="mt-3 text-lg font-semibold text-slate-200">
            Role Based
          </p>

          <p className="mt-1 text-[11px] text-slate-600">
            Controlled engineering permissions
          </p>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/[0.05] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
              Identity Directory
            </p>

            <h2 className="mt-1 text-sm font-semibold text-slate-200">
              Workspace Members
            </h2>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-cyan-400/10 bg-cyan-400/[0.04] px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />

            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-cyan-300">
              Access control active
            </span>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-slate-500">
              No workspace users found.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {users.map((user) => {
              const isSelf = user.id === currentUser?.id
              const busy = busyUserId === user.id

              const initials = user.full_name
                ? user.full_name
                    .split(' ')
                    .map((name) => name[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                : 'U'

              return (
                <div
                  key={user.id}
                  className="grid gap-4 px-5 py-4 transition-colors hover:bg-violet-500/[0.02] lg:grid-cols-[minmax(0,1.5fr)_220px_120px_120px_130px_90px] lg:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/10 bg-violet-500/[0.06] text-xs font-semibold text-violet-300">
                      {initials}

                      {isSelf && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0d1120] bg-cyan-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-slate-200">
                          {user.full_name}
                        </p>

                        {isSelf && (
                          <span className="rounded-full border border-cyan-400/10 bg-cyan-400/[0.04] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-cyan-300">
                            You
                          </span>
                        )}
                      </div>

                      <p className="mt-0.5 truncate text-[11px] text-slate-600">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-700 lg:hidden">
                      Role
                    </p>

                    <select
                      className="input-field py-2 text-xs"
                      value={user.role}
                      disabled={isSelf || busy}
                      onChange={(event) =>
                        changeRole(
                          user.id,
                          event.target.value
                        )
                      }
                    >
                      {ASSIGNABLE_ROLES.map((item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-700">
                      Reported
                    </p>

                    <p className="font-mono text-sm text-slate-400">
                      {user.bugs_reported}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-700">
                      Assigned
                    </p>

                    <p className="font-mono text-sm text-slate-400">
                      {user.bugs_assigned}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-700">
                      Joined
                    </p>

                    <p className="text-xs text-slate-500">
                      {new Date(
                        user.created_at
                      ).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex lg:justify-end">
                    <button
                      type="button"
                      disabled={isSelf || busy}
                      onClick={() =>
                        removeUser(
                          user.id,
                          user.full_name
                        )
                      }
                      className="rounded-lg border border-red-400/10 bg-red-500/[0.04] px-3 py-2 text-[10px] font-medium text-red-300 transition-colors hover:bg-red-500/[0.08] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      {busy
                        ? 'Working...'
                        : 'Remove'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-amber-400/10 bg-amber-400/[0.035] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/10 bg-amber-400/[0.05]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-4 w-4 text-amber-300"
            >
              <path
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3 3.5 19h17L12 3Z"
              />

              <path
                strokeWidth="1.6"
                strokeLinecap="round"
                d="M12 9v4M12 16h.01"
              />
            </svg>
          </div>

          <div>
            <p className="text-xs font-medium text-amber-300">
              Protected administrator actions
            </p>

            <p className="mt-1 text-[11px] leading-5 text-slate-600">
              You cannot modify your own role or remove your own account from
              this screen. User removal can also delete bugs reported by that
              account and unassign other cases.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}