import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { companiesApi } from '../lib/api'
import { maskCNPJ, maskCEP, maskPhone } from '../lib/masks'
import { validateCNPJ, validatePhone } from '../lib/validators'
import type { CreateCompanyInput } from '../types'
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

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  razaoSocial: z.string().optional(),
  nomeFantasia: z.string().optional(),
  cnpj: z
    .string()
    .optional()
    .refine((v) => !v || validateCNPJ(v), 'CNPJ inválido'),
  inscricaoEstadual: z.string().optional(),
  inscricaoMunicipal: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z
    .string()
    .optional()
    .refine((v) => !v || validatePhone(v), 'Telefone inválido'),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  representante: z.string().optional()
})

type FormData = z.infer<typeof schema>

export default function CompanyDetailPage(): React.JSX.Element {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [cnpjMasked, setCnpjMasked] = useState('')
  const [phoneMasked, setPhoneMasked] = useState('')
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
    companiesApi.list(user.id).then((companies) => {
      const company = companies.find((c) => c.id === id)
      if (!company) return
      reset(company as FormData)
      setCnpjMasked(maskCNPJ(company.cnpj ?? ''))
      setPhoneMasked(maskPhone(company.telefone ?? ''))
      setCepMasked(maskCEP(company.cep ?? ''))
    })
  }, [id, isNew, user, reset])

  async function onSubmit(data: FormData): Promise<void> {
    if (!user) return
    setError(null)
    setLoading(true)
    try {
      const payload: CreateCompanyInput = { ...data, email: data.email || undefined }
      if (isNew) {
        await companiesApi.create(user.id, payload)
      } else {
        await companiesApi.update(user.id, id!, payload)
      }
      navigate('/console/companies')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/console/companies')}>
        <ArrowLeft size={16} />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{isNew ? 'Nova Empresa' : 'Editar Empresa'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Display name + description */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="name">Nome de exibição *</Label>
                <Input id="name" {...register('name')} placeholder="Ex: Empresa Principal" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2 row-span-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" {...register('description')} rows={4} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="representante">Representante Legal</Label>
                <Input id="representante" {...register('representante')} />
              </div>
            </div>

            <Separator />
            <p className="text-sm font-medium text-muted-foreground">Dados da Empresa</p>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="razaoSocial">Razão Social</Label>
                <Input id="razaoSocial" {...register('razaoSocial')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                <Input id="nomeFantasia" {...register('nomeFantasia')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <MaskedInput
                  id="cnpj"
                  mask={maskCNPJ}
                  value={cnpjMasked}
                  placeholder="00.000.000/0000-00"
                  rawValue={(masked) => masked.replace(/[.\-\/]/g, '')}
                  onChange={(masked, raw) => {
                    setCnpjMasked(masked)
                    setValue('cnpj', raw, { shouldValidate: true })
                  }}
                />
                {errors.cnpj && (
                  <p className="text-xs text-destructive">{errors.cnpj.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="inscricaoEstadual">Inscrição Estadual</Label>
                <Input id="inscricaoEstadual" {...register('inscricaoEstadual')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inscricaoMunicipal">Inscrição Municipal</Label>
                <Input id="inscricaoMunicipal" {...register('inscricaoMunicipal')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <MaskedInput
                  id="telefone"
                  mask={maskPhone}
                  value={phoneMasked}
                  placeholder="(00) 00000-0000"
                  onChange={(masked, raw) => {
                    setPhoneMasked(masked)
                    setValue('telefone', raw, { shouldValidate: true })
                  }}
                />
                {errors.telefone && (
                  <p className="text-xs text-destructive">{errors.telefone.message}</p>
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

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/console/companies')}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
