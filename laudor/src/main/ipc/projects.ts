import { ipcMain, BrowserWindow, dialog, app } from 'electron'
import { getDb } from '../db'
import type { Prisma } from '@prisma/client'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import path from 'path'
import fs from 'fs'
import mammoth from 'mammoth'

type ProjectRecord = Prisma.ProjectGetPayload<Record<string, never>>

interface CreateProjectInput {
  name: string
  templateId: string
  perfilId?: string
  companyId?: string
  values: Record<string, string>
}

interface UpdateProjectInput {
  name?: string
  perfilId?: string
  companyId?: string
  values?: Record<string, string>
  status?: string
}

function toDTO(p: ProjectRecord): object {
  return {
    id: p.id,
    name: p.name,
    userId: p.userId,
    templateId: p.templateId,
    templateName: p.templateName,
    perfilId: p.perfilId,
    companyId: p.companyId,
    values: JSON.parse(p.values) as Record<string, string>,
    status: p.status,
    fileName: p.fileName,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString()
  }
}

async function generateDocx(
  templateBuffer: Buffer,
  values: Record<string, string>
): Promise<Buffer> {
  const zip = new PizZip(templateBuffer)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' }
  })
  doc.render(values)
  return Buffer.from(doc.getZip().generate({ type: 'nodebuffer' }))
}

async function generatePdf(htmlContent: string, values: Record<string, string>): Promise<Buffer> {
  let html = htmlContent
  for (const [key, value] of Object.entries(values)) {
    html = html.replaceAll(`{{${key}}}`, value)
  }

  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } })
  await win.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(`<html><body style="font-family:Arial,sans-serif;padding:32px">${html}</body></html>`)}`
  )

  const pdfBuffer = await win.webContents.printToPDF({
    printBackground: true,
    pageSize: 'A4',
    margins: { marginType: 'custom', top: 1, bottom: 1, left: 1, right: 1 }
  })
  win.destroy()
  return Buffer.from(pdfBuffer)
}

export function registerProjectsHandlers(): void {
  ipcMain.handle('projects:list', async (_, userId: string) => {
    const db = getDb()
    const projects = await db.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    })
    return projects.map(toDTO)
  })

  ipcMain.handle('projects:get', async (_, userId: string, id: string) => {
    const db = getDb()
    const project = await db.project.findUnique({ where: { id } })
    if (!project || project.userId !== userId) throw new Error('Projeto não encontrado')
    return toDTO(project)
  })

  ipcMain.handle('projects:create', async (_, userId: string, data: CreateProjectInput) => {
    const db = getDb()
    const template = await db.template.findUnique({ where: { id: data.templateId } })
    if (!template) throw new Error('Template não encontrado')

    const project = await db.project.create({
      data: {
        name: data.name,
        userId,
        templateId: data.templateId,
        templateName: template.name,
        perfilId: data.perfilId,
        companyId: data.companyId,
        values: JSON.stringify(data.values ?? {})
      }
    })
    return toDTO(project)
  })

  ipcMain.handle(
    'projects:update',
    async (_, userId: string, id: string, data: UpdateProjectInput) => {
      const db = getDb()
      const existing = await db.project.findUnique({ where: { id } })
      if (!existing || existing.userId !== userId) throw new Error('Projeto não encontrado')

      const project = await db.project.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.perfilId !== undefined && { perfilId: data.perfilId }),
          ...(data.companyId !== undefined && { companyId: data.companyId }),
          ...(data.values !== undefined && { values: JSON.stringify(data.values) }),
          ...(data.status !== undefined && { status: data.status })
        }
      })
      return toDTO(project)
    }
  )

  ipcMain.handle('projects:delete', async (_, userId: string, id: string) => {
    const db = getDb()
    const existing = await db.project.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) throw new Error('Projeto não encontrado')
    await db.project.delete({ where: { id } })
  })

  ipcMain.handle(
    'projects:generate',
    async (_, userId: string, id: string, format: 'docx' | 'doc' | 'pdf') => {
      const db = getDb()
      const project = await db.project.findUnique({ where: { id } })
      if (!project || project.userId !== userId) throw new Error('Projeto não encontrado')

      const template = await db.template.findUnique({ where: { id: project.templateId } })
      if (!template) throw new Error('Template não encontrado')

      const values = JSON.parse(project.values) as Record<string, string>

      const { filePath } = await dialog.showSaveDialog({
        defaultPath: path.join(app.getPath('documents'), `${project.name}.${format}`),
        filters: [
          format === 'pdf'
            ? { name: 'PDF', extensions: ['pdf'] }
            : { name: 'Word Document', extensions: [format] }
        ]
      })

      if (!filePath) return { filePath: null }

      let fileBuffer: Buffer

      if (format === 'pdf') {
        const htmlResult = await mammoth.convertToHtml({ buffer: template.fileContent })
        fileBuffer = await generatePdf(htmlResult.value, values)
      } else {
        fileBuffer = await generateDocx(template.fileContent, values)
      }

      fs.writeFileSync(filePath, fileBuffer)

      await db.project.update({
        where: { id },
        data: {
          fileContent: fileBuffer,
          fileName: path.basename(filePath),
          status: 'COMPLETED'
        }
      })

      return { filePath }
    }
  )
}
