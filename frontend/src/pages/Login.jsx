import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { login, loading, error } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const ok = await login(email, password)
    if (ok) {
      const dest = location.state?.from?.pathname || '/dashboard'
      navigate(dest, { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-signal-500/15 ring-1 ring-signal-500/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5 text-signal-400">
              <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" d="M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="leading-tight text-left">
            <p className="font-display text-sm font-semibold text-slate-50">Intelligent Bug</p>
            <p className="text-[11px] text-slate-500">Diagnosis Platform</p>
          </div>
        </div>

        <div className="panel p-7">
          <h1 className="text-xl font-semibold mb-1">Welcome back</h1>
          <p className="text-sm text-slate-500 mb-6">Sign in to triage and track your team's bugs.</p>

          {error && (
            <div className="mb-4 rounded-lg bg-alert-critical/10 border border-alert-critical/30 px-3.5 py-2.5 text-sm text-alert-critical">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                className="input-field"
                placeholder="you@team.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="label" htmlFor="password">Password</label>
                <Link to="/forgot-password" className="text-xs text-signal-400 hover:text-signal-300">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-signal-400 hover:text-signal-300 font-medium">
              Create one
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Demo account: demo@bugadvisor.dev / demo1234 (after running seed.py)
        </p>
      </div>
    </div>
  )
}
