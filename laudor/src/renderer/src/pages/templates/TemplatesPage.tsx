import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Pencil, Trash2, Eye, X, Loader2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { templatesApi } from '../../lib/api'
import { cn, formatDate } from '../../lib/utils'
import type { TemplateDTO, TemplateStatus } from '../../types'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { PdfPreview } from '../../components/ui/pdf-preview'
import { PreviewSkeleton } from './PreviewSkeleton'

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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewPdf, setPreviewPdf] = useState<Uint8Array | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    if (!user) return
    templatesApi
      .list(user.id)
      .then(setTemplates)
      .finally(() => setLoading(false))
  }, [user])

  async function loadPreview(id: string): Promise<void> {
    if (!user || id === selectedId) return
    setSelectedId(id)
    setPreviewPdf(null)
    setLoadingPreview(true)
    try {
      const pdf = await templatesApi.toPdf(user.id, id)
      setPreviewPdf(pdf)
    } catch {
      // leave previewPdf null — PdfPreview shows empty state
    } finally {
      setLoadingPreview(false)
    }
  }

  function closePreview(): void {
    setSelectedId(null)
    setPreviewPdf(null)
    setLoadingPreview(false)
  }

  async function handleDelete(id: string): Promise<void> {
    if (!user) return
    if (!confirm('Confirma a exclusão deste template?')) return
    await templatesApi.delete(user.id, id)
    setTemplates((prev) => prev.filter((t) => t.id !== id))
    if (selectedId === id) closePreview()
  }

  const filtered = filter === 'ALL' ? templates : templates.filter((t) => t.status === filter)
  const selectedTemplate = templates.find((t) => t.id === selectedId)
  const isPreviewing = selectedId !== null

  return (
    <div className="space-y-4">
      {/* Toolbar */}
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

      {/* Content */}
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
      ) : isPreviewing ? (
        /* ── Split layout ── */
        <div className="flex gap-4 items-start">
          {/* Left: compact scrollable list */}
          <div className="w-[260px] shrink-0 space-y-2">
            {filtered.map((template) => (
              <Card
                key={template.id}
                className={cn(
                  'cursor-pointer transition-colors',
                  selectedId === template.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-accent/50'
                )}
                onClick={() => loadPreview(template.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{template.name}</p>
                      {template.category && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {template.category}
                        </p>
                      )}
                      <Badge variant={STATUS_VARIANTS[template.status]} className="mt-1">
                        {STATUS_LABELS[template.status]}
                      </Badge>
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="Editar"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/console/templates/${template.id}/edit`)
                        }}
                      >
                        <Pencil size={12} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        title="Excluir"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(template.id)
                        }}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Right: PDF preview panel */}
          <div className="flex-1 min-w-0">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <CardTitle className="truncate text-sm font-medium">
                      {selectedTemplate?.name ?? 'Pré-visualização'}
                    </CardTitle>
                    {loadingPreview && (
                      <Loader2 size={13} className="shrink-0 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    title="Fechar pré-visualização"
                    onClick={closePreview}
                  >
                    <X size={14} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden rounded-b-lg">
                {loadingPreview ? (
                  <PreviewSkeleton className="h-[calc(100vh-14rem)] min-h-[400px]" />
                ) : (
                  <PdfPreview
                    buffer={previewPdf}
                    className="h-[calc(100vh-14rem)] min-h-[400px]"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* ── Full grid ── */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => (
            <Card key={template.id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="flex flex-col gap-1.5 p-4">
                {/* Top row: name + status badge */}
                <div className="flex items-start justify-between gap-2">
                  <p
                    className="flex-1 cursor-pointer font-medium line-clamp-1"
                    onClick={() => navigate(`/console/templates/${template.id}`)}
                  >
                    {template.name}
                  </p>
                  <Badge variant={STATUS_VARIANTS[template.status]} className="shrink-0">
                    {STATUS_LABELS[template.status]}
                  </Badge>
                </div>

                {/* Middle: category + description */}
                <div
                  className="cursor-pointer"
                  onClick={() => navigate(`/console/templates/${template.id}`)}
                >
                  {template.category && (
                    <p className="text-xs text-muted-foreground">{template.category}</p>
                  )}
                  {template.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                  )}
                </div>

                {/* Bottom row: date + action buttons */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <p className="text-xs text-muted-foreground">
                    {template.fields.length} campo(s) · {formatDate(template.updatedAt)}
                  </p>
                  <div className="flex gap-0.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Ver pré-visualização"
                      onClick={() => loadPreview(template.id)}
                    >
                      <Eye size={13} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Editar"
                      onClick={() => navigate(`/console/templates/${template.id}/edit`)}
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      title="Excluir"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 size={13} />
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
