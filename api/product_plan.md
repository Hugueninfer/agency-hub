# Product Plan (S.C.A.L.E.)

## Status de Execucao

- Protocolo 0 iniciado.
- Bloqueio de execucao ativo: nenhuma feature sera implementada ate Discovery + Schema aprovados.
- Stack aprovada: Next.js (frontend) + Laravel (backend).

## S — Strategy

### ICP (Ideal Customer Profile)

- Perfil principal: empresas que operam com um contratante e equipe de freelancers.
- Contexto operacional: colaboracao entre cliente contratante e colaboradores externos.

### Dor Central

- Problema preliminar: operacao fragmentada em multiplas ferramentas para planejamento, execucao e acompanhamento.
- Estado atual do cliente: uso combinado de ferramentas no estilo Trello, Miro e Toggl, com baixa centralizacao.

### Proposta de Valor Unica

- Proposta oficial (v1): reduzir a "fadiga de ferramentas" ao substituir Trello + Miro + Toggl + faturamento em uma unica plataforma para contratantes e equipes de freelancers.

### Modelo de Monetizacao

- Modelo: planos em EUR definidos por quantidade de usuarios (pricing por seat).
- Evolucao prevista: tiers por volume de usuarios e limites de recursos por plano.

### Metricas Norte

- Status: opcional nesta etapa por decisao de produto.
- Observacao: KPI nao e pre-requisito para desbloquear implementacao de feature.

### Restricoes (regulatorias, geograficas e seguranca)

- Conformidade obrigatoria com LGPD.
- Conformidade obrigatoria com regulamentacoes europeias aplicaveis (ex.: GDPR).

## Definicao de Produto (v1)

### Resumo da ideia de negocio

- SaaS para empregador e equipe (incluindo freelancers) com foco em operacao diaria.
- Objetivo principal: reduzir "fadiga de ferramentas" em um unico produto.
- Substituir combinacao de Trello + Miro + Toggl + gerador de invoice.

### Modulos principais

1. Dashboard com indicadores relevantes de operacao
2. Gestao de tarefas em Kanban
3. Boards colaborativos estilo Excalidraw
4. Gerador de invoices
5. Configuracoes de tenant, usuarios, funcoes e permissoes
6. Timesheet com visoes analiticas por cliente e por usuario

### Escopo funcional detalhado (MVP)

#### Dashboard

- Exibir visao executiva de tarefas, horas e faturamento.

#### Kanban de tarefas

- Colunas: `A fazer`, `Desenvolvimento`, `Pendente`, `Concluido`
- Filtros por usuario
- Card com descricao, comentarios, subtarefas e upload de imagens

#### Board visual

- Editor baseado em Excalidraw
- Criar e excluir boards por projeto/tenant

#### Invoices

- Geracao de invoices no estilo Invoice Ocean
- Itens, valores, impostos e status de pagamento

#### Configuracoes

- Editar informacoes do tenant
- Convidar/adicionar usuarios
- Criar funcoes (roles) e permissoes
- Gerenciar projetos

#### Timesheet

- Visao agregada de horas por cliente e por usuario
- Exemplo: cliente X total 20h (10h usuario A + 10h usuario B)
- Visao tabular de lancamentos por usuario
- Usuario registra horas por projeto com descricao e quantidade de horas

## Multi-tenancy e acesso

- Plataforma fechada: admin da plataforma cria empresas (tenants) manualmente.
- Usuarios pertencem a um tenant e operam apenas no escopo desse tenant.

## Integracoes externas

- MVP: nenhuma integracao externa obrigatoria alem do necessario para infraestrutura basica.
- Prioridade inicial: construir core com qualidade antes de expandir integracoes.

## Jornada do Usuario

### Jornada alvo (rascunho inicial)

1. Descoberta do produto
2. Cadastro
3. Ativacao
4. Primeiro valor
5. Uso recorrente
6. Expansao/upgrade

## Roadmap por Fases (S.C.A.L.E.)

### Fase 1 — Strategy

- Discovery completo
- Definicao de ICP, problema, UVP, monetizacao e restricoes
- Pesquisa de mercado e integracoes esperadas

### Fase 2 — Core

- Auth e identidade
- Multi-tenancy
- Billing e planos
- RBAC

### Fase 3 — Architecture

- Contratos de API definidos
- Servicos desacoplados
- Repositorios e indices
- Infra observavel e intercambiavel

### Fase 4 — Launch

- CI/CD, feature flags e migrations reversiveis
- Producao com secrets, backup e runbook
- Onboarding self-service validado por cliente pagante

### Fase 5 — Evolution

- Feedback loop estruturado
- Priorizacao por impacto x esforco x alinhamento
- Sprints com retrospectiva e atualizacao de progresso

## User Stories (obrigatorio antes de code de feature)

> Nenhuma implementacao de feature sem User Story + criterio de aceite.

### Template de User Story

- Como: [tipo de usuario]
- Eu quero: [objetivo]
- Para: [beneficio]

### Criterios de aceite (template)

- Dado [contexto], quando [acao], entao [resultado]
- Dado [contexto], quando [acao], entao [resultado]

## User Stories iniciais (MVP)

### US-001 — Criar e gerenciar tenant (admin da plataforma)

- Como administrador da plataforma, eu quero criar empresas manualmente para controlar entrada na plataforma fechada.
- Criterios de aceite:
  - Dado um admin autenticado, quando criar uma empresa, entao um novo tenant e criado com status ativo.
  - Dado um tenant criado, quando consultar dados, entao nao ha acesso cruzado entre tenants.

### US-002 — Gerenciar tarefas no Kanban

- Como gestor de equipe, eu quero organizar cards por status para acompanhar o fluxo de trabalho.
- Criterios de aceite:
  - Dado um projeto, quando mover card entre colunas, entao o status e persistido.
  - Dado um card, quando adicionar comentarios/subtarefas/imagens, entao os dados ficam vinculados ao card.

### US-003 — Registrar horas por projeto

- Como usuario do tenant, eu quero registrar horas em projetos para controle operacional e faturamento.
- Criterios de aceite:
  - Dado um usuario autenticado, quando registrar horas com descricao e projeto, entao o lancamento e salvo.
  - Dado um cliente, quando visualizar consolidado, entao o total por usuario e total geral sao exibidos.
