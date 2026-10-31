import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { openUrl } from '@tauri-apps/plugin-opener'
import {
  Play,
  Compass,
  Shirt,
  Image as ImageIcon,
  Layers,
  Plus,
  Settings as SettingsIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  Check,
  RotateCw,
  Sliders,
  X,
  ExternalLink,
  Cpu,
  Minus,
  Maximize2,
  FolderOpen,
  Sparkles,
  Info,
  Square,
  Shield,
  HelpCircle,
} from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'

// Default mock skins for the skin selector view
const DEFAULT_SKINS = [
  { id: 'steve', name: 'Steve', type: 'classic', img: 'https://raw.githubusercontent.com/PrismLauncher/PrismLauncher/develop/launcher/resources/multimc/icons/instances/steve.png' },
  { id: 'alex', name: 'Alex', type: 'slim', img: 'https://raw.githubusercontent.com/PrismLauncher/PrismLauncher/develop/launcher/resources/multimc/icons/instances/alex.png' },
  { id: 'ari', name: 'Ari', type: 'classic', img: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=120' },
  { id: 'noor', name: 'Noor', type: 'slim', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120' },
  { id: 'sunny', name: 'Sunny', type: 'classic', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120' },
  { id: 'zuri', name: 'Zuri', type: 'classic', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120' },
]

export default function MinecraftModrinthHub({ onBackToLauncher }) {
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

  // Modrinth Hub Nav: 'home' | 'discover' | 'skins' | 'instances'
  const [activeTab, setActiveTab] = useState('home')
  const [navHistory, setNavHistory] = useState(['home'])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Discover Content Sub-tab: 'modpacks' | 'mods' | 'resourcepacks' | 'shaders'
  const [discoverType, setDiscoverType] = useState('modpacks')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [installingId, setInstallingId] = useState(null)

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [settingsCategory, setSettingsCategory] = useState('appearance') // 'appearance' | 'features' | 'java'

  // Skin Selector state
  const [selectedSkin, setSelectedSkin] = useState(DEFAULT_SKINS[0])
  const [skinRotation, setSkinRotation] = useState(0)

  // Instances / Mods state
  const [installedMods, setInstalledMods] = useState([])
  const [versions, setVersions] = useState([])
  const [launchStatus, setLaunchStatus] = useState('idle')
  const [launchMessage, setLaunchMessage] = useState('')
  const [downloadProgress, setDownloadProgress] = useState(null)

  // Navigation handlers
  const navigateTo = (tab) => {
    setActiveTab(tab)
    const nextHistory = navHistory.slice(0, historyIndex + 1)
    nextHistory.push(tab)
    setNavHistory(nextHistory)
    setHistoryIndex(nextHistory.length - 1)
  }

  const handleNavBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setActiveTab(navHistory[historyIndex - 1])
    } else {
      onBackToLauncher()
    }
  }

  const handleNavForward = () => {
    if (historyIndex < navHistory.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setActiveTab(navHistory[historyIndex + 1])
    }
  }

  // Window Controls
  const handleMinimize = async () => {
    try {
      await getCurrentWindow().minimize()
    } catch (e) {}
  }
  const handleMaximize = async () => {
    try {
      await getCurrentWindow().toggleMaximize()
    } catch (e) {}
  }
  const handleClose = async () => {
    try {
      await getCurrentWindow().close()
    } catch (e) {}
  }

  // Load Minecraft Versions
  useEffect(() => {
    async function fetchVersions() {
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
    fetchVersions()
  }, [])

  // Load Installed Mods
  const loadMods = async () => {
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
    loadMods()
  }, [])

  // Modrinth Content Search
  const handleSearch = async (query = searchQuery) => {
    setIsSearching(true)
    try {
      const res = await invoke('search_mods', {
        req: {
          query: query || '',
          game_version: selectedVersion || '1.21.4',
          source: 'modrinth',
          limit: 20,
        },
      })
      setSearchResults(res.hits || [])
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'discover') {
      handleSearch(searchQuery)
    }
  }, [activeTab, discoverType])

  // Install Mod from Modrinth
  const handleInstallMod = async (modId) => {
    setInstallingId(modId)
    try {
      await invoke('install_mod', {
        profileId: 'default',
        modId,
        gameVersion: selectedVersion || '1.21.4',
      })
      await loadMods()
    } catch (err) {
      console.error('Install error:', err)
    } finally {
      setInstallingId(null)
    }
  }

  // Toggle Installed Mod
  const handleToggleMod = async (mod) => {
    try {
      await invoke('toggle_mod', {
        profileId: 'default',
        filename: mod.filename || mod.file_name,
        enable: !mod.enabled,
      })
      await loadMods()
    } catch (err) {
      console.error('Toggle mod error:', err)
    }
  }

  // Listen to launch events
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

  // Launch Minecraft
  const handleLaunch = async () => {
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
  }

  const handleForceQuit = async () => {
    try {
      await invoke('kill_game', { profileId: 'default' })
      setLaunchStatus('idle')
    } catch (err) {}
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#111216] text-slate-100 font-sans select-none flex">
      {/* 1. LEFT MODRINTH VERTICAL NAVIGATION RAIL */}
      <nav className="w-16 h-full bg-[#0d0e11] border-r border-white/5 flex flex-col items-center justify-between py-3.5 z-40 select-none">
        <div className="flex flex-col items-center gap-3">
          {/* Modrinth Wrench/Hexagon Logo */}
          <div
            onClick={() => navigateTo('home')}
            className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center cursor-pointer shadow-lg hover:border-emerald-400 transition-all"
            title="Modrinth Home"
          >
            <div className="w-5 h-5 rounded-lg border-2 border-emerald-400 flex items-center justify-center">
              <span className="text-[10px] font-black text-emerald-400">M</span>
            </div>
          </div>

          <div className="w-8 h-[1px] bg-white/10 my-0.5" />

          {/* Navigation Icons matching Modrinth Rail */}
          <div className="flex flex-col gap-2">
            {/* Home (Play) */}
            <button
              onClick={() => navigateTo('home')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                activeTab === 'home'
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              title="Home (Active Instance)"
            >
              <Play className={`w-4 h-4 ${activeTab === 'home' ? 'fill-current' : ''}`} />
            </button>

            {/* Discover Content (Compass) */}
            <button
              onClick={() => navigateTo('discover')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                activeTab === 'discover'
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              title="Discover Content (Mods, Modpacks, Shaders)"
            >
              <Compass className="w-4 h-4" />
            </button>

            {/* Skin Selector (Shirt) */}
            <button
              onClick={() => navigateTo('skins')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                activeTab === 'skins'
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              title="Skin Selector"
            >
              <Shirt className="w-4 h-4" />
            </button>

            {/* Instances List (Layers) */}
            <button
              onClick={() => navigateTo('instances')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                activeTab === 'instances'
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              title="Installed Instances"
            >
              <Layers className="w-4 h-4" />
            </button>

            {/* Create Instance (+) */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-10 h-10 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white flex items-center justify-center transition-all"
              title="Create an Instance"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Rail Controls */}
        <div className="flex flex-col items-center gap-2">
          {/* Settings Modal (Gear) */}
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="w-10 h-10 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white flex items-center justify-center transition-all"
            title="Settings (Java, Memory, Display)"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          {/* Return to Universal Game Launcher */}
          <button
            onClick={onBackToLauncher}
            className="w-10 h-10 rounded-xl text-rose-400/80 hover:bg-rose-500/20 hover:text-rose-300 flex items-center justify-center transition-all"
            title="Back to Universal Game Launcher"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* 2. MAIN MODRINTH CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#14161b]">
        {/* TOP BREADCRUMB & WINDOW HEADER BAR */}
        <header
          className="h-12 border-b border-white/5 bg-[#0f1014] flex items-center justify-between px-4 z-30"
          data-tauri-drag-region
        >
          {/* Navigation Controls & Breadcrumb */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={handleNavBack}
                className="w-6 h-6 rounded-md hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                title="Back"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNavForward}
                disabled={historyIndex >= navHistory.length - 1}
                className="w-6 h-6 rounded-md hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors disabled:opacity-30"
                title="Forward"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <span className="text-slate-500">▷</span>
              <span className="capitalize">
                {activeTab === 'home'
                  ? 'Home'
                  : activeTab === 'discover'
                  ? 'Discover content'
                  : activeTab === 'skins'
                  ? 'Skin selector'
                  : 'Installed instances'}
              </span>
            </div>
          </div>

          {/* Right Header Controls (Status & Window buttons) */}
          <div className="flex items-center gap-3">
            {/* Instance Quick Play Tag */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/10 text-xs">
              <div
                className={`w-2 h-2 rounded-full ${
                  launchStatus === 'running'
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-slate-500'
                }`}
              />
              <span className="font-mono text-slate-300 text-[11px]">
                {launchStatus === 'running' ? 'Minecraft Running' : 'No instances running'}
              </span>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1 pl-2">
              <button
                onClick={handleMinimize}
                className="w-7 h-7 rounded-md hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleMaximize}
                className="w-7 h-7 rounded-md hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
              <button
                onClick={handleClose}
                className="w-7 h-7 rounded-md hover:bg-rose-600 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* VIEW 1: HOME PAGE (Matching Image 1) */}
        {activeTab === 'home' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-y-auto">
            <div className="max-w-md w-full flex flex-col items-center space-y-6">
              {/* Modrinth Emblem */}
              <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-2xl shadow-emerald-500/10">
                <div className="w-14 h-14 rounded-2xl border-4 border-emerald-400 flex items-center justify-center">
                  <span className="text-2xl font-black text-emerald-400">M</span>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Welcome to Modrinth Hub
                </h2>
                <p className="text-sm text-slate-400">
                  Ready to start playing Minecraft {selectedVersion}?
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 w-full max-w-xs">
                {launchStatus === 'running' ? (
                  <button
                    onClick={handleForceQuit}
                    className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>FORCE QUIT MINECRAFT</span>
                  </button>
                ) : (
                  <button
                    onClick={handleLaunch}
                    disabled={launchStatus === 'downloading'}
                    className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
                  >
                    {launchStatus === 'downloading' ? (
                      <>
                        <RotateCw className="w-4 h-4 animate-spin text-black" />
                        <span>PREPARING CLIENT...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current text-black" />
                        <span>PLAY MINECRAFT {selectedVersion}</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs tracking-wider transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Create an instance</span>
                </button>
              </div>

              {/* Download Progress Bar */}
              {launchStatus === 'downloading' && (
                <div className="w-full p-4 rounded-xl bg-black/40 border border-white/10 space-y-2 text-left">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span className="truncate">{launchMessage}</span>
                    {downloadProgress?.total && (
                      <span className="font-mono text-emerald-400 font-bold">
                        {Math.round((downloadProgress.downloaded / downloadProgress.total) * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-150"
                      style={{
                        width: downloadProgress?.total
                          ? `${(downloadProgress.downloaded / downloadProgress.total) * 100}%`
                          : '60%',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom launcher shortcut */}
            <div className="absolute bottom-6 flex flex-col items-center gap-2">
              <span className="text-[11px] text-slate-500">Escaping another launcher?</span>
              <button
                onClick={onBackToLauncher}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-2 transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                <span>Return to Universal Game Library</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: DISCOVER CONTENT PAGE (Matching Image 2) */}
        {activeTab === 'discover' && (
          <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4">
            {/* Top Content Pills: Modpacks, Mods, Resource Packs, Shaders */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              {[
                { id: 'modpacks', label: 'Modpacks' },
                { id: 'mods', label: 'Mods' },
                { id: 'resourcepacks', label: 'Resource Packs' },
                { id: 'datapacks', label: 'Data Packs' },
                { id: 'shaders', label: 'Shaders' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setDiscoverType(pill.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    discoverType === pill.id
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Search and Sort Toolbar */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-xl">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={`Search ${discoverType} on Modrinth...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0c0d10] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Game Version:</span>
                <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20 font-bold">
                  {selectedVersion}
                </span>
              </div>
            </div>

            {/* Cards List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {isSearching ? (
                <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center gap-3">
                  <RotateCw className="w-6 h-6 animate-spin text-emerald-400" />
                  <span>Fetching content from Modrinth...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-20 text-center text-xs text-slate-400">
                  No {discoverType} found. Try searching another keyword.
                </div>
              ) : (
                searchResults.map((item) => {
                  const isInstalled = installedMods.some(
                    (im) =>
                      (im.name || im.mod_name || '').toLowerCase() === item.title.toLowerCase() ||
                      (im.filename || '').toLowerCase().includes(item.project_id.toLowerCase())
                  )
                  const isInstalling = installingId === item.project_id

                  return (
                    <div
                      key={item.project_id}
                      className="p-4 rounded-2xl bg-[#0e1014] hover:bg-[#12141a] border border-white/5 hover:border-white/15 transition-all flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        {item.icon_url ? (
                          <img
                            src={item.icon_url}
                            alt={item.title}
                            className="w-14 h-14 rounded-xl object-cover bg-black/40 border border-white/10 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
                            M
                          </div>
                        )}

                        <div className="space-y-1 min-w-0">
                          <h4 className="font-bold text-sm text-white truncate flex items-center gap-2">
                            <span>{item.title}</span>
                          </h4>
                          <p className="text-xs text-slate-400 line-clamp-1">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400">
                            <span className="px-2 py-0.5 rounded-md bg-white/5 font-mono text-emerald-400">
                              Fabric
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-white/5 font-mono">
                              {item.downloads.toLocaleString()} Downloads
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 1-Click Install Button */}
                      <button
                        onClick={() => handleInstallMod(item.project_id)}
                        disabled={isInstalled || isInstalling}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 flex-shrink-0 transition-all ${
                          isInstalled
                            ? 'bg-white/10 text-slate-400 cursor-default'
                            : isInstalling
                            ? 'bg-emerald-500/50 text-black cursor-wait'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 active:scale-95'
                        }`}
                      >
                        {isInstalling ? (
                          <>
                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Installing...</span>
                          </>
                        ) : isInstalled ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Installed</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>+ Install</span>
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

        {/* VIEW 3: SKIN SELECTOR PAGE (Matching Image 3) */}
        {activeTab === 'skins' && (
          <div className="flex-1 flex flex-col justify-between p-8 overflow-y-auto">
            <div className="flex items-start gap-12 max-w-5xl mx-auto w-full">
              {/* 3D Skin Preview Interactive Column */}
              <div className="flex flex-col items-center space-y-4">
                <div
                  className="w-64 h-80 rounded-2xl bg-black/40 border border-white/10 flex flex-col items-center justify-center relative cursor-grab active:cursor-grabbing p-4"
                  onMouseMove={(e) => {
                    if (e.buttons === 1) {
                      setSkinRotation((r) => r + e.movementX * 1.5)
                    }
                  }}
                >
                  <img
                    src={selectedSkin.img}
                    alt={selectedSkin.name}
                    className="h-56 object-contain filter drop-shadow-2xl transition-transform duration-75"
                    style={{ transform: `rotateY(${skinRotation}deg)` }}
                  />
                  <span className="text-[10px] text-slate-500 mt-2">⇄ Drag to rotate</span>
                </div>

                <div className="flex items-center gap-2 w-full">
                  <button className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white border border-white/10 transition-colors">
                    Edit skin
                  </button>
                </div>
              </div>

              {/* Skins Picker Grid */}
              <div className="flex-1 space-y-6">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">
                    Saved skins
                  </h3>
                  <div className="w-32 h-44 rounded-2xl border-2 border-dashed border-white/15 hover:border-emerald-400/50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-white/5">
                    <Plus className="w-5 h-5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-300">Add skin</span>
                    <span className="text-[10px] text-slate-500">Drag and drop</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">
                    Default skins
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {DEFAULT_SKINS.map((skin) => (
                      <div
                        key={skin.id}
                        onClick={() => setSelectedSkin(skin)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col items-center gap-2 ${
                          selectedSkin.id === skin.id
                            ? 'bg-emerald-500/10 border-emerald-400 shadow-lg'
                            : 'bg-black/30 hover:bg-white/5 border-white/10'
                        }`}
                      >
                        <img
                          src={skin.img}
                          alt={skin.name}
                          className="w-16 h-20 object-contain"
                        />
                        <span className="text-xs font-bold text-slate-200">{skin.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Demo Account Notice Banner (Matching Image 3) */}
            <div className="mt-6 p-4 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between gap-4 max-w-4xl mx-auto w-full">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                <div>
                  <h5 className="font-bold text-xs text-white">Editing with a demo account</h5>
                  <p className="text-[11px] text-slate-400">
                    Sign in to your Minecraft account to save and apply skins globally!
                  </p>
                </div>
              </div>
              <button
                onClick={() => openUrl('https://login.live.com')}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-2 shadow-lg transition-colors flex-shrink-0"
              >
                <span>Sign in to Microsoft</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 4: INSTANCES / MODS MANAGEMENT */}
        {activeTab === 'instances' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Minecraft Instances & Profiles</h3>
                <p className="text-xs text-slate-400">
                  Manage active mods and configurations for version {selectedVersion}.
                </p>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-2 shadow-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Instance</span>
              </button>
            </div>

            {/* Installed Mods List */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {installedMods.map((m) => {
                const fileName = m.filename || m.file_name
                const modName = m.name || m.mod_name
                return (
                  <div
                    key={fileName}
                    className="p-4 rounded-2xl bg-[#0e1014] border border-white/10 flex items-center justify-between"
                  >
                    <div>
                      <h5 className="font-bold text-xs text-white">{modName}</h5>
                      <span className="text-[10px] font-mono text-slate-400 block truncate max-w-[200px]">
                        {fileName}
                      </span>
                    </div>
                    <button
                      onClick={() => handleToggleMod(m)}
                      className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                        m.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          m.enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. CREATE INSTANCE MODAL (Matching Image 4) */}
      {isCreateModalOpen && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#14161b] border border-white/15 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-white">Create instance</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search mods or modpacks */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">
                Already know what you want to play?
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search mods, modpacks, and more..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsCreateModalOpen(false)
                      setActiveTab('discover')
                      handleSearch(e.target.value)
                    }
                  }}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-black/50 border border-emerald-500/50 text-xs text-white placeholder-slate-500 focus:outline-none ring-2 ring-emerald-500/20"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-[1px] bg-white/10" />
              <span className="text-[11px] text-slate-500 font-mono">or</span>
              <div className="flex-1 h-[1px] bg-white/10" />
            </div>

            {/* Instance Types Grid */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-300">Choose instance type</h4>

              <div
                onClick={() => {
                  setIsCreateModalOpen(false)
                  setSelectedVersion('26.3')
                  setActiveTab('home')
                }}
                className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/40 cursor-pointer transition-all flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-white">Custom setup</h5>
                  <p className="text-[11px] text-slate-400">
                    Start from scratch with version 26.3, Microsoft Java 25 LTS, and ZGC.
                  </p>
                </div>
              </div>

              <div
                onClick={() => {
                  setIsCreateModalOpen(false)
                  setActiveTab('discover')
                }}
                className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/40 cursor-pointer transition-all flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center flex-shrink-0">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-white">Start from a mod or modpack</h5>
                  <p className="text-[11px] text-slate-400">
                    Browse and install directly from Modrinth catalog.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODRINTH SETTINGS MODAL (Matching Image 5) */}
      {isSettingsModalOpen && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-2xl h-[520px] rounded-2xl bg-[#14161b] border border-white/15 shadow-2xl flex overflow-hidden">
            {/* Left Categories Sidebar */}
            <div className="w-52 h-full bg-[#0d0e11] border-r border-white/10 p-4 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="font-black text-base text-white px-2">Settings</h3>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase px-2">Display</span>
                  <button
                    onClick={() => setSettingsCategory('appearance')}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      settingsCategory === 'appearance'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Appearance
                  </button>
                  <button
                    onClick={() => setSettingsCategory('features')}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      settingsCategory === 'features'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Features
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase px-2">
                    Instance Defaults
                  </span>
                  <button
                    onClick={() => setSettingsCategory('java')}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      settingsCategory === 'java'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Java and memory
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 px-2 space-y-0.5">
                <div>Pannawat Launcher v0.1.0</div>
                <div>Modrinth Engine 0.22.1</div>
              </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="flex justify-end">
                <button
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Category: Appearance (Matching Image 5) */}
              {settingsCategory === 'appearance' && (
                <div className="space-y-5">
                  <div>
                    <h4 className="font-bold text-sm text-white">Color theme</h4>
                    <p className="text-xs text-slate-400">
                      Select your preferred theme across Modrinth Hub.
                    </p>
                  </div>

                  {/* Theme Cards Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl border border-emerald-500 bg-black/60 cursor-pointer">
                      <div className="h-14 rounded-lg bg-[#14161b] border border-white/10 mb-2 p-2">
                        <div className="w-4 h-4 rounded bg-emerald-500/50" />
                      </div>
                      <span className="text-xs font-bold text-emerald-400">● Dark</span>
                    </div>

                    <div className="p-3 rounded-xl border border-white/10 bg-white/5 opacity-60">
                      <div className="h-14 rounded-lg bg-white/80 border border-slate-300 mb-2 p-2" />
                      <span className="text-xs font-bold text-slate-400">○ Light</span>
                    </div>

                    <div className="p-3 rounded-xl border border-white/10 bg-white/5 opacity-60">
                      <div className="h-14 rounded-lg bg-black border border-white/20 mb-2 p-2" />
                      <span className="text-xs font-bold text-slate-400">○ OLED</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                      <div>
                        <h5 className="font-bold text-xs text-white">Advanced rendering</h5>
                        <p className="text-[10px] text-slate-400">
                          Enables GPU accelerated blur and motion effects.
                        </p>
                      </div>
                      <div className="w-9 h-5 rounded-full bg-emerald-500 flex items-center px-0.5 justify-end">
                        <div className="w-4 h-4 rounded-full bg-white" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Category: Java and memory */}
              {settingsCategory === 'java' && (
                <div className="space-y-5">
                  <div>
                    <h4 className="font-bold text-sm text-white">Java & Memory Allocation</h4>
                    <p className="text-xs text-slate-400">
                      Configured for Microsoft Java 25 LTS and Generational ZGC.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-300">Maximum Memory (Xmx)</span>
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
                        <span className="text-slate-300">Minimum Memory (Xms)</span>
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

                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                      <Cpu className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <div className="text-[11px]">
                        <h6 className="font-bold text-white">Microsoft Java 25 LTS Activated</h6>
                        <p className="text-slate-400 font-mono">-XX:+UseZGC -XX:+ZGenerational</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Category: Features */}
              {settingsCategory === 'features' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-white">Launcher Features</h4>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <div>
                      <h5 className="font-bold text-xs text-white">Show Snapshot Versions</h5>
                      <p className="text-[10px] text-slate-400">
                        Enable snapshot 26.3 and development builds.
                      </p>
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
