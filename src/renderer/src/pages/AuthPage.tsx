import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Moon, Sun, Github, Globe, Mail, Lock } from 'lucide-react'
import { authApi } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../contexts/ThemeContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import loginImage from '../assets/login-page-image.jpg'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const schema = z.object({
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
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const emailValue = watch('email', '')
  const isEmailValid = EMAIL_RE.test(emailValue ?? '')

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
    <div className="flex h-full">
      {/* Left panel — framed image */}
      <div className="relative w-1/2 shrink-0 bg-background">
        <div className="absolute inset-5 overflow-hidden rounded-2xl">
          <img
            src={loginImage}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20" />

          {/* Theme toggle — bottom-left inside the image */}
          <div className="absolute bottom-4 left-4">
            <button
              onClick={toggleTheme}
              title="Alternar tema"
              className="text-white/80 drop-shadow-lg transition-transform duration-200 hover:scale-125 hover:text-white"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-y-auto bg-background px-8 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <p
              className="font-brand text-6xl"
              style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
            >
              laudor
            </p>
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
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      className="pl-9"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••"
                      className="pl-9"
                      {...register('password')}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>

                {error && <p className="text-xs text-destructive">{error}</p>}

                <Button type="submit" className="w-full" disabled={loading || !isEmailValid}>
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

        {/* Social links — bottom-right */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">made by mlziade</span>
          <a
            href="https://github.com/mlziade"
            target="_blank"
            rel="noreferrer"
            title="GitHub"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Github size={15} />
          </a>
          <a
            href="https://mlziade.com.br/"
            target="_blank"
            rel="noreferrer"
            title="Website"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Globe size={15} />
          </a>
        </div>
      </div>
    </div>
  )
}
