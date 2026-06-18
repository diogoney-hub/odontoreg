# CLAUDE.md — OdontoConforme

## O que é (WHAT)
OdontoConforme é um assistente de IA de conformidade para cirurgiões-dentistas e clínicas no Brasil. Responde dúvidas sobre normas do CFO (Conselho Federal de Odontologia) e dos CROs estaduais, e audita peças de publicidade odontológica contra o Código de Ética. Produto da DNA Solução Digital. **MVP em produção, com usuários pagantes.**

## Por que existe (WHY)
A promessa central é orientação **confiável e com fontes**. Num produto de compliance, uma citação inventada (número de resolução ou link falso) é **pior** que nenhuma — leva o dentista a erro ético ou autuação. Portanto: **acurácia e proveniência da informação têm prioridade sobre parecer completo ou impressionante.** Abster-se é resposta válida.

## Stack
- Next.js 16 (App Router) + React 19, Tailwind 4
- Supabase (auth + Postgres: tabelas `usuarios`, `consultas`) via `@supabase/ssr`
- Gemini API (`generativelanguage.googleapis.com/v1beta`) — chamada server-side em `src/app/api/chat/route.js`
- Vercel (deploy); react-markdown + remark-gfm (render); html2pdf.js (export); lucide-react
- Chave do Gemini em `GEMINI_API_KEY` (server-side, nunca exposta ao cliente)

## Arquitetura do chat (HOW)
`src/app/page.js` (`handleSendMessage`) monta a requisição → `POST /api/chat` (`route.js`) faz auth + checagem de cota no Supabase → chama o Gemini → devolve. O `systemPrompt` e o `userQueryText` são montados no cliente (`page.js`). O estado/CRO do usuário (`selectedUF`) é capturado e injetado — **jurisdição é dado conhecido, não inferido.**

Cota (`route.js`): trial 10/mês; essencial 30/dia e 300/mês; completo 50/dia e 750/mês.

## Decisões de arquitetura TRAVADAS (não reverter sem discussão)
Se o código atual contradiz alguma, é porque está em correção — ver `docs/odontoconforme-fixes.md`.

1. **Chamada única aterrada.** Resposta e fontes vêm da MESMA chamada `generateContent` com grounding. NÃO usar duas chamadas (uma p/ texto, outra p/ fontes) — produz resposta não-aterrada + fontes que não correspondem às afirmações. *(O código atual ainda faz o split de 2 chamadas; está sendo consertado.)*

2. **Regra de proveniência (no system prompt).** O modelo NUNCA emite número de norma, número de artigo ou URL que não recebeu de uma fonte recuperada na interação. Separar *princípio geral* (pode explicar, rotulado como geral) de *citação específica* (só de fonte verificada). Nunca compor URL.

3. **Nada de crawl/scraping ao vivo dos sites dos conselhos como fonte de resposta.** Eles mantêm normas revogadas publicadas e já apareceram com spam de SEO injetado. Grounding de busca web serve como ferramenta, mas a resposta prioriza a base curada.

4. **Base curada = fonte da verdade**, mantida no Notion, com controle de vigência. Indexar SEMPRE o texto consolidado (nunca original + emenda separados — o modelo não funde emendas). O CFO publica as relações de alteração entre normas → **espelhar, não deduzir.**

5. **File Search (RAG gerenciado) é a camada de recuperação da base.** ✅ Confirmado suportado no Gemini 3.1 Flash e Flash-Lite. Link/citação vem dos METADADOS do trecho recuperado (renderizado pelo app), não do texto do modelo.

6. **Split de modelos:** `gemini-2.5-flash` no caminho com anexo (auditoria de imagem); `gemini-flash-lite-latest` no caminho de texto. ⚠️ **PENDENTE DE VALIDAÇÃO:** rodar teste adversarial de proveniência no Flash-Lite. **Decisão atual: testar Flash-Lite primeiro**; só subir para `2.5-flash` se ele vazar citação inventada apesar da regra no prompt.

7. **Auditoria de imagem não usa busca web.** Recebe um "cartão de regras" curado (artigos-chave de publicidade, verificados) embutido no system prompt, para citar de texto estável. *(Planejado — ver fixes doc.)*

## Convenções
- Metadados de grounding: ler `candidates[0].groundingMetadata.groundingChunks` (`groundingAttributions` é da API antiga — confirmar logando a resposta crua).
- Nunca devolver `stack` de erro ao cliente.
- Regras de estilo de código ficam no ESLint, não aqui.

## Comandos
`npm run dev` · `npm run build` · `npm run start` · `npm run lint`

## Plano de execução ativo
Não vive aqui (planos mudam; memória não pode virar fóssil). Ver **`docs/odontoconforme-fixes.md`**.
