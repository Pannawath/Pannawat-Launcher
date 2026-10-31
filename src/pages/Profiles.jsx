import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Plus, Trash2, Download, Upload, Layers, Check, Loader2 } from 'lucide-react'

export default function Profiles() {
  const [profiles, setProfiles] = useState([])
  const [newProfileName, setNewProfileName] = useState('')
  const [newVersion, setNewVersion] = useState('1.21.4')
  const [loading, setLoading] = useState(false)
  const [exportingId, setExportingId] = useState(null)
  const [importZipPath, setImportZipPath] = useState('')
  const [importProfileName, setImportProfileName] = useState('')

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

  const handleExport = async (id, name) => {
    setExportingId(id)
    try {
      const outPath = `C:\\Users\\mapay\\Desktop\\${name.replace(/\\s+/g, '_')}_modpack.zip`
      await invoke('export_profile', {
        profileId: id,
        outputPath: outPath,
      })
      alert(`Profile exported successfully to Desktop:\n${outPath}`)
    } catch (e) {
      alert(`Export error: ${e}`)
    } finally {
      setExportingId(null)
    }
  }

  const handleImport = async (e) => {
    e.preventDefault()
    if (!importZipPath.trim() || !importProfileName.trim()) return
    setLoading(true)
    try {
      await invoke('import_profile', {
        zipPath: importZipPath.trim(),
        profileName: importProfileName.trim(),
        mcVersion: '1.21.4',
      })
      setImportZipPath('')
      setImportProfileName('')
      await loadProfiles()
      alert('Modpack zip imported successfully!')
    } catch (e) {
      alert(`Import error: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
          Profiles &amp; Modpacks
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Create, export, and import .zip modpacks across independent profiles.
        </p>
      </div>

      {/* Forms Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create form */}
        <form
          onSubmit={handleCreate}
          className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-surface-border)] space-y-4 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Plus size={16} className="text-[var(--color-accent)]" />
            <h2 className="text-sm font-bold text-[var(--color-text)]">Create New Profile</h2>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[var(--color-text-muted)]">Profile Name</label>
            <input
              type="text"
              placeholder="e.g. Speedrun Performance"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--color-surface-raised)] border border-[var(--color-surface-border)] rounded-xl text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[var(--color-text-muted)]">Minecraft Version</label>
            <select
              value={newVersion}
              onChange={(e) => setNewVersion(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--color-surface-raised)] border border-[var(--color-surface-border)] rounded-xl text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
            >
              <option value="1.21.4">1.21.4 (Latest)</option>
              <option value="1.21.1">1.21.1</option>
              <option value="1.20.1">1.20.1</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !newProfileName.trim()}
            className="w-full py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            Create Profile
          </button>
        </form>

        {/* Import Modpack form */}
        <form
          onSubmit={handleImport}
          className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-surface-border)] space-y-4 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Upload size={16} className="text-[var(--color-accent)]" />
            <h2 className="text-sm font-bold text-[var(--color-text)]">Import .zip Modpack</h2>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[var(--color-text-muted)]">Target Profile Name</label>
            <input
              type="text"
              placeholder="e.g. My Custom Modpack"
              value={importProfileName}
              onChange={(e) => setImportProfileName(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--color-surface-raised)] border border-[var(--color-surface-border)] rounded-xl text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[var(--color-text-muted)]">ZIP File Absolute Path</label>
            <input
              type="text"
              placeholder="C:\\path\\to\\modpack.zip"
              value={importZipPath}
              onChange={(e) => setImportZipPath(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--color-surface-raised)] border border-[var(--color-surface-border)] rounded-xl text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !importZipPath.trim() || !importProfileName.trim()}
            className="w-full py-2 bg-[var(--color-surface-raised)] hover:bg-[var(--color-accent)] hover:text-white text-[var(--color-text)] text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            Import Modpack
          </button>
        </form>
      </div>

      {/* Profiles list */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
          All Profiles ({profiles.length})
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
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--color-surface-raised)] text-[var(--color-accent)] font-semibold border border-[var(--color-surface-border)]">
                    v{p.mc_version}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1 font-mono">
                  ID: {p.id.slice(0, 8)}...
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--color-surface-border)] text-xs">
                <button
                  onClick={() => handleExport(p.id, p.name)}
                  disabled={exportingId === p.id}
                  className="flex items-center gap-1.5 px-3 py-1 bg-[var(--color-surface-raised)] hover:bg-[var(--color-accent)] hover:text-white rounded-lg transition-colors cursor-pointer text-[var(--color-text)]"
                >
                  {exportingId === p.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Download size={12} />
                  )}
                  Export .zip
                </button>

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
