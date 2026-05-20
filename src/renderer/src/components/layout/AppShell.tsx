import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Github, Globe } from 'lucide-react'
import Sidebar from './Sidebar'
import Header from './Header'
import { ScrollArea } from '../ui/scroll-area'

const FOOTER_ROUTES = ['/console', '/console/docs']

export default function AppShell(): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false)
  const { pathname } = useLocation()
  const showFooter = FOOTER_ROUTES.includes(pathname)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={collapsed} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <ScrollArea className="flex-1">
          <main className="p-6">
            <Outlet />
          </main>
        </ScrollArea>
        {showFooter && (
          <footer className="flex shrink-0 items-center justify-end gap-2 border-t bg-background px-6 py-2">
            <span className="text-xs text-muted-foreground">made by mlziade</span>
            <a
              href="https://github.com/mlziade"
              target="_blank"
              rel="noreferrer"
              title="GitHub"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Github size={15} />
            </a>
            <a
              href="https://mlziade.com.br/"
              target="_blank"
              rel="noreferrer"
              title="Website"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Globe size={15} />
            </a>
          </footer>
        )}
      </div>
    </div>
  )
}
