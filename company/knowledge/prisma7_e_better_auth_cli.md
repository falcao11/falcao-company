# CONCEITO: Prisma 7 (prisma.config.ts) e Better Auth CLI Generator

- **Data da explicação:** 2026-11-12
- **Contexto:** Erro de `url` no datasource do Prisma 7 e boas práticas do Better Auth CLI

---

## 1. A Mudança do Prisma 7 (Breaking Change no `url` do Datasource)
No **Prisma 7**, a propriedade `url = env("DATABASE_URL")` foi **completamente removida de dentro do ficheiro `schema.prisma`**.

### O que mudou?
1. O ficheiro `schema.prisma` define apenas o motor:
   ```prisma
   datasource db {
     provider = "postgresql"
   }
   ```
2. A URL de conexão para migrations é agora configurada num ficheiro TypeScript dedicado: **`prisma.config.ts`**:
   ```typescript
   import { defineConfig } from '@prisma/config';
   import * as dotenv from 'dotenv';
   dotenv.config();

   export default defineConfig({
     datasource: {
       url: process.env.DATABASE_URL,
     },
   });
   ```

---

## 2. Como o Better Auth gera os Modelos no Prisma
O **Better Auth** possui uma ferramenta de linha de comandos oficial (`@better-auth/cli`):
- Em vez de escrevermos manualmente os modelos `User`, `Session`, `Account`, etc., o Better Auth lê o teu ficheiro de configuração (ex: `auth.ts`) e corre:
  ```bash
  npx @better-auth/cli generate
  ```
- Este comando inspeciona os plugins ativos (ex: organizações, 2FA, sessões) e **adiciona automaticamente** os modelos com os tipos e campos exatos diretamente no `schema.prisma`.
