# Agency Hub — implantação gratuita no Render

**Data:** 2026-09-12  
**Status:** aprovado em conversa

## Objetivo

Publicar o Agency Hub sem criar assinatura, método de pagamento ou recurso faturável, preservando MySQL e a demonstração isolada de 24 horas. O repositório e a implantação existentes do Workflow permanecem inalterados.

## Arquitetura

- Um único Web Service Docker no plano Free do Render hospeda Laravel, React, Nginx e os processos já definidos pelo projeto.
- Um serviço Aiven for MySQL no plano Free fornece o banco persistente externo.
- O blueprint não cria banco privado, disco persistente ou cron job no Render.
- Credenciais do Aiven entram no Render como variáveis secretas manuais e nunca são versionadas.
- Sessões, cache e fila continuam usando tabelas MySQL.
- A limpeza de demos expiradas usa o mecanismo oportunista e limitado executado durante a criação de novas demos; não depende de cron pago.

## Garantia de custo zero

- `render.yaml` declara somente `plan: free`.
- O blueprint não contém discos, serviços privados, workers ou cron jobs.
- O banco deve ser criado escolhendo explicitamente o plano Aiven Free, que não exige cartão.
- Nenhuma etapa deve adicionar método de pagamento ou aceitar upgrade/trial pago.
- Caso um provedor não ofereça mais o plano gratuito no momento da criação, a implantação deve parar sem provisionar alternativa paga.

## Dados e arquivos

O MySQL persiste no Aiven. O filesystem do Render Free é efêmero e pode ser apagado em reinícios, deploys ou após o serviço dormir. Uploads são bloqueados para demos; uploads de contas pessoais não devem ser anunciados como persistentes nessa implantação gratuita.

O plano Aiven Free oferece 1 GB de armazenamento e limita a organização a um serviço gratuito de cada tipo. A implantação é voltada a demonstração e portfólio, não a produção de alto tráfego.

## Operação e disponibilidade

O Render pode suspender o Web Service após 15 minutos sem tráfego. A primeira requisição após suspensão pode levar aproximadamente um minuto. O workspace dispõe de uma franquia mensal de horas e uso; sem método de pagamento, exceder limites suspende o serviço ou novos builds em vez de gerar cobrança.

## Fluxo de implantação

1. Ajustar e validar o blueprint gratuito localmente.
2. Publicar a alteração no repositório `Hugueninfer/agency-hub`.
3. Criar uma conta/projeto Aiven, se necessário, e um MySQL selecionando explicitamente o plano Free.
4. Criar o Web Service gratuito no Render conectado ao repositório.
5. Configurar `APP_KEY` e as credenciais MySQL como secrets no Render.
6. Validar migrations, health check, headers de proxy, login pessoal e fluxo completo da demo.
7. Capturar apenas dados fictícios, produzir o README final e republicar.

## Verificação

- Validação estrutural do `render.yaml` garante que só existe um serviço Free e nenhuma chave de disco/cron/private service.
- Suites Laravel em SQLite e MySQL, testes frontend, lint, build e auditorias continuam obrigatórios.
- Smoke test Docker confirma inicialização e health check.
- Teste ao vivo confirma criação, isolamento, expiração e reinício da demo.
- Verificação final confirma ausência de credenciais no Git e ausência de alterações no Workflow.

## Limitações aceitas

- Cold start do Render Free.
- Limites de 1 GB e 76 conexões no Aiven Free.
- Sem SLA de produção.
- Sem persistência de uploads no filesystem local.
- Dependência de dois provedores gratuitos e de suas políticas vigentes.
