import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

const schema = z
  .object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Mínimo 6 caracteres')
  })

type FormData = z.infer<typeof schema>

export default function AuthPage(): React.JSX.Element {
  const [isFirstRun, setIsFirstRun] = useState(false)
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { setUser } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    authApi.checkFirstRun().then((isFirst) => {
      setIsFirstRun(isFirst)
      if (isFirst) setIsRegisterMode(true)
    })
  }, [])

  async function onSubmit(data: FormData): Promise<void> {
    setError(null)
    setLoading(true)
    try {
      if (isRegisterMode) {
        const user = await authApi.register(data.email, data.password)
        setUser(user)
        navigate('/console')
      } else {
        const user = await authApi.login(data.email, data.password)
        if (!user) {
          setError('Email ou senha incorretos')
          return
        }
        setUser(user)
        navigate('/console')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  const title = isRegisterMode
    ? isFirstRun
      ? 'Criar conta de administrador'
      : 'Criar conta'
    : 'Entrar'

  const description = isRegisterMode
    ? isFirstRun
      ? 'Este é o primeiro acesso. Crie a conta principal.'
      : 'Preencha os dados para criar uma nova conta.'
    : 'Entre com seu email e senha.'

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30">
      <div className="w-full max-w-md space-y-6 px-4">
        <div className="text-center">
          <h1 className="font-brand text-4xl font-bold tracking-tight text-primary">Laudor</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gerador de laudos e documentos
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Aguarde...' : isRegisterMode ? 'Criar conta' : 'Entrar'}
              </Button>
            </form>

            {!isFirstRun && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode((prev) => !prev)
                    setError(null)
                  }}
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  {isRegisterMode ? 'Já tenho uma conta' : 'Criar nova conta'}
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
