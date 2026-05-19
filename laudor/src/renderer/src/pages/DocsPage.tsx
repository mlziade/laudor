import { useState } from 'react'
import { BookOpen, FileText, FolderOpen, User, Building2, LayoutDashboard, Tag, Workflow } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { cn } from '../lib/utils'

// ── Page content ─────────────────────────────────────────────────────────────

function PageFluxo(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Fluxo geral da aplicação</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Entenda como as partes da aplicação se conectam para gerar um documento.
        </p>
      </div>
      <ol className="space-y-4">
        {[
          {
            step: '1',
            title: 'Crie um Template',
            desc: 'Faça upload de um documento Word (.docx) com campos marcados usando a sintaxe {{tag}}. Configure os campos, rótulos e tipos na tela de criação. O template é o molde — ele define a estrutura do documento final.'
          },
          {
            step: '2',
            title: 'Cadastre Perfis e Empresas (opcional)',
            desc: 'Dados salvos em Perfis e Empresas preenchem automaticamente campos vinculados nos templates. Isso evita digitar as mesmas informações repetidamente em cada documento.'
          },
          {
            step: '3',
            title: 'Preencha o Template',
            desc: 'Clique em um template para abrir a tela de preenchimento. Selecione um perfil ou empresa para auto-preenchimento e complete os campos restantes manualmente. Use a aba "Texto" para ver uma prévia em tempo real e a aba "PDF" para gerar uma prévia fiel ao documento final.'
          },
          {
            step: '4',
            title: 'Gere o Documento',
            desc: 'Clique em "Gerar Documento" e escolha o formato desejado (Word .docx ou PDF). O arquivo será salvo no local escolhido e o preenchimento ficará registrado na seção Projetos.'
          }
        ].map((item) => (
          <Card key={item.step}>
            <CardContent className="flex gap-4 p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {item.step}
              </div>
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </ol>
    </div>
  )
}

function PageMenus(): React.JSX.Element {
  const items = [
    {
      icon: <LayoutDashboard size={18} />,
      label: 'Dashboard',
      desc: 'Visão geral da aplicação. Ponto de entrada após o login.'
    },
    {
      icon: <FileText size={18} />,
      label: 'Templates',
      desc: 'Gerencie seus modelos de documento. Crie, edite, arquive e visualize templates. A partir daqui você também inicia o preenchimento de um documento clicando no template desejado.'
    },
    {
      icon: <FolderOpen size={18} />,
      label: 'Projetos',
      desc: 'Histórico de todos os documentos gerados. Cada vez que você preenche e exporta um template, um projeto é criado aqui com os valores utilizados. Você pode pesquisar pelo nome, template ou pelo conteúdo dos campos preenchidos.'
    },
    {
      icon: <User size={18} />,
      label: 'Perfis',
      desc: 'Cadastro de pessoas físicas. Os dados (nome, CPF, endereço etc.) podem ser vinculados a campos de template para preenchimento automático, evitando redigitação.'
    },
    {
      icon: <Building2 size={18} />,
      label: 'Empresas',
      desc: 'Cadastro de pessoas jurídicas. Funciona da mesma forma que Perfis, mas para dados de empresas como razão social, CNPJ e endereço.'
    },
    {
      icon: <BookOpen size={18} />,
      label: 'Docs',
      desc: 'Esta página. Contém guias de uso, referência dos menus e instruções para criar documentos com tags.'
    }
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">O que faz cada menu</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Referência rápida de cada seção da aplicação.
        </p>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.label}>
            <CardContent className="flex gap-4 p-4">
              <div className="mt-0.5 shrink-0 text-muted-foreground">{item.icon}</div>
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function PageTags(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Como criar um documento com tags</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tags são marcadores no seu documento Word que serão substituídos pelos valores
          preenchidos na geração do documento.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Sintaxe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Envolva o nome do campo com chaves duplas, sem espaços:
          </p>
          <div className="rounded-md bg-muted px-4 py-3 font-mono text-sm">
            {'{{nome_do_campo}}'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Exemplo de documento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-muted px-4 py-3 font-mono text-sm space-y-1 leading-relaxed">
            <p>{'Eu, {{nome_completo}}, portador(a) do CPF {{cpf}},'}</p>
            <p>{'residente em {{endereco}}, declaro que...'}</p>
            <p>&nbsp;</p>
            <p>{'Data: {{data}}'}</p>
            <p>{'Empresa: {{razao_social}} — CNPJ: {{cnpj}}'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Regras para nomes de tags</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              'Use apenas letras, números e underscores — sem espaços ou acentos',
              'A tag no documento deve ser idêntica à chave configurada no template',
              'Maiúsculas e minúsculas fazem diferença: {{Nome}} é diferente de {{nome}}',
              'Prefira nomes descritivos: {{data_nascimento}} em vez de {{d}}'
            ].map((rule) => (
              <li key={rule} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Passo a passo</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-muted-foreground">
            {[
              'Abra o Word e crie ou edite seu documento normalmente',
              'Nos locais com valores dinâmicos, digite a tag correspondente',
              'Salve o arquivo como .docx',
              'Vá em Templates → Novo Template e faça o upload do arquivo',
              'O sistema detectará todas as tags automaticamente e pedirá para você configurar cada campo'
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 font-medium text-foreground">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Page registry ─────────────────────────────────────────────────────────────

type PageId = 'fluxo' | 'menus' | 'tags'

const pages: { id: PageId; icon: React.ReactNode; label: string; sub: string }[] = [
  {
    id: 'fluxo',
    icon: <Workflow size={16} />,
    label: 'Fluxo geral',
    sub: 'Como a aplicação funciona'
  },
  {
    id: 'menus',
    icon: <BookOpen size={16} />,
    label: 'Menus',
    sub: 'O que faz cada seção'
  },
  {
    id: 'tags',
    icon: <Tag size={16} />,
    label: 'Tags em documentos',
    sub: 'Como criar templates com {{tags}}'
  }
]

const pageComponents: Record<PageId, React.ReactNode> = {
  fluxo: <PageFluxo />,
  menus: <PageMenus />,
  tags: <PageTags />
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function DocsPage(): React.JSX.Element {
  const [active, setActive] = useState<PageId>('fluxo')

  return (
    <div className="flex h-full gap-6">
      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl">{pageComponents[active]}</div>
      </div>

      {/* Picker */}
      <div className="w-52 shrink-0 space-y-1">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Guias
        </p>
        {pages.map((page) => (
          <button
            key={page.id}
            onClick={() => setActive(page.id)}
            className={cn(
              'w-full rounded-lg px-3 py-2.5 text-left transition-colors',
              active === page.id
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <div className="flex items-center gap-2">
              {page.icon}
              <span className="text-sm font-medium">{page.label}</span>
            </div>
            <p className={cn(
              'mt-0.5 text-xs',
              active === page.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}>
              {page.sub}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
