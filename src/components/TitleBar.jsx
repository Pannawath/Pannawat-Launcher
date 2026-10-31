import { getCurrentWindow } from '@tauri-apps/api/window'
import { Minus, Square, X } from 'lucide-react'

export default function TitleBar() {
  const win = getCurrentWindow()

  return (
    <div
      data-tauri-drag-region
      className="h-9 flex items-center justify-between px-3 bg-[var(--color-bg-sidebar)] border-b border-[var(--color-surface-border)] shrink-0 select-none"
    >
      {/* App name */}
      <span
        data-tauri-drag-region
        className="text-xs font-semibold text-[var(--color-text-muted)] tracking-widest uppercase"
      >
        Pannawat Launcher
      </span>

      {/* Window controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => win.minimize()}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-white transition-colors"
        >
          <Minus size={12} />
        </button>
        <button
          onClick={() => win.toggleMaximize()}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-white transition-colors"
        >
          <Square size={11} />
        </button>
        <button
          onClick={() => win.hide()} // hide to tray instead of close
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-600 text-[var(--color-text-muted)] hover:text-white transition-colors"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
