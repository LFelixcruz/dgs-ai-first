# Skill de Avaliação — QA (Cenário 2)

> **Programa:** Trilha de Certificação AI First — DGS / DB1 Global Software
> **Escopo:** Cenário-Âncora 2 — Fase de Estruturação do Trabalho (exercícios 2.1, 2.2, 2.3)
> **Referência:** Usar com `avaliacao-foundation.md` para dimensões e escala.

---

# CORREÇÃO — Papel: QA

> **Data da avaliação:** 2026-06-18
> **Avaliador:** GitHub Copilot (Claude Sonnet 4.6) — Staff SDET / QA Engineer
> **Entregáveis avaliados:**
> - Exercício 2.1: Seção `## Testing Standards` do AGENTS.md + Reescrita de Teste + Tabela de Melhorias + Critérios de QA Review
> - Exercício 2.2: `/tests/specs/query-endpoint/test-plan.md` (44 cenários, QRY-001 a QRY-044)
> - Exercício 2.3: `.skills/artifacts/create-integration-test/SKILL.md`

---

## Avaliação do Exercício 2.1 — Testing Standards para o AGENTS.md

### Resumo

O participante entregou uma seção `## Testing Standards` de alta maturidade técnica: prescritiva, machine-readable, alinhada com Vitest e MSW, com linguagem MUST/MUST NOT, exemplos de código concretos, 14 forbidden patterns, e 8 critérios de QA Review binários. A reescrita do teste demonstra domínio completo — cada melhoria é justificada com precisão técnica. O artefato poderia ser inserido diretamente no AGENTS.md do repositório sem revisão adicional.

### Scores por Dimensão

| Dimensão | Score | Justificativa |
|----------|-------|---------------|
| D1 — Domínio Conceitual | 3 | Demonstra compreensão profunda de AGENTS.md como contrato para agentes (não documentação narrativa). Distinção correta entre assertions prescritivas vs vagas, MSW vs vi.mock, factories vs raw literals. Os 14 forbidden patterns evidenciam conhecimento específico do que LLMs erram em testes — não são anti-padrões genéricos. |
| D2 — Uso de Ferramentas | 2 | Claude usado com prompt altamente especializado e estruturado (evidência de qualidade de engajamento com a ferramenta). Exercício 2.1 não exige Cowork — sem penalidade. Não há evidência de iteração documentada (v1 → refinamento): a seção foi produzida em saída única sem ciclo de teste real com Copilot para validar se as regras melhorariam o output gerado. |
| D3 — Qualidade do Entregável | 3 | Seção completamente prescritiva: Test Naming Convention com exemplos válidos/inválidos, AAA com inline comments obrigatórios, Assertions com tabela de permitido/proibido e exemplos, MSW com setup file completo, Factories com as três funções obrigatórias do projeto, Fixtures com dados logísticos reais, AI Generated Test Requirements com 8 regras específicas. Reescrita tem Before/After e tabela de 7 melhorias com análise técnica profunda. 8 critérios de QA Review todos binários e verificáveis. |
| D4 — Pensamento Crítico | 3 | A tabela de melhorias vai além de "ficou melhor": para cada melhoria explica o mecanismo técnico de por que o problema original falha (ex: "toBeDefined() passa mesmo se result é { statusCode: 500 } ou null"). Reconhece que MSW intercepta no nível de rede — validando que o SDK serializa corretamente, vantagem que vi.mock não oferece. |
| D5 — Aplicabilidade ao Projeto | 3 | Referências diretas ao projeto: PROC-042, SLA-2024, FRETE-REG-003 como document IDs nos exemplos de fixtures. Tiers Gold/Silver/Standard como restrição explícita. guardrail DEVE-01 citado. Endpoint patterns Azure AI Search (`*.search.windows.net`) e Azure OpenAI (`*.openai.azure.com`) nos exemplos MSW. `source_document` tratado como hard requirement de negócio, não opcional. |

**Score do exercício 2.1: 2.8**

### Verificação de Artefatos Machine-Readable

**Prescritivo:** Sim — usa MUST/MUST NOT em toda a seção. Um agente que ler esta seção tem instruções executáveis, não aspirações.

**Exemplos do que está bem:**
- `"server.listen({ onUnhandledRequest: 'error' }) is mandatory"` — instrução de 0 ambiguidade.
- `"Strings 'test', 'hello', 'foo', 'bar', 'sample', 'example', 'placeholder' are FORBIDDEN as domain values"` — lista exaustiva, sem margem para interpretação.
- `createQueryRequest()`, `createSearchResult()`, `createAssistantResponse()` — nomes exatos das factories esperadas pelo Copilot.

**O que poderia ser mais prescritivo:**
- A seção "Fixtures Standards" define o padrão de diretório e exemplos, mas não especifica o schema TypeScript das interfaces (`QUERIES`, `CHUNKS`, `EXPECTED_RESPONSES`). Um agente geraria as factories sem tipagem explícita.
- "Responses in formal Brazilian Portuguese" aparece nas regras de AI Generated Tests mas poderia ser cruzada com a seção de Mocking para deixar claro que o mock de completion também deve usar Portuguese em seu conteúdo.

### Pontos Fortes

1. A seção **Forbidden Patterns** com 14 itens é diretamente acionável pelo Copilot — cada item tem forma de código proibido que o modelo reconhece e evita.
2. A **tabela de melhorias** do teste reescrito tem nível de análise de Staff Engineer: não apenas nomeia o problema, mas explica o mecanismo causal (por que `toBeDefined()` é insuficiente do ponto de vista do que a assertion comunica sobre o sistema).
3. Os **8 critérios de QA Review** são genuinamente binários — dois QAs independentes chegariam à mesma conclusão para qualquer teste submetido.

### Pontos de Melhoria

1. **Ausência de ciclo de feedback com Copilot:** A seção foi produzida de forma teórica. A validação real seria: escrever a seção → pedir ao Copilot para gerar um teste → verificar se o `toBeDefined()` desapareceu e o `source_document` apareceu → iterar. Esse ciclo fortaleceria D2 e evidenciaria quais regras o Copilot realmente absorve.
2. **Schema TypeScript das fixtures não especificado:** Adicionar interfaces `QueryFixture`, `ChunkFixture`, `ExpectedResponseFixture` tornaria o artefato completo para um desenvolvedor implementar sem perguntas.
3. **Seção de Coverage não menciona o guardrail de carga perigosa como linha de cobertura obrigatória:** O 80% é necessário, mas o VC-03 (dangerous cargo denial) deveria ser citado como coverage obrigatório independente da porcentagem geral.

### Classificação

**Aprovado com distinção (2.8)**

---

## Avaliação do Exercício 2.2 — Spec de Testes SDD (query endpoint)

### Resumo

O participante entregou um `test-plan.md` de nível sênior: 44 cenários distribuídos entre 4 VCs, cobrindo happy path, edge cases, segurança (6 cenários de prompt injection), multilingual (5 cenários), ambiguidade (5 cenários), contradição documental (ADR-0003) e baixa confiança. Todos os dados de teste são do domínio logístico NovaTech — nenhum string genérico. A matriz de rastreabilidade é completa e o artefato pode ser commitado diretamente. O exercício exigia Claude Cowork para a organização rastreável, e o artefato entrega o resultado esperado, mas sem evidência explícita de ferramenta separada.

### Scores por Dimensão

| Dimensão | Score | Justificativa |
|----------|-------|---------------|
| D1 — Domínio Conceitual | 3 | Derivação rigorosa dos VCs para cenários: cada VC tem objective, happy path, edge cases, test data, pass criteria e automation strategy separados. O diagrama "Architecture Under Test" corretamente mapeia o pipeline RAG com as camadas relevantes (Input Validation → Embedding → Search → Prompt Assembly → Completion → Response). A automation strategy distingue Vitest/MSW para integração, k6 para carga, e GitHub Actions para CI — separação correta de ferramentas por propósito. |
| D2 — Uso de Ferramentas | 2 | Claude usado com prompt detalhado e estruturado. O exercício exige Claude Cowork para a matriz de rastreabilidade organizada — o resultado está presente e correto, mas não há evidência da ferramenta separada (sessão Cowork, print, ou output distinto). Aplica-se a regra: "Evidência de uso de ferramenta ausente quando exigida → D2 ≤ 2". |
| D3 — Qualidade do Entregável | 3 | 44 cenários com IDs sequenciais (QRY-001 a QRY-044), todos com tipo e status PLANNED. Matriz de rastreabilidade completa com colunas Test ID / VC / Scenario / Type / Status. Coverage Summary table com contagem por tipo e VC. Scope e Out of Scope definidos. Test Environment table. Referencias explícitas a ADR-0001, ADR-0002, ADR-0003. Outro membro do time implementaria os testes sem perguntas adicionais. |
| D4 — Pensamento Crítico | 3 | Distinção crítica em QRY-013: query sobre trânsito de carga perigosa NÃO deve disparar o denial — demonstra que o participante entende que a regra é sobre intenção (retorno), não sobre subject (carga perigosa). VC-03 assertado via flag determinístico (`dangerous_cargo_denial: true`) em vez de text matching — reconhece que o LLM pode refraseiar e o único sinal confiável é a camada de pós-processamento. Seção de Prompt Injection (QRY-032) trata context poisoning via sessão anterior — cenário não óbvio. |
| D5 — Aplicabilidade ao Projeto | 3 | ADR-0002 citado na seção Architecture Under Test (context budget 4K+8K). ADR-0003 citado nos cenários de contradição documental com verificação de `vigencia_date` e flag `document_conflict_detected`. Document IDs reais do projeto: PROC-042, SLA-2024, FRETE-REG-003. Tiers válidos do NovaTech: Gold, Silver, Standard (QRY-017 usa "Platinum" corretamente como cenário de não-encontrado). Guardrail DEVE-01 referenciado explicitamente em VC-02. |

**Score do exercício 2.2: 2.8**

### Verificação de Artefatos Machine-Readable

O `test-plan.md` é um artefato humano (spec), não machine-readable no sentido de AGENTS.md. No entanto, sua estrutura é suficientemente formal para ser consumida por Claude Code ou Copilot para geração de testes: cada cenário tem Input JSON, Mock Configuration em TypeScript, Expected Result em JSON, e Pass Criteria em linguagem verificável.

**O que está bem:** Os cenários de QRY-028 a QRY-033 (prompt injection) especificam explicitamente que o agente deve assertar a camada determinística — isso é instrução de como automatizar, não apenas descrição do comportamento esperado.

**Ponto de atenção:** QRY-003 e QRY-004 dependem de `delay()` do MSW para simular latência. A automation strategy menciona isso, mas o cenário QRY-003 (29.5s boundary) em CI com `delay(28000)` tornaria o suite de integração lento demais para feedback rápido. Um refinamento seria separar esses cenários em uma suite de "slow tests" com tag separada no Vitest.

### Pontos Fortes

1. **Cenários de ambiguidade** (QRY-023 a QRY-027) cobrem casos que outros participantes tipicamente omitem: SLA sem tier especificado, frete sem origem/destino, cruzamento de contextos. São os casos que o assistente encontrará mais em produção.
2. **Cenários multilingual** (QRY-034 a QRY-038) validam o guardrail de resposta em português formal mesmo para perguntas em inglês e espanhol — e mantêm VC-03 ativo independente do idioma.
3. **Automation Strategy por VC** é diferenciadora: distingue o que vai para Vitest (rápido, CI), o que vai para k6 (carga, staging), e propõe custom Vitest matchers (`toHaveSourceDocument()`, `toBeNotFoundResponse()`) que reduzem repetição nos testes.

### Pontos de Melhoria

1. **Evidência de Claude Cowork ausente:** A matriz de rastreabilidade é excelente, mas não há print de sessão ou output distinto que evidencie uso da ferramenta. Em uma certificação, a evidência importa tanto quanto o resultado.
2. **QRY-003 e QRY-004 tornariam o CI lento:** Cenários de 28–31 segundos de delay precisam de estratégia de separação explícita (tag `@slow` ou suite separada). Sem isso, o suite de integração quebraria o feedback loop do desenvolvedor.
3. **Sem cenário de retry/exponential backoff:** O plan.md do projeto especifica "Retry com exponential backoff para chamadas Azure". Não há cenário que valide que o handler faz retry em caso de falha transiente antes de retornar 503 — gap que um revisor de QA levantaria.

### Classificação

**Aprovado com distinção (2.8)**

---

## Avaliação do Exercício 2.3 — Skill `create-integration-test`

### Resumo

O participante entregou uma SKILL.md de nível Staff Engineer: metadata YAML completo, activation phrase com variantes secundárias, 4 dependências com justificativa técnica por skill, 7 preconditions, generation workflow de 12 etapas, 17 regras, template Vitest completo com placeholders, DO/DON'T com código real, 15 AI anti-patterns com descrição/exemplo/correção, output validation de 15 itens, e review checklist de 10 itens. É consistente com os Testing Standards do Exercício 2.1 sem contradições. O exercício exigia Claude Cowork para o checklist — resultado presente, evidência de ferramenta ausente.

### Scores por Dimensão

| Dimensão | Score | Justificativa |
|----------|-------|---------------|
| D1 — Domínio Conceitual | 3 | A hierarquia Foundation → Domain → Artifact está corretamente aplicada: a skill é Artifact level e declara dependências em ambos os níveis inferiores. O conceito de activation phrase como "trigger semântico" para agentes está correto. As preconditions incluem "halt and request missing artifact before generating tests" — demonstra entendimento de que skills devem ter guardrails de entrada, não gerar output com inputs incompletos. |
| D2 — Uso de Ferramentas | 2 | Claude usado efetivamente. O exercício exige Claude Cowork para o checklist de revisão — o checklist está presente e correto, mas sem evidência da ferramenta (aplica-se a mesma regra do exercício 2.2). Sem evidência de iteração documentada: a skill foi produzida em saída única sem ciclo de teste real (gerar skill → pedir ao Copilot para gerar teste → avaliar se melhorou → refinar). |
| D3 — Qualidade do Entregável | 3 | Todos os elementos obrigatórios presentes e completos. O template tem Happy Path + Edge Case + Error Case com estrutura de placeholders semânticos (não apenas `<placeholder>`). O DO example é um teste real para VC-03 com MSW configurado, factory, fixture QUERIES.RETURN_DANGEROUS_CARGO, e flag `dangerous_cargo_denial`. O DON'T example tem tabela de 8 linhas explicando cada rejeição. Os 15 anti-patterns são específicos a LLMs (AP-09: assertar texto em vez de flag determinístico; AP-11: handler não determinístico; AP-15: missing empty search result case). |
| D4 — Pensamento Crítico | 3 | AP-09 é particularmente sofisticado: identifica que assertar `body.answer.toContain('não')` é falso positivo porque qualquer negação no texto passa o teste — a única assertion confiável para segurança é o flag determinístico. A seção "When NOT to use" demonstra boundary awareness: a skill não cobre unit tests de funções puras, e-2-e contra ambiente real, ou load tests com k6 — limites que um participante menos experiente não definiria. |
| D5 — Aplicabilidade ao Projeto | 3 | ANTT classes 1-6 referenciadas em RULE-11 e no DO example. Azure endpoint patterns exatos nos MSW handlers do template. Customer tiers restriction em RULE-14. ADR-0003 citado em RULE-17 (document conflict flag). Referências a `/docs/specs/`, `/AGENTS.md#testing-standards`, `/tests/performance/query-load.js`. O DO example usa `QUERIES.RETURN_DANGEROUS_CARGO` e `PROC-042` — dados do projeto, não genéricos. |

**Score do exercício 2.3: 2.8**

### Verificação de Artefatos Machine-Readable

A SKILL.md é o artefato mais prescritivo dos três exercícios. Um agente que receber esta skill como contexto terá:

- Activation phrases para auto-invocar a skill.
- Preconditions com halt condition explícita.
- Generation workflow sequencial de 12 etapas.
- 17 regras com linguagem MUST/MUST NOT.
- Template com placeholders tipados.
- Output validation de 15 itens PASS/FAIL para auto-revisão.

**O que está bem:** RULE-05 (`onUnhandledRequest: 'error'`) é instrução precisa o suficiente para o Copilot incluir o parâmetro corretamente — não apenas "configure MSW".

**Ponto de atenção:** As dependências referenciam skills que ainda não existem no repositório (`.skills/foundation/testing-fundamentals/SKILL.md`, `.skills/domain/rag-domain-testing/SKILL.md`). A skill deveria indicar explicitamente que esses arquivos precisam ser criados antes que a skill seja ativável, ou incluir um fallback.

### Pontos Fortes

1. **Generation Workflow de 12 etapas** é operacional: cada etapa tem uma ação concreta e uma razão. O Step 9 ("Scan for anti-patterns before finalizing") fecha o loop de qualidade dentro da própria skill — o agente revisa o próprio output.
2. **Output Validation de 15 itens** converte a skill em auto-revisão: o agente pode checar cada item como PASS/FAIL antes de entregar o teste, sem precisar de revisão humana para os problemas mais comuns.
3. **AP-09 e AP-11** são anti-padrões que participantes de nível pleno normalmente não identificam — evidenciam compreensão do comportamento real de LLMs em contextos de testes de segurança.

### Pontos de Melhoria

1. **Dependências não materializadas:** As 4 skills declaradas como dependência não existem no repositório. Sem elas, a skill não é ativável em modo completo. O plano de criação dessas skills deveria ser o próximo passo entregável.
2. **Ausência de versionamento de template:** O template é versão 1.0.0 mas não há instrução de quando o template deve ser atualizado (ex: quando o schema de `AssistantResponse` mudar). Skills são artefatos vivos — falta a política de atualização.
3. **Evidência de Claude Cowork ausente:** O checklist de revisão é excelente mas sem evidência da ferramenta. Em uma certificação, isso é penalizável na dimensão D2.

### Classificação

**Aprovado com distinção (2.8)**

---

## Score Final — Papel QA

| Exercício | Score | Classificação |
|-----------|-------|---------------|
| 2.1 — Testing Standards AGENTS.md | 2.8 | Aprovado com distinção |
| 2.2 — Spec de testes SDD | 2.8 | Aprovado com distinção |
| 2.3 — Skill create-integration-test | 2.8 | Aprovado com distinção |
| **Média final** | **2.8** | **Aprovado com distinção** |

---

## Análise Transversal

### Padrão de excelência identificado

Os três exercícios têm a mesma assinatura de qualidade: **prescritivo até o nível de instrução executável**. O participante não descreve o que deveria acontecer — instrui como fazer. Isso é raro em participantes que não têm experiência prévia com engenharia de prompts para agentes.

A escolha de assertar `dangerous_cargo_denial: true` (flag determinístico) em vez de `body.answer.toContain('não')` (text matching) aparece de forma consistente nos três exercícios — no Testing Standards, no test-plan, e na SKILL. Isso indica compreensão genuína de por que segurança baseada em LLM precisa de camada de código determinístico, não apenas instrução de prompt.

### Fraqueza transversal

A única fraqueza consistente é a **ausência de ciclo de feedback real com Copilot/Cowork**. Os três artefatos foram produzidos em modo teórico-dedutivo: o participante sabe como o output deveria ser e produz diretamente o artefato correto. O que falta é a evidência de que o participante testou os artefatos contra os agentes e iterou com base no resultado real — que é exatamente o que diferencia um artefato de especificação de um artefato de engenharia validado.

### Tópicos para aprofundamento

- **Ciclo de validação de skills com agentes:** Como testar que uma SKILL.md realmente melhora o output do Copilot (geração A/B: com e sem a skill, comparação de qualidade).
- **CI pipeline para testes de IA:** Como integrar assertions de `dangerous_cargo_denial` e `low_confidence_warning` em um pipeline que também valida cobertura de 80% — evitando que os cenários de segurança sejam excluídos do cálculo de coverage por serem "difíceis de automatizar".
- **Performance test separation:** Estratégia para separar testes lentos (delay 28s) do loop principal de CI sem perder cobertura de VC-01.

**Perfil:** Define padrões de teste consumíveis por agentes (Testing Standards do AGENTS.md), escreve specs de teste no formato SDD, e cria skills de geração de testes. Demonstra que qualidade de testes gerados por IA depende da qualidade dos padrões que os agentes recebem.

**Ferramentas esperadas:** Claude (chat) em todos; Claude Cowork nos exercícios 2.2 e 2.3.

---

## Exercício 2.1 — Testing Standards para o AGENTS.md

**Tópicos avaliados:** AGENTS.md (seção machine-readable), Skills (padrões de teste).

| Critério | Score 3 | Red flag (≤ 1) |
|----------|---------|-----------------|
| Prescritivo para agentes | Copilot que lê esta seção geraria testes melhores que o teste ruim fornecido | Texto narrativo que agente ignoraria |
| Padrão arrange/act/assert | Exigido explicitamente com exemplo | Sem menção a estrutura |
| DEVE e NÃO DEVE claros | "DEVE: assertions específicas ao comportamento. NÃO DEVE: toBeDefined() sozinho" | Apenas recomendações vagas |
| Teste reescrito demonstra padrões | Antes/depois com cada melhoria explicada | Teste reescrito com mesmos problemas |
| 3 critérios de review objetivos | Dois QAs chegariam à mesma conclusão | Critérios subjetivos |

**Verificação rápida do teste reescrito:** O teste original usa `toBeDefined()` e nome genérico. O reescrito deve ter: nome descritivo (describe/it em inglês), arrange/act/assert separados, e assertion que verifica conteúdo da resposta (não apenas existência).

---

## Exercício 2.2 — Spec de testes SDD (query endpoint)

**Tópicos avaliados:** SDD (spec de testes derivada de verification criteria), Harness (testes de robustez de IA).

| Critério | Score 3 | Red flag (≤ 1) |
|----------|---------|-----------------|
| Cada VC com 2+ cenários | Happy path + edge case para cada verification criteria | VCs com apenas 1 cenário |
| Dados de teste do domínio | Perguntas: carga perigosa, SLA Gold, frete Manaus — do Anexo A/B | Dados genéricos: "test", "hello" |
| Testes de robustez de IA | Prompt injection, perguntas em inglês, perguntas ambíguas | Sem testes de robustez |
| Rastreabilidade (Cowork) | ID único → VC correspondente. Status rastreável | Sem IDs, sem link para VCs |
| VC-03 exercitado corretamente | Cenário de "carga perigosa + devolução" → negativa explícita | VC-03 com cenário que não exercita o guardrail |

---

## Exercício 2.3 — Skill de geração de testes (`create-integration-test`)

**Tópicos avaliados:** Skills (autoria de artifact skill), AGENTS.md (consistência com Testing Standards).

| Critério | Score 3 | Red flag (≤ 1) |
|----------|---------|-----------------|
| Skill concreta | Template com placeholders, 2 exemplos completos DO/DON'T | Texto abstrato |
| Anti-padrões de IA reais | toBeDefined(), testa implementação (spyOn interno), mocks permissivos demais, dados genéricos | Anti-padrões genéricos de teste |
| Checklist rápido (Cowork) | Verificável em < 2 min, itens sim/não | Checklist demorado ou subjetivo |
| Consistente com Testing Standards | Não contradiz as regras do exercício 2.1 (ou do input simulado) | Contradições |
| Dependências declaradas | Referencia quais skills Foundation/Domain ler antes | Skill isolada sem contexto |
