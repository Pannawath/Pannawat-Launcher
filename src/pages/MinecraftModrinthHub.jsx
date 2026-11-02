import React, { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { confirm, open } from '@tauri-apps/plugin-dialog'
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window'
import {
  Play,
  Compass,
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
  Minus,
  Maximize2,
  FolderOpen,
  Info,
  Square,
  Upload,
  User,
  Trash2,
  Filter,
  Folder,
  File,
  RefreshCw,
  Box,
  Terminal,
  ChevronDown,
} from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { useProfileStore } from '../store/profileStore'
import OfflineAccountModal from '../components/OfflineAccountModal'

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
    javaPath,
    setJavaPath,
    jvmArgs,
    setJvmArgs,
    windowWidth,
    setWindowWidth,
    windowHeight,
    setWindowHeight,
    fullscreen,
    setFullscreen,
    launcherBehavior,
    setLauncherBehavior,
  } = useSettingsStore()

  const {
    offlineUsername,
    setOfflineUsername,
    profiles,
    setProfiles,
    activeProfileId,
    setActiveProfile,
    getActiveProfile,
  } = useProfileStore()

  // Navigation: 'home' | 'discover' | 'instances'
  const [activeTab, setActiveTab] = useState('home')
  const [navHistory, setNavHistory] = useState(['home'])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Installed Instance Sub-Tabs: 'mods' | 'files' | 'logs'
  const [instanceSubTab, setInstanceSubTab] = useState('mods')
  const [instanceFiles, setInstanceFiles] = useState([])
  const [instanceLogs, setInstanceLogs] = useState('')
  const [logFilter, setLogFilter] = useState('all') // 'all' | 'error' | 'warn' | 'info'
  const [currentFolderSubpath, setCurrentFolderSubpath] = useState('')
  const [pendingFileDelete, setPendingFileDelete] = useState(null)
  const [isDeletingFile, setIsDeletingFile] = useState(false)

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
  const [isVersionPickerOpen, setIsVersionPickerOpen] = useState(false)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)

  // Toast Notification
  const [toastNotification, setToastNotification] = useState(null)
  const showToast = (message, type = 'error') => {
    setToastNotification({ message, type, id: Date.now() })
    setTimeout(() => {
      setToastNotification((prev) => (prev?.message === message ? null : prev))
    }, 4500)
  }

  // Modpack Upload File Input Ref
  // Offline Player Name Edit
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
        if (isAccountModalOpen) setIsAccountModalOpen(false)
        if (selectedProject) setSelectedProject(null)
        if (isVersionPickerOpen) setIsVersionPickerOpen(false)
        if (isCreateModalOpen) {
          setIsCreateModalOpen(false)
          setCreateStep('choose_type')
        }
        if (isSettingsModalOpen) setIsSettingsModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCreateModalOpen, isSettingsModalOpen, selectedProject, isVersionPickerOpen, isAccountModalOpen])

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
        const selected = list.find((profile) => profile.id === activeProfileId) || list[0]
        if (selected.id !== activeProfileId) setActiveProfile(selected.id)
        setSelectedVersion(selected.mc_version)
      }
    } catch (err) {
      console.error('Failed to list profiles:', err)
    }
  }

  useEffect(() => {
    loadProfiles()
  }, [])

  // Load Minecraft Versions (Fetch Full 900+ Versions List from Mojang Manifest)
  const fetchAllVersions = async () => {
    try {
      const list = await invoke('get_available_versions', { includeSnapshots: true })
      if (Array.isArray(list) && list.length > 0) {
        setVersions(list)
        return
      }
    } catch (e) {
      console.error('Local manifest fetch error, using fallback API:', e)
    }

    try {
      const res = await fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json')
      const data = await res.json()
      if (Array.isArray(data?.versions)) {
        setVersions(data.versions)
      }
    } catch (err) {
      setVersions([
        { id: '26.3', type: 'snapshot' },
        { id: '1.21.4', type: 'release' },
        { id: '1.21.3', type: 'release' },
        { id: '1.21.1', type: 'release' },
        { id: '1.20.1', type: 'release' },
        { id: '1.19.2', type: 'release' },
        { id: '1.16.5', type: 'release' },
        { id: '1.12.2', type: 'release' },
        { id: '1.7.10', type: 'release' },
      ])
    }
  }

  useEffect(() => {
    fetchAllVersions()
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
      setInstanceFiles([])
      showToast(`Could not load instance files: ${err}`, 'error')
    }
  }

  const handleDeleteInstanceFile = async (file) => {
    setIsDeletingFile(true)
    try {
      await invoke('delete_instance_file', {
        profileId: activeInstance.id,
        relativePath: file.path,
      })
      setPendingFileDelete(null)
      await loadInstanceFiles()
      showToast(`Deleted ${file.name}.`, 'success')
    } catch (error) {
      showToast(`Could not delete ${file.name}: ${error}`, 'error')
    } finally {
      setIsDeletingFile(false)
    }
  }

  const applyWindowSize = async () => {
    try {
      await getCurrentWindow().setSize(new LogicalSize(windowWidth, windowHeight))
      await getCurrentWindow().center()
      showToast(`Window size set to ${windowWidth} × ${windowHeight}.`, 'success')
    } catch (error) {
      showToast(`Could not apply window size: ${error}`, 'error')
    }
  }

  // Load Instance Game Logs
  const loadInstanceLogs = async () => {
    try {
      const logs = await invoke('get_instance_logs', { profileId: activeInstance.id })
      setInstanceLogs(logs || '')
    } catch (err) {
      setInstanceLogs(`[ERROR] Could not load game logs: ${err}`)
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
    const approved = await confirm(`Delete instance “${activeInstance.name}” and all its files? This cannot be undone.`, { title: 'Delete instance', kind: 'warning' })
    if (!approved) return
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
      const compatibleVersions = Array.isArray(vers)
        ? vers.filter((version) => {
            const matchesMinecraft = version.game_versions?.includes(activeInstance.mc_version)
            if (!matchesMinecraft) return false
            if (discoverType === 'mods' || discoverType === 'modpacks') {
              const loader = activeInstance.fabric_version ? 'fabric' : null
              return !loader || version.loaders?.includes(loader)
            }
            return true
          })
        : []
      setProjectVersions(compatibleVersions)
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
      if (discoverType === 'modpacks') {
        const isFabric = versionObj.loaders?.some((l) => l.toLowerCase() === 'fabric')
        const mcVer = versionObj.game_versions?.[0] || activeInstance.mc_version || '1.21.4'
        const packName = selectedProject?.title || versionObj.name || `Modpack ${mcVer}`

        const created = await invoke('create_profile', {
          name: packName,
          mcVersion: mcVer,
          fabricVersion: isFabric ? '0.16.10' : null,
        })

        const targetId = created?.id || activeInstance.id
        await invoke('install_mod_file_url', {
          profileId: targetId,
          downloadUrl: primaryFile.url,
          filename: primaryFile.filename,
          targetFolder: 'mods',
        })

        await loadProfiles()
        if (created?.id) {
          setActiveProfile(created.id)
          setSelectedVersion(created.mc_version)
        }
        showToast(`Created instance for modpack "${packName}"!`, 'success')
      } else {
        let targetFolder = 'mods'
        if (discoverType === 'resourcepacks') targetFolder = 'resourcepacks'
        else if (discoverType === 'shaders') targetFolder = 'shaderpacks'
        else if (discoverType === 'datapacks') targetFolder = 'datapacks'

        await invoke('install_mod_file_url', {
          profileId: activeInstance.id,
          downloadUrl: primaryFile.url,
          filename: primaryFile.filename,
          targetFolder,
        })
        await loadMods()
        showToast(`Installed ${versionObj.name} (${primaryFile.filename})!`, 'success')
      }
    } catch (err) {
      showToast(`Download failed: ${err}`, 'error')
    } finally {
      setInstallingVersionId(null)
    }
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
      showToast(`Could not change ${mod.name || mod.filename}: ${err}`, 'error')
    }
  }

  // Toggle Loader (Vanilla <-> Fabric)
  const handleToggleLoader = async () => {
    try {
      const newLoader = activeInstance.fabric_version ? 'vanilla' : 'fabric'
      const updated = await invoke('set_profile_loader', {
        profileId: activeInstance.id,
        loader: newLoader,
        loaderVersion: null,
      })
      await loadProfiles()
      showToast(
        newLoader === 'fabric'
          ? `Switched to Fabric Loader (${updated.fabric_version || 'Active'})!`
          : 'Switched to Vanilla Minecraft!',
        'success'
      )
    } catch (err) {
      showToast(`Could not toggle loader: ${err}`, 'error')
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
        if (status === 'running') setLaunchStatus('running')
        else if (status === 'idle' || status === 'error') setLaunchStatus('idle')
        else setLaunchStatus('downloading')
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
    if (launchStatus === 'running' || launchStatus === 'downloading') return
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
          java_path: javaPath || null,
          jvm_args: jvmArgs,
        },
      })
    } catch (err) {
      showToast(`Launch error: ${err}`, 'error')
      setLaunchStatus('idle')
    }
  }

  // Force Out / Kill Game (Terminates process immediately)
  const handleForceQuit = async () => {
    try {
      await invoke('kill_game')
      setLaunchStatus('idle')
      showToast('Terminated Minecraft process completely.', 'success')
    } catch (err) {
      showToast(`Force out error: ${err}`, 'error')
    }
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
      {/* 1. LEFT VERTICAL NAVIGATION RAIL (Skin tab removed per user instruction) */}
      <nav className="w-16 h-full bg-[#0d0e11] border-r border-white/5 flex flex-col items-center justify-between py-3.5 z-40 select-none">
        <div className="flex flex-col items-center gap-3">
          <div
            onClick={() => navigateTo('home')}
            className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center cursor-pointer shadow-lg hover:border-emerald-400 transition-all"
            title="Minecraft Home"
          >
            <div className="w-5 h-5 rounded-lg border-2 border-emerald-400 flex items-center justify-center">
              <span className="text-[10px] font-black text-emerald-400">M</span>
            </div>
          </div>

          <div className="w-8 h-[1px] bg-white/10 my-0.5" />

          {/* Navigation Icons: Home, Discover, Instances, Create (+) */}
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
          {/* Offline Account Profile Button */}
          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="relative w-10 h-10 rounded-xl bg-black/40 hover:bg-white/10 border border-white/10 hover:border-emerald-500/50 flex items-center justify-center transition-all cursor-pointer group"
            title={`Offline Player: ${offlineUsername} (Click to switch or rename)`}
          >
            <img
              src={`https://mc-heads.net/avatar/${encodeURIComponent(offlineUsername)}/32`}
              alt={offlineUsername}
              onError={(e) => {
                e.target.style.display = 'none'
              }}
              className="w-6 h-6 rounded-md object-contain bg-black/50"
            />
            <div
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0d0e11]"
              title="Offline Active"
            />
          </button>

          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="w-10 h-10 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Settings (Java, Memory, Window, Behavior)"
          >
            <SettingsIcon className="w-4 h-4" />
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
                className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                title="Back"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNavForward}
                disabled={historyIndex >= navHistory.length - 1}
                className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors disabled:opacity-30"
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
                  : 'Installed instances'}
              </span>
            </div>
          </div>

          {/* Right Header Controls (Status & Window buttons - Matching Uploaded Image) */}
          <div className="flex items-center gap-3">
            {/* Live Modrinth Download Pill */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 border border-white/10 text-xs shadow-inner">
              <RotateCw className={`w-3.5 h-3.5 text-slate-400 ${launchStatus === 'running' || launchStatus === 'downloading' ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="font-bold text-white text-xs">
                {activeInstance.fabric_version ? 'Fabric' : 'Minecraft'} {activeInstance.mc_version}
              </span>
              <span className="text-emerald-400/90 font-mono text-[11px] font-semibold">
                {launchStatus === 'running' ? 'Playing' : launchStatus === 'downloading' ? '2.47 MB/s' : 'Ready'}
              </span>
              <div className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/40">
                {installedMods.length}
              </div>
            </div>

            {/* Offline Account Name Tag (Click to switch or rename) */}
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs cursor-pointer transition-all"
              title="Click to switch or rename player"
            >
              <img
                src={`https://mc-heads.net/avatar/${encodeURIComponent(offlineUsername)}/20`}
                alt={offlineUsername}
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
                className="w-4 h-4 rounded-sm object-contain"
              />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="font-bold text-white text-[11px] font-mono">{offlineUsername}</span>
              <span className="text-[9px] text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-bold">
                OFFLINE
              </span>
            </button>

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
                  {/* Select Minecraft Version Button (Shows full version catalog) */}
                  <button
                    onClick={() => setIsVersionPickerOpen(true)}
                    className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition-colors"
                    title="Change version for this instance"
                  >
                    <span>Version: {activeInstance.mc_version}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {/* Toggle Loader Button (Vanilla <-> Fabric) */}
                  <button
                    onClick={handleToggleLoader}
                    className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeInstance.fabric_version
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                    }`}
                    title="Click to switch between Fabric Loader and Vanilla"
                  >
                    <span>Loader: {activeInstance.fabric_version ? `Fabric (${activeInstance.fabric_version})` : 'Vanilla'}</span>
                    <RotateCw className="w-2.5 h-2.5 opacity-70" />
                  </button>

                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                    {installedMods.length} Mods Active
                  </span>
                </div>

                {/* Mod warning if installed but Vanilla is active */}
                {installedMods.length > 0 && !activeInstance.fabric_version && (
                  <div
                    onClick={handleToggleLoader}
                    className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3 cursor-pointer hover:bg-amber-500/20 transition-all text-left mt-2"
                  >
                    <div>
                      <span className="font-bold block">Vanilla Mode Active</span>
                      <span className="text-[11px] text-amber-200/80">
                        You have {installedMods.length} mods installed, but the loader is Vanilla. Click here to enable Fabric!
                      </span>
                    </div>
                    <button className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-bold text-[10px] uppercase flex-shrink-0 cursor-pointer">
                      Enable Fabric
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons: Play / Force Out */}
              <div className="flex flex-col gap-3 w-full max-w-xs">
                {launchStatus === 'running' ? (
                  <button
                    onClick={handleForceQuit}
                    className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>FORCE OUT MINECRAFT</span>
                  </button>
                ) : (
                  <button
                    onClick={handleLaunch}
                    disabled={launchStatus === 'downloading'}
                    className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
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
                <span>Target:</span>
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
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-emerald-500 hover:text-black text-slate-200 transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
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

        {/* VIEW 3: INSTALLED INSTANCES & MANAGEMENT */}
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
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 border border-white/10 flex items-center gap-1.5 cursor-pointer"
                  title="Open in Windows Explorer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>Open Folder</span>
                </button>

                {profiles.length > 1 && (
                  <button
                    onClick={() => handleDeleteInstance(activeInstance.id)}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-xs font-bold text-rose-400 border border-rose-500/30 flex items-center gap-1.5 cursor-pointer"
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
                    className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
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
                            className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer ${
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
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
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
                      className="font-mono text-emerald-400 hover:underline cursor-pointer"
                    >
                      /{activeInstance.name}
                    </button>
                    {currentFolderSubpath && (
                      <span className="font-mono text-slate-400">/{currentFolderSubpath}</span>
                    )}
                  </div>
                  <button
                    onClick={() => loadInstanceFiles()}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                    title="Refresh files"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-2">
                  {instanceFiles.length === 0 && (
                    <p className="py-12 text-center text-xs text-slate-500">This folder is empty.</p>
                  )}
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
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-slate-500">
                          {file.is_dir ? 'Directory' : `${Math.round(file.size / 1024)} KB`}
                        </span>
                        {pendingFileDelete === file.path ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleDeleteInstanceFile(file)}
                              disabled={isDeletingFile}
                              className="px-2 py-1 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-bold disabled:opacity-50"
                            >
                              {isDeletingFile ? 'Deleting…' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setPendingFileDelete(null)}
                              disabled={isDeletingFile}
                              className="px-2 py-1 rounded-md bg-white/5 text-slate-300 text-[10px] font-bold"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(event) => { event.stopPropagation(); setPendingFileDelete(file.path) }}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-rose-500/15 hover:text-rose-300"
                            aria-label={`Delete ${file.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUB-VIEW 3: GAME LOGS WITH FILTERS */}
            {instanceSubTab === 'logs' && (
              <div className="flex-1 flex flex-col overflow-hidden space-y-3">
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
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
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

      {/* 3. DISCOVER VERSION PICKER MODAL */}
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
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
              {isLoadingVersions ? (
                <div className="py-24 text-center text-xs text-slate-400 flex flex-col items-center gap-3">
                  <RotateCw className="w-6 h-6 animate-spin text-emerald-400" />
                  <span>Fetching compatible versions...</span>
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
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                          isInstalling
                            ? 'bg-emerald-500/50 text-black cursor-wait'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 active:scale-95'
                        }`}
                      >
                        {isInstalling ? (
                          <>
                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                            <span>{discoverType === 'modpacks' ? 'Creating Instance...' : 'Installing...'}</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>
                              {discoverType === 'modpacks'
                                ? 'Install Modpack'
                                : discoverType === 'resourcepacks'
                                ? 'Install Pack'
                                : discoverType === 'shaders'
                                ? 'Install Shader'
                                : 'Install Mod'}
                            </span>
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

      {/* 4. CHOOSE MINECRAFT VERSION MODAL (Full 900+ Versions List) */}
      {isVersionPickerOpen && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-xl h-[560px] rounded-2xl bg-[#14161b] border border-white/15 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-white">Select Minecraft Version</h3>
                <p className="text-xs text-slate-400">
                  Choose from full Minecraft release & snapshot catalog ({versions.length} versions)
                </p>
              </div>
              <button
                onClick={() => setIsVersionPickerOpen(false)}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
              {versions.map((v) => (
                <div
                  key={v.id}
                  onClick={async () => {
                    try {
                      const updated = await invoke('update_profile', {
                        profile: { ...activeInstance, mc_version: v.id },
                      })
                      setProfiles(profiles.map((profile) => profile.id === updated.id ? updated : profile))
                      setActiveProfile(updated.id)
                      setSelectedVersion(v.id)
                      setIsVersionPickerOpen(false)
                      showToast(`Active version changed to ${v.id}`, 'success')
                    } catch (error) {
                      showToast(`Could not save version: ${error}`, 'error')
                    }
                  }}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    activeInstance.mc_version === v.id
                      ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                      : 'bg-[#0e1014] hover:bg-white/5 border-white/5 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">{v.id}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-slate-400 font-mono uppercase">
                      {v.type || 'release'}
                    </span>
                  </div>
                  {activeInstance.mc_version === v.id && (
                    <span className="text-xs text-emerald-400 font-bold">Selected</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. CREATE INSTANCE MODAL */}
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
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/5 cursor-pointer"
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
                  onClick={async () => {
                    try {
                      const archive = await open({ multiple: false, filters: [{ name: 'Launcher profile ZIP', extensions: ['zip'] }] })
                      if (!archive) return
                      const name = archive.split(/[\\/]/).pop()?.replace(/\.zip$/i, '') || 'Imported Profile'
                      const created = await invoke('import_profile', {
                        zipPath: archive,
                        profileName: name,
                        mcVersion: newInstanceVersion,
                      })
                      await loadProfiles()
                      if (created?.id) {
                        setActiveProfile(created.id)
                        setSelectedVersion(created.mc_version)
                        navigateTo('home')
                      }
                      setIsCreateModalOpen(false)
                      setCreateStep('choose_type')
                      showToast(`Imported ${name} as a new instance.`, 'success')
                    } catch (error) {
                      showToast(`Import failed: ${error}`, 'error')
                    }
                  }}
                  className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/40 cursor-pointer transition-all flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-white">Upload a modpack</h5>
                      <p className="text-[11px] text-slate-400">
                      Import an exported launcher profile .zip from your PC.
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
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
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
                        {v.id} ({v.type || 'release'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setCreateStep('choose_type')}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateInstanceSubmit}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    Create Instance
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. MODRINTH SETTINGS MODAL */}
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
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      settingsCategory === 'appearance' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Appearance
                  </button>
                  <button
                    onClick={() => setSettingsCategory('behavior')}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      settingsCategory === 'behavior' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Behavior
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase px-2">Instance Defaults</span>
                  <button
                    onClick={() => setSettingsCategory('java')}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      settingsCategory === 'java' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Java and memory
                  </button>
                  <button
                    onClick={() => setSettingsCategory('window')}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/5 cursor-pointer"
                  title="Close settings (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {settingsCategory === 'java' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-white">Java & Memory Allocation</h4>
                  <p className="text-xs text-slate-400">These values are saved locally and used the next time an instance starts.</p>
                  <div className="space-y-1">
                    <label htmlFor="java-path" className="text-xs font-bold text-slate-300">Java executable (optional)</label>
                    <div className="flex gap-2">
                      <input id="java-path" value={javaPath} onChange={(event) => setJavaPath(event.target.value)} placeholder="Automatic per-version runtime" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white" />
                      <button
                        onClick={async () => {
                          try {
                            const path = await open({ multiple: false, filters: [{ name: 'Java executable', extensions: ['exe'] }] })
                            if (typeof path === 'string') setJavaPath(path)
                          } catch (error) { showToast(`Could not choose Java: ${error}`, 'error') }
                        }}
                        className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/15"
                      >Browse</button>
                    </div>
                  </div>
                  <label className="block space-y-1 text-xs font-bold text-slate-300">
                    Additional JVM arguments
                    <input value={jvmArgs} onChange={(event) => setJvmArgs(event.target.value)} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-white" />
                  </label>
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
                      onChange={(e) => {
                        const nextMax = Number(e.target.value)
                        setAllocatedRamMb(nextMax)
                        if (minRamMb > nextMax) setMinRamMb(nextMax)
                      }}
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
                      min="512"
                      max={Math.max(1024, Math.min(8192, allocatedRamMb))}
                      step="256"
                      value={Math.min(minRamMb, allocatedRamMb)}
                      onChange={(event) => setMinRamMb(Math.min(Number(event.target.value), allocatedRamMb))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {settingsCategory === 'window' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-white">Window Size</h4>
                  <p className="text-xs text-slate-400">Choose a size supported by this launcher. The minimum is 960 × 640.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1 text-xs text-slate-300">
                      Width
                      <input type="number" min="960" max="3840" step="80" value={windowWidth} onChange={(event) => setWindowWidth(Math.max(960, Number(event.target.value) || 960))} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white" />
                    </label>
                    <label className="space-y-1 text-xs text-slate-300">
                      Height
                      <input type="number" min="640" max="2160" step="80" value={windowHeight} onChange={(event) => setWindowHeight(Math.max(640, Number(event.target.value) || 640))} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white" />
                    </label>
                  </div>
                  <button onClick={applyWindowSize} className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-black hover:bg-emerald-400">Apply window size</button>
                </div>
              )}

              {settingsCategory === 'appearance' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-white">Appearance</h4>
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-slate-300">
                    <p className="font-bold text-white">Dark theme</p>
                    <p className="mt-1 text-slate-400">The launcher currently uses its dark theme throughout.</p>
                  </div>
                </div>
              )}

              {settingsCategory === 'behavior' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-white">Launcher Behavior</h4>
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-slate-300">
                    <p className="font-bold text-white">Keep launcher open</p>
                    <p className="mt-1 text-slate-400">The launcher stays open while the game starts. Other launch modes are not available yet.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6.5 OFFLINE ACCOUNT MANAGER MODAL */}
      <OfflineAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />

      {/* 7. IN-APP GLASSMORPHISM TOAST NOTIFICATION */}
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
            className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center flex-shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
      }
