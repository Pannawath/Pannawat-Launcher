import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const THEMES = {
  emerald: {
    id: 'emerald',
    name: 'Modrinth Emerald',
    accent: '#10b981',
    accentHover: '#059669',
    accentRgb: '16, 185, 129',
    accentText: '#10b981',
    bg: '#0f1115',
    sidebar: '#0b0c0e',
    card: '#161920',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    tag: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  },
  sapphire: {
    id: 'sapphire',
    name: 'Sapphire Blue',
    accent: '#3b82f6',
    accentHover: '#2563eb',
    accentRgb: '59, 130, 246',
    accentText: '#60a5fa',
    bg: '#0b0f19',
    sidebar: '#080b12',
    card: '#111827',
    cardBorder: 'rgba(59, 130, 246, 0.15)',
    tag: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  },
  amethyst: {
    id: 'amethyst',
    name: 'Amethyst Purple',
    accent: '#a855f7',
    accentHover: '#9333ea',
    accentRgb: '168, 85, 247',
    accentText: '#c084fc',
    bg: '#120d18',
    sidebar: '#0d0912',
    card: '#1a1324',
    cardBorder: 'rgba(168, 85, 247, 0.15)',
    tag: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
  },
  ruby: {
    id: 'ruby',
    name: 'Crimson Ruby',
    accent: '#f43f5e',
    accentHover: '#e11d48',
    accentRgb: '244, 63, 94',
    accentText: '#fb7185',
    bg: '#160d10',
    sidebar: '#10080b',
    card: '#221419',
    cardBorder: 'rgba(244, 63, 94, 0.15)',
    tag: 'bg-rose-500/20 text-rose-400 border-rose-500/30'
  },
  amber: {
    id: 'amber',
    name: 'Sunset Amber',
    accent: '#f59e0b',
    accentHover: '#d97706',
    accentRgb: '245, 158, 11',
    accentText: '#fbbf24',
    bg: '#16120b',
    sidebar: '#0f0c08',
    card: '#241c10',
    cardBorder: 'rgba(245, 158, 11, 0.15)',
    tag: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    accent: '#06b6d4',
    accentHover: '#0891b2',
    accentRgb: '6, 182, 212',
    accentText: '#22d3ee',
    bg: '#0a0d14',
    sidebar: '#06080d',
    card: '#0f172a',
    cardBorder: 'rgba(6, 182, 212, 0.2)',
    tag: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
  },
  oled: {
    id: 'oled',
    name: 'Pitch Black OLED',
    accent: '#10b981',
    accentHover: '#059669',
    accentRgb: '16, 185, 129',
    accentText: '#10b981',
    bg: '#000000',
    sidebar: '#000000',
    card: '#080808',
    cardBorder: 'rgba(255, 255, 255, 0.12)',
    tag: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  }
}

export const useThemeStore = create(
  persist(
    (set, get) => ({
      themeId: 'emerald',
      setThemeId: (id) => {
        if (THEMES[id]) {
          set({ themeId: id })
          document.documentElement.setAttribute('data-theme', id)
        }
      },
      currentTheme: () => THEMES[get().themeId] || THEMES.emerald
    }),
    { name: 'pannawat-theme-store' }
  )
)
