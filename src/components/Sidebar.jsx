import { NavLink } from 'react-router-dom'
import {
  Search,
  Home,
  LayoutGrid,
  ShoppingBag,
  Heart,
  Wallet,
  Users,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Flame,
} from 'lucide-react'
import { useState } from 'react'

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  const navPrimary = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/library', icon: LayoutGrid, label: 'Game library' },
    { to: '/mods', icon: Flame, label: 'Performance Mods' },
  ]

  const navCommunity = [
    { to: '/friends', icon: Users, label: 'Profiles & Friends', badge: '12' },
    { to: '/chat', icon: MessageSquare, label: 'Logs & Console' },
  ]

  return (
    <aside
      className={`h-full flex flex-col justify-between py-5 px-3 bg-[#0d0e12] border-r border-[#191b22] shrink-0 transition-all duration-200 select-none ${
        collapsed ? 'w-18' : 'w-60'
      }`}
    >
      <div className="space-y-6">
        {/* Steam Logo Header + Collapse toggle */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1e2330] to-[#12151e] border border-[#2d3244] flex items-center justify-center text-cyan-400 font-black shadow-inner">
              <span className="text-lg">♨</span>
            </div>
            {!collapsed && (
              <span className="font-extrabold tracking-widest text-sm text-white uppercase">
                STEAM<span className="text-cyan-400">.MC</span>
              </span>
            )}
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        {/* Search Bar */}
        {!collapsed ? (
          <div className="relative px-1">
            <Search
              size={14}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-9 pr-3 py-2 bg-[#14161d] border border-[#212530] rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/60"
            />
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-xl bg-[#14161d] flex items-center justify-center text-gray-400">
              <Search size={16} />
            </div>
          </div>
        )}

        {/* Primary Navigation */}
        <div className="space-y-1">
          {navPrimary.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#1e222d] text-white shadow-sm border border-[#2c3242]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
                }`
              }
            >
              <Icon size={16} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </div>

        {/* Separator */}
        <div className="h-[1px] bg-[#1a1d26] mx-2" />

        {/* Community / Sub Nav */}
        <div className="space-y-1">
          {navCommunity.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#1e222d] text-white shadow-sm border border-[#2c3242]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon size={16} />
                {!collapsed && <span>{label}</span>}
              </div>
              {!collapsed && badge && (
                <span className="text-[10px] bg-[#222735] text-gray-300 px-2 py-0.5 rounded-md font-mono">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Footer Navigation (Settings & Logout) */}
      <div className="space-y-1 pt-4 border-t border-[#1a1d26]">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-gray-200 hover:bg-white/[0.03] transition-all"
        >
          <Settings size={16} />
          {!collapsed && <span>Settings</span>}
        </NavLink>

        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer">
          <LogOut size={16} />
          {!collapsed && <span>Log out</span>}
        </div>
      </div>
    </aside>
  )
}
