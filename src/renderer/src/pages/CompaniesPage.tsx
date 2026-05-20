import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { companiesApi } from '../lib/api'
import type { CompanyDTO } from '../types'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { formatDate } from '../lib/utils'

export default function CompaniesPage(): React.JSX.Element {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<CompanyDTO[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    companiesApi
      .list(user.id)
      .then(setCompanies)
      .finally(() => setLoading(false))
  }, [user])

  async function handleDelete(id: string): Promise<void> {
    if (!user) return
    if (!confirm('Confirma a exclusão desta empresa?')) return
    await companiesApi.delete(user.id, id)
    setCompanies((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{companies.length} empresa(s)</p>
        <Button onClick={() => navigate('/console/companies/new')}>
          <Plus size={16} />
          Nova Empresa
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : companies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12">
            <Building2 size={40} className="text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma empresa cadastrada.</p>
            <Button onClick={() => navigate('/console/companies/new')}>
              <Plus size={16} />
              Cadastrar empresa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {companies.map((company) => (
            <Card key={company.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardContent className="flex items-center justify-between p-4">
                <div onClick={() => navigate(`/console/companies/${company.id}`)}>
                  <p className="font-medium">{company.name}</p>
                  {company.razaoSocial && (
                    <p className="text-sm text-muted-foreground">{company.razaoSocial}</p>
                  )}
                  {company.cnpj && (
                    <p className="text-xs text-muted-foreground">CNPJ: {company.cnpj}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Criada em {formatDate(company.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => navigate(`/console/companies/${company.id}`)}
                  >
                    <Pencil size={16} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(company.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
