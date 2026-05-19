import { useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthContext } from './hooks/useAuth'
import { ThemeProvider } from './contexts/ThemeContext'
import type { UserDTO } from './types'
import AuthPage from './pages/AuthPage'
import AppShell from './components/layout/AppShell'
import ConsolePage from './pages/ConsolePage'
import TemplatesPage from './pages/templates/TemplatesPage'
import TemplateNewPage from './pages/templates/TemplateNewPage'
import TemplateEditPage from './pages/templates/TemplateEditPage'
import TemplateFillPage from './pages/templates/TemplateFillPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import PerfisPage from './pages/PerfisPage'
import PerfilDetailPage from './pages/PerfilDetailPage'
import CompaniesPage from './pages/CompaniesPage'
import CompanyDetailPage from './pages/CompanyDetailPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import DocsPage from './pages/DocsPage'

export default function App(): React.JSX.Element {
  const [user, setUser] = useState<UserDTO | null>(null)

  function logout(): void {
    setUser(null)
  }

  return (
    <ThemeProvider>
    <AuthContext.Provider value={{ user, setUser, logout }}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route
            path="/console"
            element={user ? <AppShell /> : <Navigate to="/" replace />}
          >
            <Route index element={<ConsolePage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="templates/new" element={<TemplateNewPage />} />
            <Route path="templates/:id/edit" element={<TemplateEditPage />} />
            <Route path="templates/:id" element={<TemplateFillPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="perfis" element={<PerfisPage />} />
            <Route path="perfis/:id" element={<PerfilDetailPage />} />
            <Route path="companies" element={<CompaniesPage />} />
            <Route path="companies/:id" element={<CompanyDetailPage />} />
            <Route path="admin/users" element={<AdminUsersPage />} />
            <Route path="docs" element={<DocsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthContext.Provider>
    </ThemeProvider>
  )
}
