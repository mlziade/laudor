# Plan: laudor — Electron Desktop Application

## Context

A local Windows desktop application for filling Word document templates and generating reports
("laudos"). No remote backend — everything runs on the user's machine. Built with Electron +
React + Vite. SQLite stores all data locally via Prisma ORM.

Target user: a single professional (and potentially a small team on the same machine) who
needs to fill structured Word templates quickly and export them as .docx, .doc, or .pdf.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Desktop shell | Electron (latest) via `electron-vite` |
| UI framework | React 19 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS v4 |
| UI components | shadcn/ui (Vite config) + lucide-react |
| Database | SQLite (local file) via Prisma ORM (latest) |
| Password hashing | bcrypt |
| Template filling | docxtemplater + pizzip |
| .docx → HTML preview | mammoth.js |
| PDF export | Electron `webContents.printToPDF()` (built-in, no extra dep) |
| Forms | react-hook-form + zod |
| Date handling | date-fns |

### Color Palette

| Mode | Colors |
|---|---|
| Light | White `#FFFFFF`, Light Blue `#E0F2FE` / `#0EA5E9` |
| Dark | Dark Navy `#0F172A`, Dark Blue `#1E3A5F` / `#1E40AF` |

---

## Electron Architecture

Electron has two separate processes that communicate via IPC:

```
┌─────────────────────────────────────────────────────────┐
│  MAIN PROCESS (Node.js)                                 │
│  - Prisma / SQLite (all DB access)                      │
│  - File system (read/write .docx, .pdf)                 │
│  - IPC handlers (ipcMain.handle)                        │
│  - BrowserWindow management                             │
└─────────────────────┬───────────────────────────────────┘
                      │ IPC (contextBridge)
┌─────────────────────▼───────────────────────────────────┐
│  RENDERER PROCESS (React + Vite)                        │
│  - All UI (pages, components)                           │
│  - Calls window.api.* methods (exposed via preload)     │
│  - Never accesses DB or file system directly            │
└─────────────────────────────────────────────────────────┘
```

The preload script exposes a typed `window.api` object using `contextBridge.exposeInMainWorld`.

---

## Directory Structure

```
laudor/
├── electron.vite.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── components.json                        # shadcn config
├── prisma/
│   └── schema.prisma
└── src/
    ├── main/                              # Main process (Node.js)
    │   ├── index.ts                       # App entry, BrowserWindow setup
    │   ├── db.ts                          # Prisma client singleton
    │   ├── db-init.ts                     # Run migrations on app start
    │   └── ipc/                           # IPC handler modules
    │       ├── index.ts                   # Register all handlers
    │       ├── auth.ts                    # login, register, logout
    │       ├── users.ts                   # list, update, delete, toggle-admin
    │       ├── perfis.ts                  # CRUD for personal profiles
    │       ├── companies.ts               # CRUD for companies
    │       ├── templates.ts               # CRUD, parse tags, status change
    │       └── projects.ts                # CRUD, generate, export
    ├── preload/
    │   └── index.ts                       # contextBridge → window.api
    └── renderer/                          # React app
        ├── index.html
        └── src/
            ├── main.tsx
            ├── App.tsx                    # Router setup
            ├── types/
            │   └── index.ts               # Shared types (FieldSchema, etc.)
            ├── lib/
            │   ├── api.ts                 # Typed wrappers for window.api calls
            │   └── utils.ts               # cn(), formatters
            ├── hooks/
            │   ├── useAuth.ts             # Auth context + hook
            │   └── useToast.ts
            ├── components/
            │   ├── ui/                    # shadcn generated
            │   ├── auth/
            │   │   └── LoginForm.tsx
            │   ├── layout/
            │   │   ├── Sidebar.tsx
            │   │   ├── Header.tsx
            │   │   └── AppShell.tsx       # Protected layout wrapper
            │   ├── templates/
            │   │   ├── TemplateCard.tsx
            │   │   ├── DynamicForm.tsx    # Left panel: renders FieldSchema[]
            │   │   └── DocPreview.tsx     # Right panel: live HTML preview
            │   ├── projects/
            │   │   ├── ProjectCard.tsx
            │   │   └── ExportDialog.tsx   # Choose format: .docx / .doc / .pdf
            │   ├── perfis/
            │   │   └── PerfilForm.tsx
            │   └── companies/
            │       └── CompanyForm.tsx
            └── pages/
                ├── AuthPage.tsx           # Welcome + login/register
                ├── ConsolePage.tsx        # /console dashboard
                ├── TemplatesPage.tsx      # /console/templates
                ├── TemplateFillPage.tsx   # /console/templates/:id (split view)
                ├── ProjectsPage.tsx       # /console/projects
                ├── ProjectDetailPage.tsx  # /console/projects/:id
                ├── PerfisPage.tsx         # /console/perfis
                ├── PerfilDetailPage.tsx   # /console/perfis/:id
                ├── CompaniesPage.tsx      # /console/companies
                ├── CompanyDetailPage.tsx  # /console/companies/:id
                └── admin/
                    ├── AdminTemplatesPage.tsx
                    ├── AdminTemplateNewPage.tsx
                    ├── AdminTemplateEditPage.tsx
                    └── AdminUsersPage.tsx
```

---

## Database Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "windows"]   // bundle Windows binary with app
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")          // set at runtime: file:<userData>/laudor.db
}

// ─── Users ────────────────────────────────────────────────────────────────────

model User {
  id           String        @id @default(cuid())
  email        String        @unique
  passwordHash String
  isAdmin      Boolean       @default(false)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  perfis       Perfil[]
  projects     Project[]
  templates    Template[]
}

// ─── Personal Profiles ────────────────────────────────────────────────────────

model Perfil {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String
  description String?
  tags        String    @default("[]")   // JSON string[] stored as TEXT in SQLite
  // personal info
  fullName    String?
  cpf         String?
  rg          String?
  email       String?
  phone       String?
  cep         String?
  logradouro  String?
  numero      String?
  complemento String?
  bairro      String?
  cidade      String?
  estado      String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  projects    Project[]
}

// ─── Companies ────────────────────────────────────────────────────────────────

model Company {
  id                 String    @id @default(cuid())
  userId             String
  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  name               String
  description        String?
  tags               String    @default("[]")   // JSON string[]
  // Brazilian company info
  razaoSocial        String?
  nomeFantasia       String?
  cnpj               String?
  inscricaoEstadual  String?
  inscricaoMunicipal String?
  email              String?
  telefone           String?
  cep                String?
  logradouro         String?
  numero             String?
  complemento        String?
  bairro             String?
  cidade             String?
  estado             String?   // UF (2 chars)
  representante      String?   // nome do representante legal
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  projects           Project[]
}

// ─── Templates ────────────────────────────────────────────────────────────────

// status stored as TEXT in SQLite (no native enum)
// values: "DRAFT" | "PUBLISHED" | "ARCHIVED"

model Template {
  id          String    @id @default(cuid())
  name        String
  description String?
  category    String?
  fileContent Bytes                       // .docx binary
  fileName    String
  fields      String                      // JSON: FieldSchema[]
  status      String    @default("DRAFT") // DRAFT | PUBLISHED | ARCHIVED
  ownerId     String?                     // null = system/admin template
  owner       User?     @relation(fields: [ownerId], references: [id])
  isPublic    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  projects    Project[]
}

// ─── Projects ─────────────────────────────────────────────────────────────────

// status stored as TEXT: "IN_PROGRESS" | "COMPLETED"

model Project {
  id           String    @id @default(cuid())
  name         String
  userId       String
  user         User      @relation(fields: [userId], references: [id])
  templateId   String
  template     Template  @relation(fields: [templateId], references: [id])
  templateName String                     // snapshot at creation
  perfilId     String?
  perfil       Perfil?   @relation(fields: [perfilId], references: [id])
  companyId    String?
  company      Company?  @relation(fields: [companyId], references: [id])
  values       String                     // JSON: Record<string, string>
  status       String    @default("IN_PROGRESS")
  fileContent  Bytes?                     // generated .docx binary
  fileName     String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

> **Note on SQLite + Prisma**: SQLite does not support native enums. All status fields are
> stored as `String` (TEXT). Validation is enforced at the application layer (zod schemas).
> `Json` fields are stored as `String` (TEXT) since SQLite has no native JSON column type —
> always `JSON.parse()`/`JSON.stringify()` when reading/writing.

---

## Shared Types (`src/renderer/src/types/index.ts`)

```typescript
export type FieldType = "text" | "number" | "date" | "dropdown" | "textarea" | "email"

export type DefaultFromSource =
  | "perfil.fullName" | "perfil.cpf" | "perfil.rg" | "perfil.email"
  | "perfil.phone"    | "perfil.logradouro" | "perfil.cidade" | "perfil.estado"
  | "company.razaoSocial" | "company.nomeFantasia" | "company.cnpj"
  | "company.telefone"    | "company.email"        | "company.representante"
  | "company.logradouro"  | "company.cidade"       | "company.estado"

export interface FieldSchema {
  key: string                        // matches {{key}} in .docx
  label: string
  type: FieldType
  options?: string[]                 // for dropdown
  required: boolean
  defaultFrom?: DefaultFromSource    // auto-fill from selected Perfil or Company
  placeholder?: string
}

export type TemplateStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED"
export type ProjectStatus  = "IN_PROGRESS" | "COMPLETED"
export type ExportFormat   = "docx" | "doc" | "pdf"
```

---

## Auth

- **Registration**: `bcrypt.hash(password, 12)` → stored in `User.passwordHash`
- **Login**: `bcrypt.compare(input, hash)` → if match, store user in React context (in-memory session)
- **No tokens needed**: desktop app, session lives in React state. App restart = re-login.
- **First run**: if no users exist, show a "Create first account" form (auto-admin)
- The welcome/auth screen is the app's entry point (no separate landing page)

---

## Template Fill — Split View (`TemplateFillPage`)

```
┌──────────────────────────────────────────────────────────────┐
│ Template Name                              [Generate ▼]      │
├─────────────────────────┬────────────────────────────────────┤
│  LEFT PANEL (40%)       │  RIGHT PANEL (60%)                 │
│                         │                                    │
│  Perfil: [select ▼]     │  ┌──────────────────────────────┐ │
│  Company: [select ▼]    │  │  Live document preview        │ │
│                         │  │  (HTML rendered from .docx    │ │
│  Nome: [___________]    │  │   via mammoth.js, with        │ │
│  CPF:  [___________]    │  │   {{keys}} replaced live)     │ │
│  Data: [date picker]    │  │                               │ │
│  ...                    │  │  The quick brown fox…         │ │
│                         │  │  **Nome:** João Silva         │ │
│                         │  └──────────────────────────────┘ │
└─────────────────────────┴────────────────────────────────────┘
```

**Preview implementation**:
1. On page load → IPC call → main process converts template `.docx` to HTML with `mammoth.js`
2. HTML string sent to renderer, stored in state
3. As user types → React replaces `{{key}}` occurrences in the HTML string live
4. Rendered in a sandboxed `<div>` with `dangerouslySetInnerHTML` (safe: content is our own)

---

## Export / Generation

When user clicks Generate and chooses a format:

| Format | Method |
|---|---|
| `.docx` | `docxtemplater` fills template bytes → `dialog.showSaveDialog` → write to disk |
| `.doc` | Same as `.docx`, saved with `.doc` extension (Word accepts this for simple docs) |
| `.pdf` | Main process opens a hidden `BrowserWindow`, loads the rendered HTML, calls `webContents.printToPDF()` → write bytes to disk |

The generated bytes are also saved to `Project.fileContent` for re-download later.

---

## IPC API (`window.api`)

Defined in preload, implemented in `src/main/ipc/`:

```typescript
// Auth
auth.login(email, password)         → User | null
auth.register(email, password)      → User
auth.checkFirstRun()                → boolean

// Users (admin only)
users.list()                        → User[]
users.toggleAdmin(id)               → User
users.delete(id)                    → void

// Perfis
perfis.list()                       → Perfil[]
perfis.create(data)                 → Perfil
perfis.update(id, data)             → Perfil
perfis.delete(id)                   → void

// Companies
companies.list()                    → Company[]
companies.create(data)              → Company
companies.update(id, data)          → Company
companies.delete(id)                → void

// Templates
templates.list(statusFilter?)       → Template[]   // no fileContent in list
templates.get(id)                   → Template     // includes fileContent
templates.parseTags(fileBuffer)     → string[]     // extract {{tags}} from .docx
templates.create(data)              → Template
templates.update(id, data)          → Template
templates.setStatus(id, status)     → Template
templates.delete(id)                → void
templates.getPreviewHtml(id)        → string       // mammoth conversion

// Projects
projects.list()                     → Project[]
projects.get(id)                    → Project
projects.create(data)               → Project
projects.update(id, data)           → Project     // re-edit values
projects.generate(id, format)       → { filePath: string }
projects.delete(id)                 → void
```

---

## Pages

| Page | Route (client-side) | Content |
|---|---|---|
| Auth | `/` | Logo placeholder, login form, "create account" toggle |
| Dashboard | `/console` | Stats, recent projects, quick actions |
| Templates | `/console/templates` | Grid of PUBLISHED templates |
| Fill Template | `/console/templates/:id` | Split view: form left, preview right |
| Projects | `/console/projects` | List with status badges + filter |
| Project Detail | `/console/projects/:id` | Values, re-edit, export (format picker) |
| Perfis | `/console/perfis` | List + create button |
| Perfil Detail | `/console/perfis/:id` | Create/edit form |
| Companies | `/console/companies` | List + create button |
| Company Detail | `/console/companies/:id` | Create/edit form |
| Admin Templates | `/console/admin/templates` | All templates + status management |
| Admin New Template | `/console/admin/templates/new` | Upload → tag config |
| Admin Edit Template | `/console/admin/templates/:id` | Edit fields + change status |
| Admin Users | `/console/admin/users` | User list + toggle admin |

---

## Bootstrap Commands

```bash
# Create project with electron-vite
npm create @quick-start/electron@latest laudor -- --template react-ts
cd laudor

# Tailwind + shadcn
npm install tailwindcss @tailwindcss/vite
npx shadcn@latest init   # choose: Vite, TypeScript

# Core deps
npm install prisma @prisma/client
npm install bcrypt @types/bcrypt
npm install docxtemplater pizzip mammoth
npm install @types/mammoth
npm install react-hook-form @hookform/resolvers zod
npm install react-router-dom
npm install date-fns

# shadcn components
npx shadcn@latest add button input textarea form select card table badge dialog sonner
npx shadcn@latest add calendar popover separator avatar dropdown-menu sidebar sheet tabs label
```

---

## Prisma in Electron — Key Setup

```typescript
// src/main/db-init.ts — run before anything else in main process
import { app } from 'electron'
import path from 'path'

export function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'laudor.db')
  process.env.DATABASE_URL = `file:${dbPath}`
}
```

On app start: `prisma migrate deploy` (applies pending migrations without prompting).
In dev: `prisma migrate dev` (creates migrations).
Ship migrations inside the app bundle.

---

## Implementation Order

1. Project scaffold with `electron-vite` + Tailwind + shadcn
2. Prisma schema + SQLite setup + `db-init.ts`
3. Auth IPC handlers + `bcrypt` hashing
4. Auth page (logo placeholder, login/register)
5. App router + protected shell (sidebar, header)
6. Perfis IPC + pages
7. Companies IPC + pages
8. Template IPC: upload, tag parsing (`docxtemplater`), preview (`mammoth`)
9. Admin template pages (upload → field config → publish)
10. Template browser page
11. Template fill page — split view with live preview
12. Project generation (docx + pdf export)
13. Projects list + detail pages
14. Dashboard stats
15. Admin users page

---

## Verification

- App launches, DB file created at `%APPDATA%/laudor/laudor.db`
- First run: shows "Create account" form → creates admin user
- Login stores session in memory; logout clears it → redirects to auth screen
- User creates a Perfil (personal) and a Company
- Admin uploads `.docx` with `{{nome}}` + `{{cnpj}}` → tags detected → configured → published
- User opens template → selects Perfil + Company → `nome` and `cnpj` pre-filled
- Right panel shows live preview updating as user types
- Generate → pick `.docx` → save dialog → file saved to disk + stored in project
- Generate → pick `.pdf` → hidden window renders HTML → `printToPDF` → saved
- Project appears in list; re-edit restores saved values
- Non-admin cannot see admin routes
