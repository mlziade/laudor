import { contextBridge, ipcRenderer } from 'electron'

const api = {
  auth: {
    checkFirstRun: () => ipcRenderer.invoke('auth:checkFirstRun'),
    register: (email: string, password: string) =>
      ipcRenderer.invoke('auth:register', email, password),
    login: (email: string, password: string) => ipcRenderer.invoke('auth:login', email, password)
  },
  users: {
    list: (callerId: string) => ipcRenderer.invoke('users:list', callerId),
    toggleAdmin: (callerId: string, targetId: string) =>
      ipcRenderer.invoke('users:toggleAdmin', callerId, targetId),
    delete: (callerId: string, targetId: string) =>
      ipcRenderer.invoke('users:delete', callerId, targetId)
  },
  perfis: {
    list: (userId: string) => ipcRenderer.invoke('perfis:list', userId),
    create: (userId: string, data: unknown) => ipcRenderer.invoke('perfis:create', userId, data),
    update: (userId: string, id: string, data: unknown) =>
      ipcRenderer.invoke('perfis:update', userId, id, data),
    delete: (userId: string, id: string) => ipcRenderer.invoke('perfis:delete', userId, id)
  },
  companies: {
    list: (userId: string) => ipcRenderer.invoke('companies:list', userId),
    create: (userId: string, data: unknown) =>
      ipcRenderer.invoke('companies:create', userId, data),
    update: (userId: string, id: string, data: unknown) =>
      ipcRenderer.invoke('companies:update', userId, id, data),
    delete: (userId: string, id: string) => ipcRenderer.invoke('companies:delete', userId, id)
  },
  templates: {
    list: (userId: string, statusFilter?: string) =>
      ipcRenderer.invoke('templates:list', userId, statusFilter),
    get: (userId: string, id: string) => ipcRenderer.invoke('templates:get', userId, id),
    parseTags: (fileBuffer: Uint8Array) => ipcRenderer.invoke('templates:parseTags', fileBuffer),
    previewHtmlFromBuffer: (fileBuffer: Uint8Array) =>
      ipcRenderer.invoke('templates:previewHtmlFromBuffer', fileBuffer),
    toPdfFromBuffer: (fileBuffer: Uint8Array) =>
      ipcRenderer.invoke('templates:toPdfFromBuffer', fileBuffer),
    toPdf: (userId: string, id: string) =>
      ipcRenderer.invoke('templates:toPdf', userId, id),
    filledPdf: (userId: string, id: string, values: Record<string, string>) =>
      ipcRenderer.invoke('templates:filledPdf', userId, id, values),
    create: (userId: string, data: unknown) =>
      ipcRenderer.invoke('templates:create', userId, data),
    update: (userId: string, id: string, data: unknown) =>
      ipcRenderer.invoke('templates:update', userId, id, data),
    setStatus: (userId: string, id: string, status: string) =>
      ipcRenderer.invoke('templates:setStatus', userId, id, status),
    delete: (userId: string, id: string) => ipcRenderer.invoke('templates:delete', userId, id),
    getPreviewHtml: (userId: string, id: string) =>
      ipcRenderer.invoke('templates:getPreviewHtml', userId, id)
  },
  projects: {
    list: (userId: string) => ipcRenderer.invoke('projects:list', userId),
    get: (userId: string, id: string) => ipcRenderer.invoke('projects:get', userId, id),
    create: (userId: string, data: unknown) =>
      ipcRenderer.invoke('projects:create', userId, data),
    update: (userId: string, id: string, data: unknown) =>
      ipcRenderer.invoke('projects:update', userId, id, data),
    delete: (userId: string, id: string) => ipcRenderer.invoke('projects:delete', userId, id),
    generate: (userId: string, id: string, format: string) =>
      ipcRenderer.invoke('projects:generate', userId, id, format)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
