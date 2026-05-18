import type {
  UserDTO,
  PerfilDTO,
  CompanyDTO,
  TemplateDTO,
  TemplateDTOWithContent,
  ProjectDTO,
  CreatePerfilInput,
  CreateCompanyInput,
  CreateTemplateInput,
  UpdateTemplateInput,
  CreateProjectInput,
  UpdateProjectInput,
  TemplateStatus,
  ExportFormat
} from '../types'

const api = window.api

// Auth
export const authApi = {
  checkFirstRun: (): Promise<boolean> => api.auth.checkFirstRun(),
  register: (email: string, password: string): Promise<UserDTO> =>
    api.auth.register(email, password) as Promise<UserDTO>,
  login: (email: string, password: string): Promise<UserDTO | null> =>
    api.auth.login(email, password) as Promise<UserDTO | null>
}

// Users
export const usersApi = {
  list: (callerId: string): Promise<UserDTO[]> =>
    api.users.list(callerId) as Promise<UserDTO[]>,
  toggleAdmin: (callerId: string, targetId: string): Promise<UserDTO> =>
    api.users.toggleAdmin(callerId, targetId) as Promise<UserDTO>,
  delete: (callerId: string, targetId: string): Promise<void> =>
    api.users.delete(callerId, targetId)
}

// Perfis
export const perfisApi = {
  list: (userId: string): Promise<PerfilDTO[]> =>
    api.perfis.list(userId) as Promise<PerfilDTO[]>,
  create: (userId: string, data: CreatePerfilInput): Promise<PerfilDTO> =>
    api.perfis.create(userId, data) as Promise<PerfilDTO>,
  update: (userId: string, id: string, data: Partial<CreatePerfilInput>): Promise<PerfilDTO> =>
    api.perfis.update(userId, id, data) as Promise<PerfilDTO>,
  delete: (userId: string, id: string): Promise<void> => api.perfis.delete(userId, id)
}

// Companies
export const companiesApi = {
  list: (userId: string): Promise<CompanyDTO[]> =>
    api.companies.list(userId) as Promise<CompanyDTO[]>,
  create: (userId: string, data: CreateCompanyInput): Promise<CompanyDTO> =>
    api.companies.create(userId, data) as Promise<CompanyDTO>,
  update: (
    userId: string,
    id: string,
    data: Partial<CreateCompanyInput>
  ): Promise<CompanyDTO> =>
    api.companies.update(userId, id, data) as Promise<CompanyDTO>,
  delete: (userId: string, id: string): Promise<void> => api.companies.delete(userId, id)
}

// Templates
export const templatesApi = {
  list: (userId: string, statusFilter?: TemplateStatus): Promise<TemplateDTO[]> =>
    api.templates.list(userId, statusFilter) as Promise<TemplateDTO[]>,
  get: (userId: string, id: string): Promise<TemplateDTOWithContent> =>
    api.templates.get(userId, id) as Promise<TemplateDTOWithContent>,
  parseTags: (fileBuffer: Buffer): Promise<string[]> => api.templates.parseTags(fileBuffer),
  create: (userId: string, data: CreateTemplateInput): Promise<TemplateDTO> =>
    api.templates.create(userId, data) as Promise<TemplateDTO>,
  update: (userId: string, id: string, data: UpdateTemplateInput): Promise<TemplateDTO> =>
    api.templates.update(userId, id, data) as Promise<TemplateDTO>,
  setStatus: (userId: string, id: string, status: TemplateStatus): Promise<TemplateDTO> =>
    api.templates.setStatus(userId, id, status) as Promise<TemplateDTO>,
  delete: (userId: string, id: string): Promise<void> => api.templates.delete(userId, id),
  getPreviewHtml: (userId: string, id: string): Promise<string> =>
    api.templates.getPreviewHtml(userId, id)
}

// Projects
export const projectsApi = {
  list: (userId: string): Promise<ProjectDTO[]> =>
    api.projects.list(userId) as Promise<ProjectDTO[]>,
  get: (userId: string, id: string): Promise<ProjectDTO> =>
    api.projects.get(userId, id) as Promise<ProjectDTO>,
  create: (userId: string, data: CreateProjectInput): Promise<ProjectDTO> =>
    api.projects.create(userId, data) as Promise<ProjectDTO>,
  update: (userId: string, id: string, data: UpdateProjectInput): Promise<ProjectDTO> =>
    api.projects.update(userId, id, data) as Promise<ProjectDTO>,
  delete: (userId: string, id: string): Promise<void> => api.projects.delete(userId, id),
  generate: (
    userId: string,
    id: string,
    format: ExportFormat
  ): Promise<{ filePath: string | null }> => api.projects.generate(userId, id, format)
}
