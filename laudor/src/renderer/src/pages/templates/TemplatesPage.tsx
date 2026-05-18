import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { templatesApi } from '../../lib/api'
import type { TemplateDTO, TemplateStatus } from '../../types'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { formatDate } from '../../lib/utils'

const STATUS_LABELS: Record<TemplateStatus, string> = {
  DRAFT: 'Rascunho',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Arquivado'
}

const STATUS_VARIANTS: Record<TemplateStatus, 'default' | 'secondary' | 'outline'> = {
  DRAFT: 'secondary',
  PUBLISHED: 'default',
  ARCHIVED: 'outline'
}

export default function TemplatesPage(): React.JSX.Element {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<TemplateDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TemplateStatus | 'ALL'>('ALL')

  useEffect(() => {
    if (!user) return
    templatesApi
      .list(user.id)
      .then(setTemplates)
      .finally(() => setLoading(false))
  }, [user])

  async function handleDelete(id: string): Promise<void> {
    if (!user) return
    if (!confirm('Confirma a exclusão deste template?')) return
    await templatesApi.delete(user.id, id)
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  const filtered =
    filter === 'ALL' ? templates : templates.filter((t) => t.status === filter)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filter === s ? 'default' : 'outline'}
              onClick={() => setFilter(s)}
            >
              {s === 'ALL' ? 'Todos' : STATUS_LABELS[s]}
            </Button>
          ))}
        </div>
        <Button onClick={() => navigate('/console/templates/new')}>
          <Plus size={16} />
          Novo Template
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12">
            <FileText size={40} className="text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum template encontrado.</p>
            <Button onClick={() => navigate('/console/templates/new')}>
              <Plus size={16} />
              Criar template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => (
            <Card
              key={template.id}
              className="hover:bg-accent/50 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => navigate(`/console/templates/${template.id}`)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium line-clamp-1">{template.name}</p>
                    </div>
                    <Badge variant={STATUS_VARIANTS[template.status]}>
                      {STATUS_LABELS[template.status]}
                    </Badge>
                    {template.category && (
                      <p className="mt-1 text-xs text-muted-foreground">{template.category}</p>
                    )}
                    {template.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {template.fields.length} campo(s) · {formatDate(template.updatedAt)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 ml-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => navigate(`/console/templates/${template.id}/edit`)}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
