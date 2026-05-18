import { app } from 'electron'
import path from 'path'
import { execSync } from 'child_process'

export async function initDatabase(): Promise<void> {
  const dbPath = path.join(app.getPath('userData'), 'laudor.db')
  process.env.DATABASE_URL = `file:${dbPath}`

  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env },
      cwd: app.getAppPath()
    })
  } catch {
    // Migrations may fail in dev if migrations dir doesn't exist yet; db still initializes
  }
}
