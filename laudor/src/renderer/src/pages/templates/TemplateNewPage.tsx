import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { templatesApi } from '../../lib/api'
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

export default function TemplateNewPage(): React.JSX.Element {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [fileBuffer, setFileBuffer] = useState<Buffer | null>(null)
  const [fileName, setFileName] = useState('')
  const [parsedTags, setParsedTags] = useState<string[]>([])
  const [fields, setFields] = useState<FieldEditor[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'upload' | 'configure'>('upload')

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    if (!file || !user) return

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    setFileBuffer(buffer)
    setFileName(file.name)

    try {
      const tags = await templatesApi.parseTags(buffer)
      setParsedTags(tags)
      setFields(
        tags.map((tag) => ({
          key: tag,
          label: tag,
          type: 'text',
          required: true
        }))
      )
      setStep('configure')
    } catch {
      setError('Não foi possível ler as tags do arquivo.')
    }
  }

  function updateField(index: number, patch: Partial<FieldEditor>): void {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  function addField(): void {
    setFields((prev) => [
      ...prev,
      { key: '', label: '', type: 'text', required: false }
    ])
  }

  function removeField(index: number): void {
    setFields((prev) => prev.filter((_, i) => i !== index))
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
        options:
          f.type === 'dropdown' && f._optionsText
            ? f._optionsText.split('\n').map((o) => o.trim()).filter(Boolean)
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
    <div className="max-w-3xl space-y-4">
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
              <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 text-center hover:bg-accent transition-colors">
                <Upload size={32} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Clique para selecionar um arquivo .docx
                </span>
                <span className="text-xs text-muted-foreground">
                  As tags no formato {'{{'} {'campo'} {'}'} {'}'} serão detectadas automaticamente
                </span>
                <input
                  type="file"
                  accept=".docx"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurar Campos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do template *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                />
              </div>

              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground">Tags detectadas:</span>
                {parsedTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="font-mono text-xs">
                    {'{{'}{tag}{'}}'}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Campos ({fields.length})</CardTitle>
              <Button size="sm" variant="outline" onClick={addField}>
                <Plus size={14} />
                Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={index} className="rounded-md border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">
                      {field.key || 'sem chave'}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-destructive"
                      onClick={() => removeField(index)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Chave (tag)</Label>
                      <Input
                        value={field.key}
                        onChange={(e) => updateField(index, { key: e.target.value })}
                        className="h-8 font-mono text-xs"
                        placeholder="nome_campo"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Rótulo</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                        className="h-8"
                        placeholder="Nome do campo"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo</Label>
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
                      <Label className="text-xs">Pré-preencher de</Label>
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

                  {field.type === 'dropdown' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Opções (uma por linha)</Label>
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
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button onClick={() => handleSave('PUBLISHED')} disabled={loading}>
              {loading ? 'Salvando...' : 'Publicar Template'}
            </Button>
            <Button variant="outline" onClick={() => handleSave('DRAFT')} disabled={loading}>
              Salvar como Rascunho
            </Button>
            <Button variant="ghost" onClick={() => setStep('upload')}>
              Voltar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
