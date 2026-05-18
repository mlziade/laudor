import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, User } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { perfisApi } from '../lib/api'
import type { PerfilDTO } from '../types'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { formatDate } from '../lib/utils'

export default function PerfisPage(): React.JSX.Element {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [perfis, setPerfis] = useState<PerfilDTO[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    perfisApi
      .list(user.id)
      .then(setPerfis)
      .finally(() => setLoading(false))
  }, [user])

  async function handleDelete(id: string): Promise<void> {
    if (!user) return
    if (!confirm('Confirma a exclusão deste perfil?')) return
    await perfisApi.delete(user.id, id)
    setPerfis((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{perfis.length} perfil(s)</p>
        <Button onClick={() => navigate('/console/perfis/new')}>
          <Plus size={16} />
          Novo Perfil
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : perfis.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12">
            <User size={40} className="text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum perfil cadastrado.</p>
            <Button onClick={() => navigate('/console/perfis/new')}>
              <Plus size={16} />
              Criar perfil
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {perfis.map((perfil) => (
            <Card key={perfil.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardContent className="flex items-center justify-between p-4">
                <div onClick={() => navigate(`/console/perfis/${perfil.id}`)}>
                  <p className="font-medium">{perfil.name}</p>
                  {perfil.fullName && (
                    <p className="text-sm text-muted-foreground">{perfil.fullName}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Criado em {formatDate(perfil.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => navigate(`/console/perfis/${perfil.id}`)}
                  >
                    <Pencil size={16} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(perfil.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
