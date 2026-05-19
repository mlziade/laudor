import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, Trash2, Search } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { projectsApi } from '../lib/api'
import type { ProjectDTO, ProjectStatus } from '../types'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { formatDateTime } from '../lib/utils'

export default function ProjectsPage(): React.JSX.Element {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ProjectStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user) return
    projectsApi
      .list(user.id)
      .then(setProjects)
      .finally(() => setLoading(false))
  }, [user])

  async function handleDelete(id: string): Promise<void> {
    if (!user) return
    if (!confirm('Confirma a exclusão deste projeto?')) return
    await projectsApi.delete(user.id, id)
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  const query = search.trim().toLowerCase()
  const filtered = projects.filter((p) => {
    if (filter !== 'ALL' && p.status !== filter) return false
    if (query) {
      const valuesText = Object.values(p.values).join(' ').toLowerCase()
      return (
        p.name.toLowerCase().includes(query) ||
        p.templateName.toLowerCase().includes(query) ||
        valuesText.includes(query)
      )
    }
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(['ALL', 'IN_PROGRESS', 'COMPLETED'] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? 'default' : 'outline'}
            onClick={() => setFilter(s)}
          >
            {s === 'ALL' ? 'Todos' : s === 'IN_PROGRESS' ? 'Em andamento' : 'Concluídos'}
          </Button>
        ))}
        <div className="relative ml-2">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar projetos..."
            className="h-8 pl-8 text-sm w-56"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12">
            <FolderOpen size={40} className="text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum projeto encontrado.</p>
            <p className="text-sm text-muted-foreground">
              Preencha um template para criar um projeto.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <CardContent className="flex items-center justify-between p-4">
                <div
                  className="flex-1"
                  onClick={() => navigate(`/console/projects/${project.id}`)}
                >
                  <p className="font-medium">{project.name}</p>
                  <p className="text-sm text-muted-foreground">{project.templateName}</p>
                  <p className="text-xs text-muted-foreground">
                    Atualizado em {formatDateTime(project.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={project.status === 'COMPLETED' ? 'default' : 'secondary'}>
                    {project.status === 'COMPLETED' ? 'Concluído' : 'Em andamento'}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(project.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
