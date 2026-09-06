# Architecture Decision Records (ADRs)

## Como usar este documento

- Toda mudanca de logica relevante exige ADR antes de alteracao no codigo.
- Cada ADR deve registrar contexto, decisao, alternativas descartadas e impactos.

## ADR-0001 — Adocao do Protocolo S.C.A.L.E. com P.A.C.T.

### Status

Aceito

### Contexto

Necessidade de construir SaaS robusto, escalavel e rentavel com foco em contratos de dados, multi-tenancy seguro e evolucao orientada por metricas.

### Decisao

Adotar protocolo S.C.A.L.E. (Strategy, Core, Architecture, Launch, Evolution) e arquitetura em 4 camadas P.A.C.T.:

1. API (`/api`) — contract-first
2. Services (`/services`) — regra de negocio
3. Data (`/repositories`) — acesso a dados
4. Infrastructure (`/infra`) — filas, cache, storage e providers

### Alternativas descartadas

- Desenvolvimento orientado apenas por backlog sem contrato de dados formal
- Arquitetura sem separacao explicita de camadas

### Consequencias

- Maior previsibilidade e qualidade arquitetural
- Entrega inicial potencialmente mais lenta
- Reducao de retrabalho e bugs de fronteira entre camadas

## ADR-0002 — Bloqueio de Execucao ate Discovery + Schema aprovados

### Status

Aceito

### Contexto

Evitar suposicoes de regras de negocio e retrabalho tecnico.

### Decisao

Nao implementar codigo de feature ate:

1. Discovery essencial respondido (ICP, dor central, proposta de valor, monetizacao e restricoes)
2. `schema.md` aprovado
3. `product_plan.md` com User Stories e criterios de aceite

### Alternativas descartadas

- Comecar pela implementacao tecnica sem definicao de negocio

### Consequencias

- Alinhamento forte negocio-tecnologia
- Menor risco de mudancas estruturais tardias

## ADR-0003 — KPI nao obrigatorio para destravar implementacao

### Status

Aceito

### Contexto

Produto em fase inicial com necessidade de acelerar validacao de proposta de valor sem travar implementacao por ausencia de KPIs formais.

### Decisao

Definicao de KPI permanece recomendada, mas nao obrigatoria para liberar implementacao de features.

### Alternativas descartadas

- Manter obrigatoriedade de 2-3 KPIs antes de qualquer desenvolvimento

### Consequencias

- Maior velocidade inicial de execucao
- Necessidade de definir KPIs em fase posterior para orientar evolucao e escala

## ADR-0004 — Stack e escopo tecnico do MVP

### Status

Aceito

### Contexto

Necessidade de definir tecnologia base e escopo funcional de MVP para acelerar implementacao do core de produto.

### Decisao

- Frontend em Next.js
- Backend API em Laravel
- MVP sem integracoes externas de negocio (prioridade no core)
- Multi-tenancy com criacao manual de tenant por admin da plataforma

### Alternativas descartadas

- Iniciar com marketplace aberto para auto-criacao de empresas
- Priorizar integracoes externas antes do core

### Consequencias

- Escopo inicial mais controlado
- Menor complexidade operacional no MVP
