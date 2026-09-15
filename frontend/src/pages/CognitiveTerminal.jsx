import React, { useState, useRef, useEffect } from 'react'
import client from '../api/client'

export default function CognitiveTerminal() {
  const [cliInput, setCliInput] = useState('')
  const [terminalLogs, setTerminalLogs] = useState([
    { text: 'COGNITIVE INTEGRATED SHELL v3.5 -- SECURE DEPLOYMENT RECOVERY UNIT', type: 'system' },
    { text: 'ESTABLISHING ENCRYPTED LINK TO BUG DATABASE CLUSTER... SUCCESS.', type: 'system' },
    { text: "Type 'help' to review list of active terminal diagnostic commands.", type: 'system' },
  ])
  const [allBugs, setAllBugs] = useState([])
  const screenRef = useRef(null)

  const fetchBugs = async () => {
    try {
      const { data } = await client.get('/bugs?page_size=50')
      setAllBugs(data.items || [])
    } catch (e) {
      console.error('Failed fetching bugs in terminal:', e)
    }
  }

  useEffect(() => {
    fetchBugs()
  }, [])

  // Auto Scroll Terminal to bottom
  useEffect(() => {
    if (screenRef.current) {
      screenRef.current.scrollTop = screenRef.current.scrollHeight
    }
  }, [terminalLogs])

  const writeLine = (text, type = 'line') => {
    setTerminalLogs(prev => [...prev, { text, type }])
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const cmd = cliInput.trim()
    setCliInput('')
    if (!cmd) return

    // Log the user's command
    setTerminalLogs(prev => [...prev, { text: `developer@bugsense:~# ${cmd}`, type: 'user' }])

    // Parse command
    processCommand(cmd)
  }

  const processCommand = async (text) => {
    const parts = text.split(/\s+/)
    const command = parts[0].toLowerCase()
    const args = parts.slice(1)

    switch (command) {
      case 'help':
        writeLine('Available System Diagnostic & Recovery Commands:', 'success')
        writeLine('  <b>help</b>              View diagnostic command listing.')
        writeLine('  <b>bugs</b>              Format ASCII table of database incidents.')
        writeLine('  <b>scan [id]</b>          Run error log classification & footprint checks.')
        writeLine('  <b>patch [id]</b>         Execute sandbox compiler verify test suite.')
        writeLine('  <b>clear</b>             Empty terminal logs.')
        break

      case 'clear':
        setTerminalLogs([])
        break

      case 'bugs':
        if (allBugs.length === 0) {
          writeLine('No logs found in database archive.', 'warning')
          break
        }
        let ascii = 'ID    STATUS       SEVERITY    TITLE\n'
        ascii += '------------------------------------------------------------\n'
        allBugs.forEach(b => {
          const paddedId = String(b.id).padEnd(6, ' ')
          const paddedStatus = String(b.status || 'Open').padEnd(13, ' ')
          const paddedSeverity = String(b.severity || 'Medium').padEnd(12, ' ')
          const titleStr = (b.title || 'Untitled').slice(0, 30)
          ascii += `${paddedId}${paddedStatus}${paddedSeverity}${titleStr}\n`
        })
        writeLine(`<pre class="font-mono text-[11px] leading-4 text-cyan-300">${ascii}</pre>`)
        break

      case 'scan':
        if (args.length === 0) {
          writeLine('Usage: scan [incident_id] -- e.g., scan 1', 'warning')
          break
        }
        const scanId = parseInt(args[0])
        const scanTarget = allBugs.find(b => b.id === scanId)
        if (!scanTarget) {
          writeLine(`Error: Incident #${scanId} not found in database registry.`, 'danger')
        } else {
          writeLine(`Ingesting Incident #${scanTarget.id} footprint...`, 'system')
          writeLine(`> Summary Title: ${scanTarget.title || 'Untitled'}`)
          writeLine(`> Vector Class: ${scanTarget.category || 'General'}`)
          writeLine(`> Impact level: ${scanTarget.severity || 'Medium'}`)
          writeLine(`> Status: ${scanTarget.status || 'Open'}`)
          if (scanTarget.resolution_notes) {
            writeLine(`> Resolution: ${(scanTarget.resolution_notes || '').slice(0, 100)}...`)
          }
        }
        break

      case 'patch':
        if (args.length === 0) {
          writeLine('Usage: patch [incident_id] -- e.g., patch 1', 'warning')
          break
        }
        const patchId = parseInt(args[0])
        const patchTarget = allBugs.find(b => b.id === patchId)
        if (!patchTarget) {
          writeLine(`Error: Incident #${patchId} not found in database registry.`, 'danger')
        } else {
          runCliPatchVerify(patchId)
        }
        break

      default:
        writeLine(`cli: command not found: '${command}'. Type 'help' for support.`, 'danger')
    }
  }

  const runCliPatchVerify = async (id) => {
    writeLine(` CNS Core: Targeting incident patch #${id}...`, 'system')
    try {
      const res = await client.post(`/bugs/${id}/verify`)
      const data = res.data

      let delay = 0
      data.logs.forEach((log) => {
        setTimeout(() => {
          const isSuccess = log.includes('SUCCESS') || log.includes('PASS')
          writeLine(`> ${log}`, isSuccess ? 'success' : 'line')
        }, delay)
        delay += 400
      })

      setTimeout(async () => {
        await fetchBugs()
      }, delay)

    } catch (e) {
      writeLine(`Error: Failed patch execution. Details: ${e.message}`, 'danger')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md border border-violet-400/20 bg-violet-500/10 font-mono text-[10px] font-bold text-violet-300">
            CLI
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
            Interactive Diagnostics Terminal
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Cognitive Prompt Shell
        </h1>
        <p className="text-xs text-slate-400">
          Command-driven diagnostic execution environment. Query live incidents, scan error footprints, and dispatch automated patch verifications.
        </p>
      </div>

      {/* Terminal Container */}
      <div className="panel overflow-hidden flex flex-col border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0c1020] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-500/80" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 font-mono text-xs font-semibold text-slate-300">
              developer@bugsense-cli:~ (sh)
            </span>
          </div>
          <span className="rounded border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 font-mono text-[10px] text-violet-300">
            V3.5-SHELL
          </span>
        </div>

        {/* Screen Area */}
        <div
          ref={screenRef}
          className="h-[480px] overflow-y-auto bg-[#04060d] p-5 font-mono text-xs leading-6"
        >
          {terminalLogs.map((log, index) => (
            <div
              key={index}
              className={`transition-opacity duration-150 ${
                log.type === 'user'
                  ? 'text-cyan-300 font-semibold'
                  : log.type === 'system'
                    ? 'text-slate-500'
                    : log.type === 'success'
                      ? 'text-emerald-400 font-semibold'
                      : log.type === 'warning'
                        ? 'text-amber-400'
                        : log.type === 'danger'
                          ? 'text-rose-400'
                          : 'text-slate-300'
              }`}
              dangerouslySetInnerHTML={{ __html: log.text }}
            />
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="flex border-t border-white/[0.08] bg-[#0a0d1a]">
          <span className="flex items-center pl-4 font-mono text-xs font-bold text-cyan-400">
            developer@bugsense:~#
          </span>
          <input
            type="text"
            className="w-full bg-transparent px-3 py-3 font-mono text-xs text-white focus:outline-none placeholder-slate-600"
            value={cliInput}
            onChange={(e) => setCliInput(e.target.value)}
            placeholder="Type 'help', 'bugs', 'scan 1', or 'patch 1'..."
            autoFocus
          />
          <button
            type="submit"
            className="border-l border-white/[0.08] bg-violet-500/10 px-6 font-mono text-xs font-bold text-violet-300 hover:bg-violet-500/20 transition-colors"
          >
            EXEC
          </button>
        </form>
      </div>
    </div>
  )
}
