import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { Play, Loader2, CheckCircle2 } from 'lucide-react'

export default function Home() {
  const [username, setUsername] = useState('Pannawath')
  const [mcVersion, setMcVersion] = useState('1.21.4')
  const [isLaunching, setIsLaunching] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [progress, setProgress] = useState({ downloaded: 0, total: 0, percent: 0 })

  useEffect(() => {
    let unlistenStatus
    let unlistenProgress

    listen('launch-status', (event) => {
      setStatusMessage(event.payload.message)
      if (event.payload.status === 'running') {
        setIsLaunching(false)
      }
    }).then((un) => {
      unlistenStatus = un
    })

    listen('download-progress', (event) => {
      const data = event.payload
      if (data.total) {
        const pct = Math.round((data.downloaded / data.total) * 100)
        setProgress({
          downloaded: data.downloaded,
          total: data.total,
          percent: pct,
        })
      }
    }).then((un) => {
      unlistenProgress = un
    })

    return () => {
      if (unlistenStatus) unlistenStatus()
      if (unlistenProgress) unlistenProgress()
    }
  }, [])

  const handlePlay = async () => {
    try {
      setIsLaunching(true)
      setStatusMessage('Initializing launcher pipeline...')
      setProgress({ downloaded: 0, total: 0, percent: 0 })

      await invoke('launch_game', {
        req: {
          profile_id: 'default',
          username: username.trim() || 'Player',
          mc_version: mcVersion,
          fabric_version: null,
          min_ram_mb: 1024,
          max_ram_mb: 4096,
        },
      })
    } catch (err) {
      console.error(err)
      setStatusMessage(`Error: ${err}`)
      setIsLaunching(false)
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[var(--color-surface-border)] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Steam-Style Library
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Ready to test: Offline authentication, Zulu JRE, and game engine launcher.
          </p>
        </div>

        {/* User / offline session tag */}
        <div className="flex items-center gap-3 bg-[var(--color-surface)] px-4 py-2 rounded-xl border border-[var(--color-surface-border)]">
          <span className="text-xs text-[var(--color-text-muted)]">Player:</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-transparent text-sm font-semibold text-[var(--color-text)] focus:outline-none border-b border-transparent focus:border-[var(--color-accent)] w-28"
          />
        </div>
      </div>

      {/* Grid of Profiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Main Test Profile Card */}
        <div className="rounded-2xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-surface-border)] hover:border-[var(--color-accent)] transition-all shadow-lg group flex flex-col justify-between">
          <div className="h-44 bg-gradient-to-br from-[#1e102e] to-[#0d0d18] relative flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative text-center">
              <span className="text-3xl font-extrabold tracking-wider text-white drop-shadow">
                MINECRAFT
              </span>
              <p className="text-xs text-[var(--color-accent)] font-medium mt-1">
                Java Edition (Fabric Ready)
              </p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[var(--color-text)] text-base">
                  Vanilla / Fabric Baseline
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]">
                  v{mcVersion}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                ZGC Enabled • Generational Mode • Offline Auth
              </p>
            </div>

            {/* Version picker */}
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)]">Minecraft Version</label>
              <select
                value={mcVersion}
                onChange={(e) => setMcVersion(e.target.value)}
                disabled={isLaunching}
                className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-surface-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              >
                <option value="1.21.4">1.21.4 (Latest)</option>
                <option value="1.21.1">1.21.1</option>
                <option value="1.20.4">1.20.4</option>
                <option value="1.20.1">1.20.1 (Great for mods)</option>
              </select>
            </div>

            {/* Status box if launching */}
            {statusMessage && (
              <div className="p-3 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-surface-border)] text-xs space-y-2">
                <div className="flex items-center gap-2 text-[var(--color-text)]">
                  {isLaunching ? (
                    <Loader2 className="animate-spin text-[var(--color-accent)]" size={14} />
                  ) : (
                    <CheckCircle2 className="text-green-400" size={14} />
                  )}
                  <span className="truncate">{statusMessage}</span>
                </div>
                {progress.total > 0 && isLaunching && (
                  <div className="space-y-1">
                    <div className="w-full h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-accent)] transition-all duration-150"
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-[var(--color-text-muted)]">
                      <span>{progress.percent}%</span>
                      <span>
                        {(progress.downloaded / 1024 / 1024).toFixed(1)} MB /{' '}
                        {(progress.total / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handlePlay}
              disabled={isLaunching}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLaunching ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Launching Game...</span>
                </>
              ) : (
                <>
                  <Play size={16} fill="currentColor" />
                  <span>PLAY NOW</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
