import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  User,
  Building2,
  Users,
  LogOut,
  BookOpen,
} from 'lucide-react'
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
  { label: 'Perfis (Personas)', to: '/console/perfis', icon: <User size={18} /> },
  { label: 'Empresas', to: '/console/companies', icon: <Building2 size={18} /> },
  { label: 'Usuários', to: '/console/admin/users', icon: <Users size={18} />, adminOnly: true },
  { label: 'Docs (Tutorial)', to: '/console/docs', icon: <BookOpen size={18} /> }
]

interface SidebarProps {
  collapsed: boolean
}

export default function Sidebar({ collapsed }: SidebarProps): React.JSX.Element {
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
  const brandColor = theme === 'dark' ? '#ffffff' : '#000000'

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r bg-sidebar overflow-hidden transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center justify-center px-3">
        <span
          className="font-brand leading-none"
          style={{ color: brandColor, fontSize: collapsed ? '1.5rem' : '1.875rem' }}
        >
          {collapsed ? 'L' : 'laudor'}
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-2">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/console'}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                collapsed ? 'justify-center' : 'gap-3 px-3',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )
            }
          >
            {item.icon}
            {!collapsed && item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-2">
        {!collapsed && (
          <div className="mb-1 flex items-center gap-2.5 px-2 py-1">
            <Avatar src={picture} size="md" />
            <span className="truncate text-sm font-medium text-sidebar-foreground">{user?.email}</span>
          </div>
        )}
        {collapsed && (
          <div className="mb-1 flex justify-center py-1">
            <Avatar src={picture} size="md" />
          </div>
        )}
        <button
          onClick={logout}
          title={collapsed ? 'Sair' : undefined}
          className={cn(
            'flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors',
            collapsed ? 'justify-center' : 'gap-3 px-3'
          )}
        >
          <LogOut size={18} />
          {!collapsed && 'Sair'}
        </button>
      </div>
    </aside>
  )
}
