import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSettingsStore = create(
  persist(
    (set) => ({
      // Java & Memory
      allocatedRamMb: 4096,
      minRamMb: 1024,
      javaPath: '',
      jvmArgs: '-XX:+UseZGC -XX:+ZGenerational',
      selectedVersion: '1.21.4',

      // Window & Resolution
      windowWidth: 1280,
      windowHeight: 800,
      fullscreen: false,

      // Display & Appearance
      theme: 'dark', // 'dark' | 'light' | 'oled' | 'system'
      advancedRendering: true, // Blur & glass effects

      // Launcher Behavior
      launcherBehavior: 'keep_open', // 'keep_open' | 'hide' | 'close'
      showSnapshots: false,
      discordRpc: true,

      // Setters
      setAllocatedRamMb: (ram) => set({ allocatedRamMb: ram }),
      setMinRamMb: (ram) => set({ minRamMb: ram }),
      setJavaPath: (path) => set({ javaPath: path }),
      setJvmArgs: (args) => set({ jvmArgs: args }),
      setSelectedVersion: (version) => set({ selectedVersion: version }),
      setWindowWidth: (w) => set({ windowWidth: w }),
      setWindowHeight: (h) => set({ windowHeight: h }),
      setFullscreen: (f) => set({ fullscreen: f }),
      setTheme: (t) => set({ theme: t }),
      setAdvancedRendering: (r) => set({ advancedRendering: r }),
      setLauncherBehavior: (b) => set({ launcherBehavior: b }),
      setShowSnapshots: (s) => set({ showSnapshots: s }),
      setDiscordRpc: (d) => set({ discordRpc: d }),
    }),
    { name: 'pannawat-launcher-settings' }
  )
)
