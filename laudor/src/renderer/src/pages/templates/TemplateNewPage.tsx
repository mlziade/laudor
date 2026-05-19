import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, FileText, TriangleAlert, Loader2, Info } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { templatesApi } from '../../lib/api'
import { cn } from '../../lib/utils'
import type { FieldSchema, FieldType, DefaultFromSource } from '../../types'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select'
import { Separator } from '../../components/ui/separator'
import { Tooltip } from '../../components/ui/tooltip'
import { PdfPreview } from '../../components/ui/pdf-preview'
import { PreviewSkeleton } from './PreviewSkeleton'

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Texto' },
  { value: 'textarea', label: 'Texto Longo' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Data' },
  { value: 'email', label: 'Email' },
  { value: 'dropdown', label: 'Seleção' }
]

const DEFAULT_FROM_OPTIONS: { value: DefaultFromSource; label: string }[] = [
  { value: 'perfil.fullName', label: 'Perfil: Nome Completo' },
  { value: 'perfil.cpf', label: 'Perfil: CPF' },
  { value: 'perfil.rg', label: 'Perfil: RG' },
  { value: 'perfil.email', label: 'Perfil: Email' },
  { value: 'perfil.phone', label: 'Perfil: Telefone' },
  { value: 'perfil.logradouro', label: 'Perfil: Logradouro' },
  { value: 'perfil.cidade', label: 'Perfil: Cidade' },
  { value: 'perfil.estado', label: 'Perfil: Estado' },
  { value: 'company.razaoSocial', label: 'Empresa: Razão Social' },
  { value: 'company.nomeFantasia', label: 'Empresa: Nome Fantasia' },
  { value: 'company.cnpj', label: 'Empresa: CNPJ' },
  { value: 'company.telefone', label: 'Empresa: Telefone' },
  { value: 'company.email', label: 'Empresa: Email' },
  { value: 'company.representante', label: 'Empresa: Representante' },
  { value: 'company.logradouro', label: 'Empresa: Logradouro' },
  { value: 'company.cidade', label: 'Empresa: Cidade' },
  { value: 'company.estado', label: 'Empresa: Estado' }
]

interface FieldEditor extends FieldSchema {
  _optionsText?: string
}

function FieldLabel({ label, tip }: { label: string; tip: string }): React.JSX.Element {
  return (
    <div className="flex items-center gap-1">
      <Label className="text-xs">{label}</Label>
      <Tooltip content={tip} side="right">
        <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
          <Info size={11} />
        </button>
      </Tooltip>
    </div>
  )
}

export default function TemplateNewPage(): React.JSX.Element {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [fileBuffer, setFileBuffer] = useState<Uint8Array | null>(null)
  const [fileName, setFileName] = useState('')
  const [parsedTags, setParsedTags] = useState<string[]>([])
  const [fields, setFields] = useState<FieldEditor[]>([])
  const [pdfBuffer, setPdfBuffer] = useState<Uint8Array | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'upload' | 'configure'>('upload')

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setError(null)
    setUploading(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)
      setFileBuffer(buffer)
      setFileName(file.name)

      const [tags, pdf] = await Promise.all([
        templatesApi.parseTags(buffer),
        templatesApi.toPdfFromBuffer(buffer)
      ])

      setParsedTags(tags.map((t) => t.key))
      setPdfBuffer(pdf)
      setFields(
        tags.map((t) => ({
          key: t.key,
          label: t.key,
          type: t.description ? 'textarea' : ('text' as FieldType),
          description: t.description,
          required: true
        }))
      )
      setStep('configure')
    } catch {
      setError('Não foi possível ler as tags do arquivo.')
    } finally {
      setUploading(false)
    }
  }

  function updateField(index: number, patch: Partial<FieldEditor>): void {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  async function handleSave(status: 'DRAFT' | 'PUBLISHED'): Promise<void> {
    if (!user || !fileBuffer) return
    if (!name.trim()) {
      setError('Nome é obrigatório')
      return
    }

    setError(null)
    setLoading(true)
    try {
      const processedFields: FieldSchema[] = fields.map((f) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        required: f.required,
        placeholder: f.placeholder,
        defaultFrom: f.defaultFrom,
        description: f.description || undefined,
        options:
          f.type === 'dropdown' && f._optionsText
            ? f._optionsText
                .split('\n')
                .map((o) => o.trim())
                .filter(Boolean)
            : undefined
      }))

      const template = await templatesApi.create(user.id, {
        name,
        description: description || undefined,
        category: category || undefined,
        fileContent: fileBuffer,
        fileName,
        fields: processedFields
      })

      if (status === 'PUBLISHED') {
        await templatesApi.setStatus(user.id, template.id, 'PUBLISHED')
      }

      navigate('/console/templates')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-6 items-start">
      {/* Left: forms */}
      <div className="w-[500px] shrink-0 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/console/templates')}>
          <ArrowLeft size={16} />
          Voltar
        </Button>

        {step === 'upload' ? (
          <Card>
            <CardHeader>
              <CardTitle>Novo Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do template *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Laudo Médico Pericial"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Médico, Jurídico..."
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Arquivo .docx</Label>
                {fileName ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                      {uploading ? (
                        <Loader2 size={14} className="shrink-0 animate-spin text-muted-foreground" />
                      ) : (
                        <FileText size={14} className="shrink-0 text-muted-foreground" />
                      )}
                      <span className="flex-1 truncate text-sm">{fileName}</span>
                      {!uploading && (
                        <label className="cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:underline">
                          Alterar
                          <input
                            type="file"
                            accept=".docx"
                            className="hidden"
                            onChange={handleFileSelect}
                          />
                        </label>
                      )}
                    </div>
                    {uploading && (
                      <p className="text-xs text-muted-foreground">
                        Lendo tags e gerando pré-visualização...
                      </p>
                    )}
                  </div>
                ) : (
                  <label
                    className={cn(
                      'flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
                      uploading ? 'pointer-events-none opacity-50' : 'hover:bg-accent'
                    )}
                  >
                    <Upload size={32} className="text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Clique para selecionar um arquivo .docx
                    </span>
                    <span className="text-xs text-muted-foreground">
                      As tags no formato {'{{'} {'campo'} {'}'} {'}'} serão detectadas
                      automaticamente
                    </span>
                    <input
                      type="file"
                      accept=".docx"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>
                )}
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configurar Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do template *</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-muted-foreground">Tags detectadas:</span>
                  {parsedTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="font-mono text-xs">
                      {'{{'}
                      {tag}
                      {'}}'}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                  <FileText size={14} className="shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm">{fileName}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campos ({fields.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={index} className="rounded-md border p-4 space-y-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      {field.key || 'sem chave'}
                    </span>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <FieldLabel
                          label="Chave (tag)"
                          tip="O nome da tag no documento, exatamente como está entre as chaves duplas."
                        />
                        <Input
                          value={field.key}
                          onChange={(e) => updateField(index, { key: e.target.value })}
                          className="h-8 font-mono text-xs"
                          placeholder="nome_campo"
                        />
                      </div>
                      <div className="space-y-1">
                        <FieldLabel
                          label="Rótulo"
                          tip={"O que aparece para quem preenche.\n\nEx: chave data_nasc → rótulo Data de Nascimento."}
                        />
                        <Input
                          value={field.label}
                          onChange={(e) => updateField(index, { label: e.target.value })}
                          className="h-8"
                          placeholder="Nome do campo"
                        />
                      </div>
                      <div className="space-y-1">
                        <FieldLabel
                          label="Tipo"
                          tip="Como o usuário vai preencher este campo — texto, número, data, email, parágrafo ou lista."
                        />
                        <Select
                          value={field.type}
                          onValueChange={(v) => updateField(index, { type: v as FieldType })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <FieldLabel
                          label="Pré-preencher de"
                          tip={"Preenche automaticamente com dados do perfil ou empresa do projeto.\n\nEx: CPF do perfil, CNPJ da empresa."}
                        />
                        <Select
                          value={field.defaultFrom ?? '__none__'}
                          onValueChange={(v) =>
                            updateField(index, {
                              defaultFrom:
                                v === '__none__' ? undefined : (v as DefaultFromSource)
                            })
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Nenhum" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Nenhum</SelectItem>
                            {DEFAULT_FROM_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <FieldLabel
                        label="Descrição"
                        tip={"Instrução para quem vai preencher este campo. Também pode ser embutida na tag do documento: {{chave:descrição aqui}}."}
                      />
                      <Input
                        value={field.description ?? ''}
                        onChange={(e) => updateField(index, { description: e.target.value || undefined })}
                        className="h-8 text-xs"
                        placeholder="Ex: Data, horário e local da realização do exame pericial"
                      />
                    </div>

                    {field.type === 'dropdown' && (
                      <div className="space-y-1">
                        <FieldLabel
                          label="Opções (uma por linha)"
                          tip={"As opções que aparecem na lista.\n\nEx: Sim / Não / Parcial — uma por linha."}
                        />
                        <Textarea
                          value={field._optionsText ?? ''}
                          onChange={(e) => updateField(index, { _optionsText: e.target.value })}
                          rows={3}
                          className="text-xs"
                          placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`required-${index}`}
                        checked={field.required}
                        onChange={(e) => updateField(index, { required: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor={`required-${index}`} className="text-xs cursor-pointer">
                        Obrigatório
                      </Label>
                      <Tooltip
                        content="O documento não é gerado enquanto este campo estiver vazio."
                        side="right"
                      >
                        <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                          <Info size={11} />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {parsedTags.length === 0 && (
              <div className="flex items-start gap-2 rounded-md border border-orange-400 bg-orange-100 px-3 py-2 dark:bg-orange-950/40 dark:border-orange-500/60">
                <TriangleAlert size={14} className="mt-0.5 shrink-0 text-orange-600 dark:text-orange-400" />
                <p className="text-xs text-orange-800 dark:text-orange-300">
                  Nenhuma tag detectada neste documento. Adicione tags no formato{' '}
                  <span className="font-mono">{'{{campo}}'}</span> para criar campos dinâmicos.
                </p>
              </div>
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button
                onClick={() => handleSave('PUBLISHED')}
                disabled={loading || parsedTags.length === 0}
              >
                {loading ? 'Salvando...' : 'Publicar Template'}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSave('DRAFT')}
                disabled={loading || parsedTags.length === 0}
              >
                Salvar como Rascunho
              </Button>
              <Button variant="ghost" onClick={() => setStep('upload')}>
                Voltar
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Right: document preview */}
      <div className="flex-1 min-w-0">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Pré-visualização</CardTitle>
              {uploading && (
                <Loader2 size={13} className="animate-spin text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden rounded-b-lg">
            {uploading ? (
              <PreviewSkeleton className="h-[calc(100vh-10rem)] min-h-[400px]" />
            ) : (
              <PdfPreview
                buffer={pdfBuffer}
                className="h-[calc(100vh-10rem)] min-h-[400px]"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
