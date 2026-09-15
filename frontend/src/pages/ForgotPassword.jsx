import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [step, setStep] = useState(1) // 1: request token, 2: enter token and new password
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const handleRequestToken = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { data } = await client.post('/auth/forgot-password', { email })
      setMessage(data.message || 'Password reset instructions dispatched.')
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to initiate password reset.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { data } = await client.post('/auth/reset-password', {
        token,
        new_password: newPassword,
      })
      setMessage(data.message || 'Password reset successfully. You can now sign in.')
      setStep(3)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password. Please verify your token.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-signal-500/15 ring-1 ring-signal-500/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5 text-signal-400">
              <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" d="M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="leading-tight text-left">
            <p className="font-display text-sm font-semibold text-slate-50">BugSense Security</p>
            <p className="text-[11px] text-slate-500">Account Recovery Portal</p>
          </div>
        </div>

        <div className="panel p-7 space-y-4">
          <div>
            <h1 className="text-xl font-semibold mb-1 text-white">Reset Password</h1>
            <p className="text-xs text-slate-400">
              {step === 1 && 'Enter your verified account email to receive a recovery token.'}
              {step === 2 && 'Enter the reset token and choose a new password.'}
              {step === 3 && 'Account recovery complete!'}
            </p>
          </div>

          {message && (
            <div className="rounded-lg bg-emerald-400/10 border border-emerald-400/20 px-3.5 py-2.5 text-xs text-emerald-300">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-alert-critical/10 border border-alert-critical/30 px-3.5 py-2.5 text-xs text-alert-critical">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleRequestToken} className="space-y-4">
              <div>
                <label className="label" htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="you@team.com"
                  className="input-field text-xs"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="btn-primary w-full text-xs"
              >
                {loading ? 'Sending token…' : 'Send Recovery Token'}
              </button>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-center w-full text-xs text-slate-500 hover:text-slate-300"
              >
                Already have a reset token? Enter here →
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="label" htmlFor="token">Reset Token</label>
                <input
                  id="token"
                  type="text"
                  required
                  placeholder="e.g. rst_a1b2c3d4"
                  className="input-field font-mono text-xs"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>

              <div>
                <label className="label" htmlFor="newPassword">New Password</label>
                <input
                  id="newPassword"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="input-field text-xs"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !token.trim() || !newPassword.trim()}
                className="btn-primary w-full text-xs"
              >
                {loading ? 'Resetting…' : 'Save New Password'}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-center w-full text-xs text-slate-500 hover:text-slate-300"
              >
                ← Back to email request
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="pt-2 text-center">
              <Link to="/login" className="btn-primary inline-flex text-xs">
                Proceed to Sign In
              </Link>
            </div>
          )}

          <p className="text-center text-xs text-slate-500 border-t border-white/[0.05] pt-4">
            Remember your credentials?{' '}
            <Link to="/login" className="text-signal-400 hover:text-signal-300 font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
