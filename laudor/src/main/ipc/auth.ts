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
