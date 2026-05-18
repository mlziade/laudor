import { ipcMain } from 'electron'
import { getDb } from '../db'
import type { Prisma } from '@prisma/client'

type PerfilRecord = Prisma.PerfilGetPayload<Record<string, never>>

interface PerfilInput {
  name: string
  description?: string
  tags?: string[]
  fullName?: string
  cpf?: string
  rg?: string
  email?: string
  phone?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
}

function toDTO(p: PerfilRecord): object {
  return {
    ...p,
    tags: JSON.parse(p.tags) as string[],
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString()
  }
}

export function registerPerfisHandlers(): void {
  ipcMain.handle('perfis:list', async (_, userId: string) => {
    const db = getDb()
    const perfis = await db.perfil.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })
    return perfis.map(toDTO)
  })

  ipcMain.handle('perfis:create', async (_, userId: string, data: PerfilInput) => {
    const db = getDb()
    const { tags, ...rest } = data
    const perfil = await db.perfil.create({
      data: {
        ...rest,
        userId,
        tags: JSON.stringify(tags ?? [])
      }
    })
    return toDTO(perfil)
  })

  ipcMain.handle(
    'perfis:update',
    async (_, userId: string, id: string, data: Partial<PerfilInput>) => {
      const db = getDb()
      const existing = await db.perfil.findUnique({ where: { id } })
      if (!existing || existing.userId !== userId) throw new Error('Perfil não encontrado')

      const { tags, ...rest } = data
      const perfil = await db.perfil.update({
        where: { id },
        data: {
          ...rest,
          ...(tags !== undefined && { tags: JSON.stringify(tags) })
        }
      })
      return toDTO(perfil)
    }
  )

  ipcMain.handle('perfis:delete', async (_, userId: string, id: string) => {
    const db = getDb()
    const existing = await db.perfil.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) throw new Error('Perfil não encontrado')
    await db.perfil.delete({ where: { id } })
  })
}
