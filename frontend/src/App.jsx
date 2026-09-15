import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Layout from './components/Layout.jsx'

import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Dashboard from './pages/Dashboard.jsx'
import SubmitBug from './pages/SubmitBug.jsx'
import BugHistory from './pages/BugHistory.jsx'
import BugDetails from './pages/BugDetails.jsx'
import DuplicateIssues from './pages/DuplicateIssues.jsx'
import KnowledgeBase from './pages/KnowledgeBase.jsx'
import AddPastDefect from './pages/AddPastDefect.jsx'
import Reports from './pages/Reports.jsx'
import Analytics from './pages/Analytics.jsx'
import Team from './pages/Team.jsx'
import Profile from './pages/Profile.jsx'
import AdminPanel from './pages/AdminPanel.jsx'
import Settings from './pages/Settings.jsx'
import BugPrediction from './pages/BugPrediction.jsx'
import NeuralSandbox from './pages/NeuralSandbox.jsx'
import CognitiveTerminal from './pages/CognitiveTerminal.jsx'

function withLayout(Page, { adminOnly = false } = {}) {
  return (
    <ProtectedRoute>
      <Layout>
        {adminOnly ? <AdminGate><Page /></AdminGate> : <Page />}
      </Layout>
    </ProtectedRoute>
  )
}

function AdminGate({ children }) {
  const { user } = useAuth()
  if (user?.role !== 'Admin') {
    return (
      <div className="panel p-8 text-center max-w-md mx-auto">
        <p className="text-sm text-slate-300 font-medium mb-1">Admins only</p>
        <p className="text-sm text-slate-500">You need Admin access to view this page.</p>
      </div>
    )
  }
  return children
}

export default function App() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route path="/dashboard" element={withLayout(Dashboard)} />
      <Route path="/submit-bug" element={withLayout(SubmitBug)} />
      <Route path="/bugs" element={withLayout(BugHistory)} />
      <Route path="/bugs/:id" element={withLayout(BugDetails)} />
      <Route path="/duplicate-issues" element={withLayout(DuplicateIssues)} />
      <Route path="/duplicates" element={<Navigate to="/duplicate-issues" replace />} />
      <Route path="/knowledge-base" element={withLayout(KnowledgeBase)} />
      <Route path="/knowledge-base/add" element={withLayout(AddPastDefect)} />
      <Route path="/neural-sandbox" element={withLayout(NeuralSandbox)} />
      <Route path="/terminal" element={withLayout(CognitiveTerminal)} />
      <Route path="/reports" element={withLayout(Reports)} />
      <Route path="/analytics" element={withLayout(Analytics)} />
      <Route path="/team" element={withLayout(Team)} />
      <Route path="/profile" element={withLayout(Profile)} />
      <Route path="/admin" element={withLayout(AdminPanel, { adminOnly: true })} />
      <Route path="/settings" element={withLayout(Settings)} />
      <Route path="/bug-prediction" element={withLayout(BugPrediction)} />

      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}
