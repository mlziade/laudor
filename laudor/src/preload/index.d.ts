declare global {
  interface Window {
    api: {
      auth: {
        checkFirstRun: () => Promise<boolean>
        register: (email: string, password: string) => Promise<unknown>
        login: (email: string, password: string) => Promise<unknown>
      }
      users: {
        list: (callerId: string) => Promise<unknown[]>
        toggleAdmin: (callerId: string, targetId: string) => Promise<unknown>
        delete: (callerId: string, targetId: string) => Promise<void>
      }
      perfis: {
        list: (userId: string) => Promise<unknown[]>
        create: (userId: string, data: unknown) => Promise<unknown>
        update: (userId: string, id: string, data: unknown) => Promise<unknown>
        delete: (userId: string, id: string) => Promise<void>
      }
      companies: {
        list: (userId: string) => Promise<unknown[]>
        create: (userId: string, data: unknown) => Promise<unknown>
        update: (userId: string, id: string, data: unknown) => Promise<unknown>
        delete: (userId: string, id: string) => Promise<void>
      }
      templates: {
        list: (userId: string, statusFilter?: string) => Promise<unknown[]>
        get: (userId: string, id: string) => Promise<unknown>
        parseTags: (fileBuffer: Uint8Array) => Promise<string[]>
        previewHtmlFromBuffer: (fileBuffer: Uint8Array) => Promise<string>
        toPdfFromBuffer: (fileBuffer: Uint8Array) => Promise<Uint8Array>
        toPdf: (userId: string, id: string) => Promise<Uint8Array>
        create: (userId: string, data: unknown) => Promise<unknown>
        update: (userId: string, id: string, data: unknown) => Promise<unknown>
        setStatus: (userId: string, id: string, status: string) => Promise<unknown>
        delete: (userId: string, id: string) => Promise<void>
        getPreviewHtml: (userId: string, id: string) => Promise<string>
      }
      projects: {
        list: (userId: string) => Promise<unknown[]>
        get: (userId: string, id: string) => Promise<unknown>
        create: (userId: string, data: unknown) => Promise<unknown>
        update: (userId: string, id: string, data: unknown) => Promise<unknown>
        delete: (userId: string, id: string) => Promise<void>
        generate: (
          userId: string,
          id: string,
          format: string
        ) => Promise<{ filePath: string | null }>
      }
    }
  }
}

export {}
