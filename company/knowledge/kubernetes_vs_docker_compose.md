# CONCEITO: Kubernetes (K8s) vs. Docker Compose / PaaS em Fase Inicial

- **Data da explicação:** 2026-11-12
- **Contexto:** Decisão de infraestrutura de produção e deploy para o PharmaWaste (Falcão Company)

---

## O que é o Kubernetes?
O **Kubernetes (K8s)** é um orquestrador de contentores à escala planetária, criado pela Google para gerir milhares de contentores distribuídos por dezenas de servidores físicos em simultâneo.

---

## Devo usar Kubernetes para o PharmaWaste nesta fase?
**A resposta curta: Não.** Nesta fase inicial (MVP e primeiros 10 a 50 clientes), adotar Kubernetes seria um caso clássico de *over-engineering* (complexidade desnecessária).

### Os 3 Grandes Problemas do Kubernetes para um MVP:
1. **Sobrecarga de Gestão (DevOps Overhead):**
   - Obriga a configurar e manter: Ingress Controllers, Cert-Manager (certificados SSL), PersistentVolumeClaims (PVCs), ConfigMaps, Secrets e dezenas de manifestos YAML.
   - O foco do fundador deve ser vender o produto às farmácias, e não passar 70% do tempo a resolver problemas de rede interna e pods que caíram.
2. **Bases de Dados em Kubernetes são Complexas:**
   - O PostgreSQL guarda dados de forma persistente (*stateful*). Gerir bases de dados em Kubernetes exige operadores avançados para garantir backups e failover sem corrupção de dados.
3. **Custos Iniciais Elevados:**
   - Um cluster gerido de Kubernetes (ex: AWS EKS, Google GKE, Azure AKS) custa no mínimo **70€ a 120€/mês** só para manter o painel de controlo ativo, sem contar com o tráfego ou as máquinas worker.

---

## Qual a Alternativa Ideal (Moderna, Rápida e Barata)?

| Ambiente | Solução Recomendada | Custo Estimado | Vantagem |
| :--- | :--- | :--- | :--- |
| **Desenvolvimento Local** | **Docker Compose** | 0€ | Sobe Base de Dados, Back e Front num só comando (`docker compose up`). |
| **Produção Inicial (Opção 1 - VPS Próprio)** | **Coolify / Dokku** num VPS (ex: Hetzner) | ~7€ a 13€ / mês | Uma espécie de "Vercel próprio": deploys automáticos via Git, SSL automático e gestão simples de containers Docker. |
| **Produção Inicial (Opção 2 - PaaS)** | **Vercel** (Front) + **Render/Railway** (Back) + **Neon/Supabase** (Postgres) | 0€ a 25€ / mês | Zero gestão de servidores; focado em velocidade total de validação. |

---

## Quando faz sentido migrar para Kubernetes?
Apenas quando a Falcão Company tiver:
- Mais de 200 a 500 farmácias ativas.
- Necessidade de *auto-scaling* dinâmico com dezenas de instâncias por picos repentinos de carga.
- Orçamento para ter um engenheiro de DevOps/SRE dedicado na equipa.
