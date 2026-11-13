# AGENT CORE - REGRAS FUNDAMENTAIS DE COMPORTAMENTO E OPERAÇÃO

Este documento define o protocolo obrigatório de execução para qualquer agente que opere neste workspace.

---

## 1. PROTOCOLO DE BOOTSTRAP (INÍCIO DE QUALQUER SESSÃO)
No início de qualquer nova sessão ou conversa:
1. **Lê obrigatoriamente primeiro o ficheiro central:**
   - `.agent/INDEX.md`
2. **Segue os ponteiros do INDEX:**
   - Consulta `.agent/CURRENT_TASK.md` para identificar o ponto exato onde a última sessão parou.
   - Consulta `.agent/MEMORY.md` para entender as rotas de memória necessárias para a tarefa.
3. **Primeira mensagem ao utilizador:**
   - Apresentar um micro-resumo situacional de 2 linhas:
     > *"Último ponto de paragem: [X]. Próximo passo planeado: [Y]. Continuamos aqui ou queres mudar de foco?"*

---

## 2. ATUALIZAÇÃO EM TEMPO REAL (CRASH-RESILIENT)
Nunca adiar o registo para o final da sessão. O registo é contínuo e em tempo real:
1. **Regra de Substituição no CURRENT_TASK.md:**
   - O `CURRENT_TASK.md` contém **apenas a tarefa ativa do momento e os seus micro-passos**.
   - **Não acumular histórico antigo no CURRENT_TASK.md**: à medida que as tarefas mudam, o conteúdo é substituído pela nova tarefa viva. O histórico consolidado pertence exclusivamente aos `daily_logs`.
2. **Ao iniciar uma tarefa ou micro-passo:**
   - Atualizar imediatamente `.agent/CURRENT_TASK.md` marcando o item ativo como `[/] [EM CURSO]: <descrição da ação>`.
3. **Ao concluir o micro-passo:**
   - Adicionar uma entrada no log diário da data corrente em `operations/daily_logs/AAAA/MM/DD.md`.
   - Se a tarefa principal estiver concluída, substituir `.agent/CURRENT_TASK.md` pela próxima tarefa ativa.

---

## 3. RASTREIO DE PERGUNTAS E APRENDIZAGENS DO FUNDADOR
Sempre que o utilizador fizer uma pergunta conceptual, técnica ou de negócio (ex: *"o que é uma API?", "o que é CAC?", "como funciona X?"*):
1. **Registar no Log Diário:**
   - Inserir no log do dia (`operations/daily_logs/AAAA/MM/DD.md`): `[Q&A]: Esclarecimento sobre <tema>`.
2. **Indexar na Base de Conhecimento (`company/knowledge/`):**
   - Criar ou atualizar a ficha correspondente em `company/knowledge/<conceito>.md` contendo:
     - Conceito / Dúvida
     - Data em que foi abordada
     - Resumo da explicação dada e relevância para a empresa
3. **Revisitações Futuras:**
   - Se o utilizador voltar a perguntar ou referir o tema, consultar `company/knowledge/<conceito>.md` e referenciar:
     > *"No dia DD/MM/AAAA já abordámos este conceito. Queres rever os pontos principais ou aplicar ao caso prático atual?"*

---

## 4. CRIAÇÃO DE SKILLS (REGRA DOS 3X)
1. Monitorizar rotinas, comandos, prompts ou fluxos operacionais que se repitam.
2. Ao detetar a **3ª repetição** de um mesmo padrão de trabalho:
   - Sinalizar proativamente ao utilizador:
     > *"Detetei que executámos este fluxo 3 vezes. Recomendo compilar este processo numa skill em `.gemini/skills/<nome-da-skill>/SKILL.md`. Posso avançar com a criação?"*
3. **Regra de ouro:** NUNCA criar uma skill sem autorização explícita do utilizador.

---

## 5. BOAS PRÁTICAS DE ENGENHARIA E BASE DE DADOS
- **Pesquisa Prévia na Documentação Oficial:** Antes de propor ou implementar código de qualquer biblioteca ou framework, o agente deve SEMPRE consultar e verificar a documentação oficial atualizada da ferramenta, rejeitando soluções desatualizadas ou inventadas.
- **Evitar `useEffect` Categoricamente no React / Next.js:** O agente deve seguir estritamente as diretrizes oficiais do React ("You Might Not Need an Effect"). Data fetching deve ser feito via Server Components com `async/await`, mutações via Event Handlers diretos ou Server Actions, e cálculos feitos diretamente na renderização. `useEffect` só é permitido em casos extremos de APIs imperativas de terceiros.
- **Prisma Migrations Obrigatórias:** NUNCA utilizar `prisma db push` em ambientes de desenvolvimento ou produção estruturados. Toda e qualquer alteração de esquema deve ser executada e documentada via **Prisma Migrations** (`prisma migrate dev`), garantindo rastreio determinístico do histórico.
- **Padrão Obrigatório NestJS + Better Auth:** Em todos os projetos que envolvam NestJS e Better Auth, utilizar SEMPRE a biblioteca `@thallesp/nestjs-better-auth`. Utilizar `AuthModule.forRoot({ auth })`, `@AllowAnonymous()`, `@RequireActiveOrg()`, `@OrgRoles()` e `@Session()`, sem recriar autenticação caseira.

---

## 6. ESTILO DE COMUNICAÇÃO (HÍBRIDO - TIPO C)
- **Execução prática (código, tarefas, ficheiros):** Direto ao assunto, sem rodeios, focado na ação e em bullet points.
- **Estratégia, arquitetura e conceitos de negócio:** Consultivo, aprofundado, apresentando contexto, opções e prós/contras.
