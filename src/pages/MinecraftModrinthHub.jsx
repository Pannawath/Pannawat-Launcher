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
  Filter,
  FileText,
  Terminal,
  Folder,
  File,
  RefreshCw,
  Sliders,
  ChevronDown,
} from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { useProfileStore } from '../store/profileStore'

// Default Skins list
const OFFICIAL_DEFAULT_SKINS = [
  { id: 'steve', name: 'Steve', type: 'classic', url: 'https://textures.minecraft.net/texture/1a4af718455d4aab528e7a61f86fa25e6a369d1768dcb13f7df319a71824765', thumb: 'https://raw.githubusercontent.com/PrismLauncher/PrismLauncher/develop/launcher/resources/multimc/icons/instances/steve.png' },
  { id: 'alex', name: 'Alex', type: 'slim', url: 'https://textures.minecraft.net/texture/2eb916298692f0224d455d312de8bf404fbebe2a559d3326177114b0b1ff33b8', thumb: 'https://raw.githubusercontent.com/PrismLauncher/PrismLauncher/develop/launcher/resources/multimc/icons/instances/alex.png' },
  { id: 'noor', name: 'Noor', type: 'slim', url: 'https://textures.minecraft.net/texture/2d8fdf0b51f7bb9c2a71d37452d3a372eb0f171542f4c7f551b88e16fa9bf25e', thumb: 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/4/42/Noor_skin.png' },
  { id: 'sunny', name: 'Sunny', type: 'classic', url: 'https://textures.minecraft.net/texture/644788c6c9a7ceec816432b07e5fbf930eb444ee03f83120150d6ffcb37e7215', thumb: 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/3/30/Sunny_skin.png' },
  { id: 'ari', name: 'Ari', type: 'classic', url: 'https://textures.minecraft.net/texture/f140682121300977ee47683c3167df663dffbb309391ab2d5c3f39a79fa72be', thumb: 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/7/7b/Ari_skin.png' },
  { id: 'zuri', name: 'Zuri', type: 'classic', url: 'https://textures.minecraft.net/texture/e55e3a8fa6a6fbb2a67e812f86538c2323a2f7c00628d0295fcfa4ebac370f14', thumb: 'https://static.wikia.nocookie.net/minecraft_gamepedia/images/8/86/Zuri_skin.png' },
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
    windowWidth,
    setWindowWidth,
    windowHeight,
    setWindowHeight,
    fullscreen,
    setFullscreen,
    launcherBehavior,
    setLauncherBehavior,
    theme,
    setTheme,
    advancedRendering,
    setAdvancedRendering,
    discordRpc,
    setDiscordRpc,
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

  // Installed Instance Sub-Tabs: 'mods' | 'files' | 'logs'
  const [instanceSubTab, setInstanceSubTab] = useState('mods')
  const [instanceFiles, setInstanceFiles] = useState([])
  const [instanceLogs, setInstanceLogs] = useState('')
  const [logFilter, setLogFilter] = useState('all') // 'all' | 'error' | 'warn' | 'info'
  const [currentFolderSubpath, setCurrentFolderSubpath] = useState('')

  // Discover Content
  const [discoverType, setDiscoverType] = useState('modpacks')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [sortBy, setSortBy] = useState('relevance')

  // Project Detail & Version Picker Modal
  const [selectedProject, setSelectedProject] = useState(null)
  const [projectVersions, setProjectVersions] = useState([])
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)
  const [installingVersionId, setInstallingVersionId] = useState(null)

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createStep, setCreateStep] = useState('choose_type')
  const [newInstanceName, setNewInstanceName] = useState('')
  const [newInstanceVersion, setNewInstanceVersion] = useState('1.21.4')
  const [newInstanceLoader, setNewInstanceLoader] = useState('fabric')
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [settingsCategory, setSettingsCategory] = useState('appearance')

  // Toast Notification
  const [toastNotification, setToastNotification] = useState(null)
  const showToast = (message, type = 'error') => {
    setToastNotification({ message, type, id: Date.now() })
    setTimeout(() => {
      setToastNotification((prev) => (prev?.message === message ? null : prev))
    }, 4500)
  }

  // Modpack Upload File Input Ref
  const modpackInputRef = useRef(null)
  const skinFileInputRef = useRef(null)

  // Skin Selector Model State
  const [skinModelType, setSkinModelType] = useState(offlineSkin?.type || 'classic')
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [tempUsername, setTempUsername] = useState(offlineUsername)

  // Instances & Game state
  const [installedMods, setInstalledMods] = useState([])
  const [versions, setVersions] = useState([])
  const [launchStatus, setLaunchStatus] = useState('idle')
  const [launchMessage, setLaunchMessage] = useState('')
  const [downloadProgress, setDownloadProgress] = useState(null)

  // Keyboard Escape Handler for all Modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedProject) setSelectedProject(null)
        if (isCreateModalOpen) {
          setIsCreateModalOpen(false)
          setCreateStep('choose_type')
        }
        if (isSettingsModalOpen) setIsSettingsModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCreateModalOpen, isSettingsModalOpen, selectedProject])

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
    try { await getCurrentWindow().minimize() } catch (e) {}
  }
  const handleMaximize = async () => {
    try { await getCurrentWindow().toggleMaximize() } catch (e) {}
  }
  const handleClose = async () => {
    try { await getCurrentWindow().close() } catch (e) {}
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
      setInstalledMods([])
    }
  }

  // Load Instance In-App Files
  const loadInstanceFiles = async (subpath = currentFolderSubpath) => {
    try {
      const list = await invoke('list_instance_files', {
        profileId: activeInstance.id,
        subpath: subpath || null,
      })
      setInstanceFiles(list || [])
    } catch (err) {
      console.error('Failed to list files:', err)
    }
  }

  // Load Instance Game Logs
  const loadInstanceLogs = async () => {
    try {
      const logs = await invoke('get_instance_logs', { profileId: activeInstance.id })
      setInstanceLogs(logs || '')
    } catch (err) {
      setInstanceLogs('[INFO] No game logs available yet.')
    }
  }

  useEffect(() => {
    loadMods()
    if (activeTab === 'instances') {
      if (instanceSubTab === 'files') loadInstanceFiles()
      if (instanceSubTab === 'logs') loadInstanceLogs()
    }
  }, [activeInstance.id, activeTab, instanceSubTab, currentFolderSubpath])

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
      showToast(`Created instance ${name}!`, 'success')
    } catch (err) {
      showToast(`Create instance failed: ${err}`, 'error')
    }
  }

  // Delete Instance
  const handleDeleteInstance = async (id) => {
    try {
      await invoke('delete_profile', { profileId: id })
      await loadProfiles()
      showToast('Instance removed successfully', 'success')
    } catch (err) {
      showToast(`Delete failed: ${err}`, 'error')
    }
  }

  // Delete Individual Mod
  const handleDeleteMod = async (filename) => {
    try {
      await invoke('delete_installed_mod', {
        profileId: activeInstance.id,
        filename,
      })
      await loadMods()
      showToast(`Removed ${filename}`, 'success')
    } catch (err) {
      showToast(`Failed to remove mod: ${err}`, 'error')
    }
  }

  // Open Native Folders
  const handleOpenInstanceFolder = async (id) => {
    try { await invoke('open_instance_folder', { profileId: id }) } catch (err) {}
  }
  const handleOpenModsFolder = async (id) => {
    try { await invoke('open_mods_folder', { profileId: id }) } catch (err) {}
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
        if (activeInstance.fabric_version) facets.push('["categories:fabric"]')
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
      )}&facets=${encodeURIComponent(facetString)}&index=${sortBy}&limit=20`

      const res = await fetch(url)
      const data = await res.json()
      setSearchResults(data.hits || [])
    } catch (err) {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    handleSearch(searchQuery)
  }, [discoverType, sortBy])

  // Open Project Detail & Fetch All Available Versions
  const handleOpenProjectDetail = async (project) => {
    setSelectedProject(project)
    setIsLoadingVersions(true)
    try {
      const url = `https://api.modrinth.com/v2/project/${project.project_id}/version`
      const res = await fetch(url)
      const vers = await res.json()
      setProjectVersions(Array.isArray(vers) ? vers : [])
    } catch (err) {
      setProjectVersions([])
    } finally {
      setIsLoadingVersions(false)
    }
  }

  // Install Specific Selected Version
  const handleInstallSpecificVersion = async (versionObj) => {
    const primaryFile = versionObj.files?.find((f) => f.primary) || versionObj.files?.[0]
    if (!primaryFile) {
      showToast('No downloadable file in this version', 'error')
      return
    }

    setInstallingVersionId(versionObj.id)
    try {
      await invoke('install_mod_file_url', {
        profileId: activeInstance.id,
        downloadUrl: primaryFile.url,
        filename: primaryFile.filename,
      })
      await loadMods()
      showToast(`Installed ${versionObj.name} (${primaryFile.filename})!`, 'success')
    } catch (err) {
      showToast(`Download failed: ${err}`, 'error')
    } finally {
      setInstallingVersionId(null)
    }
  }

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
        showToast(`Equipped skin: ${newSkinObj.name}`, 'success')
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
    } catch (err) {}
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
      showToast(`Launch error: ${err}`, 'error')
      setLaunchStatus('idle')
    }
  }

  const handleForceQuit = async () => {
    try {
      await invoke('kill_game', { profileId: activeInstance.id || 'default' })
      setLaunchStatus('idle')
    } catch (err) {}
  }

  // Filtered Logs
  const filteredLogs = instanceLogs
    .split('\n')
    .filter((line) => {
      if (logFilter === 'all') return true
      if (logFilter === 'error') return line.toLowerCase().includes('error') || line.toLowerCase().includes('fail')
      if (logFilter === 'warn') return line.toLowerCase().includes('warn')
      if (logFilter === 'info') return line.toLowerCase().includes('info')
      return true
    })
    .join('\n')

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#111216] text-slate-100 font-sans select-none flex">
      {/* Hidden File Input for Custom Skin PNG */}
      <input
        type="file"
        ref={skinFileInputRef}
        onChange={handleSkinFileChange}
        accept="image/png"
        className="hidden"
      />

      {/* Hidden File Input for Modpack Upload */}
      <input
        type="file"
        ref={modpackInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            showToast(`Selected modpack: ${file.name}. Ready for import!`, 'success')
            setIsCreateModalOpen(false)
            setCreateStep('choose_type')
          }
        }}
        accept=".mrpack,.zip"
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

          {/* Navigation Icons */}
          <div className="flex flex-col gap-2">
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
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="w-10 h-10 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white flex items-center justify-center transition-all"
            title="Settings (Java, Memory, Display)"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

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

          {/* Right Header Controls (Status & Window buttons - Matching Uploaded Image) */}
          <div className="flex items-center gap-3">
            {/* Live Modrinth Download Pill (Matching Image 1) */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 border border-white/10 text-xs shadow-inner">
              <RotateCw className={`w-3.5 h-3.5 text-slate-400 ${launchStatus === 'downloading' ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="font-bold text-white text-xs">
                {activeInstance.fabric_version ? 'Fabric' : 'Minecraft'} {activeInstance.mc_version}
              </span>
              <span className="text-emerald-400/90 font-mono text-[11px] font-semibold">
                {launchStatus === 'downloading' ? '2.47 MB/s' : 'Ready'}
              </span>
              <div className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/40">
                {installedMods.length}
              </div>
            </div>

            {/* Offline Account Pill */}
            <div
              onClick={() => navigateTo('skins')}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs cursor-pointer transition-colors"
              title="Click to view offline profile"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-bold text-white text-[11px]">{offlineUsername}</span>
              <span className="text-[10px] text-slate-400 bg-white/10 px-1.5 py-0.2 rounded font-mono">
                Offline
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
                    className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2"
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
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    title="Open game directory in Windows Explorer"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>Folder</span>
                  </button>

                  <button
                    onClick={() => {
                      navigateTo('instances')
                      setInstanceSubTab('mods')
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    title="Manage current mods"
                  >
                    <Box className="w-3.5 h-3.5 text-slate-400" />
                    <span>Mods</span>
                  </button>

                  <button
                    onClick={() => navigateTo('instances')}
                    className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs transition-colors flex items-center justify-center"
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
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
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

              {/* Target Instance Indicator */}
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Installing to:</span>
                <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 font-bold">
                  {activeInstance.name} ({activeInstance.mc_version})
                </span>
              </div>
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

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  Sort:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-[#0c0d10] border border-white/10 text-xs font-bold text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="relevance" className="bg-[#14161b]">Relevance</option>
                  <option value="downloads" className="bg-[#14161b]">Most Downloads</option>
                  <option value="follows" className="bg-[#14161b]">Most Follows</option>
                  <option value="newest" className="bg-[#14161b]">Newest</option>
                  <option value="updated" className="bg-[#14161b]">Recently Updated</option>
                </select>
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
                searchResults.map((item) => (
                  <div
                    key={item.project_id}
                    onClick={() => handleOpenProjectDetail(item)}
                    className="p-4 rounded-2xl bg-[#0e1014] hover:bg-[#12141a] border border-white/5 hover:border-white/15 transition-all flex items-center justify-between gap-4 cursor-pointer group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {item.icon_url ? (
                        <img
                          src={item.icon_url}
                          alt={item.title}
                          className="w-14 h-14 rounded-xl object-cover bg-black/40 border border-white/10 flex-shrink-0 group-hover:border-emerald-500/40 transition-colors"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
                          M
                        </div>
                      )}

                      <div className="space-y-1 min-w-0">
                        <h4 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors truncate flex items-center gap-2">
                          <span>{item.title}</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            by {item.author || 'Modrinth Creator'}
                          </span>
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-1">
                          {item.description}
                        </p>
                        <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400">
                          <span className="px-2 py-0.5 rounded-md bg-white/5 font-mono text-emerald-400">
                            {activeInstance.fabric_version ? 'Fabric' : 'Vanilla'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white/5 font-mono">
                            {item.downloads.toLocaleString()} Downloads
                          </span>
                          {item.follows && (
                            <span className="px-2 py-0.5 rounded-md bg-white/5 font-mono text-amber-400">
                              {item.follows.toLocaleString()} Followers
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenProjectDetail(item)
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-emerald-500 hover:text-black text-slate-200 transition-all flex items-center gap-1.5 flex-shrink-0"
                    >
                      <span>Select Version</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: SKIN SELECTOR & OFFLINE PROFILE (Clean Design without 3D canvas) */}
        {activeTab === 'skins' && (
          <div className="flex-1 flex flex-col justify-between p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full space-y-6">
              {/* Top Header Card */}
              <div className="p-6 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <User className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{offlineUsername}</h3>
                    <p className="text-xs text-slate-400">
                      Offline Player Profile • Singleplayer & LAN Ready
                    </p>
                    <div className="flex items-center gap-2 pt-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        Active Local Account
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-slate-300 text-[10px] font-mono capitalize">
                        Model: {skinModelType}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {!isEditingUsername ? (
                    <button
                      onClick={() => {
                        setTempUsername(offlineUsername)
                        setIsEditingUsername(true)
                      }}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white border border-white/10 transition-colors"
                    >
                      Change Name
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tempUsername}
                        onChange={(e) => setTempUsername(e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-[#0c0d10] border border-emerald-500 text-xs text-white font-mono focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          setOfflineUsername(tempUsername)
                          setIsEditingUsername(false)
                          showToast(`Username updated to ${tempUsername}`, 'success')
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black font-bold text-xs"
                      >
                        Save
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      const next = skinModelType === 'classic' ? 'slim' : 'classic'
                      setSkinModelType(next)
                      setOfflineSkin({ ...offlineSkin, type: next })
                    }}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 border border-white/10 transition-colors capitalize"
                  >
                    Switch to {skinModelType === 'classic' ? 'Slim' : 'Classic'}
                  </button>
                </div>
              </div>

              {/* Saved Skins Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                    Custom Uploaded Skins ({savedCustomSkins.length})
                  </h4>
                  <button
                    onClick={() => skinFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold border border-emerald-500/40 flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload .PNG Skin</span>
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {savedCustomSkins.map((skin) => (
                    <div
                      key={skin.id}
                      onClick={() => {
                        setOfflineSkin(skin)
                        setSkinModelType(skin.type || 'classic')
                        showToast(`Equipped ${skin.name}`, 'success')
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                        offlineSkin?.id === skin.id
                          ? 'bg-emerald-500/10 border-emerald-500/60 shadow-lg'
                          : 'bg-black/30 hover:bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={skin.thumb || skin.url}
                          alt={skin.name}
                          className="w-10 h-10 object-contain drop-shadow"
                        />
                        <span className="text-xs font-bold text-white truncate max-w-[120px]">
                          {skin.name}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeCustomSkin(skin.id)
                        }}
                        className="p-1 rounded-md hover:bg-rose-500/20 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Default Minecraft Skins Grid */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                  Default Minecraft Skins
                </h4>
                <div className="grid grid-cols-6 gap-3">
                  {OFFICIAL_DEFAULT_SKINS.map((skin) => (
                    <div
                      key={skin.id}
                      onClick={() => {
                        setOfflineSkin(skin)
                        setSkinModelType(skin.type)
                        showToast(`Equipped ${skin.name}`, 'success')
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center gap-2 ${
                        offlineSkin?.id === skin.id
                          ? 'bg-emerald-500/10 border-emerald-500/60 shadow-lg'
                          : 'bg-black/30 hover:bg-white/5 border-white/10'
                      }`}
                    >
                      <img src={skin.thumb} alt={skin.name} className="w-14 h-16 object-contain" />
                      <span className="text-xs font-bold text-slate-200">{skin.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: INSTALLED INSTANCES & MANAGEMENT (Matching Modrinth App: Mods, Files, Logs) */}
        {activeTab === 'instances' && (
          <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4">
            {/* Top Toolbar: Switch Instance & Sub-tabs */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Active Instance:</span>
                  <select
                    value={activeInstance.id}
                    onChange={(e) => {
                      const target = profiles.find((p) => p.id === e.target.value)
                      if (target) {
                        setActiveProfile(target.id)
                        setSelectedVersion(target.mc_version)
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-xs font-bold text-emerald-400 focus:outline-none cursor-pointer"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#14161b]">
                        {p.name} ({p.mc_version})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sub-Tabs: Mods, Files, Logs */}
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => setInstanceSubTab('mods')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      instanceSubTab === 'mods'
                        ? 'bg-emerald-500 text-black shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>Current Mods ({installedMods.length})</span>
                  </button>

                  <button
                    onClick={() => {
                      setInstanceSubTab('files')
                      loadInstanceFiles()
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      instanceSubTab === 'files'
                        ? 'bg-emerald-500 text-black shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>File Browser</span>
                  </button>

                  <button
                    onClick={() => {
                      setInstanceSubTab('logs')
                      loadInstanceLogs()
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      instanceSubTab === 'logs'
                        ? 'bg-emerald-500 text-black shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Game Logs</span>
                  </button>
                </div>
              </div>

              {/* Instance Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenInstanceFolder(activeInstance.id)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 border border-white/10 flex items-center gap-1.5"
                  title="Open in Windows Explorer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>Open Folder</span>
                </button>

                {profiles.length > 1 && (
                  <button
                    onClick={() => handleDeleteInstance(activeInstance.id)}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-xs font-bold text-rose-400 border border-rose-500/30 flex items-center gap-1.5"
                    title="Delete entire instance"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Instance</span>
                  </button>
                )}
              </div>
            </div>

            {/* SUB-VIEW 1: CURRENT MODS LIST */}
            {instanceSubTab === 'mods' && (
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs text-slate-400">
                    Installed in <code className="font-mono text-emerald-400">/{activeInstance.name}/mods</code>
                  </span>
                  <button
                    onClick={() => navigateTo('discover')}
                    className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add more from Discover</span>
                  </button>
                </div>

                {installedMods.length === 0 ? (
                  <div className="py-24 text-center text-xs text-slate-500 space-y-2">
                    <Box className="w-8 h-8 text-slate-600 mx-auto" />
                    <p>No mods installed in this instance yet.</p>
                  </div>
                ) : (
                  installedMods.map((m) => {
                    const fileName = m.filename || m.file_name
                    const modName = m.name || m.mod_name
                    return (
                      <div
                        key={fileName}
                        className="p-3.5 rounded-2xl bg-[#0e1014] hover:bg-[#12141a] border border-white/5 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                            JAR
                          </div>
                          <div>
                            <h5 className="font-bold text-xs text-white">{modName}</h5>
                            <span className="text-[10px] font-mono text-slate-400 block">
                              {fileName}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Toggle Mod Switch */}
                          <button
                            onClick={() => handleToggleMod(m)}
                            className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                              m.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                            }`}
                            title={m.enabled ? 'Enabled' : 'Disabled'}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                m.enabled ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>

                          {/* Delete Mod Button */}
                          <button
                            onClick={() => handleDeleteMod(fileName)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Delete mod file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* SUB-VIEW 2: IN-APP FILE BROWSER */}
            {instanceSubTab === 'files' && (
              <div className="flex-1 flex flex-col overflow-hidden space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="text-slate-500">Path:</span>
                    <button
                      onClick={() => setCurrentFolderSubpath('')}
                      className="font-mono text-emerald-400 hover:underline"
                    >
                      /{activeInstance.name}
                    </button>
                    {currentFolderSubpath && (
                      <span className="font-mono text-slate-400">/{currentFolderSubpath}</span>
                    )}
                  </div>
                  <button
                    onClick={() => loadInstanceFiles()}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                    title="Refresh files"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-2">
                  {instanceFiles.map((file) => (
                    <div
                      key={file.path}
                      onClick={() => {
                        if (file.is_dir) {
                          setCurrentFolderSubpath(file.path)
                        }
                      }}
                      className={`p-3 rounded-xl border border-white/5 flex items-center justify-between ${
                        file.is_dir
                          ? 'bg-white/5 hover:bg-white/10 cursor-pointer text-emerald-400'
                          : 'bg-[#0e1014] text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {file.is_dir ? (
                          <Folder className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <File className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="text-xs font-mono font-semibold">{file.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {file.is_dir ? 'Directory' : `${Math.round(file.size / 1024)} KB`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUB-VIEW 3: GAME LOGS WITH FILTERS */}
            {instanceSubTab === 'logs' && (
              <div className="flex-1 flex flex-col overflow-hidden space-y-3">
                {/* Log Filters Bar (Matching User Request: All, Error, Warn, Info) */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {[
                      { id: 'all', label: 'All Logs' },
                      { id: 'error', label: 'Errors' },
                      { id: 'warn', label: 'Warnings' },
                      { id: 'info', label: 'Info' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setLogFilter(f.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          logFilter === f.id
                            ? 'bg-emerald-500 text-black shadow-md'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => loadInstanceLogs()}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                    title="Refresh logs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 p-4 rounded-2xl bg-black/80 border border-white/10 font-mono text-xs overflow-y-auto text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
                  {filteredLogs || '[INFO] No log lines matched filter.'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. DISCOVER VERSION PICKER MODAL (Matching User Request) */}
      {selectedProject && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-2xl h-[560px] rounded-2xl bg-[#14161b] border border-white/15 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedProject.icon_url && (
                  <img
                    src={selectedProject.icon_url}
                    alt={selectedProject.title}
                    className="w-10 h-10 rounded-xl object-cover bg-black/40 border border-white/10"
                  />
                )}
                <div>
                  <h3 className="font-black text-base text-white">{selectedProject.title}</h3>
                  <p className="text-xs text-slate-400">
                    Choose which version to download for {activeInstance.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
              {isLoadingVersions ? (
                <div className="py-24 text-center text-xs text-slate-400 flex flex-col items-center gap-3">
                  <RotateCw className="w-6 h-6 animate-spin text-emerald-400" />
                  <span>Fetching all release versions...</span>
                </div>
              ) : projectVersions.length === 0 ? (
                <div className="py-24 text-center text-xs text-slate-400">
                  No compatible version found.
                </div>
              ) : (
                projectVersions.map((v) => {
                  const isMatchVersion = v.game_versions?.includes(activeInstance.mc_version)
                  const primaryFile = v.files?.find((f) => f.primary) || v.files?.[0]
                  const isInstalling = installingVersionId === v.id

                  return (
                    <div
                      key={v.id}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                        isMatchVersion
                          ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                          : 'bg-white/5 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-xs text-white">{v.name || v.version_number}</h5>
                          {isMatchVersion && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                              Exact Match
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 uppercase font-mono">
                            {v.version_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                          <span>MC: {v.game_versions?.join(', ')}</span>
                          <span>•</span>
                          <span>Loaders: {v.loaders?.join(', ')}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleInstallSpecificVersion(v)}
                        disabled={isInstalling}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                          isInstalling
                            ? 'bg-emerald-500/50 text-black cursor-wait'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 active:scale-95'
                        }`}
                      >
                        {isInstalling ? (
                          <>
                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Installing...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </>
                        )}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. CREATE INSTANCE MODAL */}
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
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/5"
                title="Close modal (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createStep === 'choose_type' && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-300">Choose instance type</h4>

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

                <div
                  onClick={() => modpackInputRef.current?.click()}
                  className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/40 cursor-pointer transition-all flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-white">Upload a modpack</h5>
                      <p className="text-[11px] text-slate-400">
                        Install a modpack from an .mrpack or .zip file on your PC.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md font-mono">
                    Browse
                  </span>
                </div>
              </div>
            )}

            {createStep === 'custom_setup' && (
              <div className="space-y-4">
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

      {/* 5. MODRINTH SETTINGS MODAL */}
      {isSettingsModalOpen && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-2xl h-[520px] rounded-2xl bg-[#14161b] border border-white/15 shadow-2xl flex overflow-hidden">
            <div className="w-52 h-full bg-[#0d0e11] border-r border-white/10 p-4 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="font-black text-base text-white px-2">Settings</h3>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase px-2">Display</span>
                  <button
                    onClick={() => setSettingsCategory('appearance')}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      settingsCategory === 'appearance' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Appearance
                  </button>
                  <button
                    onClick={() => setSettingsCategory('behavior')}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      settingsCategory === 'behavior' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Behavior
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase px-2">Account</span>
                  <button
                    onClick={() => setSettingsCategory('offline_account')}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      settingsCategory === 'offline_account' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Offline Profile
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase px-2">Instance Defaults</span>
                  <button
                    onClick={() => setSettingsCategory('java')}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      settingsCategory === 'java' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Java and memory
                  </button>
                  <button
                    onClick={() => setSettingsCategory('window')}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      settingsCategory === 'window' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Window & Resolution
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="flex justify-end">
                <button
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/5"
                  title="Close settings (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {settingsCategory === 'java' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-white">Java & Memory Allocation</h4>
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. IN-APP GLASSMORPHISM TOAST NOTIFICATION */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-sm p-4 rounded-2xl bg-[#14161f]/90 backdrop-blur-xl border border-white/15 shadow-2xl animate-in fade-in slide-in-from-bottom-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                toastNotification.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {toastNotification.type === 'success' ? <Check className="w-4 h-4" /> : <Info className="w-4 h-4" />}
            </div>
            <p className="text-xs font-semibold text-slate-200 line-clamp-2">
              {toastNotification.message}
            </p>
          </div>
          <button
            onClick={() => setToastNotification(null)}
            className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
