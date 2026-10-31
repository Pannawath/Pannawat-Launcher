import { NavLink } from 'react-router-dom'
import { Home, Package, User, Settings, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  const navItems = [
    { to: '/', icon: Home, label: 'Library' },
    { to: '/mods', icon: Package, label: 'Mods' },
    { to: '/profiles', icon: User, label: 'Profiles' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <aside
      className={`h-full flex flex-col justify-between py-5 bg-[var(--color-bg-sidebar)] border-r border-[var(--color-surface-border)] shrink-0 transition-all duration-200 select-none ${
        collapsed ? 'w-16 items-center px-2' : 'w-56 px-4'
      }`}
    >
      <div className="space-y-6">
        {/* App Logo & Collapse Toggle */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-purple-800 flex items-center justify-center text-white font-extrabold text-base shadow-md shrink-0">
              P
            </div>
            {!collapsed && (
              <span className="font-extrabold tracking-wider text-sm text-[var(--color-text)] truncate">
                PANNAWAT
              </span>
            )}
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-6 h-6 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface-raised)] border border-[var(--color-surface-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-white transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        {/* Navigation items */}
        <div className="space-y-1.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[var(--color-accent)] text-white shadow-md'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
            >
              <Icon size={18} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      {!collapsed && (
        <div className="px-2 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-surface-border)] text-[11px] text-[var(--color-text-muted)] flex justify-between items-center">
          <span>Fabric Engine</span>
          <span className="w-2 h-2 rounded-full bg-green-400" />
        </div>
      )}
    </aside>
  )
}
