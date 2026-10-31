import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { Play, Loader2, CheckCircle2, Sliders, Sparkles } from 'lucide-react'

export default function Home() {
  const [username, setUsername] = useState('Pannawath')
  const [profiles, setProfiles] = useState([])
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [isLaunching, setIsLaunching] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [progress, setProgress] = useState({ downloaded: 0, total: 0, percent: 0 })

  useEffect(() => {
    loadProfiles()

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

  const loadProfiles = async () => {
    try {
      const list = await invoke('list_profiles')
      setProfiles(list)
      if (list.length > 0 && !selectedProfileId) {
        setSelectedProfileId(list[0].id)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const activeProfile = profiles.find((p) => p.id === selectedProfileId) || profiles[0]

  const handlePlay = async () => {
    if (!activeProfile) return
    try {
      setIsLaunching(true)
      setStatusMessage('Initializing launcher pipeline...')
      setProgress({ downloaded: 0, total: 0, percent: 0 })

      await invoke('launch_game', {
        req: {
          profile_id: activeProfile.id,
          username: username.trim() || 'Player',
          mc_version: activeProfile.mc_version,
          fabric_version: null,
          min_ram_mb: activeProfile.min_ram_mb || 1024,
          max_ram_mb: activeProfile.max_ram_mb || 4096,
        },
      })
    } catch (err) {
      console.error(err)
      setStatusMessage(`Error: ${err}`)
      setIsLaunching(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Top Banner / Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-surface-border)] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)] flex items-center gap-2">
            <span>Steam Library</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)] font-semibold border border-[var(--color-accent)]/30">
              Fabric Ready
            </span>
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Choose your profile and jump straight into stutter-free Minecraft.
          </p>
        </div>

        {/* Offline Player Input */}
        <div className="flex items-center gap-3 bg-[var(--color-surface)] px-4 py-2 rounded-xl border border-[var(--color-surface-border)] shadow-sm">
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
            Offline Player
          </span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-[var(--color-surface-raised)] text-sm font-semibold text-[var(--color-text)] focus:outline-none px-3 py-1 rounded-lg border border-[var(--color-surface-border)] focus:border-[var(--color-accent)] w-36 transition-colors"
          />
        </div>
      </div>

      {/* Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {profiles.map((profile) => {
          const isSelected = profile.id === selectedProfileId
          return (
            <div
              key={profile.id}
              onClick={() => setSelectedProfileId(profile.id)}
              className={`rounded-2xl overflow-hidden bg-[var(--color-surface)] border transition-all shadow-md flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'border-[var(--color-accent)] shadow-[0_0_20px_rgba(139,92,246,0.15)] ring-1 ring-[var(--color-accent)]'
                  : 'border-[var(--color-surface-border)] hover:border-[var(--color-text-muted)]'
              }`}
            >
              {/* Card Banner */}
              <div className="h-44 bg-gradient-to-br from-[#1a112c] via-[#0f0e1c] to-[#07060e] relative flex items-center justify-center p-4 overflow-hidden group">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[var(--color-accent)]/20 via-transparent to-transparent opacity-60" />
                <div className="relative text-center select-none">
                  <span className="text-2xl font-black tracking-widest text-white drop-shadow-md">
                    MINECRAFT
                  </span>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <Sparkles size={12} className="text-[var(--color-accent)]" />
                    <span className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wider">
                      Fabric Engine
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-[var(--color-text)]">
                      {profile.name}
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--color-surface-raised)] text-[var(--color-accent)] font-semibold border border-[var(--color-surface-border)]">
                      v{profile.mc_version}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    ZGC Garbage Collector • Generational Tuned
                  </p>
                </div>

                <div className="text-xs text-[var(--color-text-muted)] flex justify-between pt-2 border-t border-[var(--color-surface-border)]">
                  <span>RAM: {profile.max_ram_mb} MB</span>
                  <span>Playtime: {Math.round(profile.play_time_secs / 3600)} hrs</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Launch Control Panel */}
      {activeProfile && (
        <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-surface-border)] space-y-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">
                Active Selection
              </span>
              <h2 className="text-lg font-bold text-[var(--color-text)]">
                {activeProfile.name} (Minecraft {activeProfile.mc_version})
              </h2>
            </div>

            <button
              onClick={handlePlay}
              disabled={isLaunching}
              className="py-3 px-8 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-bold flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLaunching ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Launching Process...</span>
                </>
              ) : (
                <>
                  <Play size={18} fill="currentColor" />
                  <span>PLAY MINECRAFT</span>
                </>
              )}
            </button>
          </div>

          {/* Progress / Status feedback */}
          {statusMessage && (
            <div className="p-4 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-surface-border)] text-xs space-y-2.5 animate-fadeIn">
              <div className="flex items-center gap-2 text-[var(--color-text)]">
                {isLaunching ? (
                  <Loader2 className="animate-spin text-[var(--color-accent)]" size={15} />
                ) : (
                  <CheckCircle2 className="text-green-400" size={15} />
                )}
                <span className="font-medium">{statusMessage}</span>
              </div>

              {progress.total > 0 && isLaunching && (
                <div className="space-y-1.5">
                  <div className="w-full h-2 bg-[var(--color-surface)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-accent)] transition-all duration-150 rounded-full"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-[var(--color-text-muted)] font-mono">
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
        </div>
      )}
    </div>
  )
}
