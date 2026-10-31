import { NavLink } from 'react-router-dom'
import { Home, Package, User, Settings } from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { to: '/',         icon: Home,     label: 'Home' },
  { to: '/mods',     icon: Package,  label: 'Mods' },
  { to: '/profiles', icon: User,     label: 'Profiles' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  return (
    <aside className="w-16 flex flex-col items-center py-4 gap-1 bg-[var(--color-bg-sidebar)] border-r border-[var(--color-surface-border)]">
      {/* Logo mark */}
      <div className="w-9 h-9 rounded-lg bg-[var(--color-accent)] flex items-center justify-center mb-4 shrink-0">
        <span className="text-white font-bold text-sm">P</span>
      </div>

      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          title={label}
          className={({ isActive }) =>
            clsx(
              'w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-150',
              isActive
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'
            )
          }
        >
          <Icon size={18} />
        </NavLink>
      ))}
    </aside>
  )
}
