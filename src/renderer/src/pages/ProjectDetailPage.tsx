import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Pencil, CheckCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { projectsApi, templatesApi } from '../lib/api'
import type { ProjectDTO, TemplateDTO, ExportFormat } from '../types'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../components/ui/dialog'
import { formatDateTime } from '../lib/utils'

export default function ProjectDetailPage(): React.JSX.Element {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [project, setProject] = useState<ProjectDTO | null>(null)
  const [template, setTemplate] = useState<TemplateDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !id) return
    projectsApi.get(user.id, id).then(async (p) => {
      setProject(p)
      const tmpl = await templatesApi.list(user.id).then((ts) => ts.find((t) => t.id === p.templateId))
      if (tmpl) setTemplate(tmpl)
      setLoading(false)
    })
  }, [id, user])

  async function handleGenerate(format: ExportFormat): Promise<void> {
    if (!user || !project) return
    setError(null)
    setGenerating(true)
    setShowExportDialog(false)
    try {
      await projectsApi.generate(user.id, project.id, format)
      const updated = await projectsApi.get(user.id, project.id)
      setProject(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar documento')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground p-4">Carregando...</p>
  if (!project) return <p className="text-sm text-destructive p-4">Projeto não encontrado.</p>

  const fieldLabels = template
    ? Object.fromEntries(template.fields.map((f) => [f.key, f.label]))
    : {}

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/console/projects')}>
          <ArrowLeft size={16} />
          Voltar
        </Button>
        <Button onClick={() => setShowExportDialog(true)} disabled={generating}>
          <Download size={16} />
          {generating ? 'Gerando...' : 'Exportar'}
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>{project.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{project.templateName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={project.status === 'COMPLETED' ? 'default' : 'secondary'}>
              {project.status === 'COMPLETED' ? (
                <><CheckCircle size={12} className="mr-1" /> Concluído</>
              ) : (
                'Em andamento'
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Última atualização: {formatDateTime(project.updatedAt)}
          </p>
          {project.fileName && (
            <p className="text-xs text-muted-foreground">
              Arquivo gerado: <span className="font-mono">{project.fileName}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Valores Preenchidos</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/console/templates/${project.templateId}`)}
          >
            <Pencil size={14} />
            Re-editar
          </Button>
        </CardHeader>
        <CardContent>
          {Object.entries(project.values).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum valor preenchido.</p>
          ) : (
            <dl className="space-y-2">
              {Object.entries(project.values).map(([key, value]) => (
                <div key={key} className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="font-medium text-muted-foreground">
                    {fieldLabels[key] ?? key}
                  </dt>
                  <dd>{value || <span className="text-muted-foreground italic">vazio</span>}</dd>
                </div>
              ))}
            </dl>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar Documento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            {([
              { format: 'docx', label: 'Word (.docx)', desc: 'Documento Word editável' },
              { format: 'doc', label: 'Word (.doc)', desc: 'Formato Word legado' },
              { format: 'pdf', label: 'PDF (.pdf)', desc: 'Documento não editável' }
            ] as { format: ExportFormat; label: string; desc: string }[]).map((opt) => (
              <button
                key={opt.format}
                onClick={() => handleGenerate(opt.format)}
                className="rounded-md border p-3 text-left hover:bg-accent transition-colors"
              >
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
