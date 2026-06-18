# RUBRICA DE AVALIAÇÃO v2 — Respostas do Assistente de IA NovaTech

**Versão:** 2.0 (Corrigida e Ponderada)  
**Data:** 2026-06-02  
**Responsável:** QA — Análise Documental e Testes  

---

## Resumo Executivo das Mudanças v1 → v2

1. **Resolvida sobreposição D2 ↔ D3**: Guardrail #1 (citar fonte) removido de D3, deixando D2 exclusivamente responsável por citação
2. **Ponderação implementada**: D1 (40%) e D3 (30%) têm peso maior; D2 e D4 (15% cada) refletem risco operacional real
3. **Novo caso em D2**: "Cita fonte cuja interpretação contradiz o documento" (ex: R4)
4. **Categorização de erro**: Campo para diagnóstico (alucinação vs omissão vs inversão)
5. **Calibração inter-avaliadores**: Seção adicionada para garantir consistência entre múltiplos QAs

---

## DIMENSÃO 1: Precisão Factual

**Peso: 40% (critério mais importante)**

Avalia se a informação está correta segundo os documentos oficiais da NovaTech (Anexo A).

| Nível | Descrição | Exemplos |
|-------|-----------|----------|
| **1 — Incorreto** | Informação completamente falsa, alucinada, ou inversa à documentação. | "Prazo é 15 dias corridos" (é 7 dias úteis); "Explosivos podem ser devolvidos" (NÃO podem); "Tier Platinum existe" (não existe) |
| **2 — Parcialmente Correto** | Acerta dados principais mas omite exceções, versões anteriores, ou contextos críticos. Resposta tecnicamente verdadeira mas incompleta. | "Multiplicador Norte é 1.8" (certo para v2, mas não menciona v1=1.6 ou disposição transitória); "Devolução possível" (sem mencionar que cargas perigosas são exceção) |
| **3 — Correto** | Informação completa, precisa, alinhada com documentação. Inclui exceções, versões, e contextos relevantes. | "Devolução em 7 dias úteis, exceto cargas perigosas (classes 1-6 ANTT) → ramal 4500"; "Multiplicador v2 é 1.8, v1 era 1.6; chamados pré-01/12/2023 usam v1" |

---

## DIMENSÃO 2: Citação de Fonte (Rastreabilidade e Confiabilidade)

**Peso: 15%**

Avalia se a resposta cita a fonte de forma clara, específica e com nível apropriado de confiabilidade.

| Nível | Descrição | Exemplos |
|-------|-----------|----------|
| **1 — Sem Citação ou Contradição de Fonte** | Nenhuma fonte citada OU cita documento correto mas a resposta contradiz o conteúdo documentado (pior que não citar, cria falsa autoridade). | Sem citação; "Cita POL-001 mas diz explosivos podem ser devolvidos quando POL-001 diz que não"; FAQ citado como normativo sem avisar falta de validação |
| **2 — Citação Vaga ou Incompleta** | Cita fonte genérica sem especificar seção/versão OU cita corretamente mas omite nuances de confiabilidade (ex: FAQ informal não qualificado). | "Conforme documentação" (qual doc?); "PROC-042 diz..." (qual seção? qual versão?); FAQ informal citado sem aviso |
| **3 — Citação Clara e Qualificada** | Cita fonte específica (documento, seção, versão, data se aplicável). Se fonte é informal/não validada, avisa. Deixa claro a cadeia de autoridade. | "POL-001 seção 3.2"; "PROC-042-v2 seção 2.1 (atualizado novembro/2023)"; "FAQ Item 22 (documento informal, não validado por Compliance)" |

---

## DIMENSÃO 3: Aderência aos Guardrails Core (Exclui Citação)

**Peso: 30% (segundo mais importante)**

Avalia se a resposta segue os guardrails operacionais críticos. Citação é coberta por D2.

**Guardrails Avaliados:**
- **#2**: Nunca inventar prazos ou valores
- **#3**: Quando não encontrar, dizer explicitamente
- **#4**: Responder em português formal

| Nível | Descrição |
|-------|-----------|
| **1 — Viola 1+ Guardrails** | Inventa prazo/valor (G#2), finge saber quando não sabe (G#3), ou tom/idioma inapropriado (G#4). |
| **2 — Segue com Ressalvas** | Segue guardrails mas com imprecisão: não inventa mas é vago; ou deveria ser mais explícito quando não encontra. |
| **3 — Segue Todos** | Nenhum dado é inventado, é explícito quando não sabe, português formal apropriado. |

---

## DIMENSÃO 4: Completude (Utilidade Prática)

**Peso: 15%**

Avalia se a resposta fornece informação e contexto suficientes para o atendente agir sem dúvida.

| Nível | Descrição | Exemplos |
|-------|-----------|----------|
| **1 — Incompleto** | Omite informações críticas (exceções, próximos passos, contexto condicional). Atendente não consegue usar diretamente. | "Devolução leva 5 dias" (sem detalhar que é após aprovação, não desde a solicitação); sem mencionar procedimento abrir chamado |
| **2 — Suficiente mas Genérico** | Cobre essencial mas poderia ser mais informativo. Atendente precisa fazer acompanhamento. | "SLA de resposta é 2h" (para Gold — certo, mas não diz se é chamado geral ou incidente crítico) |
| **3 — Completo e Contextualizado** | Inclui exceções, condições, próximos passos. Atendente age com confiança. | "Para carga perigosa danificada (cliente Gold = incidente crítico), SLA resposta 30min. Registre em 48h com fotos (FAQ-38). Encaminhe para sinistros@novatech.com.br" |

---

## FÓRMULA DE PONTUAÇÃO (Ponderada)

```
Pontuação = (D1 × 0.40) + (D2 × 0.15) + (D3 × 0.30) + (D4 × 0.15)
```

**Intervalo:** 1.0 a 3.0

### Escala Interpretativa

| Intervalo | Status | Ação |
|-----------|--------|------|
| **2.7–3.0** | ✅ **Excelente** | Pronto para produção imediatamente |
| **2.4–2.6** | ✅ **Bom** | Aceitar com nota menor; monitorar em produção |
| **2.0–2.3** | ⚠️ **Aceitável** | Rejeitar, devolver para melhoria, reavaliar antes de reentrada |
| **1.5–1.9** | ⚠️ **Fraco** | Feedback crítico necessário; investigue padrão no pipeline |
| **1.0–1.4** | 🚫 **Crítico** | BLOQUEAR imediatamente; risco alto de desinformação |

---

## CATEGORIZAÇÃO DE ERRO (Diagnóstico do Pipeline)

Para cada resposta, marque o tipo de erro identificado (auxilia troubleshooting):

- **[ ] Alucinação** — Inventa informação não documentada (ex: tier Platinum)
- **[ ] Omissão** — Perde informação documentada (ex: disposição transitória)
- **[ ] Inversão** — Inverte lógica booleana de regra (ex: "SIM" quando é "NÃO")
- **[ ] Contradição de Fonte** — Cita documento mas interpreta invertido
- **[ ] Contexto Faltando** — Não aplica regra condicional (ex: sem verificar data de abertura)
- **[ ] Fonte Errada** — Usa FAQ informal para dado normativo crítico
- **[ ] Nenhum Erro** — Resposta aprovada

---

## TEMPLATE PADRÃO DE AVALIAÇÃO

```markdown
# AVALIAÇÃO DE RESPOSTA — Assistante IA NovaTech

**Data:** [DD/MM/YYYY]  
**Avaliador:** [Nome]  
**Lote ID:** [ex: LOTE-2024-06]  
**Resposta #:** [N]

---

## Contexto

**Pergunta Original:** [texto exato da pergunta]

**Resposta do Assistente:** [texto exato]

**Fonte Citada:** [ex: POL-001 seção 3.2]

**Chunks Recuperados pelo RAG:** [listar IDs dos chunks; ex: POL-001-A, POL-001-B]

---

## Avaliação por Dimensão

### D1: Precisão Factual (Peso 40%)
- **Nível:** [ 1 | 2 | 3 ]
- **Justificativa:** [Comparação com Anexo A; cite documentos específicos]
- **Documento(s) de Referência:** [ex: POL-001-B]

### D2: Citação de Fonte (Peso 15%)
- **Nível:** [ 1 | 2 | 3 ]
- **Clareza da Citação:** [Genérica / Específica / Com contexto de confiabilidade]
- **Observação:** [ex: "FAQ não validado — aviso incluído?"]

### D3: Guardrails Core (Peso 30%)
- **Nível:** [ 1 | 2 | 3 ]
- **G#2 (Não inventa):** [ ✓ | ✗ | ? ]
- **G#3 (Explícito quando não sabe):** [ ✓ | ✗ | ? ]
- **G#4 (Português formal):** [ ✓ | ✗ | ? ]
- **Observação:** [ex: "Inventa prazo de 5 dias para aprovação"]

### D4: Completude (Peso 15%)
- **Nível:** [ 1 | 2 | 3 ]
- **Informações Faltando:** [ex: "Não menciona exceção para cargas perigosas"; "Sem próximos passos"]
- **Acionabilidade:** [Atendente consegue usar direto? Precisa de acompanhamento?]

---

## Cálculo de Pontuação

- D1 = [ ] × 0.40 = [ ]
- D2 = [ ] × 0.15 = [ ]
- D3 = [ ] × 0.30 = [ ]
- D4 = [ ] × 0.15 = [ ]

**PONTUAÇÃO FINAL: [ ]** (escala 1.0–3.0)

**STATUS:** [ ✅ Excelente | ✅ Bom | ⚠️ Aceitável | ⚠️ Fraco | 🚫 Crítico ]

---

## Diagnóstico

**Tipo de Erro(s):**
- [ ] Alucinação
- [ ] Omissão
- [ ] Inversão
- [ ] Contradição de Fonte
- [ ] Contexto Faltando
- [ ] Fonte Errada
- [ ] Nenhum

---

## Recomendação

- [ ] **Pronto para Produção** — Nenhuma alteração necessária
- [ ] **Aceitar com Ressalva** — Monitorar em produção (score ≥ 2.4)
- [ ] **Rejeitar e Melhorar** — Enviar feedback ao time de desenvolvimento; reavaliar pós-correção
- [ ] **BLOQUEAR IMEDIATAMENTE** — Risco crítico de desinformação (score ≤ 1.4)

**Feedback Específico para Desenvolvimento:**
[Ex: "Resposta precisa mencionar disposição transitória PROC-042v2-E. Se chamado aberto antes de 01/12/2023, use multiplicador v1 (1.6 para Norte, não 1.8)"]

---

## Observações Adicionais

[Espaço para padrões identificados, sugestões de refinamento de prompt, investigação de retrieval, etc.]

---
```

---

## CALIBRAÇÃO INTER-AVALIADORES (Pré-Uso em Escala)

Antes de usar a rubrica com múltiplos avaliadores, execute uma sessão de calibração:

### Protocolo de Calibração

1. **Selecione 3–5 casos de referência** (mix de cenários: correto, parcialmente correto, incorreto)
2. **Cada avaliador avalia independentemente** (sem compartilhar pontuação)
3. **Compare scores** em cada dimensão
4. **Critério de aprovação**: Todos os avaliadores dentro de ±0.25 pontos na média final para cada caso
5. **Se não atingir critério**: Debata pontuação; refine descrições de nível; recalibre

### Template de Calibração

```markdown
# SESSÃO DE CALIBRAÇÃO — Rubrica v2

**Data:** [DD/MM/YYYY]  
**Avaliadores Presentes:** [Nomes]  
**Casos de Referência:** [ex: R1, R3, R4]

## Resultado por Caso

| Caso | Avaliador 1 | Avaliador 2 | Avaliador 3 | Média | Desvio | Aprovado? |
|------|-------------|-------------|-------------|-------|--------|-----------|
| R1 | 2.85 | 2.85 | 2.80 | 2.83 | 0.03 | ✓ Sim |
| R3 | 1.00 | 1.00 | 1.05 | 1.02 | 0.05 | ✓ Sim |
| R4 | 1.00 | 1.05 | 0.95 | 1.00 | 0.05 | ✓ Sim |

**Resultado Geral:** ✓ **APROVADO** — Todos os casos ≤ ±0.25. Equipe pronta para usar em escala.

## Pontos Discutidos

- [ex: "D2 em R3: Débato se 'cita POL mas inverte' é D2=1 ou D2=1.5. Consenso: D2=1, pois é o caso mais grave descrito em nível 1."]

---
```

---

## NOTAS IMPORTANTES PARA O TIME DE QA

1. **Dupla-penalização resolvida**: Uma resposta com citação ruim não é penalizada 2x (D2 + D3 em D3 anterior). Agora só afeta D2 (15%) e pode afetar D3 se violar G#3 ("ser explícito").

2. **Pesos refletem risco**: Precisão factual (40%) e Guardrails core (30%) representam 70% do score — reflete que erro factual ou guardrail violado é risco operacional alto.

3. **Categorização de erro é diagnóstico**: Se você vê muita "Omissão" (ex: disposição transitória não mencionada), o problema é no retrieval ou no chunking. Se "Inversão" (ex: POL diz NÃO mas resposta diz SIM), o problema é no prompt ou instrução do LLM.

4. **Calibração é obrigatória antes de escalar**: Dois QAs podem discordar em ±0.5 sem calibração prévia. Faça calibração com 3–5 casos de referência primeiro.

5. **Bloqueie críticos imediatamente**: Respostas com score ≤ 1.4 (Crítico) representam risco de desinformação. Não aguarde ciclo de review — bloqueia antes de ir para cliente/produção.

---

## Histórico de Versões

| Versão | Data | Mudanças |
|--------|------|----------|
| v1 | 2026-06-02 | Versão inicial: 4 dimensões, escala 1-3, pesos iguais |
| v2 | 2026-06-02 | Resolvida sobreposição D2-D3; pesos ponderados (40-30-15-15); novo caso D2; categorização de erro; protocolo calibração |

---
