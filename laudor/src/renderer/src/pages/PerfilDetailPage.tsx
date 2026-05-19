import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Camera, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { perfisApi } from '../lib/api'
import { maskCPF, maskCEP, maskPhone } from '../lib/masks'
import { validateCPF, validateLandline, validateCellphone } from '../lib/validators'
import type { CreatePerfilInput, PerfilCustomField } from '../types'
import { ESTADOS_BR } from '../data/estados'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { MaskedInput } from '../components/ui/masked-input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Separator } from '../components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select'
import { Avatar } from '../components/ui/avatar'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  cpf: z
    .string()
    .optional()
    .refine((v) => !v || validateCPF(v), 'CPF inválido'),
  rg: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      'Email inválido'
    ),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || validateLandline(v), 'Telefone fixo inválido'),
  cellphone: z
    .string()
    .optional()
    .refine((v) => !v || validateCellphone(v), 'Celular inválido'),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional()
})

type FormData = z.infer<typeof schema>

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

async function resizeToBase64(file: File, maxSize = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = reject
    img.src = url
  })
}

export default function PerfilDetailPage(): React.JSX.Element {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  const fileRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [picture, setPicture] = useState<string | null>(null)
  const [customFields, setCustomFields] = useState<PerfilCustomField[]>([])

  const [cpfMasked, setCpfMasked] = useState('')
  const [phoneMasked, setPhoneMasked] = useState('')
  const [cellphoneMasked, setCellphoneMasked] = useState('')
  const [cepMasked, setCepMasked] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const estadoValue = watch('estado')

  useEffect(() => {
    if (isNew || !user || !id) return
    perfisApi.list(user.id).then((perfis) => {
      const perfil = perfis.find((p) => p.id === id)
      if (!perfil) return
      reset({
        name: perfil.name,
        description: perfil.description ?? undefined,
        firstName: perfil.firstName ?? undefined,
        lastName: perfil.lastName ?? undefined,
        cpf: perfil.cpf ?? undefined,
        rg: perfil.rg ?? undefined,
        email: perfil.email ?? undefined,
        phone: perfil.phone ?? undefined,
        cellphone: perfil.cellphone ?? undefined,
        cep: perfil.cep ?? undefined,
        logradouro: perfil.logradouro ?? undefined,
        numero: perfil.numero ?? undefined,
        complemento: perfil.complemento ?? undefined,
        bairro: perfil.bairro ?? undefined,
        cidade: perfil.cidade ?? undefined,
        estado: perfil.estado ?? undefined
      })
      setPicture(perfil.picture ?? null)
      setCustomFields(perfil.customFields ?? [])
      setCpfMasked(maskCPF(perfil.cpf ?? ''))
      setPhoneMasked(maskPhone(perfil.phone ?? ''))
      setCellphoneMasked(maskPhone(perfil.cellphone ?? ''))
      setCepMasked(maskCEP(perfil.cep ?? ''))
    })
  }, [id, isNew, user, reset])

  async function handlePictureChange(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const b64 = await resizeToBase64(file)
      setPicture(b64)
    } catch {
      setError('Não foi possível processar a imagem.')
    }
  }

  function addCustomField(): void {
    setCustomFields((prev) => [...prev, { key: '', label: '', value: '' }])
  }

  function updateCustomField(index: number, patch: Partial<PerfilCustomField>): void {
    setCustomFields((prev) =>
      prev.map((f, i) => {
        if (i !== index) return f
        const updated = { ...f, ...patch }
        if (patch.label !== undefined) {
          updated.key = slugify(patch.label)
        }
        return updated
      })
    )
  }

  function removeCustomField(index: number): void {
    setCustomFields((prev) => prev.filter((_, i) => i !== index))
  }

  async function onSubmit(data: FormData): Promise<void> {
    if (!user) return
    setError(null)
    setLoading(true)
    try {
      const payload: CreatePerfilInput & { picture?: string } = {
        ...data,
        email: data.email || undefined,
        picture: picture ?? undefined,
        customFields: customFields.filter((f) => f.label.trim())
      }
      if (isNew) {
        await perfisApi.create(user.id, payload)
      } else {
        await perfisApi.update(user.id, id!, payload)
      }
      navigate('/console/perfis')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/console/perfis')}>
        <ArrowLeft size={16} />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{isNew ? 'Novo Perfil' : 'Editar Perfil'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Picture + identity */}
            <div className="flex items-start gap-6">
              <div className="flex flex-col items-center gap-2">
                <Avatar src={picture} size="lg" />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera size={14} />
                  {picture ? 'Alterar' : 'Adicionar'}
                </Button>
                {picture && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setPicture(null)}
                  >
                    Remover
                  </Button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePictureChange}
                />
              </div>

              <div className="flex-1 grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="name">Nome do perfil *</Label>
                  <Input id="name" {...register('name')} placeholder="Ex: Meu perfil principal" />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2 row-span-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea id="description" {...register('description')} rows={4} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstName">Primeiro nome</Label>
                  <Input id="firstName" {...register('firstName')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Sobrenome</Label>
                  <Input id="lastName" {...register('lastName')} />
                </div>
              </div>
            </div>

            <Separator />
            <p className="text-sm font-medium text-muted-foreground">Dados Pessoais</p>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <MaskedInput
                  id="cpf"
                  mask={maskCPF}
                  value={cpfMasked}
                  placeholder="000.000.000-00"
                  onChange={(masked, raw) => {
                    setCpfMasked(masked)
                    setValue('cpf', raw, { shouldValidate: true })
                  }}
                />
                {errors.cpf && <p className="text-xs text-destructive">{errors.cpf.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="rg">RG</Label>
                <Input id="rg" {...register('rg')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone fixo</Label>
                <MaskedInput
                  id="phone"
                  mask={maskPhone}
                  value={phoneMasked}
                  placeholder="(00) 0000-0000"
                  onChange={(masked, raw) => {
                    setPhoneMasked(masked)
                    setValue('phone', raw, { shouldValidate: true })
                  }}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cellphone">Celular</Label>
                <MaskedInput
                  id="cellphone"
                  mask={maskPhone}
                  value={cellphoneMasked}
                  placeholder="(00) 90000-0000"
                  onChange={(masked, raw) => {
                    setCellphoneMasked(masked)
                    setValue('cellphone', raw, { shouldValidate: true })
                  }}
                />
                {errors.cellphone && (
                  <p className="text-xs text-destructive">{errors.cellphone.message}</p>
                )}
              </div>
            </div>

            <Separator />
            <p className="text-sm font-medium text-muted-foreground">Endereço</p>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <MaskedInput
                  id="cep"
                  mask={maskCEP}
                  value={cepMasked}
                  placeholder="00000-000"
                  onChange={(masked, raw) => {
                    setCepMasked(masked)
                    setValue('cep', raw, { shouldValidate: true })
                  }}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="logradouro">Logradouro</Label>
                <Input id="logradouro" {...register('logradouro')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input id="numero" {...register('numero')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input id="complemento" {...register('complemento')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input id="bairro" {...register('bairro')} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" {...register('cidade')} />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Select value={estadoValue ?? ''} onValueChange={(v) => setValue('estado', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BR.map((e) => (
                      <SelectItem key={e.sigla} value={e.sigla}>
                        {e.sigla} — {e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Campos Personalizados</p>
              <Button type="button" size="sm" variant="outline" onClick={addCustomField}>
                <Plus size={14} />
                Adicionar campo
              </Button>
            </div>

            {customFields.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum campo personalizado.</p>
            ) : (
              <div className="space-y-3">
                {customFields.map((field, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Rótulo</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => updateCustomField(index, { label: e.target.value })}
                        placeholder="Ex: OAB, CRM..."
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor</Label>
                      <Input
                        value={field.value}
                        onChange={(e) => updateCustomField(index, { value: e.target.value })}
                        className="h-8"
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeCustomField(index)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/console/perfis')}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
