import { getCurrentWindow } from '@tauri-apps/api/window'
import { Minus, Square, X } from 'lucide-react'

export default function TitleBar() {
  const win = getCurrentWindow()

  return (
    <div
      data-tauri-drag-region
      className="h-8 flex items-center justify-between px-3 bg-[#0a0b0d] border-b border-[#181a20] shrink-0 select-none z-50"
    >
      <div data-tauri-drag-region className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400" />
        <span className="text-[11px] font-semibold text-gray-400 tracking-wider">
          PANNAWAT LAUNCHER
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => win.minimize()}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
        >
          <Minus size={11} />
        </button>
        <button
          onClick={() => win.toggleMaximize()}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
        >
          <Square size={10} />
        </button>
        <button
          onClick={() => win.close()}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/80 text-gray-400 hover:text-white transition-colors"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
