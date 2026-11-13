# CONCEITO: Ficheiros .gitkeep

- **Data da explicação:** 2026-11-12
- **Contexto:** Estrutura inicial de pastas da Falcão Company

---

## O que é e para que serve?
O **Git** (sistema de controlo de versões) foi desenhado para rastrear **conteúdo de ficheiros** e não pastas. Por esse motivo, se criares uma pasta completamente vazia no teu projeto, o Git simplesmente **ignora-a e não a guarda**.

Para contornar isto, a convenção padrão na indústria é colocar um ficheiro vazio com o nome `.gitkeep` dentro da pasta:
1. **Mantém a pasta no repositório:** Como a pasta agora tem um ficheiro (mesmo que vazio), o Git reconhece-a e guarda a sua estrutura.
2. **Reserva de espaço:** Garante que pastas importantes (como `company/branding/`, `company/knowledge/`, `projects/`) continuam a existir para ti e para qualquer agente ou colaborador.
3. **Descartável:** Assim que começarmos a colocar ficheiros reais dentro dessa pasta, o `.gitkeep` pode ser apagado se quisermos, pois a pasta já não estará vazia.
