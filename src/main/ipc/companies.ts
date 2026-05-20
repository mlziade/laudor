import { ipcMain } from 'electron'
import { getDb } from '../db'
import type { Prisma } from '@prisma/client'

type CompanyRecord = Prisma.CompanyGetPayload<Record<string, never>>

interface CompanyInput {
  name: string
  description?: string
  tags?: string[]
  razaoSocial?: string
  nomeFantasia?: string
  cnpj?: string
  inscricaoEstadual?: string
  inscricaoMunicipal?: string
  email?: string
  telefone?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  representante?: string
}

function toDTO(c: CompanyRecord): object {
  return {
    ...c,
    tags: JSON.parse(c.tags) as string[],
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString()
  }
}

export function registerCompaniesHandlers(): void {
  ipcMain.handle('companies:list', async (_, userId: string) => {
    const db = getDb()
    const companies = await db.company.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })
    return companies.map(toDTO)
  })

  ipcMain.handle('companies:create', async (_, userId: string, data: CompanyInput) => {
    const db = getDb()
    const { tags, ...rest } = data
    const company = await db.company.create({
      data: {
        ...rest,
        userId,
        tags: JSON.stringify(tags ?? [])
      }
    })
    return toDTO(company)
  })

  ipcMain.handle(
    'companies:update',
    async (_, userId: string, id: string, data: Partial<CompanyInput>) => {
      const db = getDb()
      const existing = await db.company.findUnique({ where: { id } })
      if (!existing || existing.userId !== userId) throw new Error('Empresa não encontrada')

      const { tags, ...rest } = data
      const company = await db.company.update({
        where: { id },
        data: {
          ...rest,
          ...(tags !== undefined && { tags: JSON.stringify(tags) })
        }
      })
      return toDTO(company)
    }
  )

  ipcMain.handle('companies:delete', async (_, userId: string, id: string) => {
    const db = getDb()
    const existing = await db.company.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) throw new Error('Empresa não encontrada')
    await db.company.delete({ where: { id } })
  })
}
