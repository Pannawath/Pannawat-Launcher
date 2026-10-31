import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Available themes: purple (default), green, blue, red
export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'purple',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'pannawat-theme' }
  )
)
