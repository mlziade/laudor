import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FileText, FolderOpen, User, Building2, Users, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../contexts/ThemeContext'
import { perfisApi } from '../../lib/api'
import { Avatar } from '../ui/avatar'
import { cn } from '../../lib/utils'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/console', icon: <LayoutDashboard size={18} /> },
  { label: 'Templates', to: '/console/templates', icon: <FileText size={18} /> },
  { label: 'Projetos', to: '/console/projects', icon: <FolderOpen size={18} /> },
  { label: 'Perfis', to: '/console/perfis', icon: <User size={18} /> },
  { label: 'Empresas', to: '/console/companies', icon: <Building2 size={18} /> },
  { label: 'Usuários', to: '/console/admin/users', icon: <Users size={18} />, adminOnly: true }
]

export default function Sidebar(): React.JSX.Element {
  const { user, logout } = useAuth()
  const { theme } = useTheme()
  const [picture, setPicture] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    perfisApi.list(user.id).then((perfis) => {
      const withPic = perfis.find((p) => p.picture)
      setPicture(withPic?.picture ?? null)
    })
  }, [user])

  const visibleItems = navItems.filter((item) => !item.adminOnly || user?.isAdmin)
  const emailInitials = user?.email?.slice(0, 2) ?? '?'

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-sidebar">
      <div className="flex h-16 items-center justify-center">
        <span
          className="font-brand text-3xl leading-none"
          style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
        >
          laudor
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/console'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-3">
        <div className="mb-1 flex items-center gap-2 px-2 py-1">
          <Avatar src={picture} fallback={emailInitials} size="sm" />
          <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  )
}
