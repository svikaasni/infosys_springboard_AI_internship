import React, { useState, useEffect, useRef } from 'react'
import client from '../api/client'
import StatusBadge from '../components/StatusBadge.jsx'
import SeverityBadge from '../components/SeverityBadge.jsx'

export default function NeuralSandbox() {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const nodesRef = useRef([])
  const bugRef = useRef({ x: 0, y: 0, vx: 0.25, vy: -0.25, radius: 14, pulse: 0 })
  const particlesRef = useRef([])

  const [bugs, setBugs] = useState([])
  const [selectedBugId, setSelectedBugId] = useState(null)
  const [loadingBugs, setLoadingBugs] = useState(true)

  const [isPurging, setIsPurging] = useState(false)
  const [purgeProgress, setPurgeProgress] = useState(0)
  const [statusText, setStatusText] = useState('CNS Grid Stable. Select an incident signature to project into the neural grid.')
  const [bugResolved, setBugResolved] = useState(false)

  // Fetch bugs from backend
  const fetchBugs = async () => {
    try {
      const { data } = await client.get('/bugs?page_size=50')
      const items = data.items || []
      setBugs(items)
      if (!selectedBugId && items.length > 0) {
        // Default to first open or non-resolved bug
        const openBug = items.find(b => b.status !== 'Resolved' && b.status !== 'Closed') || items[0]
        setSelectedBugId(openBug.id)
      }
    } catch (e) {
      console.error('Failed fetching bugs for sandbox:', e)
    } finally {
      setLoadingBugs(false)
    }
  }

  useEffect(() => {
    fetchBugs()
  }, [])

  const activeBug = bugs.find(b => b.id === selectedBugId) || null

  // Sync state when activeBug changes
  useEffect(() => {
    if (activeBug) {
      const isResolved = activeBug.status === 'Resolved' || activeBug.status === 'Closed'
      setBugResolved(isResolved)
      setPurgeProgress(isResolved ? 100 : 0)
      setStatusText(
        isResolved
          ? 'CNS Grid integrity fully restored. Neural path active.'
          : 'WARNING: Glitch bug is destabilizing connections. Click Code Purge to trigger neural energy streams.'
      )
    } else {
      setBugResolved(false)
      setPurgeProgress(0)
      setStatusText('CNS Grid Stable. Select an incident signature to project into the neural grid.')
    }
  }, [activeBug])

  // Canvas resize helper
  const resizeCanvas = (canvas) => {
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width || 800
    canvas.height = 480
  }

  // Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    resizeCanvas(canvas)

    const handleResize = () => resizeCanvas(canvas)
    window.addEventListener('resize', handleResize)

    // Populate stable AI nodes
    const nodeCount = 14
    const stableNodes = []
    for (let i = 0; i < nodeCount; i++) {
      stableNodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 4 + 4,
        pulse: Math.random() * Math.PI,
        pulseSpeed: Math.random() * 0.02 + 0.01,
      })
    }
    nodesRef.current = stableNodes

    // Center bug node initially
    bugRef.current.x = canvas.width / 2
    bugRef.current.y = canvas.height / 2

    const draw = () => {
      ctx.fillStyle = '#060812'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // 1. Move and draw stable nodes
      nodesRef.current.forEach(node => {
        node.x += node.vx
        node.y += node.vy

        if (node.x < 10 || node.x > canvas.width - 10) node.vx *= -1
        if (node.y < 10 || node.y > canvas.height - 10) node.vy *= -1

        node.pulse += node.pulseSpeed
        const r = node.radius + Math.sin(node.pulse) * 1.5

        // Connect nearby stable nodes
        nodesRef.current.forEach(other => {
          const dist = Math.hypot(node.x - other.x, node.y - other.y)
          if (dist < 130) {
            ctx.strokeStyle = `rgba(34, 211, 238, ${0.18 * (1 - dist / 130)})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(other.x, other.y)
            ctx.stroke()
          }
        })

        // Draw stable node glow
        ctx.shadowBlur = 10
        ctx.shadowColor = '#22d3ee'
        ctx.fillStyle = 'rgba(34, 211, 238, 0.85)'
        ctx.beginPath()
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      })

      // 2. Move and draw active Glitch Bug Node
      if (activeBug && !bugResolved) {
        const bug = bugRef.current
        bug.x += bug.vx
        bug.y += bug.vy

        if (bug.x < 50 || bug.x > canvas.width - 50) bug.vx *= -1
        if (bug.y < 50 || bug.y > canvas.height - 50) bug.vy *= -1

        bug.pulse += 0.05
        const br = bug.radius + Math.sin(bug.pulse) * 2

        // Draw warning vectors from nearby AI nodes
        nodesRef.current.forEach(node => {
          const dist = Math.hypot(node.x - bug.x, node.y - bug.y)
          if (dist < 190) {
            ctx.strokeStyle = `rgba(244, 63, 94, ${0.45 * (1 - dist / 190)})`
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(bug.x, bug.y)
            ctx.stroke()
          }
        })

        // Draw glitch bug glow
        ctx.shadowBlur = 16
        ctx.shadowColor = '#f43f5e'
        ctx.fillStyle = 'rgba(244, 63, 94, 0.9)'
        ctx.beginPath()
        ctx.arc(bug.x, bug.y, br, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        ctx.fillStyle = '#ffffff'
        ctx.font = '12px "Inter", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('👾', bug.x, bug.y)
      }

      // 3. Purge Beam particles
      if (isPurging && activeBug && !bugResolved) {
        nodesRef.current.forEach(node => {
          if (Math.random() < 0.12) {
            const angle = Math.atan2(bugRef.current.y - node.y, bugRef.current.x - node.x)
            particlesRef.current.push({
              x: node.x,
              y: node.y,
              vx: Math.cos(angle) * 4.2,
              vy: Math.sin(angle) * 4.2,
              color: Math.random() > 0.5 ? '#22d3ee' : '#a855f7',
            })
          }
        })

        // Update and draw particles
        particlesRef.current.forEach((p, idx) => {
          p.x += p.vx
          p.y += p.vy

          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2)
          ctx.fill()

          const dist = Math.hypot(p.x - bugRef.current.x, p.y - bugRef.current.y)
          if (dist < 12) {
            particlesRef.current.splice(idx, 1)
          }
        })
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [activeBug, bugResolved, isPurging])

  const executePurge = () => {
    if (!selectedBugId) return
    setIsPurging(true)
    setStatusText('CNS Core: Targeting incident virus. Adjusting alignment arrays...')

    let progress = 0
    const interval = setInterval(async () => {
      progress += 5
      setPurgeProgress(progress)

      if (progress === 25) {
        setStatusText('CNS Core: Beam connected. Flooding infected node with code patches...')
      } else if (progress === 60) {
        setStatusText('CNS Core: Compiling syntax blocks. Running AST and lint checks...')
      } else if (progress === 85) {
        setStatusText('CNS Core: Testing regression validations. PURGING THREAT SIGNATURE...')
      } else if (progress >= 100) {
        clearInterval(interval)

        try {
          await client.post(`/bugs/${selectedBugId}/verify`)
          setIsPurging(false)
          setBugResolved(true)
          setStatusText('CNS Core: CODE PURGE SUCCESSFUL. System integrity restored.')
          await fetchBugs()
        } catch (err) {
          setIsPurging(false)
          setStatusText('CNS Core: Connection disrupted during verify.')
        }
      }
    }, 150)
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md border border-cyan-400/20 bg-cyan-400/10 font-mono text-[10px] font-bold text-cyan-300">
              CNS
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
              Central Neural System
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Neural Sandbox Grid
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Real-time visual neural node simulation, live threat anomaly projection, and automated code-purge remediation.
          </p>
        </div>

        {/* Bug Switcher Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-slate-400">Project Incident:</label>
          <select
            className="input-field w-64 text-xs font-mono"
            value={selectedBugId || ''}
            onChange={(e) => setSelectedBugId(Number(e.target.value))}
            disabled={isPurging}
          >
            {bugs.map((b) => (
              <option key={b.id} value={b.id}>
                #{b.id} — {(b.title || 'Incident').slice(0, 32)} [{b.status || 'Open'}]
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Canvas + Controller */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Canvas Panel (Span 2) */}
        <div className="panel lg:col-span-2 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              <h3 className="text-sm font-semibold text-slate-100">Central Neural Network Topology</h3>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="h-2 w-2 rounded-full bg-cyan-400" /> Stable Node
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Glitch Bug
              </span>
            </div>
          </div>

          <div className="relative flex-1 bg-[#060812] min-h-[480px]">
            <canvas ref={canvasRef} className="w-full h-full block" />
          </div>
        </div>

        {/* Neural Core Controller Panel */}
        <div className="panel p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md border border-violet-400/20 bg-violet-500/10 font-mono text-[10px] font-bold text-violet-300">
                  CMD
                </span>
                <h3 className="text-sm font-semibold text-slate-100">Neural Core Controller</h3>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                bugResolved
                  ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-400/20 bg-rose-500/10 text-rose-300'
              }`}>
                {bugResolved ? '🟢 GRID SECURE' : '👾 VIRUS ACTIVE'}
              </span>
            </div>

            {!activeBug ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No active bug selected. Select or report an incident to project into the CNS node grid.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Target Incident</p>
                  <h4 className="mt-1 text-sm font-semibold text-white">
                    #{activeBug.id} — {activeBug.title || 'Untitled Incident'}
                  </h4>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3.5 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Signature Vector:</span>
                    <span className="font-mono text-cyan-300">{activeBug.category || 'General Software'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Threat Severity:</span>
                    <SeverityBadge severity={activeBug.severity} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Lifecycle Status:</span>
                    <StatusBadge status={activeBug.status} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Corruption Level:</span>
                    <span className="font-mono text-slate-300">
                      {bugResolved ? '0% (Nominal)' : '48% (Destabilized)'}
                    </span>
                  </div>
                </div>

                {/* Purge Progress bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Purge Execution</span>
                    <span className="font-mono text-cyan-300">{purgeProgress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 via-violet-500 to-rose-500 transition-all duration-150"
                      style={{ width: `${purgeProgress}%` }}
                    />
                  </div>
                  <p className="text-[11px] leading-4 text-slate-400 pt-1 italic">
                    {statusText}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-white/[0.06] mt-6">
            <button
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                bugResolved
                  ? 'border border-emerald-400/20 bg-emerald-500/10 text-emerald-300 cursor-default'
                  : isPurging
                    ? 'border border-cyan-400/30 bg-cyan-500/20 text-cyan-200 animate-pulse'
                    : 'btn-primary shadow-[0_0_20px_rgba(124,92,255,0.35)] hover:shadow-[0_0_25px_rgba(124,92,255,0.5)]'
              }`}
              onClick={executePurge}
              disabled={isPurging || bugResolved || !activeBug}
            >
              {bugResolved
                ? '✓ NEURAL GRID DE-BUGGED'
                : isPurging
                  ? 'BEAM PURGING IN PROGRESS…'
                  : 'INITIATE NEURAL CODE PURGE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
