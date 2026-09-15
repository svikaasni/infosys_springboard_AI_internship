import React, { useState } from 'react'
import client from '../api/client'
import { useAuth } from '../context/AuthContext.jsx'

export default function Profile() {
  const { user, updateUser } = useAuth()

  const [fullName, setFullName] = useState(user?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [organization, setOrganization] = useState(user?.organization || 'TechCorp Solutions')
  const [role, setRole] = useState(user?.role || 'Developer')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPass, setChangingPass] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    setMessage(null)
    setError(null)

    try {
      const { data } = await client.put('/auth/profile', {
        full_name: fullName,
        email,
        organization,
        role,
      })
      updateUser(data)
      setMessage('Profile updated successfully.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not update profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setChangingPass(true)
    setMessage(null)
    setError(null)

    try {
      await client.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      setMessage('Password updated successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not change password.')
    } finally {
      setChangingPass(false)
    }
  }

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U'

  return (
    <div className="max-w-[1300px] space-y-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.08] via-[#0b0f1d] to-cyan-400/[0.035] p-6 lg:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/[0.08] blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/20 to-cyan-400/10 text-xl font-bold text-violet-200">
              {initials}
              <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#0b0f1d] bg-emerald-400" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-white">{user?.full_name || 'User'}</h1>
                <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-bold text-violet-300">
                  {user?.role || 'Developer'}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{user?.email || '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-xs text-slate-400">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-600 block">Organization</span>
              <span className="font-medium text-slate-200">{organization}</span>
            </div>
          </div>
        </div>
      </section>

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

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Profile Information Form */}
        <form onSubmit={handleUpdateProfile} className="panel p-6 space-y-4">
          <div className="border-b border-white/[0.05] pb-3">
            <p className="section-eyebrow">Personal Details</p>
            <h2 className="text-sm font-semibold text-slate-200">Account Profile</h2>
          </div>

          <div>
            <label className="label">Full Name</label>
            <input
              type="text"
              required
              className="input-field text-xs"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              required
              className="input-field text-xs"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Organization / Team</label>
            <input
              type="text"
              className="input-field text-xs"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Engineering Role</label>
            <select
              className="input-field text-xs"
              value={role}
              disabled={user?.role === 'Admin'}
              onChange={(e) => setRole(e.target.value)}
            >
              {['Developer', 'Team Lead', 'QA Engineer', 'Engineering Manager', 'Admin'].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="btn-primary text-xs w-full"
            >
              {savingProfile ? 'Updating profile…' : 'Save Profile Changes'}
            </button>
          </div>
        </form>

        {/* Change Password Form */}
        <form onSubmit={handleChangePassword} className="panel p-6 space-y-4">
          <div className="border-b border-white/[0.05] pb-3">
            <p className="section-eyebrow">Security</p>
            <h2 className="text-sm font-semibold text-slate-200">Change Account Password</h2>
          </div>

          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="input-field text-xs"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="input-field text-xs"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="input-field text-xs"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={changingPass}
              className="btn-secondary text-xs w-full"
            >
              {changingPass ? 'Updating password…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
