import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, FolderOpen, Plus } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { templatesApi, projectsApi } from '../lib/api'
import type { TemplateDTO, ProjectDTO } from '../types'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { formatDateTime } from '../lib/utils'

export default function ConsolePage(): React.JSX.Element {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<TemplateDTO[]>([])
  const [projects, setProjects] = useState<ProjectDTO[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      templatesApi.list(user.id),
      projectsApi.list(user.id)
    ])
      .then(([t, p]) => {
        setTemplates(t)
        setProjects(p)
      })
      .finally(() => setLoading(false))
  }, [user])

  const recentProjects = projects.slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meus Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-muted-foreground">
              {templates.filter((t) => t.status === 'PUBLISHED').length} publicados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-muted-foreground">
              {projects.filter((p) => p.status === 'COMPLETED').length} concluídos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button onClick={() => navigate('/console/templates/new')}>
          <Plus size={16} />
          Novo Template
        </Button>
        <Button variant="outline" onClick={() => navigate('/console/templates')}>
          Ver Templates
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projetos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : recentProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum projeto ainda.</p>
          ) : (
            <ul className="space-y-2">
              {recentProjects.map((project) => (
                <li
                  key={project.id}
                  className="flex items-center justify-between rounded-md border p-3 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => navigate(`/console/projects/${project.id}`)}
                >
                  <div>
                    <p className="font-medium text-sm">{project.name}</p>
                    <p className="text-xs text-muted-foreground">{project.templateName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(project.updatedAt)}
                    </span>
                    <Badge variant={project.status === 'COMPLETED' ? 'default' : 'secondary'}>
                      {project.status === 'COMPLETED' ? 'Concluído' : 'Em andamento'}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
