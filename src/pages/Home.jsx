// Home — Steam Library grid style
// Each profile = card with banner, name, version, play time, Play button

export default function Home() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-[var(--color-text)] mb-6">Library</h1>
      {/* Profile grid — populated from profileStore */}
      <div className="grid grid-cols-3 gap-4 xl:grid-cols-4">
        {/* Placeholder card */}
        <div className="rounded-xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-surface-border)] hover:border-[var(--color-accent)] transition-colors cursor-pointer group">
          <div className="h-36 bg-[var(--color-surface-raised)] flex items-center justify-center">
            <span className="text-[var(--color-text-muted)] text-sm">No cover</span>
          </div>
          <div className="p-3">
            <p className="font-medium text-sm text-[var(--color-text)] truncate">Default Profile</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Minecraft 1.21.4 — Fabric</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">0 hrs played</p>
          </div>
          <div className="px-3 pb-3">
            <button className="w-full py-1.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-semibold transition-colors">
              Play
            </button>
          </div>
        </div>

        {/* New profile button */}
        <div className="rounded-xl border-2 border-dashed border-[var(--color-surface-border)] hover:border-[var(--color-accent)] flex items-center justify-center cursor-pointer min-h-[200px] transition-colors group">
          <span className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] text-sm transition-colors">
            + New Profile
          </span>
        </div>
      </div>
    </div>
  )
}
