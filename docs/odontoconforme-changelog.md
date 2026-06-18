# OdontoConforme — Changelog

Registro cronológico de alterações no código. Complementa o `odontoconforme-fixes.md` (que guarda o *plano* e o *porquê* técnico) e o `CLAUDE.md` (que guarda as decisões estáveis). Aqui mora o *o que mudou*, *quando* e *por qual razão de negócio/produto*.

---

## 2026-06-18 — Correção arquitetural do chat (Passos 1–3 do plano de correção)

**Arquivos:** `src/app/api/chat/route.js`, `src/app/page.js`

**Problema resolvido:** O app entregava links quebrados e números de norma inventados ao usuário — um problema crítico para um produto de compliance. A causa-raiz era arquitetural: o texto da resposta era gerado *sem* grounding (busca ativa), e as fontes exibidas vinham de uma busca *paralela e desconectada*, sem relação com o texto.

### Alterações em `src/app/api/chat/route.js`

| # | O que mudou | Motivo |
|---|---|---|
| 1 | Removido `mode` do body destructuring | Campo não existe mais no payload — a distinção `fast-answer` / `search-sources` foi eliminada |
| 2 | Condição do grounding: `mode !== 'fast-answer' && !currentAttachment` → `!currentAttachment` | Grounding agora ativo em **todas** as chamadas de texto; antes ficava desligado exatamente na chamada que gerava o texto lido pelo usuário |
| 3 | Removido o guard `if (mode !== 'search-sources')` em torno da contagem de cota | Com uma única chamada por pergunta, a cota deve ser contada sempre; o guard existia para evitar dupla contagem com a segunda chamada (que deixou de existir) |
| 4 | Removido `stack: error.stack` da resposta de erro 500 | Vazamento de internals do servidor para o cliente — stack trace nunca deve ir para o frontend |

### Alterações em `src/app/page.js`

| # | O que mudou | Motivo |
|---|---|---|
| 5 | `systemPrompt` substituído pelo prompt v2 de proveniência | Prompt anterior instruía o modelo a "trazer sempre a fonte com link" sem mecanismo real de verificação — induzia alucinação de citações. O v2 proíbe explicitamente números de norma, artigo ou URL de memória e instrui o modelo a dizer "não consigo confirmar" quando não tem fonte verificada |
| 6 | `userQueryText` simplificado; removida a instrução "responda com base no site oficial do CFO (cfo.org.br)" | Essa instrução servia de gatilho para o modelo compor links de memória para parecer que obedeceu. A jurisdição do usuário (UF/CRO) é mantida como dado de contexto |
| 7 | Duas chamadas ao `/api/chat` colapsadas em uma | Elimina a dissociação entre texto e fontes. Texto e grounding saem da mesma geração; as fontes exibidas correspondem às afirmações da resposta |
| 8 | `groundingMetadata.groundingAttributions` → `groundingMetadata.groundingChunks` | `groundingAttributions` é o campo da API antiga do Gemini; `groundingChunks` é o campo atual — a caixa de fontes provavelmente aparecia vazia por causa desse mismatch |
| 9 | `parts[0].text` → `parts.map(p => p.text).filter(Boolean).join('')` | O Gemini pode retornar múltiplos fragments em `parts`; ler só o índice 0 truncava a resposta em alguns casos |
| 10 | `new URL(source.uri).hostname` protegido com try/catch | URIs de redirecionamento do Google Search Grounding podem não passar no parser de URL padrão, causando crash no render do componente de fontes |

### Temporário (remover após validação)

| # | O que mudou | Quando remover |
|---|---|---|
| T1 | `console.log('[grounding debug]', ...)` em `route.js` após receber a resposta do Gemini | Após confirmar que `groundingChunks` chega com dados na resposta crua |

---

## Pendente (próximas iterações)

- **Passo 4:** Cartão de regras curadas embutido no system prompt da auditoria de imagem (caminho com anexo não usa grounding — precisa de texto estável verificado)
- **Passo 5b:** GET `/api/chat` sem autenticação expõe a chave do Gemini indiretamente (lista modelos) — proteger com auth ou remover o handler
- **Passo 5c:** Remover resíduos de `isSearchingSources` e o spinner "Buscando links oficiais…" do JSX (inerte após o colapso para chamada única, mas polui o código)
- **Base curada:** Indexar normas vigentes do CFO/CROs no Notion com schema de vigência → sincronizar com File Search do Gemini para substituir o grounding de busca web como fonte primária

---

*Histórico anterior ao primeiro commit registrado aqui: ver `git log` e mensagens de commit.*
