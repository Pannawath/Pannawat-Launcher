import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { openUrl } from '@tauri-apps/plugin-opener'
import {
  Play,
  RotateCw,
  Layers,
  ChevronDown,
  Cpu,
  Sparkles,
  Square,
  Gamepad2,
  Star,
  Settings as SettingsIcon,
  ChevronRight,
  LayoutGrid,
  Minus,
  Maximize2,
  X,
  ExternalLink,
  Sliders,
  Plus,
  Trash2,
  Search,
  Download,
  Check,
  Info,
} from 'lucide-react'
import { useSettingsStore } from './store/settingsStore'

// Initial fallback for Minecraft before backend scan resolves
const INITIAL_MINECRAFT = {
  id: 'minecraft',
  name: 'Minecraft: Java Edition',
  platform: 'minecraft',
  banner_url: 'https://images.unsplash.com/photo-1627856013091-fed6e4e30025?auto=format&fit=crop&w=1920&q=80',
  icon_url: 'https://cdn.iconscout.com/icon/free/png-256/free-minecraft-logo-icon-download-in-svg-png-gif-file-formats--brand-social-media-pack-logos-icons-2795415.png',
  description: 'Explore infinite blocky worlds, craft tools, build majestic structures, and battle monsters. Featuring official version 26.3, Microsoft Java 25 LTS, and ultra-low latency ZGC optimization.',
  launch_target: '26.3',
  is_running: false,
  tag: 'Most Played',
}

export default function App() {
  const {
    showSnapshots,
    setShowSnapshots,
    selectedVersion,
    setSelectedVersion,
    allocatedRamMb,
    setAllocatedRamMb,
    minRamMb,
    setMinRamMb,
  } = useSettingsStore()

  // Real games state (strictly from machine scan + custom games)
  const [games, setGames] = useState([INITIAL_MINECRAFT])
  const [activeGameId, setActiveGameId] = useState('minecraft')
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('pannawat_favorites')
      return saved ? JSON.parse(saved) : ['minecraft']
    } catch {
      return ['minecraft']
    }
  })
  const [onlyFavorites, setOnlyFavorites] = useState(false)

  // Drawer & Modal States
  const [isModDrawerOpen, setIsModDrawerOpen] = useState(false)
  const [modTab, setModTab] = useState('installed') // 'installed' | 'catalog'
  const [modSearchQuery, setModSearchQuery] = useState('')
  const [catalogMods, setCatalogMods] = useState([])
  const [isSearchingMods, setIsSearchingMods] = useState(false)
  const [installingModId, setInstallingModId] = useState(null)

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  // Minecraft specific state
  const [versions, setVersions] = useState([])
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false)
  const [installedMods, setInstalledMods] = useState([])
  const [launchStatus, setLaunchStatus] = useState('idle') // 'idle' | 'downloading' | 'running'
  const [launchMessage, setLaunchMessage] = useState('')
  const [downloadProgress, setDownloadProgress] = useState(null)

  // Window controls
  const handleMinimize = async () => {
    try {
      const win = getCurrentWindow()
      await win.minimize()
    } catch (e) {
      console.error('Minimize error:', e)
    }
  }

  const handleMaximize = async () => {
    try {
      const win = getCurrentWindow()
      await win.toggleMaximize()
    } catch (e) {
      console.error('Maximize error:', e)
    }
  }

  const handleClose = async () => {
    try {
      const win = getCurrentWindow()
      await win.close()
    } catch (e) {
      console.error('Close error:', e)
    }
  }

  // 1. Fetch Real Installed Games from System
  const loadGames = async () => {
    try {
      const list = await invoke('get_installed_games')
      if (list && list.length > 0) {
        setGames(list)
      }
    } catch (err) {
      console.error('Failed to load games:', err)
    }
  }

  useEffect(() => {
    loadGames()
  }, [])

  // 2. Fetch Minecraft Versions
  useEffect(() => {
    async function loadVersions() {
      try {
        const list = await invoke('get_available_versions')
        setVersions(list || [])
      } catch {
        setVersions([
          { id: '26.3', type: 'snapshot' },
          { id: '1.21.4', type: 'release' },
          { id: '1.21.3', type: 'release' },
        ])
      }
    }
    loadVersions()
  }, [])

  // 3. Fetch Installed Mods
  const loadInstalledMods = async () => {
    try {
      const mods = await invoke('list_installed_mods', { profileId: 'default' })
      setInstalledMods(mods || [])
    } catch {
      setInstalledMods([
        { file_name: 'sodium-0.6.9.jar', mod_name: 'Sodium', enabled: true },
        { file_name: 'lithium-0.14.7.jar', mod_name: 'Lithium', enabled: true },
        { file_name: 'ferritecore-7.1.1.jar', mod_name: 'FerriteCore', enabled: true },
        { file_name: 'immediatelyfast-1.3.3.jar', mod_name: 'ImmediatelyFast', enabled: true },
      ])
    }
  }

  useEffect(() => {
    loadInstalledMods()
  }, [])

  // 4. Toggle mod state
  const handleToggleMod = async (mod) => {
    try {
      await invoke('toggle_mod', {
        profileId: 'default',
        filename: mod.filename || mod.file_name,
        enable: !mod.enabled,
      })
      await loadInstalledMods()
    } catch (err) {
      console.error('Toggle mod error:', err)
      // optimistic update
      setInstalledMods((prev) =>
        prev.map((m) =>
          (m.filename || m.file_name) === (mod.filename || mod.file_name)
            ? { ...m, enabled: !m.enabled }
            : m
        )
      )
    }
  }

  // 5. In-App Modrinth Search & Install
  const handleSearchModrinth = async (query = modSearchQuery) => {
    setIsSearchingMods(true)
    try {
      const res = await invoke('search_mods', {
        req: {
          query: query || '',
          game_version: selectedVersion || '1.21.4',
          source: 'modrinth',
          limit: 15,
        },
      })
      setCatalogMods(res.hits || [])
    } catch (err) {
      console.error('Mod search error:', err)
    } finally {
      setIsSearchingMods(false)
    }
  }

  const handleInstallMod = async (modId) => {
    setInstallingModId(modId)
    try {
      await invoke('install_mod', {
        profileId: 'default',
        modId,
        gameVersion: selectedVersion || '1.21.4',
      })
      await loadInstalledMods()
    } catch (err) {
      console.error('Install mod error:', err)
    } finally {
      setInstallingModId(null)
    }
  }

  // Auto-search popular mods when catalog tab opens
  useEffect(() => {
    if (modTab === 'catalog' && catalogMods.length === 0) {
      handleSearchModrinth('')
    }
  }, [modTab])

  // 6. Custom Game Picker (Feature 1)
  const handleAddCustomGame = async () => {
    try {
      const newGame = await invoke('pick_custom_game')
      if (newGame) {
        await loadGames()
        setActiveGameId(newGame.id)
      }
    } catch (err) {
      console.error('Pick custom game error:', err)
    }
  }

  const handleRemoveCustomGame = async (e, id) => {
    e.stopPropagation()
    try {
      await invoke('remove_custom_game', { id })
      await loadGames()
      if (activeGameId === id) {
        setActiveGameId('minecraft')
      }
    } catch (err) {
      console.error('Remove custom game error:', err)
    }
  }

  // 7. Discord RPC Live Sync (Feature 2)
  const activeGame = games.find((g) => g.id === activeGameId) || games[0] || INITIAL_MINECRAFT

  useEffect(() => {
    async function syncDiscord() {
      try {
        await invoke('set_discord_presence', {
          gameName: activeGame.name,
          status: launchStatus === 'running' ? 'playing' : 'idle',
        })
      } catch (err) {
        // Discord might not be running on machine
      }
    }
    syncDiscord()
  }, [activeGameId, launchStatus])

  // 8. Listen to Minecraft launch status
  useEffect(() => {
    let unlistenStatus
    let unlistenProgress

    async function setupListeners() {
      unlistenStatus = await listen('launch-status', (event) => {
        const { status, message } = event.payload
        setLaunchMessage(message)
        if (status === 'launching' || status === 'running') {
          setLaunchStatus('running')
        } else {
          setLaunchStatus('downloading')
        }
      })

      unlistenProgress = await listen('download-progress', (event) => {
        setDownloadProgress(event.payload)
      })
    }

    setupListeners()
    return () => {
      if (unlistenStatus) unlistenStatus()
      if (unlistenProgress) unlistenProgress()
    }
  }, [])

  // Save favorites
  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
      try {
        localStorage.setItem('pannawat_favorites', JSON.stringify(next))
      } catch (e) {}
      return next
    })
  }

  // Handle Play Action
  const handleLaunch = async () => {
    if (activeGame.platform === 'minecraft') {
      if (launchStatus === 'running') return
      setLaunchStatus('downloading')
      setLaunchMessage(`Preparing Minecraft ${selectedVersion}...`)
      try {
        await invoke('launch_game', {
          req: {
            profile_id: 'default',
            profile_name: `Minecraft ${selectedVersion}`,
            username: 'Pannawath',
            mc_version: selectedVersion,
            fabric_version: null,
            min_ram_mb: minRamMb,
            max_ram_mb: allocatedRamMb,
          },
        })
      } catch (err) {
        console.error('Launch error:', err)
        setLaunchStatus('idle')
      }
    } else {
      // Universal game launch (Steam, Roblox, Epic, Custom)
      try {
        await invoke('launch_universal_game', {
          target: activeGame.launch_target || '',
          platform: activeGame.platform,
        })
      } catch (err) {
        console.error('Failed to launch universal game:', err)
      }
    }
  }

  const handleForceQuit = async () => {
    try {
      await invoke('kill_game', { profileId: 'default' })
      setLaunchStatus('idle')
    } catch (err) {
      console.error(err)
    }
  }

  // Filtered games
  const displayedGames = onlyFavorites
    ? games.filter((g) => favorites.includes(g.id))
    : games

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#07090e] text-slate-100 font-sans select-none flex">
      {/* 1. LEFT ULTRA-COMPACT FLOATING ICON DOCK */}
      <div className="absolute left-4 top-4 bottom-4 z-40 flex flex-col items-center justify-between pointer-events-none">
        {/* Top Circular Brand Logo (Clicking returns to Minecraft) */}
        <div
          onClick={() => setActiveGameId('minecraft')}
          className="w-11 h-11 rounded-full bg-[#11141c]/90 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl pointer-events-auto cursor-pointer hover:border-emerald-400/50 hover:scale-105 transition-all"
          title="Return to Home (Minecraft)"
        >
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-200 flex items-center justify-center">
            <span className="text-[11px] font-black text-black">P</span>
          </div>
        </div>

        {/* Center Floating Dark Capsule Bar */}
        <div className="p-1.5 rounded-2xl bg-[#0c0f17]/85 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col gap-2.5 pointer-events-auto">
          {/* Library view */}
          <button
            onClick={() => setOnlyFavorites(false)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              !onlyFavorites
                ? 'bg-white/15 text-emerald-400 shadow-md'
                : 'bg-transparent text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
            title="All Installed Games"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          {/* Mod Manager Drawer */}
          <button
            onClick={() => setIsModDrawerOpen(!isModDrawerOpen)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isModDrawerOpen
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-transparent text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
            title="Mod Manager (In-App Downloader)"
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* Quick Play active game */}
          <button
            onClick={handleLaunch}
            className="w-10 h-10 rounded-xl bg-transparent text-slate-400 flex items-center justify-center hover:bg-emerald-500/20 hover:text-emerald-400 transition-all"
            title={`Quick Launch: ${activeGame.name}`}
          >
            <Gamepad2 className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Settings Button */}
        <div
          onClick={() => setIsSettingsOpen(true)}
          className="w-10 h-10 rounded-full bg-[#0c0f17]/85 backdrop-blur-2xl border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/30 pointer-events-auto cursor-pointer shadow-xl transition-all"
          title="Settings (RAM, Java, JVM)"
        >
          <SettingsIcon className="w-4 h-4" />
        </div>
      </div>

      {/* 2. MAIN HERO VIEWPORT */}
      <main className="relative flex-1 h-full overflow-hidden flex flex-col justify-between pl-20 pr-80">
        {/* Hero Background Wallpaper */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 filter brightness-90"
          style={{ backgroundImage: `url(${activeGame.banner_url})` }}
        />
        {/* Subtle Vignettes matching reference aesthetic */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/25 to-[#07090e]/50 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07090e]/95 via-[#07090e]/35 to-transparent pointer-events-none" />

        {/* TOP BAR OVERLAY */}
        <header className="relative z-30 flex items-center justify-between pt-5 pb-3 pl-4 pr-4" data-tauri-drag-region>
          {/* Top Tag */}
          <div className="flex items-center gap-2">
            <span className="px-4 py-1.5 rounded-full bg-black/45 backdrop-blur-xl border border-white/15 text-xs font-semibold text-slate-200 shadow-md">
              {activeGame.platform === 'minecraft' ? 'Most Played' : activeGame.tag || 'Installed'}
            </span>
          </div>

          {/* Top Right Floating Pill Bars */}
          <div className="flex items-center gap-3">
            {/* Favorites Filter Capsule */}
            <div
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-xl border cursor-pointer transition-all shadow-lg ${
                onlyFavorites
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-black/50 border-white/10 text-slate-300 hover:bg-black/70'
              }`}
              title="Click to toggle favorites only"
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  onlyFavorites ? 'text-amber-400 fill-amber-400' : 'text-amber-400'
                }`}
              />
              <span className="text-xs font-bold font-mono">{favorites.length} Favs</span>
            </div>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/55 backdrop-blur-xl border border-white/15 shadow-lg">
              <div className="relative">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-[10px] text-black">
                  P
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-black" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-white leading-tight">Pannawath</span>
                <span className="text-[10px] text-slate-400 leading-none">
                  • {activeGame.name.split(':')[0]}
                </span>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1 pl-2">
              <button
                onClick={handleMinimize}
                className="w-7 h-7 rounded-full bg-black/40 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                title="Minimize"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleMaximize}
                className="w-7 h-7 rounded-full bg-black/40 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                title="Maximize"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
              <button
                onClick={handleClose}
                className="w-7 h-7 rounded-full bg-black/40 hover:bg-rose-600 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* HERO TITLE & ACTION CONTROLS */}
        <div className="relative z-30 pl-6 pb-12 max-w-xl space-y-5">
          {/* Emblem + Game Title */}
          <div className="space-y-3">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-black/50 backdrop-blur-md border border-white/15 p-2 shadow-2xl flex items-center justify-center">
                <img
                  src={activeGame.icon_url}
                  alt={activeGame.name}
                  className="w-full h-full object-contain filter drop-shadow-md"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120'
                  }}
                />
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase drop-shadow-2xl font-serif">
                {activeGame.name}
              </h1>
            </div>

            <p className="text-xs md:text-sm text-slate-200/90 leading-relaxed drop-shadow line-clamp-3">
              {activeGame.description}
            </p>
          </div>

          {/* MINECRAFT SPECIFIC VERSION SELECTOR & PERFORMANCE BADGES */}
          {activeGame.platform === 'minecraft' && (
            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                {/* Version Selector Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsVersionDropdownOpen(!isVersionDropdownOpen)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-xs font-bold text-slate-200 shadow-lg transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Version:</span>
                    <span className="text-emerald-400 font-mono">{selectedVersion}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {isVersionDropdownOpen && (
                    <div className="absolute bottom-full mb-2 left-0 w-64 max-h-56 overflow-y-auto rounded-2xl bg-[#10141f]/95 backdrop-blur-2xl border border-white/15 p-1.5 z-50 shadow-2xl">
                      {versions
                        .filter((v) => (v.id === '26.3' ? true : showSnapshots || v.type === 'release'))
                        .map((v) => (
                          <button
                            key={v.id}
                            onClick={() => {
                              setSelectedVersion(v.id)
                              setIsVersionDropdownOpen(false)
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                              selectedVersion === v.id
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'text-slate-300 hover:bg-white/5'
                            }`}
                          >
                            <span className="font-mono">{v.id}</span>
                            <span className="text-[9px] uppercase font-bold text-slate-400">
                              {v.id === '26.3' ? 'Featured 26.3' : v.type}
                            </span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {/* Java 25 LTS Badge (Clicking opens Settings) */}
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-3.5 py-2 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/10 text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
                  title="Configure JVM & Memory"
                >
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Java 25 LTS • ZGC</span>
                </button>

                {/* Mods Active Badge (Clicking opens Mod Manager) */}
                <button
                  onClick={() => setIsModDrawerOpen(true)}
                  className="px-3.5 py-2 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/10 text-xs text-emerald-300 flex items-center gap-1.5 font-mono transition-colors"
                  title="Open Mod Manager"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{installedMods.filter((m) => m.enabled).length} Mods Active</span>
                </button>
              </div>
            </div>
          )}

          {/* ACTION BUTTON ROW */}
          <div className="flex items-center gap-4 pt-1">
            {activeGame.platform === 'minecraft' && launchStatus === 'running' ? (
              <>
                <div className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-cyan-950/80 border border-cyan-400/50 text-cyan-300 font-black text-sm shadow-[0_0_25px_rgba(6,182,212,0.4)] animate-pulse">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                  <span>MINECRAFT IS RUNNING</span>
                </div>
                <button
                  onClick={handleForceQuit}
                  className="px-5 py-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-transform active:scale-95"
                >
                  <Square className="w-3.5 h-3.5 fill-current inline-block mr-1" />
                  <span>FORCE QUIT</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleLaunch}
                disabled={activeGame.platform === 'minecraft' && launchStatus === 'downloading'}
                className="flex items-center gap-2.5 px-9 py-3.5 rounded-full bg-white text-black hover:bg-slate-100 font-black text-sm tracking-wide shadow-2xl shadow-white/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {activeGame.platform === 'minecraft' && launchStatus === 'downloading' ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-black" />
                    <span>DOWNLOADING...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current text-black" />
                    <span>PLAY</span>
                  </>
                )}
              </button>
            )}

            {/* Add to Favorite Button */}
            <button
              onClick={() => toggleFavorite(activeGame.id)}
              className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-xl border border-white/15 text-xs font-bold text-white shadow-lg transition-colors"
            >
              <Star
                className={`w-4 h-4 ${
                  favorites.includes(activeGame.id) ? 'text-amber-400 fill-amber-400' : 'text-slate-400'
                }`}
              />
              <span>{favorites.includes(activeGame.id) ? 'FAVORITE' : 'ADD TO FAVORITE'}</span>
            </button>
          </div>

          {/* Minecraft Download Progress Bar */}
          {activeGame.platform === 'minecraft' && launchStatus === 'downloading' && (
            <div className="p-3 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/15 animate-in fade-in max-w-md">
              <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                <span>{launchMessage}</span>
                {downloadProgress?.total && (
                  <span className="font-mono text-emerald-400 font-bold">
                    {Math.round((downloadProgress.downloaded / downloadProgress.total) * 100)}%
                  </span>
                )}
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-150"
                  style={{
                    width: downloadProgress?.total
                      ? `${(downloadProgress.downloaded / downloadProgress.total) * 100}%`
                      : '50%',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM CENTER SCROLL INDICATOR CHEVRON (Clicking toggles Game Details) */}
        <div className="relative z-30 pb-4 flex justify-center pointer-events-none">
          <button
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-slate-400 pointer-events-auto cursor-pointer hover:text-white transition-colors"
            title="Toggle Details & Modpack Info"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-300 ${
                isDetailsOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </main>

      {/* 3. RIGHT GAME CARDS STACK (Real Installed Games + Custom Game Picker) */}
      <div className="absolute right-4 top-16 bottom-6 w-72 z-40 flex flex-col justify-between pointer-events-none">
        {/* Real Installed Games Stack */}
        <div className="space-y-2.5 overflow-y-auto pr-1 pointer-events-auto max-h-[calc(100vh-170px)]">
          {displayedGames.map((g) => {
            const isSelected = activeGameId === g.id
            const isCustom = g.platform === 'custom'
            return (
              <div
                key={g.id}
                onClick={() => setActiveGameId(g.id)}
                className={`group relative p-2.5 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 backdrop-blur-2xl ${
                  isSelected
                    ? 'bg-black/75 border-white/30 shadow-2xl scale-[1.02]'
                    : 'bg-black/45 hover:bg-black/65 border-white/10 hover:border-white/20'
                }`}
              >
                {/* Game Thumbnail */}
                <img
                  src={g.icon_url}
                  alt={g.name}
                  className="w-11 h-11 rounded-xl object-cover bg-black/60 border border-white/10 shadow flex-shrink-0"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100'
                  }}
                />

                {/* Game Meta */}
                <div className="flex-1 min-w-0">
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-semibold text-slate-300 inline-block mb-0.5">
                    {g.tag || (g.platform === 'minecraft' ? 'Most Played' : 'Installed')}
                  </span>
                  <h4 className="font-bold text-xs text-white truncate group-hover:text-emerald-300 transition-colors">
                    {g.name}
                  </h4>
                </div>

                {isCustom && (
                  <button
                    onClick={(e) => handleRemoveCustomGame(e, g.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all"
                    title="Remove custom game"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {isSelected && (
                  <div className="w-1.5 h-6 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
                )}
              </div>
            )
          })}
        </div>

        {/* Action Buttons: Add Custom Game & Discover More */}
        <div className="space-y-2 pt-2 pointer-events-auto">
          {/* Feature 1: Add Custom Executable Button */}
          <button
            onClick={handleAddCustomGame}
            className="w-full py-2 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5 shadow-lg transition-all"
            title="Browse and add any .exe on your PC"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD CUSTOM GAME (.EXE)</span>
          </button>

          {/* Discover More Button */}
          <button
            onClick={() => openUrl('https://modrinth.com')}
            className="w-full py-2.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-xl border border-white/20 text-xs font-bold text-slate-200 hover:text-white flex items-center justify-center gap-1.5 shadow-xl transition-all"
            title="Browse Modrinth Mods & Modpacks"
          >
            <span>DISCOVER MORE</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* 4. SLIDE-OUT MOD MANAGER DRAWER (Feature 3: Modrinth In-App Downloader) */}
      {isModDrawerOpen && (
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[#0c0f17]/95 backdrop-blur-2xl border-l border-white/10 p-5 z-50 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h3 className="font-black text-sm text-white uppercase tracking-wider">
                  Mod Manager
                </h3>
              </div>
              <button
                onClick={() => setIsModDrawerOpen(false)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs: Installed vs Catalog */}
            <div className="flex rounded-xl bg-black/50 p-1 border border-white/10">
              <button
                onClick={() => setModTab('installed')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  modTab === 'installed'
                    ? 'bg-emerald-500/20 text-emerald-300 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Installed ({installedMods.length})
              </button>
              <button
                onClick={() => setModTab('catalog')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  modTab === 'catalog'
                    ? 'bg-emerald-500/20 text-emerald-300 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Modrinth Catalog
              </button>
            </div>

            {/* TAB 1: INSTALLED MODS */}
            {modTab === 'installed' && (
              <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-210px)] pr-1">
                {installedMods.map((m) => {
                  const fileName = m.filename || m.file_name
                  const modName = m.name || m.mod_name
                  return (
                    <div
                      key={fileName}
                      className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <h5 className="font-bold text-xs text-white truncate">{modName}</h5>
                        <span className="text-[10px] font-mono text-slate-400 block truncate">
                          {fileName}
                        </span>
                      </div>
                      <button
                        onClick={() => handleToggleMod(m)}
                        className={`w-8 h-5 rounded-full transition-colors relative flex items-center px-0.5 flex-shrink-0 ${
                          m.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            m.enabled ? 'translate-x-3' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* TAB 2: MODRINTH IN-APP CATALOG & DOWNLOADER */}
            {modTab === 'catalog' && (
              <div className="space-y-3">
                {/* Search Input Bar */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search mods on Modrinth..."
                      value={modSearchQuery}
                      onChange={(e) => setModSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchModrinth()}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <button
                    onClick={() => handleSearchModrinth()}
                    className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs"
                  >
                    Search
                  </button>
                </div>

                {/* Catalog Results */}
                <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-270px)] pr-1">
                  {isSearchingMods ? (
                    <div className="py-10 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                      <RotateCw className="w-5 h-5 animate-spin text-emerald-400" />
                      <span>Searching Modrinth...</span>
                    </div>
                  ) : catalogMods.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-400">
                      No mods found. Try another search.
                    </div>
                  ) : (
                    catalogMods.map((mod) => {
                      const isInstalled = installedMods.some(
                        (im) =>
                          (im.name || im.mod_name || '').toLowerCase() ===
                            mod.title.toLowerCase() ||
                          (im.filename || '').toLowerCase().includes(mod.project_id.toLowerCase())
                      )
                      const isInstalling = installingModId === mod.project_id

                      return (
                        <div
                          key={mod.project_id}
                          className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {mod.icon_url ? (
                              <img
                                src={mod.icon_url}
                                alt={mod.title}
                                className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                M
                              </div>
                            )}
                            <div className="min-w-0">
                              <h5 className="font-bold text-xs text-white truncate">{mod.title}</h5>
                              <p className="text-[10px] text-slate-400 line-clamp-1">
                                {mod.description}
                              </p>
                              <span className="text-[9px] font-mono text-emerald-400">
                                {mod.downloads.toLocaleString()} DLs
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleInstallMod(mod.project_id)}
                            disabled={isInstalled || isInstalling}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all ${
                              isInstalled
                                ? 'bg-white/10 text-slate-400 cursor-default'
                                : isInstalling
                                ? 'bg-emerald-500/50 text-black cursor-wait'
                                : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-md'
                            }`}
                          >
                            {isInstalling ? (
                              <>
                                <RotateCw className="w-3 h-3 animate-spin" />
                                <span>...</span>
                              </>
                            ) : isInstalled ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Done</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3 h-3" />
                                <span>Install</span>
                              </>
                            )}
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => openUrl('https://modrinth.com/mods')}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Open Modrinth Website</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 5. SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#0e121a] border border-white/15 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-base text-white uppercase tracking-wider">
                  Launcher Settings
                </h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* RAM Allocations */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-300">Max Allocated RAM</span>
                  <span className="text-emerald-400 font-mono">{allocatedRamMb} MB</span>
                </div>
                <input
                  type="range"
                  min="2048"
                  max="16384"
                  step="512"
                  value={allocatedRamMb}
                  onChange={(e) => setAllocatedRamMb(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-300">Min RAM</span>
                  <span className="text-cyan-400 font-mono">{minRamMb} MB</span>
                </div>
                <input
                  type="range"
                  min="1024"
                  max="8192"
                  step="512"
                  value={minRamMb}
                  onChange={(e) => setMinRamMb(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Snapshots Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10">
                <div>
                  <h5 className="font-bold text-xs text-white">Show Snapshot Versions</h5>
                  <span className="text-[10px] text-slate-400">
                    Includes 26.3 and development builds
                  </span>
                </div>
                <button
                  onClick={() => setShowSnapshots(!showSnapshots)}
                  className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                    showSnapshots ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      showSnapshots ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Java Runtime Info */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center gap-3">
                <Cpu className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                <div className="text-[11px]">
                  <h6 className="font-bold text-white">Microsoft Java 25 LTS</h6>
                  <p className="text-slate-400">ZGC Generational Garbage Collector enabled</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsSettingsOpen(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all"
            >
              Save & Close
            </button>
          </div>
        </div>
      )}

      {/* 6. BOTTOM DETAILS DRAWER (Toggled by Chevron) */}
      {isDetailsOpen && (
        <div className="absolute left-20 right-80 bottom-0 h-44 bg-[#0a0d14]/95 backdrop-blur-2xl border-t border-white/10 p-4 z-40 rounded-t-2xl shadow-2xl flex items-center justify-between gap-6 animate-in slide-in-from-bottom duration-200">
          <div className="space-y-2 flex-1">
            <h4 className="font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-400" />
              <span>Instance Details: {activeGame.name}</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
              {activeGame.description}
            </p>
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <span>Platform: {activeGame.platform}</span>
              <span>•</span>
              <span>Target: {activeGame.launch_target}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModDrawerOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white border border-white/10 transition-colors"
            >
              Manage Mods
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white border border-white/10 transition-colors"
            >
              Engine Settings
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
