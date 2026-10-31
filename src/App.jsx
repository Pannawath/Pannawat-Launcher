import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TitleBar from './components/TitleBar'
import Home from './pages/Home'
import Mods from './pages/Mods'
import Profiles from './pages/Profiles'
import Settings from './pages/Settings'
import { useThemeStore } from './store/themeStore'

export default function App() {
  const theme = useThemeStore((s) => s.theme)

  return (
    <div data-theme={theme} className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--color-bg)]">
      {/* Custom frameless titlebar */}
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar nav */}
        <Sidebar />

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Routes>
            <Route path="/"         element={<Home />} />
            <Route path="/mods"     element={<Mods />} />
            <Route path="/profiles" element={<Profiles />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
