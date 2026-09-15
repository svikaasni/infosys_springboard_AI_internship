import React, { useState, useEffect } from 'react'
import client from '../api/client'
import { useAuth } from '../context/AuthContext.jsx'

const ROLES = [
  'Admin',
  'Team Lead',
  'Developer',
  'QA Engineer',
  'Engineering Manager',
  'Viewer',
]

export default function Team() {
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Developer')
  const [inviteMsg, setInviteMsg] = useState('')
  const [inviting, setInviting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [membersRes, invitesRes] = await Promise.all([
        client.get('/team/members'),
        client.get('/team/invitations'),
      ])
      setMembers(membersRes.data)
      setInvitations(invitesRes.data)
    } catch (err) {
      setError('Could not load team data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleInviteSubmit = async (e) => {
    e.preventDefault()
    setInviting(true)
    setError(null)
    setMessage(null)

    try {
      await client.post('/team/invite', {
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
        message: inviteMsg,
      })
      setMessage(`Invitation sent successfully to ${inviteEmail}.`)
      setShowInviteModal(false)
      setInviteName('')
      setInviteEmail('')
      setInviteRole('Developer')
      setInviteMsg('')
      await loadData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send invitation.')
    } finally {
      setInviting(false)
    }
  }

  const handleRoleChange = async (memberId, newRole) => {
    setError(null)
    setMessage(null)
    try {
      await client.patch(`/team/members/${memberId}/role`, { role: newRole })
      setMessage('Team member role updated successfully.')
      await loadData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not update role.')
    }
  }

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from the workspace?`)) return

    setError(null)
    setMessage(null)
    try {
      await client.delete(`/team/members/${memberId}`)
      setMessage(`${memberName} removed from workspace.`)
      await loadData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not remove member.')
    }
  }

  const handleCancelInvite = async (invId) => {
    setError(null)
    setMessage(null)
    try {
      await client.delete(`/team/invitations/${invId}`)
      setMessage('Invitation canceled.')
      await loadData()
    } catch (err) {
      setError('Could not cancel invitation.')
    }
  }

  const handleResendInvite = async (invId) => {
    setError(null)
    setMessage(null)
    try {
      await client.post(`/team/invitations/${invId}/resend`)
      setMessage('Invitation renewed for 7 days.')
      await loadData()
    } catch (err) {
      setError('Could not renew invitation.')
    }
  }

  return (
    <div className="max-w-[1400px] space-y-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.08] via-[#0b0f1d] to-cyan-400/[0.035] p-6 lg:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/[0.08] blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-violet-400/15 bg-violet-500/[0.08] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-violet-300">
                Workspace Administration
              </span>
              <span className="glass-chip">RBAC Security Model</span>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-white lg:text-3xl">
              Team & Member Management
            </h1>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-400">
              Manage team members, adjust engineering roles, and track onboarding invitations.
            </p>
          </div>

          <button
            onClick={() => setShowInviteModal(true)}
            className="btn-primary text-xs"
          >
            + Invite Team Member
          </button>
        </div>
      </section>

      {/* Notifications */}
      {message && (
        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3 text-xs text-emerald-300">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-400/15 bg-red-500/[0.06] px-4 py-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Team Members List */}
      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.05] px-6 py-4">
          <div>
            <p className="section-eyebrow">Roster</p>
            <h2 className="text-sm font-semibold text-slate-200">Active Team Members</h2>
          </div>
          <span className="font-mono text-xs text-slate-500">{members.length} members</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading team members…</div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {members.map((m) => (
              <div key={m.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/[0.08] text-xs font-bold text-violet-300">
                    {m.full_name
                      ? m.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()
                      : 'U'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-slate-200">{m.full_name}</p>
                      {m.id === user?.id && (
                        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-bold text-cyan-300">
                          You
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                        m.status === 'Pending'
                          ? 'border border-amber-400/20 bg-amber-400/10 text-amber-300'
                          : 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                      }`}>
                        {m.status || 'Active'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">{m.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    className="input-field py-1 text-xs max-w-[170px]"
                    value={m.role}
                    disabled={m.id === user?.id && user?.role === 'Admin'}
                    onChange={(e) => handleRoleChange(m.id, e.target.value)}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>

                  {m.id !== user?.id && (
                    <button
                      onClick={() => handleRemoveMember(m.id, m.full_name)}
                      className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/20"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.05] px-6 py-4">
            <div>
              <p className="section-eyebrow">Onboarding</p>
              <h2 className="text-sm font-semibold text-slate-200">Pending Invitations</h2>
            </div>
            <span className="font-mono text-xs text-slate-500">{invitations.length} invitations</span>
          </div>

          <div className="divide-y divide-white/[0.05]">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-slate-200">{inv.email}</p>
                    <span className="glass-chip text-[9px]">{inv.role}</span>
                    <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[9px] text-amber-300">
                      {inv.status}
                    </span>
                  </div>
                  {inv.message && (
                    <p className="mt-1 text-[11px] text-slate-500">"{inv.message}"</p>
                  )}
                  <p className="mt-1 font-mono text-[10px] text-slate-600">Token: {inv.token}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResendInvite(inv.id)}
                    className="btn-secondary py-1 text-[11px]"
                  >
                    Renew Token
                  </button>
                  <button
                    onClick={() => handleCancelInvite(inv.id)}
                    className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/20"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="panel w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
              <h3 className="text-sm font-semibold text-white">Invite Team Member</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-500 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-3.5">
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Jane Developer"
                  className="input-field text-xs"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="jane@company.com"
                  className="input-field text-xs"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Engineering Role</label>
                <select
                  className="input-field text-xs"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Welcome Note (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Welcome to BugSense!"
                  className="input-field text-xs resize-none"
                  value={inviteMsg}
                  onChange={(e) => setInviteMsg(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="btn-primary text-xs"
                >
                  {inviting ? 'Dispatching…' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
