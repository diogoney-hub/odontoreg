# OdontoConforme — Plano de Correção e Decisões

> Brief de execução. Complementa o `CLAUDE.md` (que guarda as decisões estáveis). Aqui mora o *plano* e o *porquê* — pode mudar conforme avança. Não mover este conteúdo para o CLAUDE.md (planos não devem fossilizar lá).

## Contexto: o que está sangrando

O app entrega ao usuário **links quebrados e números de norma inventados**, atingindo a promessa central ("com fontes"). Causa-raiz: **arquitetura de duas chamadas**.

- **Chamada 1** (`page.js`, `mode: 'fast-answer'`): gera o TEXTO que o usuário lê. Em `route.js`, a condição `mode !== 'fast-answer' && !currentAttachment` deixa o **grounding DESLIGADO** aqui. Logo, a resposta — com citações e links — sai da memória pura do modelo. É a origem da alucinação.
- **Chamada 2** (`mode: 'search-sources'`): roda o mesmo prompt com grounding, **joga o texto fora** e extrai só os links para a caixa "Fontes". São fontes de uma busca PARALELA, desconectadas das afirmações da resposta.
- Resultado: resposta nunca aterrada + caixa de fontes decorativa que não corresponde ao texto. Na auditoria de imagem (anexo), as duas chamadas ficam sem grounding → caixa de fontes **sempre vazia**. E custa 2 chamadas de modelo por pergunta.

Nenhum prompt sozinho conserta isso — é arquitetural.

---

## Passos de correção (ordem de impacto)

### Passo 1 — Colapsar para uma única chamada aterrada  [CRÍTICO]
Resposta e fontes saindo da MESMA geração com grounding.

`route.js` — condição do grounding (removendo o `fast-answer`):
```js
if (!currentAttachment) {
  payload.tools = [{ googleSearch: {} }];
}
```

`page.js` — substituir todo o bloco das duas chamadas (~linhas 671–736 de `handleSendMessage`) por UMA chamada (sem `mode`), extraindo texto E fontes do mesmo `candidates[0]`:
```js
const payload = { history, userQueryText, systemPrompt, currentAttachment, conselhoRegional: selectedUF };
const result = await fetchWithRetry(url, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
});
const cand = result.candidates?.[0];
const responseText = cand?.content?.parts?.map(p => p.text).filter(Boolean).join('')
  || "Desculpe, não consegui analisar sua requisição neste momento.";
const chunks = cand?.groundingMetadata?.groundingChunks || [];
const sources = chunks.map(c => ({ uri: c.web?.uri, title: c.web?.title })).filter(s => s.uri);
const uniqueSources = Array.from(new Map(sources.map(s => [s.uri, s])).values());
setMessages(prev => [...prev, {
  id: Date.now() + 1, role: 'model', text: responseText, sources: uniqueSources, isSearchingSources: false
}]);
setIsLoading(false);
```
Remover o modo `fast-answer` de todo o código. **Benefício: metade do custo, mais rápido, e coerente** (citações do texto passam a corresponder aos chips de fonte).

### Passo 2 — Aplicar o prompt de proveniência (v2)
Substituir a string `systemPrompt` em `page.js` (~linha 646) pelo prompt abaixo. Manter o `userQueryText` (injeta o estado do usuário), mas tirar o trecho que manda "responda com base no site oficial..." servir de desculpa para link de memória — o grounding fornece o link real.

```
Você é o assistente do OdontoConforme, voltado a cirurgiões-dentistas e clínicas
odontológicas no Brasil. Ajuda a entender e cumprir as regras do CFO e dos CROs,
com foco em conformidade, ética e publicidade.

Você é um assistente de ORIENTAÇÃO — não uma autoridade definitiva nem substituto
de consultoria jurídica. Seu valor está em ser confiável e honesto sobre o que sabe
e o que não consegue confirmar. Nunca pareça saber mais do que pode verificar.

REGRA INVIOLÁVEL DE PROVENIÊNCIA:
Separe sempre explicar um princípio de citar uma fonte específica.
1. Princípios gerais e conceituais (ex.: "publicidade odontológica não pode prometer
   resultados"): você pode explicar com seu conhecimento, desde que deixe claro que é
   orientação geral e oriente confirmar na fonte oficial.
2. Citações específicas — número de resolução, número de artigo, data, ou link: só
   pode fornecer se vier de uma fonte recuperada NESTA interação (grounding/base).
   - É TERMINANTEMENTE PROIBIDO inventar, adivinhar, completar ou "lembrar de memória"
     um número de norma, artigo ou URL.
   - Não escreva "Resolução CFO XXX/AAAA", "Art. X", nem link, se não recebeu isso de
     uma fonte verificada agora. Na menor dúvida, NÃO cite — descreva o princípio.
3. Links: nunca componha uma URL. Só forneça link vindo de fonte recuperada. Sem link
   verificado, nomeie a fonte (ex.: "site oficial do CFO") sem fabricar o endereço.

QUANDO NÃO TEM FONTE VERIFICADA:
Não preencha a lacuna. Diga: "Não consigo confirmar a norma específica sobre isso em
fonte verificada agora. O princípio geral é [X], mas confirme com o seu CRO ou no site
oficial antes de agir." Num produto de compliance, "não consegui confirmar" é uma
resposta correta e valiosa.

JURISDIÇÃO: Regras variam entre CFO (federal) e cada CRO estadual. Use o estado/CRO do
usuário. Se não souber, pergunte ou avise que pode variar conforme o CRO.

AUDITORIA DE PUBLICIDADE (ao receber imagem ou PDF de peça publicitária):
Auditoria rigorosa de marketing odontológico. Verifique: promessa/garantia de resultado;
"antes e depois" sem nome e CRO do profissional; sensacionalismo; divulgação de preço/
promoção; exposição desnecessária do paciente; ausência de dados obrigatórios (responsável
técnico, CRO). Para cada problema, diga o que corrigir. Aplique a MESMA regra de
proveniência: princípio você pode afirmar; número de artigo/resolução só com fonte
verificada.

FORMATO E TOM: linguagem simples, clara, direta e empática. Ao apontar erro/violação/
alerta, indique como eliminar ou minimizar. Indique sempre o nível de certeza (alto/médio/
baixo) e lembre que é orientação, não decisão final; para algo consequente, recomende
confirmar com o CRO ou advogado. Nunca sacrifique a honestidade por completude.
```

### Passo 3 — Corrigir a extração de fontes
`page.js` lê `groundingMetadata.groundingAttributions` (linha 718) — campo da API antiga, **provavelmente vem vazio** (motivo provável da caixa de fontes não aparecer). Trocar por `groundingChunks` (já no Passo 1). CONFIRMAR logando `console.log(JSON.stringify(cand?.groundingMetadata))` e ajustar conforme o que vier. As URIs do grounding do Google são links de redirecionamento (mostram `vertexaisearch`, expiram em ~semanas): exibir `source.title` (linha 1262) e proteger `new URL()` com try/catch.

### Passo 4 — Cartão de regras da auditoria de imagem  [próximo, não bloqueia hoje]
O caminho com anexo fica sem grounding (correto — auditoria não pode beber da web ao vivo). Embutir no system prompt da auditoria os artigos-chave de publicidade/ética (verificados, curados) para o parecer citar de texto estável.

### Passo 5 — Limpezas  [rápidas]
- `route.js`: não devolver `stack` do erro ao cliente (vazamento de info).
- `route.js`: o `GET /api/chat` é aberto e dispara chamada ao Google com a chave — proteger com auth ou remover.
- Remover resíduos de `mode: 'fast-answer'` e `'search-sources'`.

---

## Gate de validação — teste adversarial de proveniência (Flash-Lite)
**Decisão: testar o `gemini-flash-lite-latest` no caminho de texto ANTES de cogitar trocar de modelo.**

Após aplicar Passos 1–3, no caminho de texto, disparar perguntas que antes geravam citação inventada: *"qual resolução trata de X?"*, *"qual artigo proíbe Y?"*.
- **PASSA** se o Lite responder "não consigo confirmar na fonte / confirme no site oficial" em vez de cuspir número/link inventado → **mantém o Lite** (economia).
- **FALHA** se o Lite inventar "Resolução CFO XXX/AAAA" apesar da regra estar no prompt → **subir o caminho de texto para `gemini-2.5-flash`**.

O teste decide, não a teoria.

---

## Plano da base curada (trabalho seguinte — fundação de todos os degraus)
A base alimenta Q&A, auditoria e futuros geradores. Construir **depois** do tourniquet (Passos 1–3).

**Notion — schema** (base "OdontoConforme | CFO", já existe). Campos a adicionar: `Conselho`, `UF`, `Situação` (Vigente / Vigente alterada / Revogada / Revogada parcialmente), relações `Altera` / `Alterada por`, `Texto vigente (consolidado)`, `Consolidado até`. *(A aplicação do schema via conector ficou pendente de aprovação manual no Notion — fazer na mão se preciso.)*

**Regras da base:**
- Indexar SÓ o texto consolidado e vigente. Original + emenda ficam como rastreabilidade, **fora** do índice de resposta (o modelo não funde emendas via RAG).
- `Vigência` (validade legal) ≠ `Status BASE` (status da curadoria). Só entra no índice o que é Concluído E Vigente.
- O CFO publica a relação de alteração no topo de cada ato normativo (ex.: 161/2015 "altera a 63/2005") → espelhar essa determinação, não fazer análise jurídica própria.
- Frescor: a consolidação tem data ("Consolidado até"); emenda posterior a essa data NÃO está nela → o monitoramento pega o delta; durante a janela, remendar à mão ou marcar confiança menor (passo humano irredutível).

**Recuperação:** File Search (✅ suportado no 3.1 Flash/Flash-Lite). Cada arquivo carrega metadados (`conselho`, `uf`, `situacao`, `url`). O app filtra por jurisdição (CFO + CRO do usuário) e renderiza o link a partir do metadado. A mesma chamada única do Passo 1 recebe a base como mais uma fonte aterrada.

**Sync (depois do loop manual funcionar):** monitoramento diário (ex.: changedetection.io nas páginas oficiais) detecta mudança → estaciona o doc novo numa fila → curadoria humana aprova vigência (irredutível) → sincroniza para o File Search Store. Não dar o portão de curadoria ao crawler.

---

## Fora de escopo / rejeitado
- **Orquestrador de 5 agentes:** rejeitado. Agentes sobrepostos (jurídico ≈ ética; marketing = ética aplicada à publicidade), prematuro para um MVP cujo agente único ainda não é confiável, e multiplicaria os lugares onde a regra de proveniência teria que ser aplicada. A versão do tamanho certo (SE o dado justificar no futuro): UM assistente aterrado + um roteador leve que escolhe modo = {instrução + filtro de metadados + ferramentas}. Não construir agora.
- **Crawl/scraping ao vivo dos sites dos conselhos como fonte de resposta:** rejeitado (normas revogadas publicadas; spam de SEO injetado nos sites oficiais).
- **Validar churn com features especulativas:** antes de construir novos "degraus de valor" (foto→corrigida, auditoria periódica de perfil — esta última é construível e legítima por ser a conta do PRÓPRIO dentista), validar a dor com ~5 usuários reais. Não inventar roadmap.
