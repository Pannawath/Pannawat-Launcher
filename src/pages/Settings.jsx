import { useThemeStore } from '../store/themeStore'

const THEMES = [
  { id: 'purple', label: 'Enderman Purple', color: '#8b5cf6' },
  { id: 'green',  label: 'Minecraft Green', color: '#44af28' },
  { id: 'blue',   label: 'Diamond Blue',    color: '#3b9edd' },
  { id: 'red',    label: 'Nether Red',      color: '#e53e3e' },
]

export default function Settings() {
  const { theme, setTheme } = useThemeStore()

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-[var(--color-text)] mb-6">Settings</h1>

      {/* Appearance */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
          Appearance
        </h2>
        <div className="flex gap-3 flex-wrap">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                theme === t.id
                  ? 'border-[var(--color-accent)] text-white'
                  : 'border-[var(--color-surface-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ background: t.color }}
              />
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* Java / RAM */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
          Java
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <label className="text-sm text-[var(--color-text)] w-24">Min RAM</label>
            <input
              type="number"
              defaultValue={512}
              className="w-28 px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-surface-border)] text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
            />
            <span className="text-xs text-[var(--color-text-muted)]">MB</span>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm text-[var(--color-text)] w-24">Max RAM</label>
            <input
              type="number"
              defaultValue={4096}
              className="w-28 px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-surface-border)] text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
            />
            <span className="text-xs text-[var(--color-text-muted)]">MB</span>
          </div>
        </div>
      </section>

      {/* More sections: JVM flags, Network/Proxy, Launch behavior, Account */}
      <p className="text-xs text-[var(--color-text-muted)]">More settings coming in Phase 2.</p>
    </div>
  )
}
