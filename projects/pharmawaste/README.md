# PharmaWaste (Falcão Company)

> Plataforma inteligente de gestão preditiva de validades e automatização de devoluções de medicamentos para farmácias.

---

## 🛠️ Stack Tecnológica
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, Lucide Icons, React Dropzone.
- **Backend:** NestJS, TypeScript, Swagger (OpenAPI), Better Auth.
- **ORM & Migrations:** Prisma ORM.
- **Base de Dados:** PostgreSQL 16 (via Docker).

---

## 🚀 Como Executar em Desenvolvimento

### 1. Subir os Contentores com Docker Compose:
```bash
docker compose up -d
```

### 2. Aceder aos Serviços:
- **Frontend Web:** [http://localhost:3000](http://localhost:3000)
- **API Swagger Docs:** [http://localhost:3333/api/docs](http://localhost:3333/api/docs)
- **PostgreSQL Database:** `localhost:5432` (db: `pharmawaste_db`, user: `pharma_user`)

### 3. Executar Migrations do Prisma:
```bash
cd apps/api
npm run prisma:migrate
```
