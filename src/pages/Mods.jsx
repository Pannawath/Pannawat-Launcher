import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Search, Download, Check, ToggleLeft, ToggleRight, Loader2, Package } from 'lucide-react'

export default function Mods() {
  const [activeTab, setActiveTab] = useState('browse') // 'browse' | 'installed'
  const [searchQuery, setSearchQuery] = useState('')
  const [mcVersion, setMcVersion] = useState('1.21.4')
  const [searchResults, setSearchResults] = useState([])
  const [installedMods, setInstalledMods] = useState([])
  const [loading, setLoading] = useState(false)
  const [installingId, setInstallingId] = useState(null)

  useEffect(() => {
    loadInstalledMods()
  }, [])

  const loadInstalledMods = async () => {
    try {
      const list = await invoke('list_installed_mods', { profileId: 'default' })
      setInstalledMods(list)
    } catch (e) {
      console.error(e)
    }
  }

  const handleSearch = async (e) => {
    if (e) e.preventDefault()
    setLoading(true)
    try {
      const res = await invoke('search_mods', {
        req: {
          query: searchQuery,
          game_version: mcVersion,
          source: 'modrinth',
          limit: 15,
        },
      })
      setSearchResults(res.hits || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleInstall = async (projectId) => {
    setInstallingId(projectId)
    try {
      await invoke('install_mod', {
        profileId: 'default',
        modId: projectId,
        gameVersion: mcVersion,
      })
      await loadInstalledMods()
    } catch (err) {
      alert(`Install error: ${err}`)
    } finally {
      setInstallingId(null)
    }
  }

  const handleToggle = async (filename, currentEnabled) => {
    try {
      await invoke('toggle_mod', {
        profileId: 'default',
        filename,
        enable: !currentEnabled,
      })
      await loadInstalledMods()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Title & Tabs */}
      <div className="flex items-center justify-between border-b border-[var(--color-surface-border)] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Mods Manager
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Browse Modrinth & manage performance mods with one-click installation.
          </p>
        </div>

        <div className="flex gap-2 bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-surface-border)]">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'browse'
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-white'
            }`}
          >
            Browse Modrinth
          </button>
          <button
            onClick={() => {
              setActiveTab('installed')
              loadInstalledMods()
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'installed'
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-white'
            }`}
          >
            Installed ({installedMods.length})
          </button>
        </div>
      </div>

      {activeTab === 'browse' ? (
        <div className="space-y-6">
          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              />
              <input
                type="text"
                placeholder="Search Sodium, Lithium, FerriteCore, Iris..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            <select
              value={mcVersion}
              onChange={(e) => setMcVersion(e.target.value)}
              className="bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl px-4 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
            >
              <option value="1.21.4">1.21.4</option>
              <option value="1.21.1">1.21.1</option>
              <option value="1.20.1">1.20.1</option>
            </select>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Search
            </button>
          </form>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((mod) => (
              <div
                key={mod.project_id}
                className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-surface-border)] hover:border-[var(--color-accent)] transition-all flex flex-col justify-between space-y-3"
              >
                <div className="flex gap-3">
                  {mod.icon_url ? (
                    <img
                      src={mod.icon_url}
                      alt={mod.title}
                      className="w-12 h-12 rounded-lg object-cover shrink-0 bg-[var(--color-surface-raised)]"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-[var(--color-surface-raised)] flex items-center justify-center shrink-0">
                      <Package size={20} className="text-[var(--color-text-muted)]" />
                    </div>
                  )}

                  <div className="overflow-hidden">
                    <h3 className="font-semibold text-sm text-[var(--color-text)] truncate">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mt-0.5">
                      {mod.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--color-surface-border)]">
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {(mod.downloads / 1000).toFixed(0)}k downloads
                  </span>

                  <button
                    onClick={() => handleInstall(mod.project_id)}
                    disabled={installingId === mod.project_id}
                    className="px-3 py-1 bg-[var(--color-surface-raised)] hover:bg-[var(--color-accent)] hover:text-white text-xs font-medium text-[var(--color-text)] rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {installingId === mod.project_id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Download size={12} />
                    )}
                    Install
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Installed Mods Tab */
        <div className="space-y-3">
          {installedMods.length === 0 ? (
            <div className="text-center py-16 text-[var(--color-text-muted)] text-sm">
              No mods installed for this profile yet.
            </div>
          ) : (
            installedMods.map((mod) => (
              <div
                key={mod.filename}
                className="p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-surface-border)] flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Package size={18} className="text-[var(--color-accent)]" />
                  <div>
                    <span className="text-sm font-medium text-[var(--color-text)]">
                      {mod.name}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)] ml-2">
                      ({mod.filename})
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleToggle(mod.filename, mod.enabled)}
                  className="flex items-center gap-2 text-xs font-semibold cursor-pointer"
                >
                  {mod.enabled ? (
                    <span className="text-green-400 flex items-center gap-1">
                      <ToggleRight size={24} /> Enabled
                    </span>
                  ) : (
                    <span className="text-[var(--color-text-muted)] flex items-center gap-1">
                      <ToggleLeft size={24} /> Disabled
                    </span>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
