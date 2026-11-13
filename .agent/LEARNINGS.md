# PREFERÊNCIAS E APRENDIZAGENS (LEARNINGS)

Registo contínuo de preferências de trabalho, regras operacionais e heurísticas validadas com o fundador.

---

## Preferências de Trabalho do Fundador
- **Estilo de Comunicação:** Híbrido (Tipo C) — direto na execução prática, consultivo e aprofundado em decisões estratégicas.
- **CURRENT_TASK Limpo e Sem Acumulação:** No `CURRENT_TASK.md`, substituir sempre o conteúdo pela tarefa e sub-passos ativos do momento, sem acumular histórico concluído (o histórico passado pertence exclusivamente aos `daily_logs`).
- **Pesquisa Prévia Obrigatória na Documentação Oficial:** Antes de escrever qualquer código, arquitetura ou configuração de uma biblioteca/framework (NestJS, Next.js, Prisma, Better Auth, etc.), fazer SEMPRE pesquisa e verificação rigorosa da documentação oficial atualizada, seguindo estritamente as suas diretrizes canónicas.
- **Evitar `useEffect` Categoricamente no React / Next.js:** Eliminar o uso desnecessário de `useEffect` (conforme as diretrizes oficiais "You Might Not Need an Effect"). Privilegiar:
  1. **Server Components:** Data fetching direto no servidor com `async/await` (zero waterfalls, zero loading spinners).
  2. **Event Handlers Diretos:** Tratar respostas e mutações diretamente na ação do utilizador (`onDrop`, `onClick`, `onSubmit`).
  3. **Valores Derivados:** Calcular filtros e totais durante o render em vez de sincronizar estados com `useEffect`.
  4. Reservar `useEffect` apenas para casos extremos e inevitáveis de subscrição de APIs externas do browser.
- **Padrão Obrigatório NestJS + Better Auth:** Em todos os projetos que combinem NestJS e Better Auth, utilizar OBRIGATORIAMENTE a biblioteca `@thallesp/nestjs-better-auth`. Adotar a sua arquitetura canónica: `AuthModule.forRoot({ auth })`, `@AllowAnonymous()`, `@RequireActiveOrg()`, `@OrgRoles()` e `@Session()`, evitando criar guards ou decorators manuais.
- **Versões Recentes mas Estáveis (Sem RCs/Betas):** Utilizar sempre as versões mais recentes estáveis e testadas do ecossistema (ex: Prisma v7.10 em vez de v8-rc; NestJS v11; Next.js v16; Better Auth v1.7), evitando versões candidatas/experimentais para garantir fiabilidade absoluta da documentação e código.
- **Base de Dados com Migrations:** Usar SEMPRE Prisma Migrations (`prisma migrate`) para qualquer alteração de base de dados, garantindo rastreabilidade, histórico e rollback seguro.
- **Validação Prévia:** Fazer perguntas e validar abordagens antes de escrever alterações estruturais.
- **Registo em Tempo Real:** Atualizar tarefas e registos diários no momento em que as ações acontecem, prevenindo perda de contexto por queda de sessão.
- **Skills Automatizadas:** Propor a criação de uma *skill* quando um padrão ou fluxo se repetir 3 vezes (e aguardar aprovação explícita).
