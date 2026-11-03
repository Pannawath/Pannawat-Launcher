import { useEffect } from 'react'
import MinecraftModrinthHub from './pages/MinecraftModrinthHub'
import { useThemeStore } from './store/themeStore'

export default function App() {
  const { themeId } = useThemeStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeId || 'emerald')
  }, [themeId])

  return (
    <div className="w-full h-full min-h-screen bg-[#111216] select-none text-slate-100 overflow-hidden">
      <MinecraftModrinthHub />
    </div>
  )
}
