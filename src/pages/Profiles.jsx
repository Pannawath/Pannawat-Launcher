import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Plus, Trash2, User, Layers, Calendar, Check } from 'lucide-react'

export default function Profiles() {
  const [profiles, setProfiles] = useState([])
  const [newProfileName, setNewProfileName] = useState('')
  const [newVersion, setNewVersion] = useState('1.21.4')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    try {
      const list = await invoke('list_profiles')
      setProfiles(list)
    } catch (e) {
      console.error(e)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newProfileName.trim()) return
    setLoading(true)
    try {
      await invoke('create_profile', {
        name: newProfileName.trim(),
        mcVersion: newVersion,
      })
      setNewProfileName('')
      await loadProfiles()
    } catch (e) {
      alert(`Create profile error: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this profile?')) return
    try {
      await invoke('delete_profile', { profileId: id })
      await loadProfiles()
    } catch (e) {
      alert(`Delete error: ${e}`)
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
          Profiles Management
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Create and isolate custom modpacks, saves, and versions per profile.
        </p>
      </div>

      {/* Create form */}
      <form
        onSubmit={handleCreate}
        className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-surface-border)] flex flex-wrap items-end gap-4 shadow-sm"
      >
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
            Profile Name
          </label>
          <input
            type="text"
            placeholder="e.g. Sodium Speedrun 1.21"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            className="w-full px-3.5 py-2 bg-[var(--color-surface-raised)] border border-[var(--color-surface-border)] rounded-xl text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        <div className="space-y-1.5 w-48">
          <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
            Version
          </label>
          <select
            value={newVersion}
            onChange={(e) => setNewVersion(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--color-surface-raised)] border border-[var(--color-surface-border)] rounded-xl text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
          >
            <option value="1.21.4">1.21.4 (Latest)</option>
            <option value="1.21.1">1.21.1</option>
            <option value="1.20.4">1.20.4</option>
            <option value="1.20.1">1.20.1</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !newProfileName.trim()}
          className="px-5 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 h-[38px]"
        >
          <Plus size={16} />
          Create Profile
        </button>
      </form>

      {/* Profiles list */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
          Existing Profiles ({profiles.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-surface-border)] hover:border-[var(--color-accent)] transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-[var(--color-text)]">{p.name}</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--color-surface-raised)] text-[var(--color-accent)] font-semibold">
                    v{p.mc_version}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1 font-mono">
                  ID: {p.id.slice(0, 8)}...
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--color-surface-border)] text-xs text-[var(--color-text-muted)]">
                <span>RAM: {p.max_ram_mb} MB</span>
                {profiles.length > 1 && (
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Delete profile"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
