import { registerAuthHandlers } from './auth'
import { registerUsersHandlers } from './users'
import { registerPerfisHandlers } from './perfis'
import { registerCompaniesHandlers } from './companies'
import { registerTemplatesHandlers } from './templates'
import { registerProjectsHandlers } from './projects'

export function registerAllHandlers(): void {
  registerAuthHandlers()
  registerUsersHandlers()
  registerPerfisHandlers()
  registerCompaniesHandlers()
  registerTemplatesHandlers()
  registerProjectsHandlers()
}
