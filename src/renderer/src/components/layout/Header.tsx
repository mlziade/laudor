import { useLocation } from 'react-router-dom'
import { Moon, Sun, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { Button } from '../ui/button'

const routeLabels: Record<string, string> = {
  '/console': 'Dashboard',
  '/console/templates': 'Templates',
  '/console/templates/new': 'Novo Template',
  '/console/projects': 'Projetos',
  '/console/perfis': 'Perfis (Personas)',
  '/console/companies': 'Empresas',
  '/console/admin/users': 'Usuários'
}

function getPageTitle(pathname: string): string {
  if (routeLabels[pathname]) return routeLabels[pathname]
  if (pathname.includes('/templates/') && pathname.includes('/edit')) return 'Editar Template'
  if (pathname.includes('/templates/')) return 'Preencher Template'
  if (pathname.includes('/projects/')) return 'Detalhe do Projeto'
  if (pathname.includes('/perfis/')) return 'Detalhe do Perfil'
  if (pathname.includes('/companies/')) return 'Detalhe da Empresa'
  return 'Laudor'
}

interface HeaderProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Header({ collapsed, onToggle }: HeaderProps): React.JSX.Element {
  const { pathname } = useLocation()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </Button>
        <h1 className="text-lg font-semibold">{getPageTitle(pathname)}</h1>
      </div>
      <Button variant="ghost" size="icon" onClick={toggleTheme} title="Alternar tema">
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </Button>
    </header>
  )
}
