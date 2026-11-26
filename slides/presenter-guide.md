# Guia da apresentadora — Packt · 11 de dezembro de 2026

Apresentação ao vivo em inglês · 60 minutos · [Instruções de prévia](README.md)

## Antes de compartilhar a tela

1. Abra a versão da apresentadora e pressione **S**. Mantenha a janela de notas fora do compartilhamento. Na janela do público, comece em `#/start`. Use as setas para avançar slides e fragmentos. Teste o projetor e o zoom dos terminais.
2. Prepare um checkout sintético isolado, Bun 1.4.5, Chromium e Docker Compose local. Instale as dependências com `bun install --frozen-lockfile` e o navegador com `bun run browser:install`. Copie `.env.example` para `.env`. Execute `bun run lab:up` e `bun run lab:doctor --db-only`. Em outro terminal, execute `bun run dev`. Confirme `bun run lab:doctor` e abra `http://127.0.0.1:3000`. Evite mostrar variáveis de ambiente, cookies e traces brutos.
3. Prepare nesta ordem: slides, Procurement Hub, terminal na raiz, GrokBot autenticado, PR e Actions da mesma revisão. Confirme quais operações o GrokBot pode fazer no checkout e no lab. Use acesso mínimo e uma branch isolada.
4. Em um ensaio prévio, execute `bun run verify:all --run-id workshop-rehearsal` em checkout limpo e com um ID novo por ensaio. Para o checkout de referência com a suíte de migração, acrescente `--slice VS-05`. Abra os manifestos em `artifacts/verification/<slice>/<run-id>/`. Separe a captura sanitizada da UI, o resultado do snapshot, a checagem real, o PR e o Actions. Identifique-as com origem, data e SHA. As capturas da apresentação são evidência visual do deck.
5. Passe pelos cinco cortes aos **16**, **20**, **24**, **34** e **47** minutos. Se faltar tempo, reduza a discussão do modelo formal e preserve o runtime e o PR. Reserve os últimos oito minutos para transferência e Q&A.

## Brief para GrokBot · 24 min

> Investigate PH-42 in this isolated synthetic checkout. Read the issue, acceptance criteria, repository boundaries and verification skill. Classify the historical fixture and live observations separately. Trace request submission and explain which boundary must preserve the invariant across app instances. Inspect the scoped candidate, preserve the API, tenant isolation and audit contract, and report the first unexpected check with its evidence. Keep at most two correction attempts after the first run, within the timebox. Report the candidate SHA, commands, results, limitations and blockers. Leave merge to the human reviewer.

## Contingência e encerramento

- **GrokBot indisponível.** Mostre o brief, faça a investigação no checkout preparado e execute os mesmos comandos pelo terminal. Identifique o que foi feito manualmente.
- **Lab ou rede indisponível.** Abra as capturas sanitizadas do ensaio com data, SHA e origem. Identifique o que veio do ensaio e marque o que ficou bloqueado nesta sessão. A build privada pode ser servida localmente durante a apresentação.
- **Verificação falhou.** Mostre a primeira divergência, guarde a evidência e siga o orçamento de duas correções após a tentativa inicial. Escale bloqueios de escopo, acesso ou tempo.
- **Após a sessão.** Pare o app manual com Ctrl+C e rode `bun run lab:down`. A execução de ponta a ponta já recolhe seus próprios recursos. Confira o estágio de limpeza e retenha somente a evidência destinada à revisão. Compartilhe os materiais aprovados para participantes.

## Talk track por slide

<!-- slide:start -->
### 1. From Issue to Verified Pull Request · 00:00–01:00

**EN**

Welcome. Today we'll take one engineering issue through to a pull request that another person can verify. Our case is a procurement app with tenant boundaries, a database and an audit trail. As we go, each character on this slide will help us focus on a different responsibility. I’ll take the reviewer’s seat at the end.

**PT-BR**

Boas-vindas. Hoje vamos levar uma issue de engenharia até um pull request que outra pessoa consiga verificar. O caso é um app de compras com fronteiras de tenant, banco e trilha de auditoria. Cada personagem deste slide ajuda a destacar uma responsabilidade. No fim eu assumo o papel de revisora.

**Palco**

Mostre o elenco. Avance para a pergunta inicial.


<!-- slide:trust -->
### 2. The reviewer’s question · 01:00–03:00

**EN**

What would you need to see before approving a pull request written by an agent? Take a moment to think of your own repository. We'll write down one rule a purchase must obey, run a check that can observe it, then hand the evidence to a reviewer.

**PT-BR**

O que você precisaria ver antes de aprovar um pull request escrito por um agente? Pense por um instante no seu próprio repositório. Vamos explicitar uma regra de compra, rodar uma checagem que consiga observá-la e entregar a evidência a quem revisa.

**Palco**

Colete uma resposta breve. Avance para a pirâmide.


<!-- slide:trust-pyramid -->
### 3. How do we earn trust in an agent’s work? · 03:00–06:00

**EN**

Every time we correct an agent, we can choose where that correction lives. Start with the codebase. An interface can make the safe path easy. Next, make import and type boundaries executable. Verification tells us something about the running system or the model we checked. Written guidance carries context and judgment. Finally, a reviewer decides whether the evidence earns approval. We’ll follow one purchase through all five layers.

**PT-BR**

Toda vez que corrigimos um agente, podemos escolher onde a correção vai ficar. Comece pelo código. Uma interface pode tornar o caminho seguro mais fácil. Depois, faça as restrições de imports e tipos serem executáveis. A verificação revela algo sobre o sistema em execução ou sobre o modelo checado. A orientação escrita carrega contexto e julgamento. Por fim, uma pessoa decide se a evidência sustenta a aprovação. Vamos seguir uma compra pelas cinco camadas.

**Palco**

Avance cinco vezes, uma faixa por clique. Aponte a seta de custo e atribua a figura a Lauren Tan. Reserve a discussão sobre automação para a revisão.


<!-- slide:procurement-hub -->
### 4. Enterprise Codebase Foundations & Enforceable Architecture · 06:00–07:00

**EN**

Our first pillar is the codebase. Procurement Hub is already running when the issue arrives. It has two synthetic tenants and separate responsibilities for requesting, deciding and auditing a purchase. This is a small brownfield system with rules an agent needs to discover and preserve.

**PT-BR**

Nosso primeiro pilar é o código. O Procurement Hub já existe quando chega a issue. Há dois tenants sintéticos e responsabilidades separadas para solicitar, decidir e auditar uma compra. É um pequeno sistema brownfield com regras que o agente precisa descobrir e preservar.

**Palco**

Aponte o Engineering Lead. Passe ao impacto da duplicidade.


<!-- slide:invariant -->
### 5. A duplicate purchase can be approved twice · 07:00–09:00

**EN**

The audit view shows a creation and a decision on one request. Imagine the same submission arriving twice in parallel. Two records can enter two approval paths. Our invariant is concrete. The same logical operation produces one request identifier and one creation event. Equivalent retries give us the same identifier.

**PT-BR**

A auditoria mostra uma criação e uma decisão na mesma requisição. Imagine o mesmo envio chegando duas vezes em paralelo. Dois registros podem entrar em dois fluxos de aprovação. A invariante é concreta. A mesma operação lógica gera um ID e um evento de criação. Retries equivalentes devolvem o mesmo ID.

**Palco**

Aponte CREATED e APPROVED na captura. Faça a pergunta sobre duas aprovações antes de avançar.


<!-- slide:boundaries -->
### 6. Follow the invariant to the write boundary · 09:00–12:00

**EN**

Follow the submission. Next.js validates the input and resolves actor and tenant on the server. Application code applies the role and ownership rules. The persistence boundary must preserve the purchase and its audit event together, including when two app instances share a database. On the next click, here's a smaller guarantee. ESLint can reject an application import that crosses the allowed architecture. The business invariant needs its own regression.

**PT-BR**

Siga o envio. O Next.js valida a entrada e resolve o ator e o tenant no servidor. A aplicação aplica regras de papel e propriedade. A persistência precisa manter a compra e seu evento coerentes, inclusive quando duas instâncias compartilham o banco. No próximo clique, vemos uma garantia menor. O ESLint pode rejeitar um import que desrespeite a arquitetura. A invariante de negócio precisa da própria regressão.

**Palco**

Siga o diagrama da esquerda para a direita e revele a checagem de imports. Ligue requisito, slice e teste.


<!-- slide:boot-lab -->
### 7. Harness Engineering & Reusable Verification Skills · 12:00–16:00

**EN**

The feature map gives us names for user-visible journeys. The verification skill tells us how to launch the lab, check readiness, drive a scenario, collect evidence and clean up. The same commands serve an engineer, an agent and CI. Readiness is a separate observation from the business result. Once the lab is ready, we can exercise one purchase through the real UI.

**PT-BR**

O feature map dá nomes às jornadas que as pessoas usam. A skill explica como iniciar o lab, checar a prontidão, executar um cenário, coletar evidência e limpar. Os mesmos comandos servem à engenharia, ao agente e ao CI. Prontidão e resultado de negócio são observações distintas. Com o lab pronto, vamos acompanhar uma compra pela interface real.

**Palco**

Mostre a skill e cite lab:doctor. Às 16 min, avance para o slide 8 e abra o app.


<!-- slide:try-the-app -->
### 8. Follow one purchase through three roles · 16:00–20:00

**EN**

I'll submit a synthetic purchase as the Northstar requester and keep the ID. Then I'll switch to its approver and record a decision. As the auditor, I'll trace both events on the same purchase. The ID connects what we see across the three views. Keep that idea in mind when we compare the concurrent responses.

**PT-BR**

Vou enviar uma compra sintética como solicitante da Northstar e guardar o ID. Depois assumo a identidade responsável pela aprovação e registro a decisão. Como auditora, acompanho os dois eventos na mesma compra. É o ID que conecta as três telas. Guarde essa ideia para a comparação das respostas concorrentes.

**Palco**

App local → Northstar Requester → Approver → Auditor. Guarde um único ID. Volte ao slide 9.


<!-- slide:runtime -->
### 9. Runtime Verification & Self-Correcting Agent Loops · 20:00

**EN**

We’re going to inspect the failure scenario and then test the candidate that is running today. Keep the sources in mind. The first result is a synthetic historical snapshot. The second comes from real requests and the database in the isolated lab.

**PT-BR**

Vamos inspecionar o cenário de falha e depois verificar o candidato em execução. Guarde a origem de cada resultado. O primeiro vem de um snapshot histórico sintético. O segundo vem de requisições reais e do banco do lab isolado.

**Palco**

Passe ao slide 10 e abra o terminal.


<!-- slide:reproduce -->
### 10. Read the synthetic PH-42 snapshot · 20:00–24:00

**EN**

This command reads a synthetic historical snapshot. Both simulated requests returned Created, but they have different identifiers. PostgreSQL holds two requests and two creation events in this fixture. Exit one is the expected observation. If we only looked at the HTTP success codes, we would miss the defect.

**PT-BR**

Esse comando lê um snapshot histórico sintético. As duas requisições simuladas retornaram Created, mas com IDs diferentes. O PostgreSQL registra duas requisições e dois eventos de criação nesse fixture. A saída um é esperada. Só pelos códigos HTTP de sucesso, perderíamos o defeito.

**Palco**

Execute bun run verify:ph42-fixture. Mostre 201/201, IDs distintos e duas linhas e eventos. Retorne no slide 11.


<!-- slide:agent-loop -->
### 11. Let the first failed check drive the next action · 24:00–34:00

**EN**

I’ll give GrokBot the acceptance criteria and the verification path. I want it to trace submission from the route to persistence and tell me which boundary owns the invariant. We isolate one hypothesis and one scoped change. If a check surprises us, we keep that evidence, revise the hypothesis, and try again within the budget. Once we reach the limit, we hand the blocker to a person.

**PT-BR**

Vou dar ao GrokBot os critérios de aceite e o caminho de verificação. Quero que ele acompanhe o envio da rota à persistência e diga qual fronteira garante a invariante. Isolamos uma hipótese e uma mudança pequena. Se a checagem surpreender, guardamos a evidência, revemos a hipótese e tentamos de novo dentro do limite. Ao atingir o limite, escalamos o bloqueio.

**Palco**

Abra o GrokBot e use o brief acima. Identifique o candidato preparado. Revele o fragmento sobre repetir ou escalar. Volte no slide 12.


<!-- slide:verify-live -->
### 12. One logical purchase. One record. · 34:00–39:00

**EN**

Now we're exercising the running API. One submission creates the purchase and the equivalent retry returns the existing identifier. We expect a 201 and a 200 in either order. Both responses must agree on the ID. The database also has to agree. It should hold one request and one creation event. This is the verification layer of the pyramid.

**PT-BR**

Agora vamos exercitar a API em execução. Um envio cria a compra e o retry equivalente retorna o ID existente. Esperamos um 201 e um 200 em qualquer ordem. As duas respostas precisam concordar no ID. O banco também. Deve haver uma requisição e um evento de criação. Essa é a camada de verificação da pirâmide.

**Palco**

Execute bun run verify:concurrency. Aponte status, ID, contagens, origem e saída 0 esperada. Se divergir, informe a falha observada. Volte no slide 13.


<!-- slide:optional-extension -->
### 13. Test the contract. Observe the run. Explore the model. · 39:00–44:00

**EN**

A contract test checks expected behavior under a defined input. Runtime verification shows what the deployed code path in our local lab actually did. The bounded TLA+ model lets us explore interleavings within its assumptions, including the invariant over creation. We take both results to a review with their scope attached.

**PT-BR**

Um teste de contrato checa o comportamento esperado sob uma entrada definida. A verificação em runtime mostra o que o código em execução fez no lab. O modelo finito em TLA+ explora entrelaçamentos dentro de suas hipóteses, incluindo a invariante de criação. Levamos os dois resultados à revisão com seus respectivos escopos.

**Palco**

Se houver tempo, mostre a evidência preparada do modelo. Se estiver atrasada, use apenas a fala e siga.


<!-- slide:run-harness -->
### 14. Evidence-Based Software Delivery & Enterprise Governance · 44:00–47:00

**EN**

The evidence chain starts at an acceptance criterion. A command produces an observation. The artifact records the revision and check outcomes, including failures, blockers or checks we didn't run. Independent CI repeats the required checks on the exact candidate. This is the package that lets another person review our claim.

**PT-BR**

A cadeia de evidências começa no critério de aceite. Um comando gera uma observação. O artefato registra a revisão e os resultados, incluindo falhas, bloqueios ou checagens que ficaram pendentes. O CI independente repete as verificações exigidas no candidato exato. É esse conjunto que permite a outra pessoa revisar a alegação.

**Palco**

Abra o manifesto de ensaio se precisar ilustrar o formato. Às 47 min, avance e abra o PR.


<!-- slide:review -->
### 15. Would you approve this exact revision? · 47:00–52:00

**EN**

Pick one criterion and follow it from the issue into the check and its artifact. Compare the PR head with the revision in Actions. Read the persisted counts, then look for anything marked failed, blocked or not run. Lauren’s team describes expanding automation once the inner loop is reliable. Here, we use that loop to give the human reviewer a stronger basis for the merge decision.

**PT-BR**

Escolha um critério e siga da issue à checagem e ao artefato. Compare o head do PR com a revisão no Actions. Leia as contagens persistidas e procure falhas, bloqueios e verificações que ficaram pendentes. A equipe da Lauren descreve ampliar a automação quando o ciclo interno é confiável. Aqui, esse ciclo dá à pessoa revisora uma base melhor para decidir sobre o merge.

**Palco**

Abra o PR e o Actions do mesmo SHA. Compare os manifestos. Se estiver usando captura, indique revisão e data. Retorne ao slide 16.


<!-- slide:takeaways -->
### 16. Leave with a verification pattern you can reuse · 52:00–55:00

**EN**

Pick an invariant in your own system. Where can you encode the constraint? Which real interface can you exercise to observe it? What could a reviewer open to see the outcome? Start by adapting the verification skill and feature map, then link one acceptance criterion to one check and one artifact in your PR.

**PT-BR**

Escolha uma invariante do seu sistema. Onde dá para codificar a restrição? Qual interface real permite observar o resultado? O que uma pessoa revisora poderia abrir para conferi-lo? Comece adaptando a skill e o feature map de verificação. Depois ligue um critério de aceite a uma checagem e a um artefato no PR.

**Palco**

Dê um minuto para cada pessoa escolher sua invariante. Aponte os materiais aprovados para participantes.


<!-- slide:questions -->
### 17. Don’t just build better agents · 55:00–60:00

**EN**

We followed one purchase from an issue to a reviewable outcome. The same approach works wherever a team can state its invariants, exercise the system and record what happened. Think about the first recurring correction you can turn into a durable check. What would you ask an agent to prove in your repository?

**PT-BR**

Seguimos uma compra da issue a um resultado que outra pessoa consegue revisar. A mesma abordagem funciona quando a equipe explicita suas invariantes, exercita o sistema e registra o que aconteceu. Pense na primeira correção recorrente que pode virar uma checagem durável. O que você pediria a um agente para provar no seu repositório?

**Palco**

Reúna o elenco, conduza o Q&A e finalize até 60 min.
