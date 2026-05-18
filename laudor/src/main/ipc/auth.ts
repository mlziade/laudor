import { ipcMain } from 'electron'
import bcrypt from 'bcrypt'
import { getDb } from '../db'

const BCRYPT_ROUNDS = 12

function toUserDTO(user: {
  id: string
  email: string
  isAdmin: boolean
  createdAt: Date
  updatedAt: Date
}): object {
  return {
    id: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  }
}

export function registerAuthHandlers(): void {
  ipcMain.handle('auth:checkFirstRun', async () => {
    const db = getDb()
    const count = await db.user.count()
    return count === 0
  })

  ipcMain.handle('auth:register', async (_, email: string, password: string) => {
    const db = getDb()
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) throw new Error('Email já cadastrado')

    const isFirstUser = (await db.user.count()) === 0
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    const user = await db.user.create({
      data: { email, passwordHash, isAdmin: isFirstUser }
    })

    await db.perfil.create({
      data: {
        userId: user.id,
        name: 'Perfil Principal',
        description: 'Perfil de exemplo',
        tags: JSON.stringify(['exemplo']),
        fullName: 'João da Silva',
        cpf: '123.456.789-09',
        rg: '12.345.678-9',
        email: 'joao.silva@exemplo.com.br',
        phone: '(11) 98765-4321',
        cep: '01310-100',
        logradouro: 'Av. Paulista, 1000',
        numero: '1000',
        complemento: 'Sala 42',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        estado: 'SP'
      }
    })

    await db.company.create({
      data: {
        userId: user.id,
        name: 'Empresa Exemplo Ltda',
        description: 'Empresa de exemplo',
        tags: JSON.stringify(['exemplo']),
        razaoSocial: 'Empresa Exemplo Sociedade Limitada',
        nomeFantasia: 'Exemplo Tech',
        cnpj: '11.222.333/0001-81',
        inscricaoEstadual: '110.042.490.114',
        email: 'contato@exemplotech.com.br',
        telefone: '(11) 3000-1234',
        cep: '04578-000',
        logradouro: 'Av. das Nações Unidas, 12901',
        numero: '12901',
        complemento: '6º andar',
        bairro: 'Brooklin',
        cidade: 'São Paulo',
        estado: 'SP',
        representante: 'Maria Oliveira'
      }
    })

    return toUserDTO(user)
  })

  ipcMain.handle('auth:login', async (_, email: string, password: string) => {
    const db = getDb()
    const user = await db.user.findUnique({ where: { email } })
    if (!user) return null

    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) return null

    return toUserDTO(user)
  })
}
