import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
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
  Users,
  Compass,
  Bell,
  Settings as SettingsIcon,
  ChevronRight,
  LayoutGrid,
  MessageSquare,
  Minus,
  Maximize2,
  X,
  ExternalLink,
} from 'lucide-react'
import { useSettingsStore } from './store/settingsStore'

// Reference game mock data for fallback & showcase matching user reference image
const DEFAULT_GAMES = [
  {
    id: 'minecraft',
    name: 'Minecraft: Java Edition',
    platform: 'minecraft',
    banner_url: 'https://images.unsplash.com/photo-1627856013091-fed6e4e30025?auto=format&fit=crop&w=1920&q=80',
    icon_url: 'https://cdn.iconscout.com/icon/free/png-256/free-minecraft-logo-icon-download-in-svg-png-gif-file-formats--brand-social-media-pack-logos-icons-2795415.png',
    description: 'Explore infinite blocky worlds, craft tools, build majestic structures, and battle monsters. Featuring official version 26.3, Microsoft Java 25 LTS, and ultra-low latency ZGC optimization.',
    tag: 'Most Played',
  },
  {
    id: 'roblox',
    name: 'Roblox',
    platform: 'roblox',
    banner_url: 'https://images.unsplash.com/photo-1612287233207-6f8d3870624a?auto=format&fit=crop&w=1920&q=80',
    icon_url: 'https://cdn.iconscout.com/icon/free/png-256/free-roblox-logo-icon-download-in-svg-png-gif-file-formats--brand-social-media-pack-logos-icons-2795431.png',
    description: 'Roblox is an online game platform and game creation system that allows users to program games and play games created by other users.',
    tag: 'Most Recent',
    launch_target: 'roblox://',
  },
  {
    id: 'strange-clan',
    name: 'Strange Clan',
    platform: 'custom',
    banner_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80',
    icon_url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=120',
    description: "Strange Clan™ is an online, action RPG, using Play-2-Own mechanics to give players ownership of their digital items in game.",
    tag: 'Promoted',
  },
  {
    id: 'chihuahuaverse',
    name: 'Chihuahuaverse',
    platform: 'custom',
    banner_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1920&q=80',
    icon_url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=120',
    description: 'A vibrant universe of companion avatars, interactive social mini-games, and community exploration.',
    tag: 'Promoted',
  },
  {
    id: 'elpis-battle',
    name: 'Elpis Battle',
    platform: 'custom',
    banner_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1920&q=80',
    icon_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=120',
    description: 'Turn-based tactical RPG with strategic hero combinations, guild conquests, and seasonal leaderboards.',
    tag: 'Trending',
  },
  {
    id: 'fez',
    name: 'FEZ',
    platform: 'custom',
    banner_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1920&q=80',
    icon_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=120',
    description: 'A 2D creature living in a 2D world discovers the existence of a mysterious third dimension.',
    tag: 'Trending',
  },
]

// Mock friends list matching rightmost vertical strip in reference image
const FRIENDS = [
  { name: 'Alex', status: 'online', color: 'bg-emerald-400', img: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64' },
  { name: 'Kira', status: 'in-game', color: 'bg-amber-400', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64' },
  { name: 'Marcus', status: 'online', color: 'bg-emerald-400', img: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=64' },
  { name: 'Sophie', status: 'busy', color: 'bg-purple-400', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64' },
  { name: 'David', status: 'online', color: 'bg-emerald-400', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64' },
  { name: 'Elena', status: 'away', color: 'bg-rose-400', img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=64' },
  { name: 'Leo', status: 'online', color: 'bg-emerald-400', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64' },
  { name: 'Maya', status: 'online', color: 'bg-emerald-400', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=64' },
]

export default function App() {
  const {
    showSnapshots,
    selectedVersion,
    setSelectedVersion,
    allocatedRamMb,
    minRamMb,
  } = useSettingsStore()

  // Game Hub States
  const [games, setGames] = useState(DEFAULT_GAMES)
  const [activeGameId, setActiveGameId] = useState('minecraft')
  const [favorites, setFavorites] = useState(['minecraft', 'roblox'])

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
      console.log('Window minimize:', e)
    }
  }

  const handleMaximize = async () => {
    try {
      const win = getCurrentWindow()
      await win.toggleMaximize()
    } catch (e) {
      console.log('Window toggleMaximize:', e)
    }
  }

  const handleClose = async () => {
    try {
      const win = getCurrentWindow()
      await win.close()
    } catch (e) {
      console.log('Window close:', e)
    }
  }

  // 1. Fetch Installed Games (Minecraft, Steam, Roblox)
  useEffect(() => {
    async function loadGames() {
      try {
        const list = await invoke('get_installed_games')
        if (list && list.length > 0) {
          // Merge detected games with showcase games
          const merged = [...list]
          DEFAULT_GAMES.forEach((dg) => {
            if (!merged.some((m) => m.id === dg.id || m.name.toLowerCase() === dg.name.toLowerCase())) {
              merged.push(dg)
            }
          })
          setGames(merged)
        }
      } catch (err) {
        console.error('Failed to load games:', err)
      }
    }
    loadGames()
  }, [])

  // 2. Fetch Minecraft Versions
  useEffect(() => {
    async function loadVersions() {
      try {
        const list = await invoke('get_available_versions')
        setVersions(list || [])
      } catch (err) {
        setVersions([
          { id: '26.3', type: 'snapshot' },
          { id: '1.21.4', type: 'release' },
          { id: '1.21.3', type: 'release' },
        ])
      }
    }
    loadVersions()
  }, [])

  // 3. Fetch Mods
  useEffect(() => {
    async function loadMods() {
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
    loadMods()
  }, [])

  // 4. Listen to Minecraft launch status
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

  // Active game object
  const activeGame = games.find((g) => g.id === activeGameId) || games[0] || DEFAULT_GAMES[0]

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
      // Universal game launch (Steam, Roblox, Custom)
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

  const toggleFavorite = (id) => {
    if (favorites.includes(id)) {
      setFavorites(favorites.filter((f) => f !== id))
    } else {
      setFavorites([...favorites, id])
    }
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#07090e] text-slate-100 font-sans select-none flex">
      {/* 1. LEFT ULTRA-COMPACT FLOATING ICON DOCK */}
      <div className="absolute left-4 top-4 bottom-4 z-40 flex flex-col items-center justify-between pointer-events-none">
        {/* Top Circular Brand Logo */}
        <div className="w-11 h-11 rounded-full bg-[#11141c]/90 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl pointer-events-auto cursor-pointer hover:border-white/30 transition-all">
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-200 flex items-center justify-center">
            <span className="text-[11px] font-black text-black">P</span>
          </div>
        </div>

        {/* Center Floating Dark Capsule Bar */}
        <div className="p-1.5 rounded-2xl bg-[#0c0f17]/85 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col gap-2.5 pointer-events-auto">
          <button className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all">
            <LayoutGrid className="w-4 h-4 text-emerald-400" />
          </button>
          <button className="w-10 h-10 rounded-xl bg-transparent text-slate-400 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all">
            <Layers className="w-4 h-4" />
          </button>
          <button className="w-10 h-10 rounded-xl bg-transparent text-slate-400 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all">
            <Gamepad2 className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Chat Icon */}
        <div className="w-10 h-10 rounded-full bg-[#0c0f17]/85 backdrop-blur-2xl border border-white/10 flex items-center justify-center text-slate-400 hover:text-white pointer-events-auto cursor-pointer shadow-xl transition-all">
          <MessageSquare className="w-4 h-4" />
        </div>
      </div>

      {/* 2. MAIN HERO VIEWPORT */}
      <main className="relative flex-1 h-full overflow-hidden flex flex-col justify-between pl-20 pr-96">
        {/* Hero Background Wallpaper */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 filter brightness-95"
          style={{ backgroundImage: `url(${activeGame.banner_url})` }}
        />
        {/* Gradient Vignettes matching reference aesthetic */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/20 to-[#07090e]/50 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07090e]/95 via-[#07090e]/40 to-transparent pointer-events-none" />

        {/* TOP BAR OVERLAY */}
        <header className="relative z-30 flex items-center justify-between pt-5 pb-3 pl-4 pr-0" data-tauri-drag-region>
          {/* Top Tag */}
          <div className="flex items-center gap-2">
            <span className="px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/15 text-xs font-semibold text-slate-200 shadow-md">
              {activeGame.platform === 'minecraft' ? 'Most Played' : activeGame.tag || 'Most Played'}
            </span>
          </div>

          {/* Top Right Floating Pill Bars */}
          <div className="flex items-center gap-3">
            {/* Favorites / Featured Capsule */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 shadow-lg">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <div className="flex -space-x-1.5">
                <img
                  src="https://images.unsplash.com/photo-1563089145-599997674d42?w=64"
                  className="w-5 h-5 rounded-full object-cover border border-black/80"
                  alt="fav-1"
                />
                <img
                  src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=64"
                  className="w-5 h-5 rounded-full object-cover border border-black/80"
                  alt="fav-2"
                />
                <img
                  src="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=64"
                  className="w-5 h-5 rounded-full object-cover border border-black/80"
                  alt="fav-3"
                />
              </div>
              <ExternalLink className="w-3 h-3 text-slate-400 ml-0.5" />
            </div>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/55 backdrop-blur-xl border border-white/15 shadow-lg">
              <Bell className="w-3.5 h-3.5 text-slate-400 hover:text-white cursor-pointer" />
              <MessageSquare className="w-3.5 h-3.5 text-slate-400 hover:text-white cursor-pointer" />
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64"
                  alt="avatar"
                  className="w-6 h-6 rounded-full object-cover border border-white/20"
                />
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
            {/* Stylized Emblem matching Strange Clan / Minecraft */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 p-2 shadow-2xl flex items-center justify-center">
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

                {/* Badges */}
                <span className="px-3.5 py-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-xs text-slate-300 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Java 25 LTS • ZGC</span>
                </span>
                <span className="px-3.5 py-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-xs text-emerald-300 flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{installedMods.length} Mods Active</span>
                </span>
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

        {/* BOTTOM CENTER SCROLL INDICATOR CHEVRON */}
        <div className="relative z-30 pb-4 flex justify-center pointer-events-none">
          <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-slate-400 pointer-events-auto cursor-pointer hover:text-white transition-colors">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </main>

      {/* 3. RIGHT GAME CARDS STACK */}
      <div className="absolute right-14 top-16 bottom-6 w-72 z-40 flex flex-col justify-between pointer-events-none">
        {/* Cards Stack */}
        <div className="space-y-2.5 overflow-y-auto pr-1 pointer-events-auto max-h-[calc(100vh-140px)]">
          {games.map((g) => {
            const isSelected = activeGameId === g.id
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
                    {g.tag || (g.platform === 'minecraft' ? 'Most Played' : 'Trending')}
                  </span>
                  <h4 className="font-bold text-xs text-white truncate group-hover:text-emerald-300 transition-colors">
                    {g.name}
                  </h4>
                </div>

                {isSelected && (
                  <div className="w-1.5 h-6 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
                )}
              </div>
            )
          })}
        </div>

        {/* Discover More Pill Button */}
        <div className="pt-2 pointer-events-auto">
          <button className="w-full py-2.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-xl border border-white/20 text-xs font-bold text-slate-200 hover:text-white flex items-center justify-center gap-1.5 shadow-xl transition-all">
            <span>DISCOVER MORE</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* 4. FAR RIGHT VERTICAL SOCIAL / FRIENDS STRIP */}
      <div className="w-14 h-full py-5 bg-[#080a10]/90 backdrop-blur-2xl border-l border-white/5 z-40 flex flex-col items-center justify-start gap-4">
        {/* Friends Header Icon */}
        <div className="w-8 h-8 rounded-full bg-white/5 text-slate-300 flex items-center justify-center">
          <Users className="w-4 h-4" />
        </div>

        {/* Friends Avatars Column */}
        <div className="flex flex-col items-center gap-3 overflow-y-auto">
          {FRIENDS.map((f, i) => (
            <div key={i} className="relative group cursor-pointer" title={`${f.name} (${f.status})`}>
              <img
                src={f.img}
                alt={f.name}
                className="w-8 h-8 rounded-full object-cover border border-white/15 group-hover:scale-105 transition-transform"
              />
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${f.color} ring-2 ring-black`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
