import { useLocation } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { Button } from '../ui/button'

const routeLabels: Record<string, string> = {
  '/console': 'Dashboard',
  '/console/templates': 'Templates',
  '/console/templates/new': 'Novo Template',
  '/console/projects': 'Projetos',
  '/console/perfis': 'Perfis',
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

export default function Header(): React.JSX.Element {
  const { pathname } = useLocation()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <h1 className="text-lg font-semibold">{getPageTitle(pathname)}</h1>
      <Button variant="ghost" size="icon" onClick={toggleTheme} title="Alternar tema">
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </Button>
    </header>
  )
}
