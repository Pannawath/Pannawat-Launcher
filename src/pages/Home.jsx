import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { Play, Loader2, CheckCircle2, Sparkles, User, Cpu } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'

// Curated high quality Minecraft scenery wallpapers
const MINECRAFT_SCENERIES = [
  'https://images.unsplash.com/photo-1627856013091-fed6e4e30025?q=80&w=1200&auto=format&fit=crop', // Lush Cherry / Landscape
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop', // Fantasy Sunset Biome
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop', // Dark Forest / Mountains
  'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=1200&auto=format&fit=crop', // Vibrant Nature
]

export default function Home() {
  const [username, setUsername] = useState('Pannawath')
  const [profiles, setProfiles] = useState([])
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [selectedVersion, setSelectedVersion] = useState('26.3')
  const [versions, setVersions] = useState([])
  const [isLaunching, setIsLaunching] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [progress, setProgress] = useState({ downloaded: 0, total: 0, percent: 0 })

  const showSnapshots = useSettingsStore((s) => s.showSnapshots)
  const allocatedRamMb = useSettingsStore((s) => s.allocatedRamMb)

  useEffect(() => {
    loadProfiles()
    loadVersions()

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
  }, [showSnapshots])

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

  const loadVersions = async () => {
    try {
      const list = await invoke('get_available_versions', {
        includeSnapshots: showSnapshots,
      })
      setVersions(list)

      const has263 = list.some((v) => v.id === '26.3')
      if (has263) {
        setSelectedVersion('26.3')
      } else if (list.length > 0 && !selectedVersion) {
        setSelectedVersion(list[0].id)
      }
    } catch (e) {
      console.error('Failed to load version manifest:', e)
    }
  }

  const activeProfile = profiles.find((p) => p.id === selectedProfileId) || profiles[0]

  const handlePlay = async () => {
    if (!activeProfile) return
    try {
      setIsLaunching(true)
      setStatusMessage(`Initializing launcher for Minecraft ${selectedVersion}...`)
      setProgress({ downloaded: 0, total: 0, percent: 0 })

      await invoke('launch_game', {
        req: {
          profile_id: activeProfile.id,
          profile_name: `${activeProfile.name} (${selectedVersion})`,
          username: username.trim() || 'Player',
          mc_version: selectedVersion,
          fabric_version: null,
          min_ram_mb: 1024,
          max_ram_mb: allocatedRamMb || 4096,
        },
      })
    } catch (err) {
      console.error(err)
      setStatusMessage(`Error: ${err}`)
      setIsLaunching(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[var(--color-surface-border)] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)] flex items-center gap-2.5">
            <span>Minecraft Library</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-semibold border border-[var(--color-accent)]/30">
              Fabric Ready
            </span>
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Choose your profile, select Minecraft version, and launch with Generational ZGC.
          </p>
        </div>

        {/* Offline Player Input */}
        <div className="flex items-center gap-3 bg-[var(--color-surface)] px-4 py-2 rounded-xl border border-[var(--color-surface-border)] shadow-sm">
          <User size={14} className="text-[var(--color-accent)]" />
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
            Player:
          </span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-[var(--color-surface-raised)] text-sm font-semibold text-[var(--color-text)] focus:outline-none px-3 py-1 rounded-lg border border-[var(--color-surface-border)] focus:border-[var(--color-accent)] w-36 transition-colors"
          />
        </div>
      </div>

      {/* Profile Cards Grid (Original layout with scenic Minecraft artworks) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {profiles.map((profile, index) => {
          const isSelected = profile.id === selectedProfileId
          const sceneryImage = MINECRAFT_SCENERIES[index % MINECRAFT_SCENERIES.length]

          return (
            <div
              key={profile.id}
              onClick={() => setSelectedProfileId(profile.id)}
              className={`rounded-2xl overflow-hidden bg-[var(--color-surface)] border transition-all duration-200 shadow-md flex flex-col justify-between cursor-pointer group ${
                isSelected
                  ? 'border-[var(--color-accent)] shadow-[0_0_20px_rgba(139,92,246,0.2)] ring-1 ring-[var(--color-accent)]'
                  : 'border-[var(--color-surface-border)] hover:border-[var(--color-accent)]/50'
              }`}
            >
              {/* Card Banner with Minecraft Scenery Artwork */}
              <div className="h-44 relative flex items-end p-4 overflow-hidden">
                <img
                  src={sceneryImage}
                  alt="Minecraft Scenery"
                  className="absolute inset-0 w-full h-full object-cover brightness-[0.6] group-hover:scale-105 group-hover:brightness-[0.7] transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] via-transparent to-black/30" />

                <div className="relative z-10 w-full flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black tracking-widest text-white uppercase drop-shadow-md">
                      MINECRAFT
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Sparkles size={11} className="text-[var(--color-accent)]" />
                      <span className="text-[10px] font-bold text-white/90 drop-shadow">
                        Fabric Modloader
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="text-[10px] bg-[var(--color-accent)] text-white font-bold px-2 py-0.5 rounded-full shadow">
                      SELECTED
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-[var(--color-text)]">
                      {profile.name}
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--color-surface-raised)] text-[var(--color-accent)] font-semibold border border-[var(--color-surface-border)]">
                      v{selectedVersion}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    ZGC Garbage Collector • Generational Tuned
                  </p>
                </div>

                <div className="text-xs text-[var(--color-text-muted)] flex justify-between pt-3 border-t border-[var(--color-surface-border)]">
                  <span>RAM: {allocatedRamMb} MB</span>
                  <span>Playtime: {Math.round(profile.play_time_secs / 3600)} hrs</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Launch Control Panel */}
      {activeProfile && (
        <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-surface-border)] space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="space-y-1.5">
              <span className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">
                Launch Configuration
              </span>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-[var(--color-text)]">
                  {activeProfile.name}
                </h2>

                {/* Minecraft Version Picker */}
                <div className="flex items-center gap-2 bg-[var(--color-surface-raised)] px-3 py-1 rounded-xl border border-[var(--color-surface-border)]">
                  <span className="text-xs text-[var(--color-text-muted)] font-medium">Version:</span>
                  <select
                    value={selectedVersion}
                    onChange={(e) => setSelectedVersion(e.target.value)}
                    disabled={isLaunching}
                    className="bg-transparent text-xs font-bold text-[var(--color-accent)] focus:outline-none cursor-pointer"
                  >
                    <option value="26.3" className="bg-[#16161f] text-[var(--color-accent)] font-bold">
                      26.3 (Official Target)
                    </option>
                    {versions
                      .filter((v) => v.id !== '26.3')
                      .map((v) => (
                        <option key={v.id} value={v.id} className="bg-[#16161f] text-gray-200">
                          {v.id} ({v.type})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Big Launch Button */}
            <button
              onClick={handlePlay}
              disabled={isLaunching}
              className="py-3 px-8 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-bold flex items-center justify-center gap-2.5 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLaunching ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Launching {selectedVersion}...</span>
                </>
              ) : (
                <>
                  <Play size={18} fill="currentColor" />
                  <span>PLAY MINECRAFT {selectedVersion}</span>
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
