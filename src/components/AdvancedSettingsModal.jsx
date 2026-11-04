import React, { useState, useEffect } from 'react'
import {
  X,
  Sliders,
  Cpu,
  Monitor,
  Palette,
  Shield,
  FileText,
  FolderOpen,
  RotateCcw,
  Check,
  Info,
  ChevronRight,
  ExternalLink,
  Laptop,
  Download,
  RotateCw,
  Sparkles,
  AlertTriangle
} from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { useThemeStore, THEMES } from '../store/themeStore'
import { open } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

export default function AdvancedSettingsModal({ isOpen, onClose, onShowToast }) {
  const {
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
    showSnapshots,
    setShowSnapshots,
    discordRpc,
    setDiscordRpc
  } = useSettingsStore()

  const { themeId, setThemeId } = useThemeStore()
  const [activeSection, setActiveSection] = useState('appearance')
  const [systemRamGb, setSystemRamGb] = useState(32)

  // Update State
  const [updateInfo, setUpdateInfo] = useState(null)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateProgress, setUpdateProgress] = useState(null)

  useEffect(() => {
    let unlisten = null
    const setupListener = async () => {
      try {
        unlisten = await listen('update_progress', (event) => {
          setUpdateProgress(event.payload)
          if (event.payload.stage === 'ready') {
            setIsUpdating(false)
            onShowToast?.(event.payload.message, 'success')
          }
        })
      } catch (err) {
        console.error('Failed to attach update_progress listener:', err)
      }
    }

    if (isOpen) {
      setupListener()
    }

    return () => {
      if (unlisten) unlisten()
    }
  }, [isOpen])

  const handleCheckUpdates = async () => {
    setIsCheckingUpdate(true)
    try {
      const res = await invoke('check_for_updates')
      setUpdateInfo(res)
      if (res.has_update) {
        onShowToast?.(`New update found: v${res.latest_version}!`, 'success')
      } else {
        onShowToast?.('You are on the latest version (v0.2.0)', 'info')
      }
    } catch (err) {
      onShowToast?.(`Check updates failed: ${err}`, 'error')
    } finally {
      setIsCheckingUpdate(false)
    }
  }

  const handleApplyUpdate = async () => {
    if (!updateInfo?.download_url) {
      onShowToast?.('No direct executable asset found for this release.', 'error')
      return
    }

    setIsUpdating(true)
    setUpdateProgress({
      stage: 'downloading',
      downloaded_bytes: 0,
      total_bytes: 0,
      percent: 0,
      message: 'Starting update download...'
    })

    try {
      await invoke('download_and_install_update', {
        downloadUrl: updateInfo.download_url
      })
    } catch (err) {
      setIsUpdating(false)
      onShowToast?.(`Update failed: ${err}`, 'error')
    }
  }

  if (!isOpen) return null

  const handlePickJava = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Java Executable', extensions: ['exe'] }]
      })
      if (typeof selected === 'string') {
        setJavaPath(selected)
        onShowToast?.(`Selected Java runtime: ${selected}`, 'success')
      }
    } catch (err) {
      onShowToast?.(`Failed selecting Java: ${err}`, 'error')
    }
  }

  const handleResetJvm = () => {
    const defaultArgs = '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1ReservePercent=20 -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:InitiatingHeapOccupancyPercent=15 -XX:SurvivorRatio=32'
    setJvmArgs(defaultArgs)
    onShowToast?.('JVM arguments reset to optimized Aikar G1GC flags', 'success')
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in select-none">
      <div className="w-full max-w-4xl h-[640px] rounded-2xl bg-[#12141a] border border-white/15 shadow-2xl flex overflow-hidden">
        
        {/* Left Category Sidebar */}
        <div className="w-64 h-full bg-[#0d0e12] border-r border-white/10 p-5 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-black text-black text-sm shadow-lg shadow-emerald-500/20">
                P
              </div>
              <div>
                <h3 className="font-bold text-sm text-white tracking-wide">Launcher Settings</h3>
                <p className="text-[10px] text-slate-400">Pannawat Launcher v0.2.0</p>
              </div>
            </div>

            <nav className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase px-2 tracking-wider">Customization</span>
              
              <button
                onClick={() => setActiveSection('appearance')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeSection === 'appearance'
                    ? 'theme-accent-subtle font-bold border'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Palette className="w-4 h-4" />
                Theme & Colors
              </button>

              <button
                onClick={() => setActiveSection('behavior')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeSection === 'behavior'
                    ? 'theme-accent-subtle font-bold border'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sliders className="w-4 h-4" />
                Launcher Behavior
              </button>

              <div className="pt-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase px-2 tracking-wider">Performance</span>
              </div>

              <button
                onClick={() => setActiveSection('java')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeSection === 'java'
                    ? 'theme-accent-subtle font-bold border'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Cpu className="w-4 h-4" />
                Java & Memory (RAM)
              </button>

              <button
                onClick={() => setActiveSection('window')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeSection === 'window'
                    ? 'theme-accent-subtle font-bold border'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Monitor className="w-4 h-4" />
                Window & Display
              </button>

              <div className="pt-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase px-2 tracking-wider">System</span>
              </div>

              <button
                onClick={() => setActiveSection('updates')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeSection === 'updates'
                    ? 'theme-accent-subtle font-bold border'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Download className="w-4 h-4" />
                  Updates & Version
                </div>
                {updateInfo?.has_update && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>

              <button
                onClick={() => setActiveSection('about')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeSection === 'about'
                    ? 'theme-accent-subtle font-bold border'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Info className="w-4 h-4" />
                About & Diagnostics
              </button>
            </nav>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-500">
            Hardware: i7-11700F | 32 GB RAM | GTX 1050 Ti
          </div>
        </div>

        {/* Right Content Panel */}
        <div className="flex-1 flex flex-col h-full bg-[#14161f]">
          {/* Header */}
          <div className="h-16 border-b border-white/10 px-8 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white capitalize">
                {activeSection === 'appearance' && 'Theme & Visual Styling'}
                {activeSection === 'behavior' && 'Launcher Behavior & Integrations'}
                {activeSection === 'java' && 'Java Runtime & Memory Optimization'}
                {activeSection === 'window' && 'Display & Window Resolution'}
                {activeSection === 'updates' && 'Launcher Updates & Versioning'}
                {activeSection === 'about' && 'About Pannawat Launcher'}
              </h2>
              <p className="text-xs text-slate-400">
                Configure your environment, themes, performance, offline and updater preferences.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer border border-white/10 active:scale-95"
              title="Close Settings (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 p-8 overflow-y-auto space-y-6">

            {/* SECTION 1: APPEARANCE & THEMES */}
            {activeSection === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">Color Theme</h4>
                  <p className="text-xs text-slate-400 mb-4">Choose your preferred visual accent and UI atmosphere.</p>
                  
                  <div className="grid grid-cols-2 gap-3.5">
                    {Object.values(THEMES).map((thm) => (
                      <button
                        key={thm.id}
                        onClick={() => setThemeId(thm.id)}
                        className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          themeId === thm.id
                            ? 'bg-white/10 border-white/30 shadow-lg'
                            : 'bg-black/30 border-white/5 hover:bg-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-6 h-6 rounded-full border border-white/20 shadow-md"
                            style={{ backgroundColor: thm.accent }}
                          />
                          <div>
                            <div className="text-xs font-bold text-white">{thm.name}</div>
                            <div className="text-[10px] text-slate-400 capitalize">{thm.id} Palette</div>
                          </div>
                        </div>

                        {themeId === thm.id && (
                          <div className="w-5 h-5 rounded-full theme-accent-bg text-black flex items-center justify-center font-bold">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">UI Smoothness & Motion</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Glassmorphism & Blur Effects</div>
                      <div className="text-[11px] text-slate-400">Render smooth backdrop-blur on panels and modal dialogs</div>
                    </div>
                    <span className="text-xs font-bold theme-accent-text bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                      ACTIVE (GPU ACCELERATED)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: BEHAVIOR */}
            {activeSection === 'behavior' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">When Minecraft Starts</h4>
                  <p className="text-xs text-slate-400 mb-3">Choose what happens to the launcher window after clicking Play.</p>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'keep_open', title: 'Keep Launcher Open', desc: 'Allows instant log monitoring and quick restarts' },
                      { id: 'hide', title: 'Hide Launcher', desc: 'Minimizes to tray and re-opens when Minecraft closes' },
                      { id: 'close', title: 'Close Launcher', desc: 'Saves maximum PC RAM for Minecraft' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setLauncherBehavior(mode.id)}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                          launcherBehavior === mode.id
                            ? 'theme-accent-subtle font-bold border'
                            : 'bg-black/30 border-white/5 hover:border-white/15 text-slate-300'
                        }`}
                      >
                        <div className="text-xs font-bold text-white mb-1">{mode.title}</div>
                        <div className="text-[11px] text-slate-400">{mode.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Discord Rich Presence (RPC)</h4>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Show Minecraft in Discord Profile</div>
                      <div className="text-[11px] text-slate-400">
                        Displays "Playing Minecraft" with active instance name and elapsed playtime (ID: 356875570916753438)
                      </div>
                    </div>
                    <button
                      onClick={() => setDiscordRpc(!discordRpc)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        discordRpc
                          ? 'theme-accent-bg text-black theme-shadow'
                          : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {discordRpc ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Version Selection Channel</h4>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Show Snapshots & Pre-releases</div>
                      <div className="text-[11px] text-slate-400">Include experimental Minecraft snapshots and release candidates in dropdowns</div>
                    </div>
                    <button
                      onClick={() => setShowSnapshots(!showSnapshots)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        showSnapshots
                          ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                          : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {showSnapshots ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: JAVA & MEMORY */}
            {activeSection === 'java' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-bold text-white">Maximum Memory Allocation (Xmx)</h4>
                    <span className="font-mono text-sm font-bold theme-accent-text bg-white/5 px-2 py-0.5 rounded border border-white/10">
                      {(allocatedRamMb / 1024).toFixed(1)} GB ({allocatedRamMb} MB)
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Allocated to Minecraft Java Virtual Machine. Your system has 32 GB of total RAM.
                  </p>

                  <input
                    type="range"
                    min="2048"
                    max="16384"
                    step="512"
                    value={allocatedRamMb}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      setAllocatedRamMb(val)
                      if (minRamMb > val) setMinRamMb(val)
                    }}
                    className="w-full accent-emerald-500 cursor-pointer h-2 bg-black/50 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                    <span>2 GB</span>
                    <span>4 GB (Vanilla)</span>
                    <span className="theme-accent-text font-bold">8 GB (Modded Recommended)</span>
                    <span>12 GB</span>
                    <span>16 GB</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-bold text-white">Minimum Initial Memory (Xms)</h4>
                    <span className="font-mono text-sm font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      {minRamMb} MB
                    </span>
                  </div>
                  <input
                    type="range"
                    min="512"
                    max={Math.min(8192, allocatedRamMb)}
                    step="256"
                    value={minRamMb}
                    onChange={(e) => setMinRamMb(Math.min(Number(e.target.value), allocatedRamMb))}
                    className="w-full accent-cyan-500 cursor-pointer h-2 bg-black/50 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-200">Custom Java Executable Runtime (Optional)</label>
                  <div className="flex gap-2">
                    <input
                      value={javaPath}
                      onChange={(e) => setJavaPath(e.target.value)}
                      placeholder="Automatic Managed Java (Mojang bundled runtime)"
                      className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono"
                    />
                    <button
                      onClick={handlePickJava}
                      className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      Browse
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200">Additional JVM Arguments</label>
                    <button
                      onClick={handleResetJvm}
                      className="text-[11px] font-bold theme-accent-text hover:opacity-80 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset to Optimized Aikar G1GC Flags
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={jvmArgs}
                    onChange={(e) => setJvmArgs(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white font-mono resize-none focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
            )}

            {/* SECTION 4: WINDOW & RESOLUTION */}
            {activeSection === 'window' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">Game Window Resolution</h4>
                  <p className="text-xs text-slate-400 mb-4">Set the starting resolution when Minecraft opens.</p>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Width (Pixels)</label>
                      <input
                        type="number"
                        min="800"
                        max="3840"
                        step="40"
                        value={windowWidth}
                        onChange={(e) => setWindowWidth(Number(e.target.value) || 1280)}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Height (Pixels)</label>
                      <input
                        type="number"
                        min="600"
                        max="2160"
                        step="40"
                        value={windowHeight}
                        onChange={(e) => setWindowHeight(Number(e.target.value) || 720)}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Preset resolution buttons */}
                  <div className="flex gap-2 mt-3">
                    {[
                      { w: 1280, h: 720, label: '720p HD' },
                      { w: 1920, h: 1080, label: '1080p FHD' },
                      { w: 2560, h: 1440, label: '1440p 2K' },
                      { w: 3840, h: 2160, label: '4K UHD' },
                    ].map((res) => (
                      <button
                        key={res.label}
                        onClick={() => {
                          setWindowWidth(res.w)
                          setWindowHeight(res.h)
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] font-semibold text-slate-300 transition-all cursor-pointer"
                      >
                        {res.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Start in Fullscreen</div>
                    <div className="text-[11px] text-slate-400">Force Minecraft to launch in exclusive fullscreen mode</div>
                  </div>
                  <button
                    onClick={() => setFullscreen(!fullscreen)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      fullscreen
                        ? 'theme-accent-bg text-black theme-shadow'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {fullscreen ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
              </div>
            )}

            {/* SECTION 5: UPDATER & VERSIONS */}
            {activeSection === 'updates' && (
              <div className="space-y-6">
                <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">Launcher Version Status</h4>
                      <p className="text-xs text-slate-400">
                        Check for new updates from GitHub and install seamlessly with 1-click.
                      </p>
                    </div>

                    <button
                      onClick={handleCheckUpdates}
                      disabled={isCheckingUpdate || isUpdating}
                      className="px-4 py-2 rounded-xl theme-accent-bg font-bold text-xs flex items-center gap-2 cursor-pointer hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                      <span>{isCheckingUpdate ? 'Checking GitHub...' : 'Check for Updates'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Installed Version</span>
                      <div className="text-slate-200 font-mono font-bold text-sm">v0.2.0</div>
                      <div className="text-[10px] text-slate-400">Channel: Stable Release</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Latest on GitHub</span>
                      <div className="text-slate-200 font-mono font-bold text-sm">
                        {updateInfo ? `v${updateInfo.latest_version}` : 'Not checked'}
                      </div>
                      <div className={`text-[10px] ${updateInfo?.has_update ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                        {updateInfo
                          ? updateInfo.has_update
                            ? 'Update Available!'
                            : 'Up to Date'
                          : 'Click check to scan'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* If update is available banner */}
                {updateInfo?.has_update && (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-cyan-500/10 to-transparent border border-emerald-500/30 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                          <h4 className="text-sm font-bold text-white">
                            New Release: v{updateInfo.latest_version}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-300">
                          A newer standalone build is ready on GitHub. Click below to download and auto-restart.
                        </p>
                      </div>

                      <button
                        onClick={handleApplyUpdate}
                        disabled={isUpdating}
                        className="px-5 py-2.5 rounded-xl theme-accent-bg font-black text-xs uppercase tracking-wider theme-shadow hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>{isUpdating ? 'Updating...' : 'Update & Restart Now'}</span>
                      </button>
                    </div>

                    {/* Progress Bar */}
                    {isUpdating && updateProgress && (
                      <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-200">{updateProgress.message}</span>
                          <span className="theme-accent-text font-mono font-bold">{updateProgress.percent.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full theme-accent-bg transition-all duration-300"
                            style={{ width: `${updateProgress.percent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Release Notes */}
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Changelog</span>
                      <div className="p-3.5 rounded-xl bg-black/50 border border-white/5 font-mono text-xs text-slate-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {updateInfo.release_notes}
                      </div>
                    </div>
                  </div>
                )}

                {/* If checked and already up-to-date */}
                {updateInfo && !updateInfo.has_update && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-xs text-emerald-300">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Your launcher is running the latest version! No updates are required.</span>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 6: ABOUT & DIAGNOSTICS */}
            {activeSection === 'about' && (
              <div className="space-y-6">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-black/40 to-cyan-500/10 border border-white/10 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-black text-black text-2xl shadow-xl shadow-emerald-500/20">
                    P
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">Pannawat Minecraft Launcher</h3>
                    <p className="text-xs text-slate-400">Modrinth App Style Engine • Offline & Fabric Ready</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10">v0.2.0-standalone</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded theme-accent-subtle border">Tauri 2.0 + Rust Core</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Discord Integration</span>
                    <div className="text-slate-200 font-mono">ID: 356875570916753438</div>
                    <div className="text-[10px] text-emerald-400">Official Minecraft Title Verified</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Offline Profile UUID</span>
                    <div className="text-slate-200 font-mono">RFC 4122 v3 MD5 Offline Spec</div>
                    <div className="text-[10px] text-cyan-400">Multi-Account & Custom Skins</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-400">
                  Built with Tauri v2, Rust, Vite, React, Tailwind CSS, and Lucide Icons. Designed for ultra-high FPS, seamless Modrinth 1-click mod installations, and zero bloat.
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="h-16 border-t border-white/10 px-8 flex items-center justify-end gap-3 bg-[#0e1015]">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-all cursor-pointer"
            >
              Done
            </button>
          </div>

        </div>

      </div>
    </div>
  )
}
