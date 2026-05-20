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

// ── Word XML → styled HTML ────────────────────────────────────────────────────

function twipsToPx(twips: number): number {
  return Math.round(twips * 96 / 1440)
}

function halfPtToPx(halfPt: number): number {
  return Math.round((halfPt / 2) * (96 / 72))
}

interface StyleProps {
  align?: string
  firstLine?: number
  left?: number
  right?: number
  spaceBefore?: number
  spaceAfter?: number
  lineSpacing?: number
  lineSpacingRule?: string
  fontSize?: number
  fontName?: string
}

interface StyleEntry extends StyleProps {
  basedOn?: string
}

function parsePPr(pPrXml: string): StyleProps {
  const s: StyleProps = {}
  const jc = /<w:jc[^>]*w:val="([^"]+)"/.exec(pPrXml)
  if (jc) s.align = jc[1]
  const indAttrs = (/<w:ind\s([^/]*)\/?>/.exec(pPrXml))?.[1] ?? ''
  if (indAttrs) {
    const fl = /w:firstLine="(\d+)"/.exec(indAttrs)
    const lft = /w:left="(\d+)"/.exec(indAttrs)
    const rgt = /w:right="(\d+)"/.exec(indAttrs)
    if (fl) s.firstLine = parseInt(fl[1])
    if (lft) s.left = parseInt(lft[1])
    if (rgt) s.right = parseInt(rgt[1])
  }
  const spcAttrs = (/<w:spacing\s([^/]*)\/?>/.exec(pPrXml))?.[1] ?? ''
  if (spcAttrs) {
    const before = /w:before="(\d+)"/.exec(spcAttrs)
    const after = /w:after="(\d+)"/.exec(spcAttrs)
    const line = /w:line="(\d+)"/.exec(spcAttrs)
    const rule = /w:lineRule="([^"]+)"/.exec(spcAttrs)
    if (before) s.spaceBefore = parseInt(before[1])
    if (after) s.spaceAfter = parseInt(after[1])
    if (line) s.lineSpacing = parseInt(line[1])
    if (rule) s.lineSpacingRule = rule[1]
  }
  return s
}

function parseRPr(rPrXml: string): Pick<StyleProps, 'fontSize' | 'fontName'> {
  const s: Pick<StyleProps, 'fontSize' | 'fontName'> = {}
  const sz = /<w:sz\s[^>]*w:val="(\d+)"/.exec(rPrXml)
  if (sz) s.fontSize = parseInt(sz[1])
  const font = /<w:rFonts[^>]*w:ascii="([^"]+)"/.exec(rPrXml)
  if (font) s.fontName = font[1]
  return s
}

function mergeStyles(base: StyleProps, override: StyleProps): StyleProps {
  const r: StyleProps = { ...base }
  for (const k of Object.keys(override) as (keyof StyleProps)[]) {
    if (override[k] !== undefined) (r as Record<string, unknown>)[k] = override[k]
  }
  return r
}

function parseStylesXml(stylesXml: string): { styleMap: Map<string, StyleEntry>; docDefault: StyleProps } {
  const styleMap = new Map<string, StyleEntry>()
  const docDefault: StyleProps = {}

  const docDefaultsXml = (/<w:docDefaults>([\s\S]*?)<\/w:docDefaults>/.exec(stylesXml))?.[1] ?? ''
  const pPrDefaultXml = (/<w:pPrDefault>([\s\S]*?)<\/w:pPrDefault>/.exec(docDefaultsXml))?.[1] ?? ''
  const pPrInDefault = (/<w:pPr>([\s\S]*?)<\/w:pPr>/.exec(pPrDefaultXml))?.[1]
  if (pPrInDefault) Object.assign(docDefault, parsePPr(pPrInDefault))
  const rPrDefaultXml = (/<w:rPrDefault>([\s\S]*?)<\/w:rPrDefault>/.exec(docDefaultsXml))?.[1] ?? ''
  const rPrInDefault = (/<w:rPr>([\s\S]*?)<\/w:rPr>/.exec(rPrDefaultXml))?.[1]
  if (rPrInDefault) Object.assign(docDefault, parseRPr(rPrInDefault))

  for (const m of stylesXml.matchAll(/<w:style\s[^>]*w:type="paragraph"[^>]*>([\s\S]*?)<\/w:style>/g)) {
    const block = m[0]
    const id = /w:styleId="([^"]+)"/.exec(block)?.[1]
    if (!id) continue
    const entry: StyleEntry = {}
    const basedOn = /<w:basedOn\s[^>]*w:val="([^"]+)"/.exec(block)?.[1]
    if (basedOn) entry.basedOn = basedOn
    const pPr = (/<w:pPr>([\s\S]*?)<\/w:pPr>/.exec(block))?.[1]
    if (pPr) Object.assign(entry, parsePPr(pPr))
    const rPr = (/<w:rPr>([\s\S]*?)<\/w:rPr>/.exec(block))?.[1]
    if (rPr) Object.assign(entry, parseRPr(rPr))
    styleMap.set(id, entry)
  }

  return { styleMap, docDefault }
}

function resolveStyle(
  styleId: string | undefined,
  styleMap: Map<string, StyleEntry>,
  docDefault: StyleProps,
  visited = new Set<string>()
): StyleProps {
  if (!styleId || visited.has(styleId)) return { ...docDefault }
  visited.add(styleId)
  const { basedOn, ...ownProps } = styleMap.get(styleId) ?? {}
  const base = resolveStyle(basedOn, styleMap, docDefault, visited)
  return mergeStyles(base, ownProps)
}

function extractParaInfos(documentXml: string): { styleId?: string; paraProps: StyleProps }[] {
  const infos: { styleId?: string; paraProps: StyleProps }[] = []
  const bodyXml = documentXml.replace(/<w:tbl\b[\s\S]*?<\/w:tbl>/g, '')
  for (const m of bodyXml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
    // Mammoth drops paragraphs with no text nodes — skip to keep the counter in sync
    if (!/<w:t[\s>]/.test(m[0])) continue
    const pPrXml = (/<w:pPr>([\s\S]*?)<\/w:pPr>/.exec(m[0]))?.[1] ?? ''
    const styleId = /<w:pStyle\s[^>]*w:val="([^"]+)"/.exec(pPrXml)?.[1]
    const paraProps: StyleProps = pPrXml ? parsePPr(pPrXml) : {}
    const rPrInPPr = (/<w:rPr>([\s\S]*?)<\/w:rPr>/.exec(pPrXml))?.[1]
    if (rPrInPPr) Object.assign(paraProps, parseRPr(rPrInPPr))
    infos.push({ styleId, paraProps })
  }
  return infos
}

function parsePageContentWidth(documentXml: string): number {
  const sectPr = (/<w:sectPr\b[\s\S]*?<\/w:sectPr>/.exec(documentXml))?.[0] ?? ''
  const pgSzAttrs = (/<w:pgSz\s([^/]*)\/?>/.exec(sectPr))?.[1] ?? ''
  const pgMarAttrs = (/<w:pgMar\s([^/]*)\/?>/.exec(sectPr))?.[1] ?? ''
  const w = /w:w="(\d+)"/.exec(pgSzAttrs)?.[1]
  const l = /w:left="(\d+)"/.exec(pgMarAttrs)?.[1]
  const r = /w:right="(\d+)"/.exec(pgMarAttrs)?.[1]
  if (!w || !l || !r) return 680
  return twipsToPx(parseInt(w) - parseInt(l) - parseInt(r))
}

function stylePropsToCSS(s: StyleProps): string {
  const css: string[] = []
  if (s.align === 'both') css.push('text-align:justify')
  else if (s.align === 'center') css.push('text-align:center')
  else if (s.align === 'right') css.push('text-align:right')
  else if (s.align === 'left') css.push('text-align:left')
  if (s.firstLine && s.firstLine > 0) css.push(`text-indent:${twipsToPx(s.firstLine)}px`)
  if (s.left && s.left > 0) css.push(`padding-left:${twipsToPx(s.left)}px`)
  if (s.right && s.right > 0) css.push(`padding-right:${twipsToPx(s.right)}px`)
  if (s.spaceBefore !== undefined) css.push(`margin-top:${twipsToPx(s.spaceBefore)}px`)
  if (s.spaceAfter !== undefined) css.push(`margin-bottom:${twipsToPx(s.spaceAfter)}px`)
  if (s.lineSpacing !== undefined) {
    css.push(
      !s.lineSpacingRule || s.lineSpacingRule === 'auto'
        ? `line-height:${(s.lineSpacing / 240).toFixed(2)}`
        : `line-height:${twipsToPx(s.lineSpacing)}px`
    )
  }
  if (s.fontSize) css.push(`font-size:${halfPtToPx(s.fontSize)}px`)
  if (s.fontName) css.push(`font-family:'${s.fontName}',serif`)
  return css.join(';')
}

async function convertDocxToStyledHtml(buf: Buffer): Promise<string> {
  const { value: bodyHtml } = await mammoth.convertToHtml({ buffer: buf })
  try {
    const zip = new PizZip(buf)
    const documentXml = zip.file('word/document.xml')?.asText()
    const stylesXml = zip.file('word/styles.xml')?.asText()
    if (!documentXml) return bodyHtml

    const { styleMap, docDefault } = stylesXml
      ? parseStylesXml(stylesXml)
      : { styleMap: new Map<string, StyleEntry>(), docDefault: {} }

    const contentWidthPx = parsePageContentWidth(documentXml)
    const paraInfos = extractParaInfos(documentXml)

    const fontName = docDefault.fontName ?? 'Times New Roman'
    const fontSize = docDefault.fontSize ? halfPtToPx(docDefault.fontSize) : 16
    const docStyle = `<style>.doc-preview{font-family:'${fontName}',serif;font-size:${fontSize}px;max-width:${contentWidthPx}px}</style>`

    let paraIdx = 0
    let tableDepth = 0
    const styledHtml = bodyHtml.replace(/<\/?table\b[^>]*>|<p(?:\s[^>]*)?>/g, (match) => {
      if (match.startsWith('</table')) { tableDepth--; return match }
      if (match.startsWith('<table')) { tableDepth++; return match }
      if (tableDepth > 0 || paraIdx >= paraInfos.length) return match
      const { styleId, paraProps } = paraInfos[paraIdx++]
      const resolved = resolveStyle(styleId, styleMap, docDefault)
      const cssStr = stylePropsToCSS(mergeStyles(resolved, paraProps))
      if (!cssStr) return match
      if (match.includes('style="')) return match.replace(/style="([^"]*)"/, `style="$1;${cssStr}"`)
      return `<p style="${cssStr}">`
    })

    return docStyle + styledHtml
  } catch {
    return bodyHtml
  }
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
    const seen = new Set<string>()
    const parsed: { key: string; description?: string }[] = []
    for (const m of matches) {
      const inner = m.replace(/^\{\{|\}\}$/g, '').trim()
      const colonIdx = inner.indexOf(':')
      const key = colonIdx >= 0 ? inner.slice(0, colonIdx).trim() : inner
      const description = colonIdx >= 0 ? inner.slice(colonIdx + 1).trim() : undefined
      if (!seen.has(key)) {
        seen.add(key)
        parsed.push({ key, description: description || undefined })
      }
    }
    return parsed
  })

  ipcMain.handle('templates:previewHtmlFromBuffer', async (_, fileBuffer: Buffer | Uint8Array) => {
    const buf = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer)
    return convertDocxToStyledHtml(buf)
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
        delimiters: { start: '{{', end: '}}' },
        parser: (tag: string) => ({
          get: (scope: Record<string, string>) => {
            const colonIdx = tag.indexOf(':')
            const key = colonIdx >= 0 ? tag.slice(0, colonIdx).trim() : tag.trim()
            return scope[key] ?? ''
          }
        })
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
    await db.project.deleteMany({ where: { templateId: id } })
    await db.template.delete({ where: { id } })
  })

  ipcMain.handle('templates:getPreviewHtml', async (_, userId: string, id: string) => {
    const db = getDb()
    const template = await db.template.findUnique({ where: { id } })
    if (!template) throw new Error('Template não encontrado')
    if (!canAccess(template, userId)) throw new Error('Acesso negado')

    return convertDocxToStyledHtml(template.fileContent)
  })
}
