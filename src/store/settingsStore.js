import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSettingsStore = create(
  persist(
    (set) => ({
      showSnapshots: false,
      allocatedRamMb: 4096,
      minRamMb: 1024,
      setShowSnapshots: (show) => set({ showSnapshots: show }),
      setAllocatedRamMb: (ram) => set({ allocatedRamMb: ram }),
      setMinRamMb: (ram) => set({ minRamMb: ram }),
    }),
    { name: 'pannawat-launcher-settings' }
  )
)
