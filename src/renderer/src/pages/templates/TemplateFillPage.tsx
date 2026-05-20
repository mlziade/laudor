import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, RefreshCw, FileText, Loader2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { templatesApi, projectsApi, perfisApi, companiesApi } from '../../lib/api'
import type {
  TemplateDTO,
  PerfilDTO,
  CompanyDTO,
  FieldSchema,
  ExportFormat
} from '../../types'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../components/ui/dialog'
import { PdfPreview } from '../../components/ui/pdf-preview'
import { PreviewSkeleton } from './PreviewSkeleton'

function hslToHex(h: number, s: number, l: number): string {
  const sl = s / 100
  const ll = l / 100
  const a = sl * Math.min(ll, 1 - ll)
  const f = (n: number): string => {
    const k = (n + h / 30) % 12
    const color = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function defaultFieldColor(index: number): string {
  const hue = Math.round((index * 137.508) % 360)
  return hslToHex(hue, 65, 42)
}

function getDefaultValue(
  field: FieldSchema,
  perfil: PerfilDTO | null,
  company: CompanyDTO | null
): string {
  if (!field.defaultFrom) return ''
  const [source, key] = field.defaultFrom.split('.') as [string, string]
  if (source === 'perfil' && perfil) {
    return (perfil[key as keyof PerfilDTO] as string | null | undefined) ?? ''
  }
  if (source === 'company' && company) {
    return (company[key as keyof CompanyDTO] as string | null | undefined) ?? ''
  }
  return ''
}

export default function TemplateFillPage(): React.JSX.Element {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [template, setTemplate] = useState<TemplateDTO | null>(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [perfis, setPerfis] = useState<PerfilDTO[]>([])
  const [companies, setCompanies] = useState<CompanyDTO[]>([])
  const [selectedPerfilId, setSelectedPerfilId] = useState<string>('__none__')
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('__none__')
  const [values, setValues] = useState<Record<string, string>>({})
  const [fieldColors, setFieldColors] = useState<Record<string, string>>({})
  const [projectName, setProjectName] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewTab, setPreviewTab] = useState<'text' | 'pdf'>('text')
  const [pdfBuffer, setPdfBuffer] = useState<Uint8Array | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const selectedPerfil = perfis.find((p) => p.id === selectedPerfilId) ?? null
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) ?? null

  const liveHtml = useCallback((): string => {
    const labelMap: Record<string, string> = {}
    for (const f of template?.fields ?? []) labelMap[f.key] = f.label

    let html = previewHtml
    for (const [key, val] of Object.entries(values)) {
      const color = fieldColors[key] ?? '#888888'
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const htmlVal = val.replace(/\n/g, '<br>')
      const replacement = htmlVal
        ? `<span style="color:${color} !important;font-weight:500">${htmlVal}</span>`
        : `<span style="background:${color}1a;color:${color};border:1px dashed ${color}80;border-radius:3px;padding:0 5px;font-size:0.85em;font-style:italic;white-space:nowrap">${labelMap[key] ?? key}</span>`
      html = html.replace(new RegExp(`\\{\\{${escaped}(?::[^}]*)?\\}\\}`, 'g'), replacement)
    }
    return html
  }, [previewHtml, values, fieldColors, template])

  useEffect(() => {
    if (!user || !id) return
    Promise.all([
      templatesApi.get(user.id, id),
      templatesApi.getPreviewHtml(user.id, id),
      perfisApi.list(user.id),
      companiesApi.list(user.id)
    ])
      .then(([tmpl, html, p, c]) => {
        setTemplate(tmpl)
        setPreviewHtml(html)
        setPerfis(p)
        setCompanies(c)
        setProjectName(`Projeto - ${tmpl.name}`)
        const initial: Record<string, string> = {}
        const colors: Record<string, string> = {}
        tmpl.fields.forEach((field, i) => {
          initial[field.key] = ''
          colors[field.key] = defaultFieldColor(i)
        })
        setValues(initial)
        setFieldColors(colors)
      })
      .finally(() => setLoading(false))
  }, [id, user])

  // Auto-fill from perfil/company when they change; clear when deselected
  useEffect(() => {
    if (!template) return
    setValues((prev) => {
      const updated = { ...prev }
      for (const field of template.fields) {
        if (field.defaultFrom) {
          updated[field.key] = getDefaultValue(field, selectedPerfil, selectedCompany)
        }
      }
      return updated
    })
  }, [selectedPerfil, selectedCompany, template])

  function setValue(key: string, value: string): void {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function setFieldColor(key: string, color: string): void {
    setFieldColors((prev) => ({ ...prev, [key]: color }))
  }

  async function generatePdfPreview(): Promise<void> {
    if (!user || !id) return
    setGeneratingPdf(true)
    try {
      const pdf = await templatesApi.filledPdf(user.id, id, values)
      setPdfBuffer(pdf)
    } catch {
      // leave pdfBuffer null — PdfPreview shows empty state
    } finally {
      setGeneratingPdf(false)
    }
  }

  async function handleGenerate(format: ExportFormat): Promise<void> {
    if (!user || !template) return
    setError(null)
    setGenerating(true)
    setShowExportDialog(false)
    try {
      const projectId = savedProjectId ?? (await projectsApi.create(user.id, {
        name: projectName,
        templateId: template.id,
        perfilId: selectedPerfilId === '__none__' ? undefined : selectedPerfilId,
        companyId: selectedCompanyId === '__none__' ? undefined : selectedCompanyId,
        values
      })).id
      if (!savedProjectId) setSavedProjectId(projectId)
      await projectsApi.generate(user.id, projectId, format)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar documento')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave(): Promise<void> {
    if (!user || !template) return
    if (savedProjectId) {
      navigate('/console/projects')
      return
    }
    setSaving(true)
    try {
      await projectsApi.create(user.id, {
        name: projectName,
        templateId: template.id,
        perfilId: selectedPerfilId === '__none__' ? undefined : selectedPerfilId,
        companyId: selectedCompanyId === '__none__' ? undefined : selectedCompanyId,
        values
      })
      navigate('/console/projects')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar projeto')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground p-4">Carregando...</p>
  if (!template) return <p className="text-sm text-destructive p-4">Template não encontrado.</p>

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/console/templates')}>
            <ArrowLeft size={16} />
          </Button>
          <div className="flex items-end gap-6">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Template
              </p>
              <h2 className="font-semibold leading-tight">{template.name}</h2>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Projeto
              </p>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="h-7 text-xs w-60"
                placeholder="Nome do projeto"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowExportDialog(true)} disabled={generating || saving}>
            <Download size={16} />
            {generating ? 'Gerando...' : 'Gerar Documento'}
          </Button>
          <Button variant="outline" onClick={handleSave} disabled={generating || saving}>
            {saving ? 'Salvando...' : 'Concluir'}
          </Button>
        </div>
      </div>

      {error && <p className="text-xs text-destructive mb-2">{error}</p>}

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left panel — form */}
        <div className="w-[40%] flex-shrink-0 overflow-auto space-y-4 pr-2">
          {/* Auto-fill sources */}
          <div className="rounded-lg border border-dashed bg-muted/40 p-4 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Preenchimento automático
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Selecione um perfil ou empresa para preencher campos vinculados automaticamente.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Perfil (Persona)</Label>
              <Select value={selectedPerfilId} onValueChange={setSelectedPerfilId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar perfil..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {perfis.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar empresa..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Manual fields */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Campos do documento
            </p>
            {template.fields.map((field) => (
              <div
                key={field.key}
                className="space-y-1 border-l-[3px] pl-2 transition-colors"
                style={{ borderColor: fieldColors[field.key] ?? defaultFieldColor(0) }}
              >
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={fieldColors[field.key] ?? defaultFieldColor(0)}
                    onChange={(e) => setFieldColor(field.key, e.target.value)}
                    className="h-[18px] w-[18px] cursor-pointer rounded-[3px] border-0 p-0"
                    title="Cor na pré-visualização"
                  />
                  <Label className="text-sm">
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                </div>
                {field.description && (
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                )}
                {field.type === 'textarea' ? (
                  <Textarea
                    value={values[field.key] ?? ''}
                    onChange={(e) => setValue(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                  />
                ) : field.type === 'dropdown' && field.options ? (
                  <Select
                    value={values[field.key] ?? '__none__'}
                    onValueChange={(v) => setValue(field.key, v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Selecionar...</SelectItem>
                      {field.options.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : 'text'}
                    value={values[field.key] ?? ''}
                    onChange={(e) => setValue(field.key, e.target.value)}
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — preview */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border">
          {/* Tab bar */}
          <div className="flex items-center gap-1 border-b bg-muted/40 px-3 py-2">
            <button
              onClick={() => setPreviewTab('text')}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                previewTab === 'text'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Texto
            </button>
            <button
              onClick={() => setPreviewTab('pdf')}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                previewTab === 'pdf'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              PDF
            </button>
            {previewTab === 'pdf' && (
              <div className="ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generatePdfPreview}
                  disabled={generatingPdf}
                >
                  {generatingPdf ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <RefreshCw size={13} />
                  )}
                  {generatingPdf ? 'Gerando...' : 'Gerar pré-visualização'}
                </Button>
              </div>
            )}
          </div>

          {/* Tab content */}
          {previewTab === 'text' ? (
            <div className="flex-1 overflow-auto bg-white p-8 text-black">
              <div
                className="doc-preview max-w-none"
                dangerouslySetInnerHTML={{ __html: liveHtml() }}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              {generatingPdf ? (
                <PreviewSkeleton className="h-full" />
              ) : pdfBuffer ? (
                <PdfPreview buffer={pdfBuffer} className="h-full" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <FileText size={36} className="text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Clique em "Gerar pré-visualização" para ver o PDF com os valores preenchidos.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escolher formato</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <p className="text-sm text-muted-foreground">
              Selecione o formato de exportação do documento:
            </p>
            <div className="grid gap-2">
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
