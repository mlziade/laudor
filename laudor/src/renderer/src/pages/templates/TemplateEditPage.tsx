import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { templatesApi } from '../../lib/api'
import type { FieldSchema, FieldType, DefaultFromSource, TemplateStatus } from '../../types'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
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

export default function TemplateEditPage(): React.JSX.Element {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState<TemplateStatus>('DRAFT')
  const [fields, setFields] = useState<FieldEditor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !id) return
    templatesApi.get(user.id, id).then((template) => {
      setName(template.name)
      setDescription(template.description ?? '')
      setCategory(template.category ?? '')
      setStatus(template.status)
      setFields(
        template.fields.map((f) => ({
          ...f,
          _optionsText: f.options?.join('\n')
        }))
      )
      setLoading(false)
    })
  }, [id, user])

  function updateField(index: number, patch: Partial<FieldEditor>): void {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  function addField(): void {
    setFields((prev) => [...prev, { key: '', label: '', type: 'text', required: false }])
  }

  function removeField(index: number): void {
    setFields((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave(): Promise<void> {
    if (!user || !id) return
    setError(null)
    setSaving(true)
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

      await templatesApi.update(user.id, id, {
        name,
        description: description || undefined,
        category: category || undefined,
        fields: processedFields
      })
      await templatesApi.setStatus(user.id, id, status)
      navigate('/console/templates')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>

  return (
    <div className="max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/console/templates')}>
        <ArrowLeft size={16} />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Editar Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as TemplateStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Rascunho</SelectItem>
                  <SelectItem value="PUBLISHED">Publicado</SelectItem>
                  <SelectItem value="ARCHIVED">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
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
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Rótulo</Label>
                  <Input
                    value={field.label}
                    onChange={(e) => updateField(index, { label: e.target.value })}
                    className="h-8"
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
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`req-${index}`}
                  checked={field.required}
                  onChange={(e) => updateField(index, { required: e.target.checked })}
                />
                <Label htmlFor={`req-${index}`} className="text-xs cursor-pointer">
                  Obrigatório
                </Label>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
        <Button variant="outline" onClick={() => navigate('/console/templates')}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
