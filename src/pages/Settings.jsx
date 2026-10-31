import { useSettingsStore } from '../store/settingsStore'
import { ToggleLeft, ToggleRight, Cpu, Layers } from 'lucide-react'

export default function Settings() {
  const { showSnapshots, setShowSnapshots, allocatedRamMb, setAllocatedRamMb, minRamMb, setMinRamMb } =
    useSettingsStore()

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 select-none">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Launcher Settings</h1>
        <p className="text-xs text-gray-400 mt-1">
          Customize version channels, JVM memory parameters, and experimental features.
        </p>
      </div>

      {/* Minecraft Versions Channel */}
      <div className="p-6 rounded-3xl bg-[#12141a] border border-[#1f232d] space-y-4">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-cyan-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Version Channels
          </h2>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="space-y-0.5">
            <span className="text-sm font-semibold text-gray-200">
              Enable Snapshots &amp; Pre-releases
            </span>
            <p className="text-xs text-gray-500">
              Show experimental developmental builds and snapshots in version selectors.
            </p>
          </div>

          <button
            onClick={() => setShowSnapshots(!showSnapshots)}
            className="cursor-pointer text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {showSnapshots ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                <ToggleRight size={32} /> ENABLED
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                <ToggleLeft size={32} /> DISABLED
              </span>
            )}
          </button>
        </div>
      </div>

      {/* JVM Memory Tuning */}
      <div className="p-6 rounded-3xl bg-[#12141a] border border-[#1f232d] space-y-5">
        <div className="flex items-center gap-2">
          <Cpu size={18} className="text-cyan-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Java Virtual Machine (JVM) &amp; Memory
          </h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-300 font-semibold">Maximum RAM Allocation</span>
              <span className="font-mono text-cyan-400 font-bold">{(allocatedRamMb / 1024).toFixed(1)} GB ({allocatedRamMb} MB)</span>
            </div>
            <input
              type="range"
              min="1024"
              max="16384"
              step="512"
              value={allocatedRamMb}
              onChange={(e) => setAllocatedRamMb(Number(e.target.value))}
              className="w-full h-1.5 bg-[#1b1f2b] rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          <div className="text-[11px] text-gray-500 bg-[#161821] p-3 rounded-xl border border-white/5">
            💡 <strong>Performance note:</strong> Generational ZGC (<code>-XX:+UseZGC -XX:+ZGenerational</code>) works best with 4 GB or more RAM to eliminate micro-stutters during world chunk loading.
          </div>
        </div>
      </div>
    </div>
  )
}
