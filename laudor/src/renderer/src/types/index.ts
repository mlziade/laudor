export type FieldType = 'text' | 'number' | 'date' | 'dropdown' | 'textarea' | 'email'

export type DefaultFromSource =
  | 'perfil.fullName'
  | 'perfil.cpf'
  | 'perfil.rg'
  | 'perfil.email'
  | 'perfil.phone'
  | 'perfil.logradouro'
  | 'perfil.cidade'
  | 'perfil.estado'
  | 'company.razaoSocial'
  | 'company.nomeFantasia'
  | 'company.cnpj'
  | 'company.telefone'
  | 'company.email'
  | 'company.representante'
  | 'company.logradouro'
  | 'company.cidade'
  | 'company.estado'

export interface FieldSchema {
  key: string
  label: string
  type: FieldType
  options?: string[]
  required: boolean
  defaultFrom?: DefaultFromSource
  placeholder?: string
}

export type TemplateStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type ProjectStatus = 'IN_PROGRESS' | 'COMPLETED'
export type ExportFormat = 'docx' | 'doc' | 'pdf'

// DTOs for IPC communication

export interface UserDTO {
  id: string
  email: string
  isAdmin: boolean
  createdAt: string
  updatedAt: string
}

export interface PerfilDTO {
  id: string
  userId: string
  name: string
  description?: string | null
  tags: string[]
  fullName?: string | null
  cpf?: string | null
  rg?: string | null
  email?: string | null
  phone?: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  picture?: string | null
  createdAt: string
  updatedAt: string
}

export interface CompanyDTO {
  id: string
  userId: string
  name: string
  description?: string | null
  tags: string[]
  razaoSocial?: string | null
  nomeFantasia?: string | null
  cnpj?: string | null
  inscricaoEstadual?: string | null
  inscricaoMunicipal?: string | null
  email?: string | null
  telefone?: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  representante?: string | null
  createdAt: string
  updatedAt: string
}

export interface TemplateDTO {
  id: string
  name: string
  description?: string | null
  category?: string | null
  fileName: string
  fields: FieldSchema[]
  status: TemplateStatus
  ownerId: string
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

export interface TemplateDTOWithContent extends TemplateDTO {
  fileContent: Buffer
}

export interface ProjectDTO {
  id: string
  name: string
  userId: string
  templateId: string
  templateName: string
  perfilId?: string | null
  companyId?: string | null
  values: Record<string, string>
  status: ProjectStatus
  fileName?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreatePerfilInput {
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
  picture?: string
}

export interface CreateCompanyInput {
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

export interface CreateTemplateInput {
  name: string
  description?: string
  category?: string
  fileContent: Buffer
  fileName: string
  fields: FieldSchema[]
  isPublic?: boolean
}

export interface UpdateTemplateInput {
  name?: string
  description?: string
  category?: string
  fields?: FieldSchema[]
  isPublic?: boolean
}

export interface CreateProjectInput {
  name: string
  templateId: string
  perfilId?: string
  companyId?: string
  values: Record<string, string>
}

export interface UpdateProjectInput {
  name?: string
  perfilId?: string
  companyId?: string
  values?: Record<string, string>
  status?: ProjectStatus
}
