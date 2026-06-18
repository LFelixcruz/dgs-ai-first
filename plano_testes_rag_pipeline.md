# PLANO DE TESTES — Pipeline de RAG NovaTech

**Versão:** 1.0  
**Data:** 2026-06-02  
**Escopo:** Validação do pipeline Documento → Embedding → Retrieval → LLM Generation  
**Ambiente:** Desenvolvimento + Produção (Staging)  
**Time Responsável:** QA + DevOps + Product Engineering  

---

## Visão Geral do Pipeline

```
[Documentos SharePoint + Confluence + FS]
                    ↓
            [Extração de Texto]
                    ↓
            [Divisão em Chunks]
                    ↓
            [Embedding (Ada-v3)]
                    ↓
            [Azure AI Search Index]
                    ↓
        [Query → Embedding → Busca Similaridade]
                    ↓
        [Recuperação Top-K Chunks + Prompt]
                    ↓
            [Claude LLM Generation]
                    ↓
        [Resposta em Português Formal]
```

---

## 1. TESTES DE INGESTÃO

**Objetivo:** Verificar que documentos são extraídos, convertidos e indexados corretamente.

### 1.1 Validação de Extração

| ID | Teste | Entrada | Esperado | Critério de Aceite |
|----|----|---------|----------|-------------------|
| ING-001 | Extração de PDF | PROC-042-v2 (arquivo PDF) | Texto limpo, sem artefatos OCR | Conteúdo da seção 2.1 (multiplicadores) presente e legível |
| ING-002 | Extração de Word | POL-001 (docx) | Texto com formatação normalizada | Todas as 5 seções presentes; sem corrupção |
| ING-003 | Tratamento de caracteres especiais | FAQ-Atendimento com "®" e "™" | Caracteres escapados corretamente | Nenhuma perda de significado semântico |
| ING-004 | Tabelas | SLA-2024 (tabela Gold/Silver/Standard) | Dados estruturados legíveis | Linha 1 (Gold), coluna "resposta" = "2h úteis" |
| ING-005 | Excluir cabeçalhos/rodapés | Documentos com cabeçalho "NovaTech - Confidencial" | Apenas corpo do documento indexado | Cabeçalho não recuperável na busca |

### 1.2 Validação de Chunking

| ID | Teste | Entrada | Esperado | Critério de Aceite |
|----|-------|---------|----------|-------------------|
| INK-001 | Tamanho de chunks | POL-001 (1.200 palavras) | Chunks entre 200–400 palavras | Nenhum chunk < 150 ou > 500 palavras |
| INK-002 | Preservação de contexto | Chunk sobre "exceção cargas perigosas" | Inclui descrição completa + referência a ramal 4500 | Chunk é auto-contido; não requer chunk anterior |
| INK-003 | Overlap entre chunks | Seção 3.2 (2 parágrafos) | Sobreposição de ~50 palavras entre chunks adjacentes | Informação crítica não fica na borda entre chunks |
| INK-004 | Chunks órfãos | PROC-042 seção 4 (referencias a PROC-043) | Chunk inclui nota "Ver PROC-043" ou similar | Link/referência preservado mesmo se PROC-043 não estiver indexada |

### 1.3 Validação de Indexação (Azure AI Search)

| ID | Teste | Entrada | Esperado | Critério de Aceite |
|----|-------|---------|----------|-------------------|
| IDX-001 | Metadados corretos | Documento PROC-042-v2 | Campos: doc_name, version, section, indexed_at | doc_version = "2.0"; indexed_at dentro dos últimos 5 minutos |
| IDX-002 | Deduplicação | Mesmo chunk indexado 2x | Apenas 1 cópia no índice | SELECT count(*) WHERE chunk_id = X → 1 |
| IDX-003 | Versões antigas removidas | PROC-042 v1 foi substituída por v2 | v1 marcada como "deprecated" ou removida | Busca por "multiplicador Norte 1.6" retorna 0 resultados (ou com warning) |
| IDX-004 | Disponibilidade imediata | Documento indexado | Recuperável dentro de 1 minuto | Query simples retorna chunk < 1s latência |

---

## 2. TESTES DE RETRIEVAL

**Objetivo:** Dada uma pergunta, os chunks corretos são recuperados com score alto?

### 2.1 Matriz de Casos de Teste (Expandida do Anexo B)

| ID | Pergunta | Chunks Esperados (Rank) | Chunks Aceitáveis | Chunks Inaceitáveis | Score Mín. |
|----|----|----------|---------|-------------|-----------|
| RET-001 | "Qual o prazo de devolução?" | POL-001-A (rank 1), POL-001-B (rank 2) | POL-001-C | Qualquer PROC-042, SLA | 0.82 |
| RET-002 | "Posso devolver carga perigosa?" | POL-001-B (rank 1), FAQ-03 (rank 2) | POL-001-A | PROC-042, SLA | 0.85 |
| RET-003 | "SLA do cliente Gold?" | SLA-2024-B (rank 1), SLA-2024-A (rank 2) | SLA-2024-C | PROC-042, POL-001 | 0.80 |
| RET-004 | "Multiplicador para Manaus?" | PROC-042v2-B (rank 1) | PROC-042v2-A | PROC-042-B (v1) — score deve ser < 0.75 | 0.88 |
| RET-005 | "Frete para 2.500kg Nordeste 12 fretes/mês?" | PROC-042v2-A, PROC-042v2-B, PROC-042v2-D (todas rank ≤3) | Nenhum | PROC-042 v1 | 0.80 (todos) |
| RET-006 | "O que fazer com carga danificada?" | FAQ-38 (rank 1) | POL-001-D | Nenhum PROC-042 | 0.78 |
| RET-007 | "Qual SLA incidente crítico?" | SLA-2024-C (rank 1), SLA-2024-D (rank 2) | SLA-2024-A | POL-001, PROC-042 | 0.83 |
| RET-008 | "Como calcular frete especial?" | PROC-042v2-A (rank 1), PROC-042v2-B (rank 2) | PROC-042v2-D | PROC-042 v1 score < 0.75 | 0.85 |
| RET-009 | "Qual seguro de carga?" | FAQ-22 (rank 1, com advertência de que é informal) | Nenhum | Qualquer POL, PROC formal | 0.75 |
| RET-010 | "Tier Platinum existe?" | SLA-2024-A (rank 1, contém "não existem outros tiers") | FAQ-15 | Qualquer referência a tiers inexistentes | 0.80 |

**Variação: Perguntas com Typos / Sinônimos**

| ID | Pergunta Alterada | Esperado vs RET-001 | Tolerância |
|----|---------|---------|-----------|
| RET-011 | "qual prazo devolução" (sem acentos) | Mesmo resultado RET-001 | Rank ±1 |
| RET-012 | "quanto tempo leva pra devolver" (sinônimo) | Mesmo resultado RET-001 | Rank ±2, Score ≥ 0.78 |
| RET-013 | "retorna mercadoria?" (sinônimo) | Mesmo resultado RET-002 | Rank ±1 |

### 2.2 Teste de Ranking Competitivo

**Objetivo:** Quando múltiplos chunks são relevantes, a ordem está correta?

| ID | Pergunta | Chunks Retornados | Análise |
|----|----------|---------|---------|
| RET-RANK-001 | "Multiplicador Sudeste" | [PROC-042v2-B: 0.92, PROC-042-B: 0.85, PROC-042v2-A: 0.78] | ✓ v2 em primeiro; v1 em segundo com score claro menor |
| RET-RANK-002 | "Frete especial Nordeste" | [PROC-042v2-B: 0.88, PROC-042v2-A: 0.85, PROC-042v2-D: 0.82, PROC-042-B: 0.73] | ✓ v2 dominante; v1 score < 0.75 |
| RET-RANK-003 | "Devolução cargas especiais" | [POL-001-B: 0.91, POL-001-A: 0.84, FAQ-03: 0.82] | ✓ Exceção em primeiro; genérico segundo |

### 2.3 Teste de Recall (Cobertura de Documentos)

| ID | Documento | Pergunta Teste | Chunks Retornados ≥ 1? |
|----|-----------|----------|----------|
| RET-REC-001 | POL-001 | "Qual prazo de devolução?" | ✓ Deve ter ≥ 1 chunk |
| RET-REC-002 | PROC-042-v1 | "Qual multiplicador Norte v1?" | Aceitar score baixo (0.6–0.75) — indica versão antiga |
| RET-REC-003 | PROC-042-v2 | "Qual multiplicador Norte v2?" | ✓ Deve ter score alto (0.85+) |
| RET-REC-004 | SLA-2024 | "Qual SLA Gold incidente crítico?" | ✓ Deve ter ≥ 1 chunk |
| RET-REC-005 | FAQ-Atendimento | "Carga danificada processo?" | ✓ Deve ter ≥ 1 chunk (FAQ-38) |

---

## 3. TESTES DE GERAÇÃO (LLM)

**Objetivo:** Dados os chunks corretos, o LLM gera resposta adequada?

### 3.1 Testes com Chunks Perfeitos (Golden Path)

| ID | Pergunta | Chunks Fornecidos | Esperado | Critério de Aceite |
|----|----------|---------|----------|---------|
| GEN-001 | "Prazo devolução?" | [POL-001-A, POL-001-B] | "7 dias úteis, exceto cargas perigosas classes 1-6 ANTT" | Contém "7 dias úteis"; menciona exceção classes ANTT |
| GEN-002 | "Multiplicador Manaus?" | [PROC-042v2-B] | "1.8 (conforme PROC-042-v2)" | Contém "1.8"; cita documento específico |
| GEN-003 | "SLA Gold?" | [SLA-2024-B] | "Resposta 2h, resolução 24h úteis" | Ambos os SLAs mencionados; "úteis" presente |
| GEN-004 | "Carga perigosa devolução?" | [POL-001-B] | "NÃO [elegível]; ramal 4500 Gestão de Riscos" | Lógica correta (negativa); direciona ramal |

### 3.2 Testes com Chunks Inadequados (Falha Esperada)

| ID | Pergunta | Chunks Fornecidos | Esperado | Avaliação |
|----|----------|---------|----------|----------|
| GEN-FAIL-001 | "SLA Platinum?" | [SLA-2024-A] (contém "não existem outros tiers") | Resposta deve dizer "Tier não existe" | ✓ Se responde; ✗ Se inventa valores |
| GEN-FAIL-002 | "Frete para 300kg SP?" | [Vazio — nenhum chunk sobre frete padrão] | "Não encontrei informação" | ✓ Se recusa; ✗ Se inventa regra |
| GEN-FAIL-003 | "Seguro de carga?" | [FAQ-22 com aviso informal] | Responde mas com caveat "documento informal, confirme com Comercial" | ✓ Se qualifica fonte; ✗ Se trata como normativo |

### 3.3 Testes de Aderência aos Guardrails

| ID | Teste | Input | Verificação | Critério |
|----|-------|-------|-----------|----------|
| GEN-GR-001 | Citar Fonte | Pergunta + chunks com ID | Resposta cita documento? | Deve incluir "conforme [DOC] seção X" |
| GEN-GR-002 | Não Inventar Prazos | Pergunta sem resposta documentada | Resposta inventa número? | Deve dizer "não encontrei" ou "sob análise" |
| GEN-GR-003 | Português Formal | Resposta genérica | Idioma correto? Formalidade? | Nenhum "vc", "tbm", emoji; português formal de negócio |
| GEN-GR-004 | Explícito quando não sabe | Query fora de escopo | Resposta é honesta? | Deve dizer explicitamente "esta informação não está em nossa base" |

---

## 4. TESTES DE CONTEXTO (Engenharia de Contexto)

**Objetivo:** Garantir que limites de contexto, lost in the middle, e context rot não degradam qualidade.

### 4.1 Teste de Orçamento de Contexto

| ID | Teste | Setup | Verificação | Esperado |
|----|-------|-------|------------|----------|
| CTX-BUD-001 | Limite de tokens | Query + Top-5 chunks | Total tokens = prompt + chunks + response | ≤ 6000 tokens (para modelo com 8K window) |
| CTX-BUD-002 | Truncamento seguro | Query onde chunks.total_tokens > window | Resposta mantém qualidade? | LLM recebe chunks ≤ window; sem truncamento silencioso |
| CTX-BUD-003 | Priorização de chunks | Top-10 chunks recuperados, window permite só 3 | Quais 3 o LLM recebe? | Top 3 por score (ou os mais recentes) |

### 4.2 Teste de Lost in the Middle

**Hipótese:** Chunk crítico no meio de 5+ chunks tem score menor que o do início/fim.

| ID | Teste | Setup | Verificação | Esperado |
|----|-------|-------|------------|----------|
| CTX-LIM-001 | Chunk crucial no meio | Pergunta "carga danificada + SLA + reembolso". Recupera 6 chunks: SLA (início), carga danificada (meio), reembolso (meio), frete (fim). | Resposta menciona reembolso completo? | ✓ Deve mencionar "NovaTech paga, sem custo"; não deve omitir |
| CTX-LIM-002 | Múltiplos chunks, um crítico | 5 chunks: genérico, genérico, **crítico**, genérico, genérico | Score do chunk crítico vs genéricos | Esperado: crítico ≥ 0.85; genéricos 0.70–0.80. Se invertido, falha |
| CTX-LIM-003 | Reordenação de chunks | Reordena chunks fornecidos ao LLM para pôr crítico no fim | Resposta muda? | Resposta pode ser menor, mas não deve invert lógica |

### 4.3 Teste de Context Rot (Conversas Longas no Teams)

**Objetivo:** Verificar que contexto de perguntas anteriores não é "esquecido".

| ID | Teste | Pergunta Série | Setup | Verificação | Esperado |
|----|----|----------|-------|-------------|----------|
| CTX-ROT-001 | Series de 3 perguntas | P1: "Cliente é de Manaus?" → R1: "Sim, Norte" | P1 estabelece contexto. P2: "Multiplicador?" → deve usar "Norte" | R2 menciona multiplica dor 1.8 (Norte v2) sem refazer P1 | ✓ Se menciona; ✗ Se responde genérico "depende da região" |
| CTX-ROT-002 | Series de 6 perguntas | P1–P5: dúvidas gerais. P6: "E se frigorificada?" | P1–P5 estabelecem cliente = Manaus, carga normal | R6 aplica contexto Manaus? | ✓ Deveria mencionar "Para Manaus, além do multiplicador 1.8, verif. se frigorificada não rompeu cadeia frio per POL-001-B" |
| CTX-ROT-003 | Reset de contexto | Series de 5. User: "Esqueça tudo anterior. SLA Platinum?" | Contexto anterior deve ser ignorado | Resposta: "Tier Platinum não existe" (não refere a Manaus) | ✓ Limpo; sem confusão |

### 4.4 Teste de Tamanho de Conversação

| ID | Teste | Conversação | Limites Testados | Esperado |
|----|-------|------------|---------|----------|
| CTX-SIZE-001 | Conversa curta (3 mensagens) | P1, P2, P3 | Nenhum limite | Qualidade consistente |
| CTX-SIZE-002 | Conversa média (8 mensagens) | P1–P8 | Começa a usar janela | Qualidade mantém; latência ≤ 2s |
| CTX-SIZE-003 | Conversa longa (15+ mensagens) | P1–P15 | Janela quase cheia | Qualidade degrada graciosamente; sem erros; latência 2–5s |
| CTX-SIZE-004 | Reset automático | Conversa 20+; time > 2h | Deve fazer reset ou avisar | Sistema reseta ou pede confirmação ao usuário |

---

## 5. TESTES DE PONTA A PONTA (E2E)

**Objetivo:** Pergunta → Resposta Completo com casos reais.

### 5.1 Casos E2E de Ouro (Golden Path)

| ID | Pergunta | Chunks Esperados | Resposta Esperada (Resumida) | Rubrica Min. |
|----|----------|---------|----------|----------|
| E2E-001 | "Qual o prazo de devolução?" | POL-001-A, POL-001-B | "7 dias úteis; exceção cargas perigosas → ramal 4500" | 2.7+ (Excelente) |
| E2E-002 | "Quanto custa frete para 600kg Manaus?" | PROC-042v2-A, PROC-042v2-B | "Base × 1.8 × 1.0 (600kg não tem fator). Valor final consulte tabela base." | 2.4+ (Bom) |
| E2E-003 | "SLA do cliente Gold com incidente crítico?" | SLA-2024-C, SLA-2024-D | "Resposta 30min; resolução 4h. Incidente crítico = carga >R$100k desconhecida >6h OU carga perigosa com irregularidade ..." | 2.7+ (Excelente) |

### 5.2 Casos E2E de Risco (Anti-Patterns)

| ID | Pergunta | Risco | Esperado | Rubrica Max. |
|----|----------|-------|---------|----------|
| E2E-FAIL-001 | "Posso devolver explosivos?" | Inversão lógica | "Não; ramal 4500" | 1.0 (Crítico) |
| E2E-FAIL-002 | "SLA cliente Platinum?" | Alucinação | "Tier não existe" | 1.0 (Crítico) |
| E2E-FAIL-003 | "Frete padrão para 300kg?" | Fora de escopo | "Não encontrei; consulte tabela base" | 2.0+ (Aceitável) |

---

## 6. TESTES DE REGRESSÃO

**Objetivo:** Quando prompt muda ou documento é atualizado, respostas anteriormente aprovadas continuam aprovadas.

### 6.1 Suite de Regressão Automática

**Trigger:** Qualquer mudança em:
- Prompt do sistema
- Versão do modelo LLM
- Documento indexado (versão nova ou remoção)

**Execução:** Antes de merge para produção

| ID | Caso | Status Anterior | Verificação |
|----|------|----------|-----------|
| REG-001 | E2E-001 (prazo devolução) | Aprovado (Rubrica 2.85) | Deve manter ≥ 2.7 |
| REG-002 | E2E-002 (frete Manaus) | Aprovado (Rubrica 2.4) | Deve manter ≥ 2.4 |
| REG-003 | E2E-003 (SLA Gold incidente) | Aprovado (Rubrica 2.7) | Deve manter ≥ 2.7 |
| REG-FAIL-001 | E2E-FAIL-001 (explosivos) | Bloqueado (Rubrica 1.0) | Deve permanecer bloqueado (< 2.0) |
| REG-FAIL-002 | E2E-FAIL-002 (Platinum) | Bloqueado (Rubrica 1.0) | Deve permanecer bloqueado (< 2.0) |

### 6.2 Matriz de Mudanças vs Testes

| Mudança | Testes Afetados | Necessário Re-rodar? |
|---------|----------|---------|
| Atualizar POL-001 seção 3.2 | RET-001, RET-002, E2E-001 | ✓ Sim (afeta retrieval + resposta) |
| Atualizar PROC-042-v2 multiplicadores | RET-004, RET-005, E2E-002 | ✓ Sim |
| Remover PROC-042 v1 do índice | RET-RANK-002, RET-REC-002 | ✓ Sim (verif que v1 desapareceu) |
| Mudar modelo LLM (GPT-4 → Claude) | Todos E2E + GEN | ✓ Sim (todo gen pode mudar) |
| Ajustar prompt sistema (guardrails) | GEN-GR-*, todos E2E | ✓ Sim |
| Adicionar novo documento (PROC-045) | Nenhum (sem perguntas sobre PROC-045) | ✗ Não |

### 6.3 Fluxo de Regressão

```
Mudança → Commit Push → CI/CD Pipeline
                            ↓
                    [Execute Suite Regressão]
                     (RET + GEN + E2E)
                            ↓
            Resultado: PASS / FAIL / DEGRADE
                            ↓
        PASS: Merge para stage   FAIL: Block; investigar
                  ↓                        ↓
            Deploy Stage          Feedback dev + retest
```

---

## 7. MÉTRICAS E KPIs

### 7.1 Métricas de Retrieval

| Métrica | Fórmula | Target | Frequência |
|---------|---------|--------|-----------|
| **Recall@3** | (#chunks corretos em top-3) / (total chunks corretos) | ≥ 0.90 (90%) | Diária |
| **MRR (Mean Reciprocal Rank)** | 1 / rank_do_primeiro_correto (média) | ≥ 0.85 | Diária |
| **Latência Retrieval** | Tempo query → chunks retornados | ≤ 500ms (p95) | Contínuo |
| **Versão Correta** | % queries que retornam doc. vigente | ≥ 0.95 (95%) | Diária |

### 7.2 Métricas de Geração

| Métrica | Fórmula | Target | Frequência |
|---------|---------|--------|-----------|
| **Taxa Aceitação** | Respostas com rubrica ≥ 2.4 / total | ≥ 0.85 (85%) | Semanal (amostra) |
| **Taxa Bloqueio** | Respostas com rubrica < 1.5 / total | ≤ 0.05 (5%) | Semanal |
| **Latência Gen** | Tempo chunks → resposta final | ≤ 3s (p95) | Contínuo |
| **Conformidade Guardrails** | Respostas que seguem todos 4 guardrails | ≥ 0.92 | Semanal |

### 7.3 Métricas de Negócio

| Métrica | Fórmula | Target | Frequência |
|---------|---------|--------|-----------|
| **Tempo Economizado** | Média tempo atendente (antes) - (depois) | 12 min → 2 min | Mensal |
| **Taxa Satisfação Atendente** | (Respostas úteis) / (total queries) | ≥ 0.80 (80%) | Semanal (survey) |
| **Redução Escalações** | Queries resolvidas sem consultoria / total | ≥ 0.60 (60%) | Mensal |

---

## 8. CRONOGRAMA DE TESTES

### Fase 1: Desenvolvimento (Semanas 1–3)

| Semana | Foco | Testes | Responsável |
|--------|------|--------|-------------|
| 1 | Ingestão | ING-*, INK-*, IDX-* | DevOps + QA |
| 2 | Retrieval | RET-001 a RET-010 | QA + ML Eng |
| 3 | Geração | GEN-001 a GEN-004 | QA + Product |

### Fase 2: Staging (Semana 4)

| Foco | Testes | Responsável |
|-----|--------|-------------|
| Contexto | CTX-BUD, CTX-LIM, CTX-ROT, CTX-SIZE | QA + DevOps |
| Ponta a Ponta | E2E-001 a E2E-FAIL-003 | QA + Product |
| Regressão | REG-001 a REG-FAIL-002 | CI/CD Automático |

### Fase 3: Produção (Go-live + Contínuo)

| Foco | Testes | Responsável | Frequência |
|-----|--------|-------------|-----------|
| Monitoramento Métricas | Recall@3, Taxa Aceite, Latência | DevOps + Analytics | Contínuo |
| Regressão Automática | Todos REG-* | CI/CD | A cada deploy |
| Auditoria Manual | Amostra 50 queries/semana | QA | Semanal |

---

## 9. Critérios de Aceite por Fase

### Go-live para Staging
- [ ] Todos ING-* PASS
- [ ] Todos RET-* ≥ 0.80 score
- [ ] Todos GEN-001 a GEN-004 PASS
- [ ] E2E-FAIL-* não invocam respostas perigosas

### Go-live para Produção
- [ ] Todos acima +
- [ ] CTX-BUD-001, 002, 003 PASS
- [ ] CTX-ROT-001, 002 PASS
- [ ] Taxa Aceite ≥ 0.80 em teste de 100 queries representativas
- [ ] Latência p95 ≤ 3s
- [ ] Zero Respostas com score < 1.5 em amostra

---

## 10. Riscos e Mitigação

| Risco | Impacto | Probabilidade | Mitigação |
|-------|--------|--------------|-----------|
| Chunks fragmentados causam lost in the middle | Respostas incompletas | Alta | Teste CTX-LIM-001 em dados reais antes do go-live |
| Versão de documento desatualizada não é removida | Cliente recebe informação errada | Alta | Automatizar verificação REG na ingestão; marcar v1 como deprecated |
| LLM inverte lógica de negativas | Desinforma atendente | Média | Adicionar exemplos de negação ao prompt; teste E2E-FAIL-001 + regressão |
| Contexto rot em conversas longas no Teams | Atendente fica confuso | Média | Teste CTX-ROT-002; considerar reset automático em 15+ msgs |
| Latência ultrapassa SLA (2min por chamado) | Atendente não consegue usar | Baixa | Monitorar CTX-SIZE-002/003 em staging; otimizar embedding se necessário |

---

## Apêndice: Checkpoints de Qualidade

```
✓ CHECKPOINT 1 (Fim Semana 2): Retrieval ≥ 0.85 score, Taxa recall@3 ≥ 0.90
✓ CHECKPOINT 2 (Fim Semana 3): GEN + E2E dorados todos PASS; nenhum E2E-FAIL invoca respostas
✓ CHECKPOINT 3 (Fim Staging): Contexto PASS; regressão 100%; métricas dentro do target
✓ CHECKPOINT 4 (Semana 1 Prod): 100 queries em produção, taxa aceite ≥ 0.80, 0 bloqueios críticos
✓ CHECKPOINT 5 (Semana 4 Prod): Tempo economizado ≥ 50% (12 min → 6 min min); satisfação ≥ 0.70
```

---
