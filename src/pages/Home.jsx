import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import {
  Play,
  Settings,
  AlertCircle,
  Clock,
  ChevronRight,
  TrendingUp,
  Loader2,
  Bell,
  ShoppingBag,
} from 'lucide-react'

export default function Home() {
  const [username, setUsername] = useState('Totalitarochka')
  const [isLaunching, setIsLaunching] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [progress, setProgress] = useState({ downloaded: 0, total: 0, percent: 0 })
  const [activeTab, setActiveTab] = useState('Recently played')

  useEffect(() => {
    let unlistenStatus
    let unlistenProgress

    listen('launch-status', (event) => {
      setStatusMessage(event.payload.message)
      if (event.payload.status === 'running') {
        setIsLaunching(false)
      }
    }).then((un) => {
      unlistenStatus = un
    })

    listen('download-progress', (event) => {
      const data = event.payload
      if (data.total) {
        const pct = Math.round((data.downloaded / data.total) * 100)
        setProgress({
          downloaded: data.downloaded,
          total: data.total,
          percent: pct,
        })
      }
    }).then((un) => {
      unlistenProgress = un
    })

    return () => {
      if (unlistenStatus) unlistenStatus()
      if (unlistenProgress) unlistenProgress()
    }
  }, [])

  const handlePlay = async () => {
    try {
      setIsLaunching(true)
      setStatusMessage('Initializing launcher pipeline...')
      setProgress({ downloaded: 0, total: 0, percent: 0 })

      await invoke('launch_game', {
        req: {
          profile_id: 'default',
          profile_name: 'Minecraft Java Edition',
          username: username.trim() || 'Player',
          mc_version: '1.21.4',
          fabric_version: null,
          min_ram_mb: 1024,
          max_ram_mb: 4096,
        },
      })
    } catch (err) {
      console.error(err)
      setStatusMessage(`Error: ${err}`)
      setIsLaunching(false)
    }
  }

  return (
    <div className="p-7 max-w-[1400px] mx-auto space-y-6 select-none">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-white flex items-center gap-1.5">
            Hi, {username}!
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Here's your last progress</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 bg-[#12141a] p-1 rounded-2xl border border-[#1f232d]">
          {['My games', 'Recently played', 'Favourites', 'Downloads'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-[#222733] text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* User avatar & actions */}
        <div className="flex items-center gap-3">
          <button className="w-8 h-8 rounded-full bg-[#14161d] border border-[#212530] flex items-center justify-center text-gray-400 hover:text-white">
            <ShoppingBag size={14} />
          </button>
          <button className="w-8 h-8 rounded-full bg-[#14161d] border border-[#212530] flex items-center justify-center text-gray-400 hover:text-white">
            <Bell size={14} />
          </button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-pink-400 p-[1.5px] cursor-pointer">
            <div className="w-full h-full rounded-full bg-[#14161d] flex items-center justify-center font-bold text-xs text-white">
              🎮
            </div>
          </div>
        </div>
      </div>

      {/* Hero Card Banner */}
      <div className="relative rounded-3xl overflow-hidden h-[330px] border border-white/10 shadow-2xl flex flex-col justify-between p-8 bg-[#101216]">
        {/* Ambient Game Banner Background */}
        <div
          className="absolute inset-0 bg-cover bg-center brightness-[0.55] transition-all duration-700 hover:scale-105"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1600&auto=format&fit=crop')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e1015] via-[#0e1015]/60 to-transparent" />

        {/* Top meta */}
        <div className="relative z-10">
          <span className="text-[11px] font-medium text-gray-300 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
            Last played Today • Fabric 1.21.4
          </span>
        </div>

        {/* Bottom Hero Info & Play Button */}
        <div className="relative z-10 flex items-end justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-300 bg-white/10 px-2.5 py-0.5 rounded-md flex items-center gap-1 backdrop-blur-sm">
                <Clock size={11} /> 102 hrs played
              </span>
            </div>

            <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-md">
              Minecraft: Fabric Performance Edition
            </h2>
            <p className="text-xs text-gray-300/80 leading-relaxed line-clamp-2">
              Equipped with Sodium, Lithium, and Generational ZGC. Stutter-free rendering and
              high-efficiency physics ready for your next adventure.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <button className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 backdrop-blur-md flex items-center justify-center text-gray-300 hover:text-white transition-all cursor-pointer">
              <Settings size={16} />
            </button>
            <button className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 backdrop-blur-md flex items-center justify-center text-gray-300 hover:text-white transition-all cursor-pointer">
              <AlertCircle size={16} />
            </button>

            <button
              onClick={handlePlay}
              disabled={isLaunching}
              className="px-6 py-3 rounded-full bg-[#83eef5] hover:bg-[#6ed9e0] text-[#0a1b24] font-extrabold text-xs flex items-center gap-2.5 transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isLaunching ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Launching...</span>
                </>
              ) : (
                <>
                  <Play size={14} fill="currentColor" />
                  <span>Continue playing</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar inside hero if launching */}
        {statusMessage && (
          <div className="relative z-10 mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white">
            <span>{statusMessage}</span>
            {progress.total > 0 && <span>{progress.percent}%</span>}
          </div>
        )}
      </div>

      {/* Bottom 3-Column Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Achievements */}
        <div className="p-6 rounded-3xl bg-[#12141a] border border-[#1f232d] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">Achievements</h3>
            <ChevronRight size={16} className="text-gray-500" />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-gray-200">5/26 (19%)</span>
            </div>
            <div className="w-full h-1.5 bg-[#1b1e27] rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full w-[19%]" />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Last gained
            </span>

            {[
              { title: 'Stone Age', desc: 'Mine stone with your new pickaxe' },
              { title: 'Benchmarking', desc: 'Craft a Workbench table' },
              { title: 'Getting an Upgrade', desc: 'Construct a better pickaxe' },
            ].map((ach, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1b1f2b] flex items-center justify-center font-bold text-xs text-cyan-400">
                  ★
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-200">{ach.title}</h4>
                  <p className="text-[11px] text-gray-500">{ach.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Compare progress (Friends) */}
        <div className="p-6 rounded-3xl bg-[#12141a] border border-[#1f232d] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">Compare progress</h3>
            <ChevronRight size={16} className="text-gray-500" />
          </div>

          <div className="space-y-4">
            {[
              { name: username, hrs: '102 hrs', ach: '5/26', pct: '40%', active: true },
              { name: 'Brandon Sanderson', hrs: '232 hrs', ach: '26/26', pct: '100%', top: true },
              { name: 'PlayingWithFun', hrs: '77 hrs', ach: '10/26', pct: '70%' },
              { name: 'Awesome Possum', hrs: '12 hrs', ach: '3/26', pct: '30%' },
            ].map((friend, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1b1e27] border border-white/5 flex items-center justify-center text-xs font-bold text-gray-300">
                    {friend.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-200">{friend.name}</span>
                      {friend.top && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-semibold">
                          ★ Top 1
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-500">
                      ⏱ {friend.hrs} • 🏆 {friend.ach}
                    </span>
                  </div>
                </div>

                <span className="text-xs font-semibold text-gray-400">{friend.pct}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Activity Heatmap (Activity in August) */}
        <div className="p-6 rounded-3xl bg-[#12141a] border border-[#1f232d] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">Activity in August</h3>
            <span className="text-xs text-gray-400 bg-[#191c25] px-2.5 py-1 rounded-lg">
              Month ▾
            </span>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#1f232e]" /> 0h
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#2b3345]" /> &gt;2h
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#40506e]" /> &gt;4h
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-cyan-300" /> &gt;8h
            </span>
          </div>

          {/* Calendar Heatmap Grid */}
          <div className="grid grid-cols-7 gap-2 pt-2">
            {Array.from({ length: 35 }).map((_, idx) => {
              const activeLevels = [
                'bg-[#1a1d26]',
                'bg-[#1a1d26]',
                'bg-[#283042]',
                'bg-[#3b4763]',
                'bg-[#83eef5]',
              ]
              const level = [0, 4, 0, 1, 3, 4, 0, 0, 4, 2, 0, 0, 4, 0, 4, 0, 0, 3, 0, 0, 4][
                idx % 21
              ]

              return (
                <div
                  key={idx}
                  className={`h-7 rounded-lg transition-transform hover:scale-110 ${activeLevels[level]}`}
                />
              )
            })}
          </div>

          <div className="flex justify-between text-[10px] text-gray-500 pt-1 font-mono">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
        </div>
      </div>
    </div>
  )
}
