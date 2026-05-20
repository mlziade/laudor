import { ipcMain } from 'electron'
import { getDb } from '../db'

function toUserDTO(user: {
  id: string
  email: string
  isAdmin: boolean
  createdAt: Date
  updatedAt: Date
}): object {
  return {
    id: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  }
}

export function registerUsersHandlers(): void {
  ipcMain.handle('users:list', async (_, callerId: string) => {
    const db = getDb()
    const caller = await db.user.findUnique({ where: { id: callerId } })
    if (!caller?.isAdmin) throw new Error('Acesso negado')

    const users = await db.user.findMany({ orderBy: { createdAt: 'asc' } })
    return users.map(toUserDTO)
  })

  ipcMain.handle('users:toggleAdmin', async (_, callerId: string, targetId: string) => {
    const db = getDb()
    const caller = await db.user.findUnique({ where: { id: callerId } })
    if (!caller?.isAdmin) throw new Error('Acesso negado')
    if (callerId === targetId) throw new Error('Não pode alterar a si mesmo')

    const target = await db.user.findUnique({ where: { id: targetId } })
    if (!target) throw new Error('Usuário não encontrado')

    const updated = await db.user.update({
      where: { id: targetId },
      data: { isAdmin: !target.isAdmin }
    })
    return toUserDTO(updated)
  })

  ipcMain.handle('users:delete', async (_, callerId: string, targetId: string) => {
    const db = getDb()
    const caller = await db.user.findUnique({ where: { id: callerId } })
    if (!caller?.isAdmin) throw new Error('Acesso negado')
    if (callerId === targetId) throw new Error('Não pode deletar a si mesmo')

    await db.user.delete({ where: { id: targetId } })
  })
}
