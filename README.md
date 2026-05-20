# Laudor

Desktop application for filling Word document templates and generating professional reports. Built for the Brazilian market with support for managing profiles, companies, and reusable templates.

<p align="center">
  <img src="resources/icon.png" alt="Laudor" width="120" />
</p>

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop | Electron 33 |
| Frontend | React 19, React Router 7, TypeScript 5.7 |
| Styling | Tailwind CSS 4, Radix UI, Lucide React |
| Forms | React Hook Form 7, Zod |
| Database | SQLite via Prisma 5 |
| Document processing | docxtemplater, mammoth, PizzIP |
| Build | electron-vite, Vite 6, electron-builder |

---

## Features

### Authentication
- User registration and login with bcrypt-hashed passwords
- Admin role with user management panel (promote/demote, delete users)

### Template Management
- Upload `.docx` files as templates
- Define typed fields: `text`, `textarea`, `number`, `date`, `email`, `dropdown`
- Fields can auto-fill from linked profiles or companies via `defaultFrom` bindings
- Draft/Published workflow — only published templates are available to create projects from
- Live HTML preview with inline placeholder highlighting

### Profile Management (Perfis)
- Store personal data: name, CPF, RG, email, phone, mobile
- Full address: CEP, street, number, complement, neighborhood, city, state
- Profile picture support
- Custom additional fields and tags

### Company Management
- Store business data: Razão Social, Nome Fantasia, CNPJ, state/municipal registration
- Contact details, representative name, address
- Tags for organization

### Project Management
- Create a project by selecting a published template
- Link a profile and/or company — their data auto-fills matching template fields
- Fill remaining fields manually with a live document preview
- Generate the filled document in DOCX or PDF format
- Re-generate multiple times; use "Concluir" to save and close when done

### Document Generation
- DOCX output via docxtemplater tag substitution
- PDF conversion via Puppeteer-rendered HTML
- Files saved to the user's chosen location via native save dialog

---

## Development

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install
```

### Run in development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Type check

```bash
npm run typecheck
```

### Lint

```bash
npm run lint
```

---

## Project Structure

```
src/
├── main/           # Electron main process — IPC handlers, Prisma client, file I/O
├── preload/        # Context bridge — exposes typed window.api to renderer
└── renderer/       # React app
    └── src/
        ├── components/   # Shared UI components
        ├── hooks/        # Custom React hooks
        ├── lib/          # API client, utilities
        └── pages/        # Route-level page components
prisma/
└── schema.prisma   # SQLite schema (User, Perfil, Company, Template, Project)
resources/
└── icon.{ico,png}  # Application icons
```

---

## License

Private — all rights reserved.
