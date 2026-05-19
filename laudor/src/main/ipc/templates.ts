import { ipcMain, BrowserWindow, app } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { getDb } from '../db'
import type { Prisma } from '@prisma/client'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import mammoth from 'mammoth'
import fs from 'fs'
import path from 'path'

const execFileAsync = promisify(execFile)

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

async function convertViaWord(docxPath: string, pdfPath: string): Promise<void> {
  const d = docxPath.replace(/\\/g, '/')
  const p = pdfPath.replace(/\\/g, '/')
  const script = [
    '$word = New-Object -ComObject Word.Application',
    '$word.Visible = $false',
    '$word.DisplayAlerts = 0',
    `$doc = $word.Documents.Open("${d}")`,
    `$doc.ExportAsFixedFormat("${p}", 17)`,
    '$doc.Close($false)',
    '$word.Quit()'
  ].join('\r\n')
  const scriptPath = `${docxPath}.ps1`
  fs.writeFileSync(scriptPath, script, 'utf-8')
  try {
    await execFileAsync('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath
    ], { timeout: 30000 })
  } finally {
    try { fs.unlinkSync(scriptPath) } catch { /* ignore */ }
  }
}

async function convertViaMammoth(buf: Buffer): Promise<Buffer> {
  const { value: bodyHtml } = await mammoth.convertToHtml({ buffer: buf })
  const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; padding: 2.54cm 3cm; color: #000; background: #fff; }
p { margin-bottom: 6pt; }
h1 { font-size: 16pt; font-weight: bold; margin: 12pt 0 6pt; }
h2 { font-size: 14pt; font-weight: bold; margin: 10pt 0 4pt; }
h3 { font-size: 12pt; font-weight: bold; margin: 8pt 0 4pt; }
table { border-collapse: collapse; width: 100%; margin-bottom: 8pt; }
td, th { border: 1px solid #000; padding: 3pt 6pt; font-size: 11pt; }
th { background: #f0f0f0; font-weight: bold; }
ul, ol { padding-left: 20pt; margin-bottom: 6pt; }
li { margin-bottom: 2pt; }
strong, b { font-weight: bold; }
em, i { font-style: italic; }
img { max-width: 100%; }
</style></head><body>${bodyHtml}</body></html>`
  const tmpHtml = path.join(app.getPath('temp'), `laudor-preview-${Date.now()}.html`)
  fs.writeFileSync(tmpHtml, fullHtml, 'utf-8')
  const win = new BrowserWindow({ show: false, width: 1024, height: 768 })
  try {
    await win.loadFile(tmpHtml)
    return await win.webContents.printToPDF({ printBackground: false, pageSize: 'A4', margins: { marginType: 'default' } })
  } finally {
    win.destroy()
    try { fs.unlinkSync(tmpHtml) } catch { /* ignore */ }
  }
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

  ipcMain.handle('templates:parseTags', async (_, fileBuffer: Buffer | Uint8Array) => {
    const buf = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer)
    const zip = new PizZip(buf)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' }
    })
    const fullText = doc.getFullText()
    const matches = fullText.match(/\{\{([^}]+)\}\}/g) ?? []
    const tags = [...new Set(matches.map((m) => m.replace(/^\{\{|\}\}$/g, '').trim()))]
    return tags
  })

  ipcMain.handle('templates:previewHtmlFromBuffer', async (_, fileBuffer: Buffer | Uint8Array) => {
    const buf = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer)
    const result = await mammoth.convertToHtml({ buffer: buf })
    return result.value
  })

  ipcMain.handle('templates:toPdfFromBuffer', async (_, fileBuffer: Buffer | Uint8Array) => {
    const buf = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer)
    const base = path.join(app.getPath('temp'), `laudor-${Date.now()}`)
    const tmpDocx = `${base}.docx`
    const tmpPdf = `${base}.pdf`

    fs.writeFileSync(tmpDocx, buf)
    try {
      await convertViaWord(tmpDocx, tmpPdf)
      return fs.readFileSync(tmpPdf)
    } catch {
      return await convertViaMammoth(buf)
    } finally {
      try { fs.unlinkSync(tmpDocx) } catch { /* ignore */ }
      try { fs.unlinkSync(tmpPdf) } catch { /* ignore */ }
    }
  })

  ipcMain.handle('templates:toPdf', async (_, userId: string, id: string) => {
    const db = getDb()
    const template = await db.template.findUnique({ where: { id } })
    if (!template) throw new Error('Template não encontrado')
    if (!canAccess(template, userId)) throw new Error('Acesso negado')

    const base = path.join(app.getPath('temp'), `laudor-${Date.now()}`)
    const tmpDocx = `${base}.docx`
    const tmpPdf = `${base}.pdf`

    fs.writeFileSync(tmpDocx, template.fileContent)
    try {
      await convertViaWord(tmpDocx, tmpPdf)
      return fs.readFileSync(tmpPdf)
    } catch {
      return await convertViaMammoth(template.fileContent)
    } finally {
      try { fs.unlinkSync(tmpDocx) } catch { /* ignore */ }
      try { fs.unlinkSync(tmpPdf) } catch { /* ignore */ }
    }
  })

  ipcMain.handle(
    'templates:filledPdf',
    async (_, userId: string, id: string, values: Record<string, string>) => {
      const db = getDb()
      const template = await db.template.findUnique({ where: { id } })
      if (!template) throw new Error('Template não encontrado')
      if (!canAccess(template, userId)) throw new Error('Acesso negado')

      const zip = new PizZip(template.fileContent)
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' }
      })
      doc.render(values)
      const filledBuf = Buffer.from(doc.getZip().generate({ type: 'nodebuffer' }))

      const base = path.join(app.getPath('temp'), `laudor-filled-${Date.now()}`)
      const tmpDocx = `${base}.docx`
      const tmpPdf = `${base}.pdf`

      fs.writeFileSync(tmpDocx, filledBuf)
      try {
        await convertViaWord(tmpDocx, tmpPdf)
        return fs.readFileSync(tmpPdf)
      } catch {
        return await convertViaMammoth(filledBuf)
      } finally {
        try { fs.unlinkSync(tmpDocx) } catch { /* ignore */ }
        try { fs.unlinkSync(tmpPdf) } catch { /* ignore */ }
      }
    }
  )

  ipcMain.handle('templates:create', async (_, userId: string, data: CreateTemplateInput) => {
    const db = getDb()
    const fileContent = Buffer.isBuffer(data.fileContent)
      ? data.fileContent
      : Buffer.from(data.fileContent as unknown as Uint8Array)
    const template = await db.template.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        fileContent,
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
