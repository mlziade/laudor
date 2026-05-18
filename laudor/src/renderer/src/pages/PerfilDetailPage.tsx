import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { perfisApi } from '../lib/api'
import type { CreatePerfilInput } from '../types'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Separator } from '../components/ui/separator'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  fullName: z.string().optional(),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().max(2, 'UF deve ter 2 caracteres').optional()
})

type FormData = z.infer<typeof schema>

export default function PerfilDetailPage(): React.JSX.Element {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (isNew || !user || !id) return
    perfisApi.list(user.id).then((perfis) => {
      const perfil = perfis.find((p) => p.id === id)
      if (perfil) reset(perfil as FormData)
    })
  }, [id, isNew, user, reset])

  async function onSubmit(data: FormData): Promise<void> {
    if (!user) return
    setError(null)
    setLoading(true)
    try {
      const payload: CreatePerfilInput = {
        ...data,
        email: data.email || undefined
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
    <div className="max-w-2xl space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/console/perfis')}>
        <ArrowLeft size={16} />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{isNew ? 'Novo Perfil' : 'Editar Perfil'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do perfil *</Label>
              <Input id="name" {...register('name')} placeholder="Ex: Meu perfil principal" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" {...register('description')} rows={2} />
            </div>

            <Separator />
            <p className="text-sm font-medium text-muted-foreground">Dados Pessoais</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input id="fullName" {...register('fullName')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" {...register('cpf')} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rg">RG</Label>
                <Input id="rg" {...register('rg')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" {...register('phone')} placeholder="(00) 00000-0000" />
              </div>
            </div>

            <Separator />
            <p className="text-sm font-medium text-muted-foreground">Endereço</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" {...register('cep')} placeholder="00000-000" />
              </div>
              <div className="space-y-2">
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
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" {...register('cidade')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">UF</Label>
                <Input id="estado" {...register('estado')} maxLength={2} placeholder="SP" />
                {errors.estado && (
                  <p className="text-xs text-destructive">{errors.estado.message}</p>
                )}
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
                onClick={() => navigate('/console/perfis')}
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
