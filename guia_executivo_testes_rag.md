# GUIA EXECUTIVO — Testes do Pipeline RAG NovaTech

**Data:** 2026-06-02  
**Público:** PMs, QA Lead, DevOps, Product Engineering  
**Duração Leitura:** 5 minutos  

---

## Resumo Executivo

O pipeline RAG passa por 6 etapas críticas que precisam ser testadas separadamente e no fluxo integrado. Este guia mapeia o que testar, quando, e com qual critério de aceite.

```
DOCS → EXTRAÇÃO → CHUNKING → EMBEDDING → INDEX → QUERY → RETRIEVAL → PROMPT → LLM → RESPOSTA
 ↓        ↓           ↓          ↓        ↓        ↓         ↓        ↓      ↓      ↓
[ING]   [ING]       [ING]      [ING]   [ING]    [RET]      [RET]    [GEN]  [GEN]  [E2E]
```

**Total de testes:** 100+ casos (mas ~30 core + 70 de cobertura expandida)

---

## 1️⃣ INGESTÃO (Semana 1 — Dev)

**O que:** Documentos entram no sistema corretamente?

**5 Checkpoints Críticos:**
1. ✓ Documentos extraem sem erros OCR (PDF, Word, FS)
2. ✓ Chunks têm 200–400 palavras (não orfãos, não genéricos)
3. ✓ Metadados incluem doc_name, version, section
4. ✓ Versões antigas (PROC-042 v1) marcadas como deprecated
5. ✓ Índice disponível em <1s latência

**Saída esperada:** ~13 testes, todos PASS. Se falhar: bloqueia go-live Staging.

---

## 2️⃣ RETRIEVAL (Semana 2 — Dev)

**O que:** Pergunta correta retorna chunks corretos?

**10 Perguntas Core (do Anexo B):**

| Pergunta | Chunks Esperados | Score Mín. | Bloqueia se... |
|----------|----------|---------|---------|
| Prazo devolução? | POL-001-A, B | 0.82 | Retorna PROC-042 em rank 1 |
| Devolução perigosa? | POL-001-B | 0.85 | Confunde com "possível" |
| SLA Gold? | SLA-2024-B | 0.80 | Traz incidente crítico |
| Multiplicador Manaus? | PROC-042v2-B (v1 < 0.75) | 0.88 | v1 com score > 0.75 |
| Frete 2.5t Nordeste 12 fretes? | PROC-042v2-A,B,D | 0.80 | Missing desconto ou fator peso |

**Variações testadas:**
- Typos ("qual prazo devolução" sem acentos) → Rank ±1
- Sinônimos ("quanto tempo devolver") → Rank ±2

**Saída esperada:** 25 testes Retrieval; Recall@3 ≥ 0.90; MRR ≥ 0.85. Se < 0.80 em core: investigar embeddings.

---

## 3️⃣ GERAÇÃO (Semana 2-3 — Dev)

**O que:** Dados chunks corretos, LLM responde bem?

**4 Guardrails Testados:**

| Guardrail | Teste | Critério |
|-----------|-------|----------|
| **Citar Fonte** | Resposta menciona "conforme POL-001 seção 3.2"? | ✓ Específico; ✗ Genérico |
| **Não Inventar** | "SLA Platinum?" → Responde "não existe"? | ✓ Recusa; ✗ Inventa 1h/12h |
| **Ser Explícito** | "Frete 300kg?" → Diz "não encontrei"? | ✓ Transparente; ✗ Interpola |
| **Português Formal** | Sem "vc", "tbm", emoji? | ✓ Formal; ✗ Casual |

**Anti-Patterns (MUST FAIL):**
- E2E-FAIL-001: Explosivos → "SIM podem devolver" = **BLOQUEIO 🚫**
- E2E-FAIL-002: Tier Platinum = **BLOQUEIO 🚫**

**Saída esperada:** 15 testes; 0 respostas com score < 1.5 (crítico).

---

## 4️⃣ CONTEXTO (Semana 4 — Staging)

**O que:** Limites, lost in the middle, context rot não quebram tudo?

### 4.1 Orçamento de Contexto
- **Query + Top-5 chunks ≤ 6.000 tokens** (8K window LLM)
- **Sem truncamento silencioso** de chunks importantes

### 4.2 Lost in the Middle
**Hipótese:** Chunk crítico no meio de 5+ chunks é processado com qualidade igual ao do início/fim.

| Teste | Setup | Esperado |
|-------|-------|----------|
| Carga danificada + SLA + reembolso | 6 chunks; crítico no meio | Resposta menciona reembolso sem custos (não omite) |
| Desconto de volume no meio | 5 chunks; regra de desconto no meio | Aplica 5% desconto corretamente |

### 4.3 Context Rot (Conversas Longas no Teams)
| Teste | Setup | Esperado |
|-------|-------|----------|
| P1: "Cliente Manaus?" → P2: "Multiplicador?" | Series 3 | P2 usa contexto: "1.8" |
| P1–P5: genéricas; P6: "E se frigorificada?" | Series 6 | P6 aplica "Manaus" + "frigorificada" juntos |

**Saída esperada:** 12 testes; nenhuma degradação de qualidade em conversas >8 msgs.

---

## 5️⃣ PONTA A PONTA (Semana 4 — Staging)

**O que:** Pergunta → Resposta final com qualidade?

### Casos Ouro (Devem PASS com Rubrica ≥2.7)
```
E2E-001: "Prazo devolução?" 
  → "7 dias úteis, exceto cargas perigosas (classes 1-6 ANTT) → ramal 4500"
  → Rubrica: 2.85 ✓

E2E-003: "SLA Gold incidente crítico?"
  → "30min resposta; 4h resolução; definição: carga >R$100k desconhecida >6h OU..."
  → Rubrica: 2.7+ ✓
```

### Casos Anti-Pattern (Devem FALHAR com Rubrica ≤1.0)
```
E2E-FAIL-001: "Devolução explosivos?"
  → NÃO pode (POL-001-B explícito)
  → Resposta CORRETA: "Não; ramal 4500"
  → Resposta INCORRETA: "Sim, 7 dias" = BLOQUEIO 🚫

E2E-FAIL-002: "SLA Platinum?"
  → Tier não existe (SLA-2024-A explícito)
  → Resposta CORRETA: "Platinum não existe"
  → Resposta INCORRETA: "1h resposta, 12h resolução" = BLOQUEIO 🚫
```

**Saída esperada:** 6 testes; 3 ouro ≥2.7; 2 anti-pattern ≤1.0; 1 aceitável ≥2.0.

---

## 6️⃣ REGRESSÃO (Contínuo — Pós Go-Live)

**Trigger:** A cada mudança em:
- ✓ Prompt do sistema
- ✓ Versão do modelo LLM
- ✓ Documento atualizado (versão nova ou remoção)

**Execução:** Automática no CI/CD; bloqueia merge se falhar

| Antes (Aprovado) | Depois (Verificar) | Critério |
|----------|---------|----------|
| E2E-001: Rubrica 2.85 | Mantém ≥2.7? | PASS / FAIL |
| E2E-FAIL-001: Bloqueado (1.0) | Permanece < 2.0? | PASS / FAIL |

---

## 📊 MÉTRICAS-CHAVE (Contínuo)

### Retrieval
- **Recall@3:** ≥90% (% chunks corretos em top-3)
- **MRR:** ≥0.85 (ranking médio correto)
- **Latência:** ≤500ms (p95)

### Geração
- **Taxa Aceite:** ≥85% (rubrica ≥2.4)
- **Taxa Bloqueio:** ≤5% (rubrica <1.5)
- **Conformidade Guardrails:** ≥92%

### Negócio
- **Tempo Economizado:** 12 min → 2 min (redução 83%)
- **Taxa Satisfação Atendente:** ≥80%
- **Redução Escalações:** ≥60% resolvido s/ consultoria

---

## 🚦 Checkpoints de Aprovação

### ✓ Checkpoint 1: Fim Dev (Semana 2)
- [ ] Retrieval ≥0.85 score
- [ ] Recall@3 ≥0.90
- [ ] Nenhum teste ING ou INK falha

### ✓ Checkpoint 2: Fim Dev (Semana 3)
- [ ] GEN + E2E ouro todos PASS
- [ ] E2E-FAIL-001/002 = bloqueado (1.0)
- [ ] Taxa aceite ≥85% em amostra 30 queries

### ✓ Checkpoint 3: Fim Staging
- [ ] Contexto (CTX-*) PASS
- [ ] Regressão 100% pass
- [ ] Latência p95 ≤3s
- [ ] Zero críticos em 100 queries amostra

### ✓ Checkpoint 4: Go-Live + Semana 1
- [ ] 100 queries produção; taxa aceite ≥80%
- [ ] 0 bloqueios críticos
- [ ] Tempo economizado ≥50% (12 min → 6 min mín)

---

## 🎯 Cronograma

| Fase | Semana | Foco | Owner | Critério Saída |
|------|--------|------|-------|---------|
| **Dev** | 1 | Ingestão | DevOps | ING-* all PASS |
| **Dev** | 2 | Retrieval | QA + ML | RET-* ≥0.85 score |
| **Dev** | 3 | Geração | QA + Product | GEN-* PASS; E2E-FAIL bloqueado |
| **Staging** | 4 | Contexto + E2E | QA + DevOps | CTX-*, REG-* PASS |
| **Produção** | 4+ | Monitoramento Contínuo | DevOps + Analytics | Métricas no target |

---

## ⚠️ Riscos Críticos

| Risco | Impacto | Mitigation |
|-------|--------|-----------|
| Chunks fragmentados → Lost in Middle | Respostas incompletas | Teste CTX-LIM-001 em dados reais |
| Versão v1 não removida → Info desatualizada | Cliente recebe errado | Automatizar remoção v1 pós-v2 go-live |
| LLM inverte negação → "SIM explosivos" | CRÍTICO; atendente desinforma | Teste E2E-FAIL-001 em regressão 100% |
| Context rot em 15+ msgs → Atendente confuso | Qualidade degrada | Reset automático ou aviso em CTX-SIZE-004 |

---

## 📋 Como Usar Este Plano

### Para QA:
1. Abra `matriz_rastreamento_testes_rag.csv`
2. Filtre por **Prioridade = P0** para ordem de execução
3. Execute teste; preencha Status, Resultado, Notas
4. Bloqueie se score < esperado ou rubrica < 1.5

### Para DevOps:
1. Implemente testes de Regressão (REG-*) no CI/CD
2. Configure alertas se latência > 500ms ou timeout
3. Remova versão v1 do índice após cutoff 01/12/2023

### Para Product:
1. Monitore Checkpoints (4 pontos de approval acima)
2. Go-live Staging quando Checkpoint 3 = PASS
3. Go-live Produção após 1 semana Staging sem críticos

---

## 📞 Contato e Escalação

| Bloqueio | Responsável | SLA Resolução |
|----------|-------------|---------|
| Teste Ingestão FAIL | DevOps | 4h |
| Teste Retrieval score < 0.80 | ML Eng | 8h |
| Teste Geração FAIL (E2E-FAIL) | QA + Product | 2h |
| Contexto degradação | QA + DevOps | 4h |

---

## Arquivo Referência

- **Plano Completo:** `plano_testes_rag_pipeline.md` (10+ páginas, casos de teste detalhados)
- **Matriz Rastreamento:** `matriz_rastreamento_testes_rag.csv` (Excel-ready, status em tempo real)
- **Este Guia:** `guia_executivo_testes_rag.md` (você está lendo)

---

**Última Atualização:** 2026-06-02  
**Status:** ✅ Pronto para Implementação  
**Próximo:** Sessão de calibração inter-avaliadores (Seg 03/06)
