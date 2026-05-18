import { ipcMain } from 'electron'
import { getDb } from '../db'
import type { Prisma } from '@prisma/client'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import mammoth from 'mammoth'

type TemplateRecord = Prisma.TemplateGetPayload<Record<string, never>>

interface CreateTemplateInput {
  name: string
  description?: string
  category?: string
  fileContent: Buffer
  fileName: string
  fields: unknown[]
  isPublic?: boolean
}

interface UpdateTemplateInput {
  name?: string
  description?: string
  category?: string
  fields?: unknown[]
  isPublic?: boolean
}

function toDTO(t: TemplateRecord, includeContent = false): object {
  const base = {
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    fileName: t.fileName,
    fields: JSON.parse(t.fields) as unknown[],
    status: t.status,
    ownerId: t.ownerId,
    isPublic: t.isPublic,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString()
  }
  if (includeContent) {
    return { ...base, fileContent: t.fileContent }
  }
  return base
}

function canAccess(t: TemplateRecord, userId: string): boolean {
  return t.ownerId === userId || t.isPublic
}

export function registerTemplatesHandlers(): void {
  ipcMain.handle('templates:list', async (_, userId: string, statusFilter?: string) => {
    const db = getDb()
    const where: Prisma.TemplateWhereInput = { ownerId: userId }
    if (statusFilter) where.status = statusFilter

    const templates = await db.template.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        fileName: true,
        fields: true,
        status: true,
        ownerId: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true
      }
    })
    return templates.map((t) =>
      toDTO(
        { ...t, fileContent: Buffer.alloc(0) } as TemplateRecord,
        false
      )
    )
  })

  ipcMain.handle('templates:get', async (_, userId: string, id: string) => {
    const db = getDb()
    const template = await db.template.findUnique({ where: { id } })
    if (!template) throw new Error('Template não encontrado')
    if (!canAccess(template, userId)) throw new Error('Acesso negado')
    return toDTO(template, true)
  })

  ipcMain.handle('templates:parseTags', async (_, fileBuffer: Buffer) => {
    const zip = new PizZip(fileBuffer)
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
    const fullText = doc.getFullText()
    const matches = fullText.match(/\{\{([^}]+)\}\}/g) ?? []
    const tags = [...new Set(matches.map((m) => m.replace(/^\{\{|\}\}$/g, '').trim()))]
    return tags
  })

  ipcMain.handle('templates:create', async (_, userId: string, data: CreateTemplateInput) => {
    const db = getDb()
    const template = await db.template.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        fileContent: data.fileContent,
        fileName: data.fileName,
        fields: JSON.stringify(data.fields ?? []),
        isPublic: data.isPublic ?? false,
        ownerId: userId
      }
    })
    return toDTO(template, false)
  })

  ipcMain.handle(
    'templates:update',
    async (_, userId: string, id: string, data: UpdateTemplateInput) => {
      const db = getDb()
      const existing = await db.template.findUnique({ where: { id } })
      if (!existing || existing.ownerId !== userId) throw new Error('Template não encontrado')

      const template = await db.template.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.category !== undefined && { category: data.category }),
          ...(data.fields !== undefined && { fields: JSON.stringify(data.fields) }),
          ...(data.isPublic !== undefined && { isPublic: data.isPublic })
        }
      })
      return toDTO(template, false)
    }
  )

  ipcMain.handle(
    'templates:setStatus',
    async (_, userId: string, id: string, status: string) => {
      const db = getDb()
      const existing = await db.template.findUnique({ where: { id } })
      if (!existing || existing.ownerId !== userId) throw new Error('Template não encontrado')

      const template = await db.template.update({
        where: { id },
        data: { status }
      })
      return toDTO(template, false)
    }
  )

  ipcMain.handle('templates:delete', async (_, userId: string, id: string) => {
    const db = getDb()
    const existing = await db.template.findUnique({ where: { id } })
    if (!existing || existing.ownerId !== userId) throw new Error('Template não encontrado')
    await db.template.delete({ where: { id } })
  })

  ipcMain.handle('templates:getPreviewHtml', async (_, userId: string, id: string) => {
    const db = getDb()
    const template = await db.template.findUnique({ where: { id } })
    if (!template) throw new Error('Template não encontrado')
    if (!canAccess(template, userId)) throw new Error('Acesso negado')

    const result = await mammoth.convertToHtml({ buffer: template.fileContent })
    return result.value
  })
}
