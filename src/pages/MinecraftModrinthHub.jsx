import React, { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import {
  Play,
  Compass,
  Shirt,
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
  Upload,
  User,
  Trash2,
  CheckCircle2,
  Clock,
  HardDrive,
  Monitor,
  Palette,
  FileCode,
  Box,
  MoreVertical,
} from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { useProfileStore } from '../store/profileStore'
import MinecraftSkinViewer3D from '../components/MinecraftSkinViewer3D'

// Default Skins from official Minecraft assets
const OFFICIAL_DEFAULT_SKINS = [
  {
    id: 'steve',
    name: 'Steve',
    type: 'classic',
    url: 'https://textures.minecraft.net/texture/1a4af718455d4aab528e7a61f86fa25e6a369d1768dcb13f7df319a71824765',
    thumb: 'https://raw.githubusercontent.com/PrismLauncher/PrismLauncher/develop/launcher/resources/multimc/icons/instances/steve.png',
  },
  {
    id: 'alex',
    name: 'Alex',
    type: 'slim',
    url: 'https://textures.minecraft.net/texture/2eb916298692f0224d455d312de8bf404fbebe2a559d3326177114b0b1ff33b8',
    thumb: 'https://raw.githubusercontent.com/PrismLauncher/PrismLauncher/develop/launcher/resources/multimc/icons/instances/alex.png',
  },
  {
    id: 'noor',
    name: 'Noor',
    type: 'slim',
    url: 'https://textures.minecraft.net/texture/2d8fdf0b51f7bb9c2a71d37452d3a372eb0f171542f4c7f551b88e16fa9bf25e',
    thumb: 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/4/42/Noor_skin.png',
  },
  {
    id: 'sunny',
    name: 'Sunny',
    type: 'classic',
    url: 'https://textures.minecraft.net/texture/644788c6c9a7ceec816432b07e5fbf930eb444ee03f83120150d6ffcb37e7215',
    thumb: 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/3/30/Sunny_skin.png',
  },
  {
    id: 'ari',
    name: 'Ari',
    type: 'classic',
    url: 'https://textures.minecraft.net/texture/f140682121300977ee47683c3167df663dffbb309391ab2d5c3f39a79fa72be',
    thumb: 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/7/7b/Ari_skin.png',
  },
  {
    id: 'zuri',
    name: 'Zuri',
    type: 'classic',
    url: 'https://textures.minecraft.net/texture/e55e3a8fa6a6fbb2a67e812f86538c2323a2f7c00628d0295fcfa4ebac370f14',
    thumb: 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/8/86/Zuri_skin.png',
  },
  {
    id: 'makena',
    name: 'Makena',
    type: 'classic',
    url: 'https://textures.minecraft.net/texture/186a51d45d9fafe479366dfae9997410c59828fa6b67bc1ca19d533458efbf80',
    thumb: 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/8/87/Makena_skin.png',
  },
  {
    id: 'kai',
    name: 'Kai',
    type: 'classic',
    url: 'https://textures.minecraft.net/texture/42d2a45d04581177651c6eb33051e51b14736f90ab99ae130ec7fb75f6d9070',
    thumb: 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/9/91/Kai_skin.png',
  },
  {
    id: 'efe',
    name: 'Efe',
    type: 'slim',
    url: 'https://textures.minecraft.net/texture/94ca6faea0f3f218001be2b4d0eef888066e8fa178e6988880e64024b4231b74',
    thumb: 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/5/52/Efe_skin.png',
  },
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

  const {
    offlineUsername,
    setOfflineUsername,
    offlineSkin,
    setOfflineSkin,
    savedCustomSkins,
    addCustomSkin,
    removeCustomSkin,
    profiles,
    setProfiles,
    activeProfileId,
    setActiveProfile,
    getActiveProfile,
  } = useProfileStore()

  // Navigation: 'home' | 'discover' | 'skins' | 'instances'
  const [activeTab, setActiveTab] = useState('home')
  const [navHistory, setNavHistory] = useState(['home'])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Discover Content
  const [discoverType, setDiscoverType] = useState('modpacks')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createStep, setCreateStep] = useState('choose_type') // 'choose_type' | 'custom_setup'
  const [newInstanceName, setNewInstanceName] = useState('')
  const [newInstanceVersion, setNewInstanceVersion] = useState('1.21.4')
  const [newInstanceLoader, setNewInstanceLoader] = useState('fabric') // 'fabric' | 'forge' | 'neoforge' | 'quilt' | 'vanilla'
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [settingsCategory, setSettingsCategory] = useState('appearance')

  // Skin Selector Model State
  const [skinModelType, setSkinModelType] = useState(offlineSkin?.type || 'classic')
  const [skinAnimation, setSkinAnimation] = useState('idle')
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [tempUsername, setTempUsername] = useState(offlineUsername)
  const fileInputRef = useRef(null)

  // Instances & Game state
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

  // Load Profiles / Instances from Rust
  const loadProfiles = async () => {
    try {
      const list = await invoke('list_profiles')
      if (Array.isArray(list) && list.length > 0) {
        setProfiles(list)
        if (!activeProfileId || !list.some((p) => p.id === activeProfileId)) {
          setActiveProfile(list[0].id)
          setSelectedVersion(list[0].mc_version)
        }
      }
    } catch (err) {
      console.error('Failed to list profiles:', err)
    }
  }

  useEffect(() => {
    loadProfiles()
  }, [])

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
          { id: '1.21.1', type: 'release' },
          { id: '1.20.1', type: 'release' },
          { id: '1.19.2', type: 'release' },
          { id: '1.16.5', type: 'release' },
        ])
      }
    }
    fetchVersions()
  }, [])

  // Active Profile object
  const activeInstance = getActiveProfile() || profiles[0] || {
    id: 'default',
    name: 'Default Profile',
    mc_version: selectedVersion || '1.21.4',
    fabric_version: '0.16.10',
  }

  // Load Installed Mods for Active Instance
  const loadMods = async () => {
    try {
      const profileId = activeInstance.id || 'default'
      const mods = await invoke('list_installed_mods', { profileId })
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
  }, [activeInstance.id])

  // Create Instance Submit Handler
  const handleCreateInstanceSubmit = async () => {
    const name = newInstanceName.trim() || `Minecraft ${newInstanceVersion}`
    try {
      const fabricVer = newInstanceLoader === 'fabric' ? '0.16.10' : null
      const created = await invoke('create_profile', {
        name,
        mcVersion: newInstanceVersion,
        fabricVersion: fabricVer,
      })
      await loadProfiles()
      if (created?.id) {
        setActiveProfile(created.id)
        setSelectedVersion(created.mc_version)
      }
      setIsCreateModalOpen(false)
      setCreateStep('choose_type')
      setNewInstanceName('')
    } catch (err) {
      console.error('Failed to create instance:', err)
    }
  }

  // Delete Instance
  const handleDeleteInstance = async (id) => {
    try {
      await invoke('delete_profile', { profileId: id })
      await loadProfiles()
    } catch (err) {
      console.error('Failed to delete instance:', err)
    }
  }

  // Open Instance Folder in Windows Explorer
  const handleOpenInstanceFolder = async (id) => {
    try {
      await invoke('open_instance_folder', { profileId: id })
    } catch (err) {
      console.error('Failed to open instance folder:', err)
    }
  }

  // Open Mods Folder in Windows Explorer
  const handleOpenModsFolder = async (id) => {
    try {
      await invoke('open_mods_folder', { profileId: id })
    } catch (err) {
      console.error('Failed to open mods folder:', err)
    }
  }

  // Search Modrinth API
  const handleSearch = async (query = searchQuery) => {
    setIsSearching(true)
    try {
      let facets = []
      if (discoverType === 'modpacks') {
        facets.push('["project_type:modpack"]')
      } else if (discoverType === 'mods') {
        facets.push('["project_type:mod"]')
        facets.push('["categories:fabric"]')
      } else if (discoverType === 'resourcepacks') {
        facets.push('["project_type:resourcepack"]')
      } else if (discoverType === 'shaders') {
        facets.push('["project_type:shader"]')
      } else if (discoverType === 'datapacks') {
        facets.push('["project_type:datapack"]')
      }

      const facetString = `[${facets.join(',')}]`
      const url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(
        query
      )}&facets=${encodeURIComponent(facetString)}&limit=15`

      const res = await fetch(url)
      const data = await res.json()
      setSearchResults(data.hits || [])
    } catch (err) {
      console.error('Search error:', err)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    handleSearch('')
  }, [discoverType])

  // Custom Skin Upload
  const handleSkinFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64Data = event.target?.result
      if (typeof base64Data === 'string') {
        const newSkinObj = {
          id: `custom_${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          type: skinModelType,
          url: base64Data,
          thumb: base64Data,
          isCustom: true,
        }
        addCustomSkin(newSkinObj)
      }
    }
    reader.readAsDataURL(file)
  }

  // Toggle Installed Mod
  const handleToggleMod = async (mod) => {
    try {
      await invoke('toggle_mod', {
        profileId: activeInstance.id || 'default',
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

  // Launch Minecraft with Offline Profile
  const handleLaunch = async () => {
    if (launchStatus === 'running') return
    const currentInst = activeInstance
    setLaunchStatus('downloading')
    setLaunchMessage(`Preparing ${currentInst.name} (${currentInst.mc_version}) for ${offlineUsername}...`)
    try {
      await invoke('launch_game', {
        req: {
          profile_id: currentInst.id,
          profile_name: currentInst.name,
          username: offlineUsername,
          mc_version: currentInst.mc_version,
          fabric_version: currentInst.fabric_version || null,
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
      await invoke('kill_game', { profileId: activeInstance.id || 'default' })
      setLaunchStatus('idle')
    } catch (err) {}
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#111216] text-slate-100 font-sans select-none flex">
      {/* Hidden File Input for Custom Skin PNG Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleSkinFileChange}
        accept="image/png"
        className="hidden"
      />

      {/* 1. LEFT MODRINTH VERTICAL NAVIGATION RAIL */}
      <nav className="w-16 h-full bg-[#0d0e11] border-r border-white/5 flex flex-col items-center justify-between py-3.5 z-40 select-none">
        <div className="flex flex-col items-center gap-3">
          {/* Modrinth Wrench Logo */}
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
              title="Skin Selector & Offline Profile"
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
              title="Installed Instances Library"
            >
              <Layers className="w-4 h-4" />
            </button>

            {/* Create Instance (+) */}
            <button
              onClick={() => {
                setCreateStep('choose_type')
                setIsCreateModalOpen(true)
              }}
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
                  ? `Home / ${activeInstance.name}`
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
            {/* Instance Quick Selector Dropdown */}
            {profiles.length > 1 && (
              <select
                value={activeInstance.id}
                onChange={(e) => {
                  const target = profiles.find((p) => p.id === e.target.value)
                  if (target) {
                    setActiveProfile(target.id)
                    setSelectedVersion(target.mc_version)
                  }
                }}
                className="px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-xs font-bold text-slate-300 focus:outline-none cursor-pointer"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#14161b]">
                    {p.name} ({p.mc_version})
                  </option>
                ))}
              </select>
            )}

            {/* Offline Account Pill */}
            <div
              onClick={() => navigateTo('skins')}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs cursor-pointer transition-colors"
              title="Click to customize offline profile"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-bold text-white text-[11px]">{offlineUsername}</span>
              <span className="text-[10px] text-slate-400 bg-white/10 px-1.5 py-0.2 rounded font-mono">
                Offline
              </span>
            </div>

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
                {launchStatus === 'running' ? 'Minecraft Running' : 'Ready'}
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

        {/* VIEW 1: HOME PAGE */}
        {activeTab === 'home' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-y-auto">
            <div className="max-w-md w-full flex flex-col items-center space-y-6">
              {/* Modrinth Emblem */}
              <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-2xl shadow-emerald-500/10 relative group">
                <div className="w-14 h-14 rounded-2xl border-4 border-emerald-400 flex items-center justify-center">
                  <span className="text-2xl font-black text-emerald-400">M</span>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white tracking-tight">
                  {activeInstance.name}
                </h2>
                <p className="text-sm text-slate-400">
                  Ready to launch Minecraft {activeInstance.mc_version} as{' '}
                  <span className="text-emerald-400 font-bold">{offlineUsername}</span>
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {activeInstance.fabric_version ? 'Fabric Loader' : 'Vanilla'}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                    {installedMods.length} Mods Active
                  </span>
                </div>
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
                        <span>PLAY INSTANCE</span>
                      </>
                    )}
                  </button>
                )}

                {/* Instance Quick Actions */}
                <div className="flex items-center gap-2 w-full">
                  <button
                    onClick={() => handleOpenInstanceFolder(activeInstance.id)}
                    className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    title="Open game directory"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>Folder</span>
                  </button>

                  <button
                    onClick={() => handleOpenModsFolder(activeInstance.id)}
                    className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    title="Open mods directory"
                  >
                    <Box className="w-3.5 h-3.5 text-slate-400" />
                    <span>Mods</span>
                  </button>

                  <button
                    onClick={() => navigateTo('instances')}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs transition-colors flex items-center justify-center"
                    title="Switch or view all instances"
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
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

        {/* VIEW 2: DISCOVER CONTENT PAGE */}
        {activeTab === 'discover' && (
          <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4">
            {/* Top Content Pills */}
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
                <span>Target Instance:</span>
                <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20 font-bold">
                  {activeInstance.name} ({activeInstance.mc_version})
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
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 flex-shrink-0 transition-all ${
                          isInstalled
                            ? 'bg-white/10 text-slate-400 cursor-default'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 active:scale-95'
                        }`}
                      >
                        {isInstalled ? (
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

        {/* VIEW 3: SKIN SELECTOR PAGE */}
        {activeTab === 'skins' && (
          <div className="flex-1 flex flex-col justify-between p-8 overflow-y-auto">
            <div className="flex items-start gap-12 max-w-5xl mx-auto w-full">
              {/* 3D Skin Preview Interactive Column */}
              <div className="flex flex-col items-center space-y-4">
                <div className="w-72 h-96 rounded-2xl bg-black/40 border border-white/10 flex flex-col items-center justify-center relative p-4 shadow-2xl backdrop-blur-sm">
                  {offlineSkin?.url ? (
                    <MinecraftSkinViewer3D
                      skinUrl={offlineSkin.url}
                      model={skinModelType}
                      animation={skinAnimation}
                      width={220}
                      height={320}
                    />
                  ) : (
                    <div className="text-xs text-slate-500">No skin loaded</div>
                  )}
                </div>

                {/* Model & Animation Controls */}
                <div className="flex items-center gap-2 w-full">
                  <button
                    onClick={() => {
                      const nextType = skinModelType === 'classic' ? 'slim' : 'classic'
                      setSkinModelType(nextType)
                      setOfflineSkin({ ...offlineSkin, type: nextType })
                    }}
                    className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 border border-white/10 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Model:</span>
                    <span className="text-emerald-400 capitalize">{skinModelType}</span>
                  </button>

                  <button
                    onClick={() => {
                      const anims = ['idle', 'walk', 'fly']
                      const nextIdx = (anims.indexOf(skinAnimation) + 1) % anims.length
                      setSkinAnimation(anims[nextIdx])
                    }}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 border border-white/10 transition-colors flex items-center gap-1"
                    title="Change pose animation"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="capitalize text-[11px]">{skinAnimation}</span>
                  </button>
                </div>
              </div>

              {/* Skins Picker & Offline Profile Grid */}
              <div className="flex-1 space-y-6">
                {/* Offline Profile Name Card */}
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-400" />
                      Offline Username
                    </span>
                    {!isEditingUsername && (
                      <button
                        onClick={() => {
                          setTempUsername(offlineUsername)
                          setIsEditingUsername(true)
                        }}
                        className="text-[11px] font-bold text-emerald-400 hover:underline"
                      >
                        Change Name
                      </button>
                    )}
                  </div>

                  {isEditingUsername ? (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={tempUsername}
                        onChange={(e) => setTempUsername(e.target.value)}
                        placeholder="Enter player name..."
                        className="flex-1 px-3 py-1.5 rounded-xl bg-[#0c0d10] border border-emerald-500/50 text-xs text-white font-mono focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          setOfflineUsername(tempUsername)
                          setIsEditingUsername(false)
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black font-bold text-xs"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditingUsername(false)}
                        className="px-2 py-1.5 rounded-xl bg-white/5 text-slate-400 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="text-base font-black text-white font-mono">
                        {offlineUsername}
                      </div>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-mono">
                        Valid for Singleplayer & LAN
                      </span>
                    </div>
                  )}
                </div>

                {/* Saved Custom Skins */}
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <span>Saved custom skins</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      ({savedCustomSkins.length})
                    </span>
                  </h3>

                  <div className="flex items-center gap-3 overflow-x-auto pb-2">
                    {/* Add Custom Skin Box */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-28 h-36 rounded-2xl border-2 border-dashed border-white/15 hover:border-emerald-400/50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-white/5 flex-shrink-0 group"
                    >
                      <Upload className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                      <span className="text-xs font-bold text-slate-300">Add skin</span>
                      <span className="text-[10px] text-slate-500">.png file</span>
                    </div>

                    {/* Custom Skins List */}
                    {savedCustomSkins.map((skin) => (
                      <div
                        key={skin.id}
                        onClick={() => {
                          setOfflineSkin(skin)
                          setSkinModelType(skin.type || 'classic')
                        }}
                        className={`w-28 h-36 rounded-2xl border p-2.5 flex flex-col items-center justify-between cursor-pointer transition-all flex-shrink-0 relative group ${
                          offlineSkin?.id === skin.id
                            ? 'bg-emerald-500/10 border-emerald-400 shadow-lg'
                            : 'bg-black/30 hover:bg-white/5 border-white/10'
                        }`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeCustomSkin(skin.id)
                          }}
                          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <img
                          src={skin.thumb || skin.url}
                          alt={skin.name}
                          className="w-14 h-20 object-contain drop-shadow"
                        />
                        <span className="text-[11px] font-bold text-slate-200 truncate w-full text-center">
                          {skin.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Default Official Skins */}
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">
                    Default skins
                  </h3>
                  <div className="grid grid-cols-4 gap-2.5">
                    {OFFICIAL_DEFAULT_SKINS.map((skin) => (
                      <div
                        key={skin.id}
                        onClick={() => {
                          setOfflineSkin(skin)
                          setSkinModelType(skin.type)
                        }}
                        className={`p-2 rounded-2xl border cursor-pointer transition-all flex flex-col items-center gap-1.5 relative ${
                          offlineSkin?.id === skin.id
                            ? 'bg-emerald-500/10 border-emerald-400 shadow-lg'
                            : 'bg-black/30 hover:bg-white/5 border-white/10'
                        }`}
                      >
                        {offlineSkin?.id === skin.id && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-black stroke-[3]" />
                          </div>
                        )}
                        <img
                          src={skin.thumb}
                          alt={skin.name}
                          className="w-12 h-16 object-contain"
                        />
                        <span className="text-xs font-bold text-slate-200">{skin.name}</span>
                        <span className="text-[9px] text-slate-500 font-mono capitalize">
                          {skin.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Offline Notice Banner */}
            <div className="mt-6 p-4 rounded-2xl bg-black/50 border border-emerald-500/20 flex items-center justify-between gap-4 max-w-4xl mx-auto w-full">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <h5 className="font-bold text-xs text-white">
                    Offline Account Active: {offlineUsername}
                  </h5>
                  <p className="text-[11px] text-slate-400">
                    Skins and player profile are stored locally on your PC. No online login required.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/10 transition-colors flex-shrink-0"
              >
                Configure Settings
              </button>
            </div>
          </div>
        )}

        {/* VIEW 4: INSTANCES LIBRARY (All Instances Grid & Management) */}
        {activeTab === 'instances' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Minecraft Instances Library</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Switch, launch, and configure your individual Minecraft versions and profiles.
                </p>
              </div>

              <button
                onClick={() => {
                  setCreateStep('choose_type')
                  setIsCreateModalOpen(true)
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-2 shadow-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create Instance</span>
              </button>
            </div>

            {/* Instances Cards Grid */}
            <div className="grid grid-cols-3 gap-4">
              {profiles.map((p) => {
                const isActive = p.id === activeInstance.id
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setActiveProfile(p.id)
                      setSelectedVersion(p.mc_version)
                    }}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 group ${
                      isActive
                        ? 'bg-emerald-500/10 border-emerald-500/60 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                        : 'bg-[#0f1014] hover:bg-[#14161c] border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                            isActive
                              ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                              : 'bg-white/5 text-slate-300'
                          }`}
                        >
                          MC
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">
                            {p.name}
                          </h4>
                          <span className="text-[11px] font-mono text-slate-400 block">
                            Version {p.mc_version}
                          </span>
                        </div>
                      </div>

                      {isActive && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md font-mono">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-slate-400">
                      <span className="font-mono">
                        {p.fabric_version ? 'Fabric Loader' : 'Vanilla'}
                      </span>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenInstanceFolder(p.id)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                          title="Open instance folder"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenModsFolder(p.id)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                          title="Open mods folder"
                        >
                          <Box className="w-3.5 h-3.5" />
                        </button>
                        {profiles.length > 1 && (
                          <button
                            onClick={() => handleDeleteInstance(p.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                            title="Delete instance"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. CREATE INSTANCE MODAL (Matching Image 4 & Full Custom Setup) */}
      {isCreateModalOpen && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#14161b] border border-white/15 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-white">
                {createStep === 'custom_setup' ? 'Custom Instance Setup' : 'Create instance'}
              </h3>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false)
                  setCreateStep('choose_type')
                }}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* STEP 1: CHOOSE INSTANCE TYPE */}
            {createStep === 'choose_type' && (
              <>
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

                {/* Instance Types Options */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-300">Choose instance type</h4>

                  {/* 1. Custom setup */}
                  <div
                    onClick={() => setCreateStep('custom_setup')}
                    className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/40 cursor-pointer transition-all flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-white">Custom setup</h5>
                      <p className="text-[11px] text-slate-400">
                        Start from scratch by picking a loader and game version.
                      </p>
                    </div>
                  </div>

                  {/* 2. Start from modpack */}
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
                        Choose a project and we'll use its latest version.
                      </p>
                    </div>
                  </div>

                  {/* 3. Upload modpack */}
                  <div
                    onClick={() => {
                      setIsCreateModalOpen(false)
                      setActiveTab('home')
                    }}
                    className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/40 cursor-pointer transition-all flex items-center gap-4 opacity-75"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-white">Upload a modpack</h5>
                      <p className="text-[11px] text-slate-400">
                        Install a modpack from an .mrpack file on your device.
                      </p>
                    </div>
                  </div>

                  {/* 4. Import instance */}
                  <div
                    onClick={() => {
                      setIsCreateModalOpen(false)
                      setActiveTab('home')
                    }}
                    className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/40 cursor-pointer transition-all flex items-center gap-4 opacity-75"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
                      <Box className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-white">Import instance</h5>
                      <p className="text-[11px] text-slate-400">
                        Import an instance from Prism, CurseForge, or similar.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* STEP 2: CUSTOM SETUP DETAIL FORM */}
            {createStep === 'custom_setup' && (
              <div className="space-y-4">
                {/* Instance Name */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Instance Name
                  </label>
                  <input
                    type="text"
                    value={newInstanceName}
                    onChange={(e) => setNewInstanceName(e.target.value)}
                    placeholder={`Minecraft ${newInstanceVersion}`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Loader Selection */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Mod Loader
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'fabric', label: 'Fabric' },
                      { id: 'vanilla', label: 'Vanilla' },
                      { id: 'neoforge', label: 'NeoForge' },
                      { id: 'forge', label: 'Forge' },
                      { id: 'quilt', label: 'Quilt' },
                    ].map((loader) => (
                      <button
                        key={loader.id}
                        type="button"
                        onClick={() => setNewInstanceLoader(loader.id)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                          newInstanceLoader === loader.id
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/60'
                            : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                        }`}
                      >
                        {loader.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Minecraft Version Selection */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Minecraft Version
                  </label>
                  <select
                    value={newInstanceVersion}
                    onChange={(e) => setNewInstanceVersion(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {versions.map((v) => (
                      <option key={v.id} value={v.id} className="bg-[#14161b]">
                        {v.id} ({v.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setCreateStep('choose_type')}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateInstanceSubmit}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Create Instance
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. MODRINTH SETTINGS MODAL */}
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
                  <span className="text-[10px] font-bold text-slate-500 uppercase px-2">Account</span>
                  <button
                    onClick={() => setSettingsCategory('offline_account')}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      settingsCategory === 'offline_account'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Offline Profile
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

              {/* Category: Appearance */}
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

              {/* Category: Offline Account */}
              {settingsCategory === 'offline_account' && (
                <div className="space-y-5">
                  <div>
                    <h4 className="font-bold text-sm text-white">Offline Player Settings</h4>
                    <p className="text-xs text-slate-400">
                      Manage local username and parameters for Minecraft Singleplayer & LAN.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">
                        In-Game Username
                      </label>
                      <input
                        type="text"
                        value={offlineUsername}
                        onChange={(e) => setOfflineUsername(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="text-[11px] text-slate-400 space-y-1">
                      <div>• Account Type: Local Offline Profile</div>
                      <div>• Authentication: Direct local token bypass</div>
                      <div>• Skin Support: Equipped custom skin will be rendered locally</div>
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
