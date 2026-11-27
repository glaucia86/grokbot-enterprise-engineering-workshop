# Guia da apresentadora — Packt · 11 de dezembro de 2026

Apresentação ao vivo em inglês · 60 minutos · [Instruções de prévia](README.md) · [Facilitator Guide (EN)](../docs/workshop/FACILITATOR-GUIDE.md)

## Antes de compartilhar a tela

1. Abra a versão da apresentadora (`bun run slides:preview:presenter`) e pressione **S**. Mantenha a janela de notas fora do compartilhamento. Na janela do público, comece em `#/start`.
2. Prepare o checkout demo em `workshop/starter` com Bun 1.4.5, Docker Compose v2 (`postgres:18.7` e `eclipse-temurin:21-jre-alpine` pré-baixados) e Chromium. Copie `.env.example` para `.env`, rode `bun install --frozen-lockfile`, `bun run lab:bootstrap`, `bun run lab:seed:ph42` e `bun run dev`.
3. Pré-cacheie `artifacts/.cache/tla2tools-1.7.4.jar` executando `bun run verify:formal --run-id preflight` antes da sessão para o demo TLA+ rodar offline em menos de 5 segundos.
4. Confira os 6 checkpoints de recuperação (`checkpoint-00-starter` até `checkpoint-05-pr-ready`). Nunca apresente artefatos de ensaio como se tivessem sido gerados ao vivo.

## Brief para GrokBot · 24 min

> Investigate PH-42 in this isolated Procurement Hub lab checkout. Read AGENTS.md, doc-specs/03-demo-issue-42.md, SPEC.md, and skills/verify-procurement/SKILL.md. Reproduce the concurrent approval overspend with `bun run ph42:reproduce`, state your root-cause hypothesis across PostgreSQL locking, DB constraints, and approval idempotency (INV-01–INV-10), implement the minimal targeted fix preserving all ESLint boundaries, and verify with `bun run check:static`, `bun run ph42:reproduce`, `bun run test:concurrency`, and `bun run test:security`. Allow at most 2 self-correction attempts; never weaken tests or ESLint rules; leave merge to the human reviewer.

## Talk track por slide

<!-- slide:start -->
### 1. From Issue to Verified Pull Request · 00:00–01:00

**EN**

Welcome. Over the next 60 minutes we will take a real enterprise financial concurrency incident from live failure reproduction to a verified, reviewable Pull Request. Our reference system is Procurement Hub — a multi-tenant corporate procurement platform with Cost Center budgets, approval limits, financial commitments, and audit trails. Each role on this slide represents a distinct responsibility, and I will hold the Human Reviewer seat at the end.

**PT-BR**

Boas-vindas. Nos próximos 60 minutos vamos levar um incidente real de concorrência financeira desde a reprodução ao vivo até um Pull Request verificado e revisável. Nosso sistema de referência é o Procurement Hub, uma plataforma corporativa multi-tenant com orçamentos de Centros de Custo, limites de aprovação, compromissos financeiros e trilha de auditoria. Cada papel neste slide representa uma responsabilidade distinta, e eu fico na cadeira de Human Reviewer no final.

**Palco**

Mostre o elenco de papéis e avance para a pergunta inicial.


<!-- slide:trust -->
### 2. The reviewer’s question · 01:00–03:00

**EN**

Ask yourself: what proof would you require before approving an AI-generated pull request that modifies financial budget code? Throughput without verification just generates faster defects. Our goal today is not merely to demo GrokBot, but to engineer a verifiable environment around any coding agent.

**PT-BR**

Pergunte a si mesmo: que prova você exigiria antes de aprovar um pull request gerado por IA que mexe em código de orçamento financeiro? Vazão sem verificação apenas gera defeitos mais rápido. Nosso objetivo hoje não é só demonstrar o GrokBot, mas construir um ambiente verificável ao redor de qualquer agente.

**Palco**

Dê 15 segundos para reflexão e avance para a Trust Pyramid.


<!-- slide:trust-pyramid -->
### 3. Workshop Trust Pyramid · 03:00–06:00

**EN**

Adapted from Lauren Tan’s talk All Code Is Slop (Except Mine), this five-layer workshop pyramid shows where engineering investment pays off most. Start with codebase design and exact types like MoneyMinor. Enforce module boundaries, database CHECK constraints, Vitest, and fast-check deterministically. Verify against the live app and real PostgreSQL. Model-check critical concurrent protocols in TLA+. Reserve prose rules and skills for judgment — and keep human review as the final delivery gate.

**PT-BR**

Adaptada da palestra All Code Is Slop (Except Mine) da Lauren Tan, esta pirâmide de cinco camadas mostra onde o investimento de engenharia mais compensa. Comece pela arquitetura e tipos exatos como MoneyMinor. Aplique fronteiras ESLint, restrições CHECK no banco, Vitest e fast-check deterministicamente. Verifique no app e PostgreSQL reais. Cheque protocolos concorrentes críticos em TLA+. Deixe regras em texto para julgamento e mantenha a revisão humana como portão final.

**Palco**

Revele as 5 faixas uma a uma. Destaque que esta decomposição em 5 camadas é uma adaptação do workshop inspirada na Lauren Tan.


<!-- slide:procurement-hub -->
### 4. Pillar 01 — Enforceable Architecture · 06:00–07:00

**EN**

Pillar one is the codebase itself. Procurement Hub is a brownfield Modular Monolith with two synthetic tenants, three Cost Centers, nine role-scoped identities, and explicit monetary approval limits. Agents learn patterns from the repository, so our boundaries must be structural rather than wishful prose.

**PT-BR**

O primeiro pilar é a própria base de código. O Procurement Hub é um Monólito Modular brownfield com dois tenants sintéticos, três Centros de Custo, nove identidades com papéis e limites explícitos de aprovação. Agentes aprendem padrões do repositório, portanto nossas fronteiras precisam ser estruturais, não apenas texto.

**Palco**

Destaque o Engineering Lead e avance para o incidente PH-42.


<!-- slide:invariant -->
### 5. PH-42 — Two $7,000 approvals overspend a $10,000 budget · 07:00–09:00

**EN**

Here is incident PH-42. Northstar Cost Center CC-ENG-01 has $10,000 allocated. Two pending requests require $7,000 each. Under concurrent approval, a stale read lets both succeed, committing $14,000 and driving available budget to minus $4,000. We model ten explicit invariants — INV-01 through INV-10 — covering financial bounds, idempotent retries, payload conflicts, tenant isolation, authorization on replay, state machine integrity, audit consistency, and atomic recovery.

**PT-BR**

Este é o incidente PH-42. O Centro de Custo CC-ENG-01 da Northstar tem $10.000 alocados. Duas requisições pendentes pedem $7.000 cada. Sob aprovação concorrente, uma leitura obsoleta deixa ambas passarem, comprometendo $14.000 e levando o disponível a menos $4.000. Modelamos dez invariantes explícitas — INV-01 a INV-10 — cobrindo teto orçamentário, retries idempotentes, conflitos de payload, isolamento de tenant, autorização em replay, máquina de estados, auditoria e atomicidade.

**Palco**

Mostre rapidamente o dashboard local em http://127.0.0.1:3000 com CC-ENG-01 ($10,000) e as duas requisições de $7,000.


<!-- slide:boundaries -->
### 6. Follow the invariant to the write boundary · 09:00–12:00

**EN**

Trace an approval from HTTP to PostgreSQL. Next.js validates strict Zod schemas and resolves server-side sessions. Domain rules stay pure with zero external imports and no floating-point parsing. PostgreSQL owns row-level FOR UPDATE locking, CHECK constraints, and atomic audit writes across multiple app instances. Let’s prove our ESLint boundary rules reject violations right now with bun run verify:architecture.

**PT-BR**

Siga a aprovação do HTTP até o PostgreSQL. O Next.js valida esquemas Zod estritos e resolve a sessão no servidor. O domínio permanece puro, sem imports externos nem ponto flutuante. O PostgreSQL garante lock FOR UPDATE, restrições CHECK e escrita atômica de auditoria entre múltiplas instâncias. Vamos provar agora que o ESLint rejeita violações com bun run verify:architecture.

**Palco**

Rode `bun run verify:architecture` no terminal (5 fixtures rejeitadas pelo ESLint). Volte ao slide 7.


<!-- slide:boot-lab -->
### 7. Pillar 02 — Harness Engineering & Verification Skills · 12:00–15:00

**EN**

Pillar two makes verification repeatable. Adapted from pstack’s create-verification-skill, our verify-procurement skill defines Launch, Doctor, Drive, Evidence, and Cleanup. Eight user-POV Feature Maps give both humans and agents shared selectors, API endpoints, invariants, and exact commands so nobody has to guess how to test the app.

**PT-BR**

O segundo pilar torna a verificação repetível. Adaptada da create-verification-skill do pstack, nossa skill verify-procurement define Launch, Doctor, Drive, Evidence e Cleanup. Oito Feature Maps na visão de usuário dão a humanos e agentes seletores estáveis, endpoints, invariantes e comandos exatos.

**Palco**

Mostre brevemente `skills/verify-procurement/SKILL.md` e `features/README.md`.


<!-- slide:try-the-app -->
### 8. Live walkthrough — budgets, limits, audit & isolation · 15:00–20:00

**EN**

Before breaking anything, let’s run lab:doctor to confirm PostgreSQL, seeded Cost Centers, and anonymous 401 checks are healthy. In the browser, watch how a Junior Approver with a $5,000 limit is blocked on a $7,000 request, while a Senior Approver commits funds atomically, Northstar Auditor sees 1:1 audit events, and Meridian gets 404 on foreign IDs.

**PT-BR**

Antes de reproduzir a falha, rodamos lab:doctor para confirmar banco, Centros de Custo e 401 anônimo. No navegador, veja como um Junior Approver com limite de $5.000 é bloqueado em $7.000, enquanto o Senior Approver compromete fundos atomicamente, o Auditor vê eventos 1:1 e a Meridian recebe 404 em IDs de outro tenant.

**Palco**

Rode `bun run lab:doctor` e mostre o app em http://127.0.0.1:3000. Atingir slide 9 até 20:00.


<!-- slide:runtime -->
### 9. Pillar 03 — Runtime Verification & Self-Correcting Loops · 20:00

**EN**

Now we enter Pillar three: live failure reproduction and bounded self-correction. Unlike mocked tests or static snapshots, we are going to break the real running Next.js application and inspect real PostgreSQL balances before and after.

**PT-BR**

Agora entramos no terceiro pilar: reprodução ao vivo da falha e autocorreção limitada. Diferente de mocks ou snapshots estáticos, vamos quebrar a aplicação Next.js real e inspecionar os saldos reais no PostgreSQL antes e depois.

**Palco**

Avance imediatamente para o slide 10 e abra o terminal.


<!-- slide:reproduce -->
### 10. Reproduce PH-42 live on workshop/starter · 20:00–24:00

**EN**

Running bun run ph42:reproduce sends two real concurrent HTTP approvals for $7,000 each against Northstar’s $10,000 CC-ENG-01 budget. Both return HTTP 200 APPROVED. PostgreSQL now holds $14,000 committed and minus $4,000 available — violating INV-01 and INV-02 with exit code 1. Refreshing the browser shows OVERSPENT in red directly from the database.

**PT-BR**

Executar bun run ph42:reproduce envia duas aprovações HTTP concorrentes reais de $7.000 cada contra o orçamento de $10.000 do CC-ENG-01. Ambas retornam HTTP 200 APPROVED. O PostgreSQL registra $14.000 comprometidos e menos $4.000 disponíveis — violando INV-01 e INV-02 com saída 1. Recarregando o navegador vemos OVERSPENT em vermelho vindo direto do banco.

**Palco**

Execute `bun run ph42:reproduce` no terminal em `workshop/starter` e recarregue `http://127.0.0.1:3000` para mostrar `-$4,000.00 (OVERSPENT)`.


<!-- slide:agent-loop -->
### 11. Live GrokBot bounded loop · 24:00–36:00

**EN**

Now we hand GrokBot the issue, invariants, and verification skill. Notice our bounded Loop Engineering engine in engineering/loop-runner.ts: it persists state and handoffs outside chat context, enforces a two-correction cap, refuses to re-run identical failing commands without a new hypothesis, and trips a scope guard if protected ESLint rules or security tests are altered. Watch the root fix emerge: row-level FOR UPDATE locking on cost_centers, a database CHECK constraint, unique financial commitments, and tenant-scoped decision_idempotency_keys with authorization re-checked on replay.

**PT-BR**

Agora entregamos ao GrokBot a issue, invariantes e skill de verificação. Note nosso motor de Loop Engineering em engineering/loop-runner.ts: ele persiste estado e handoffs fora do chat, limita a duas autocorreções, impede repetir o mesmo comando falhando sem nova hipótese e dispara guarda de escopo se regras ESLint ou testes de segurança forem alterados. Veja a correção raiz: lock FOR UPDATE em cost_centers, CHECK no banco, unicidade de commitments e decision_idempotency_keys com revalidação de autorização em replay.

**Palco**

Execute o brief no GrokBot (ou avance para `checkpoint-03-implementation` se atingir 35:00). Revele o fragmento com a correção raiz.


<!-- slide:verify-live -->
### 12. Live solution verification · 36:00–40:00

**EN**

Now we exercise the corrected API and database with the exact same command: bun run ph42:reproduce. One approval commits $7,000 with HTTP 200; the competing approval fails cleanly with HTTP 409 INSUFFICIENT_BUDGET. PostgreSQL holds $7,000 committed, $3,000 available, one financial commitment, and one APPROVED audit event — exit code 0. Then test:concurrency and test:security falsify 6-way bursts, same-key retries, cross-tenant probes, and revoked-role replays.

**PT-BR**

Agora exercitamos a API e o banco corrigidos com o mesmo comando: bun run ph42:reproduce. Uma aprovação compromete $7.000 com HTTP 200; a concorrente falha limpo com HTTP 409 INSUFFICIENT_BUDGET. O PostgreSQL mantém $7.000 comprometidos, $3.000 disponíveis, um commitment e um evento APPROVED — saída 0. Em seguida test:concurrency e test:security testam rajadas simultâneas, retries com mesma chave, acesso cross-tenant e replay com papel revogado.

**Palco**

Execute `bun run ph42:reproduce`, `bun run test:concurrency` e `bun run test:security`. Destaque saída 0 e o QA Engineer.


<!-- slide:optional-extension -->
### 13. Formal verification with TLA+ / TLC · 48:00–53:00

**EN**

Tests check scenarios we thought to write; formal model checking explores every reachable interleaving in a bounded scope. Running bun run verify:formal uses Dockerized TLC with zero host Java setup. On defective-read-commit.cfg, TLC exits 12 and prints a 7-step counterexample violating BudgetNotExceeded. On locked-atomic.cfg, TLC exhausts 473 generated and 225 distinct states with zero queued and confirms all six invariants hold, including lost-response retries. Remember: fast-check is property testing, not formal verification, and TLA+ verifies the bounded model — not the full TypeScript runtime.

**PT-BR**

Testes checam cenários que pensamos em escrever; model checking formal explora todos os entrelaçamentos alcançáveis num escopo limitado. Rodar bun run verify:formal usa TLC em Docker sem instalar Java no host. Em defective-read-commit.cfg, o TLC sai com 12 e gera contraexemplo de 7 passos violando BudgetNotExceeded. Em locked-atomic.cfg, exaure 473 estados gerados e 225 distintos confirmando as seis invariantes, incluindo retries após perda de resposta. Lembre: fast-check não é verificação formal, e TLA+ prova o modelo finito, não o runtime TypeScript inteiro.

**Palco**

Execute `bun run verify:formal --run-id live-tlc` (4 segundos com imagem em cache) e mostre `artifacts/formal/live-tlc/summary.md`.


<!-- slide:run-harness -->
### 14. Pillar 04 — Evidence-Based Software Delivery · 40:00–43:00

**EN**

Pillar four turns local proof into enterprise governance. One command — bun run verify:all — launches an isolated stack, runs 14 checks across static, architecture, unit, property, integration, concurrency, security, migration, and Chromium E2E, writes manifest.json and summary.md bound to the exact clean Git SHA, and tears down resources while preserving the evidence. Six independent least-privilege CI jobs repeat those gates, plus a governance-guard that alerts reviewers whenever verifier files change.

**PT-BR**

O quarto pilar transforma prova local em governança corporativa. Um comando — bun run verify:all — sobe o ambiente isolado, executa 14 checagens entre estático, arquitetura, unitário, propriedades, integração, concorrência, segurança, migrações e E2E no Chromium, gera manifest.json e summary.md vinculados ao SHA limpo exato e limpa tudo preservando a evidência. Seis jobs independentes no CI repetem esses portões, além do governance-guard que alerta revisores caso arquivos de verificação sejam alterados.

**Palco**

Abra `artifacts/verification/solution/<run-id>/summary.md` e `.github/workflows/workshop-verification.yml`.


<!-- slide:review -->
### 15. Would you approve this exact revision? · 43:00–48:00

**EN**

As the Human Reviewer, I inspect the 11-section PR template, verify that the PR head SHA matches the independent CI run, check governance-guard to confirm no tests or ESLint boundaries were weakened, and review database counts and limitations. Remember to distinguish committed workflow files from administrative GitHub Branch Rulesets — agents never self-approve or merge to main.

**PT-BR**

Como Human Reviewer, inspeciono o template de PR de 11 seções, confirmo que o SHA do PR bate com o CI independente, checo o governance-guard para garantir que testes e fronteiras ESLint não foram enfraquecidos e reviso contagens do banco e limitações. Lembre de distinguir workflows versionados das Branch Rulesets administrativas do GitHub — agentes nunca autoaprovam ou fazem merge na main.

**Palco**

Mostre `.github/pull_request_template.md` e `docs/governance/ENTERPRISE-GOVERNANCE.md`. Avance ao slide 13 (TLA+ às 48:00) ou siga conforme sequência.


<!-- slide:takeaways -->
### 16. Reusable Enterprise Starter Kit · 53:00–55:00

**EN**

Procurement Hub is the reference case; the real takeaway is the Reusable Enterprise Starter Kit in starter-kit/. Twelve ready-to-adapt templates — from the architecture checklist and AGENTS.md template to Feature Maps, verification skill, TLA+ starter, loop playbook, evidence schema, CI gates, and governance checklist — plus a four-week brownfield adoption guide so your team can introduce one invariant at a time without rewriting legacy code.

**PT-BR**

O Procurement Hub é o caso de referência; o verdadeiro entregável é o Reusable Enterprise Starter Kit em starter-kit/. Doze templates prontos para adaptar — do checklist de arquitetura e AGENTS.md aos Feature Maps, skill de verificação, starter TLA+, playbook de loop, schema de evidências, CI e governança — além de um guia de adoção incremental de quatro semanas para sistemas brownfield.

**Palco**

Aponte `starter-kit/README.md` e `docs/workshop/PARTICIPANT-GUIDE.md`.


<!-- slide:questions -->
### 17. Don’t just build better agents · 55:00–60:00

**EN**

We moved from a live $4,000 budget overrun to an ACID, formally checked, independently verified Pull Request. Do not just chase better prompts or better models — engineer better environments where agents can prove their work. Which recurring mistake in your repository will you turn into an executable guardrail next week? Let’s open for Q&A.

**PT-BR**

Saímos de um estouro real de orçamento de $4.000 para um Pull Request ACID, model-checked e verificado de forma independente. Não busque apenas prompts ou modelos melhores — construa ambientes melhores onde agentes consigam provar o próprio trabalho. Qual erro recorrente do seu repositório você vai transformar em guardrail executável na próxima semana? Vamos às perguntas.

**Palco**

Mantenha o elenco na tela, conduza o Q&A e encerre dentro dos 60 minutos.
