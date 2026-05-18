import { useEffect, useState } from 'react'
import { ShieldCheck, ShieldOff, Trash2, Users } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { usersApi } from '../../lib/api'
import type { UserDTO } from '../../types'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { formatDate } from '../../lib/utils'

export default function AdminUsersPage(): React.JSX.Element {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserDTO[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.isAdmin) return
    usersApi
      .list(user.id)
      .then(setUsers)
      .finally(() => setLoading(false))
  }, [user])

  async function handleToggleAdmin(targetId: string): Promise<void> {
    if (!user) return
    const updated = await usersApi.toggleAdmin(user.id, targetId)
    setUsers((prev) => prev.map((u) => (u.id === targetId ? updated : u)))
  }

  async function handleDelete(targetId: string): Promise<void> {
    if (!user) return
    if (!confirm('Confirma a exclusão deste usuário?')) return
    await usersApi.delete(user.id, targetId)
    setUsers((prev) => prev.filter((u) => u.id !== targetId))
  }

  if (!user?.isAdmin) {
    return <p className="text-sm text-destructive">Acesso negado.</p>
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Usuários</CardTitle>
          <Users size={20} className="text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium text-sm">{u.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Criado em {formatDate(u.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.isAdmin && (
                      <Badge variant="default">Admin</Badge>
                    )}
                    {u.id !== user.id && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          title={u.isAdmin ? 'Remover admin' : 'Tornar admin'}
                          onClick={() => handleToggleAdmin(u.id)}
                        >
                          {u.isAdmin ? (
                            <ShieldOff size={16} />
                          ) : (
                            <ShieldCheck size={16} />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(u.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
