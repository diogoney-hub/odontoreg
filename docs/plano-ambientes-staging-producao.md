# Plano de Ação — Separação de Ambientes: Staging e Produção

**Projeto:** OdontoConforme  
**Data:** 2026-06-18  
**Objetivo:** Criar uma camada de homologação entre o desenvolvimento e a produção, eliminando o risco de código não validado chegar a usuários pagantes.

---

## Contexto e Motivação

O setup atual faz deploy automático para produção a cada push na branch `main`. Isso significa que qualquer commit — inclusive correções rápidas e experimentais — vai direto para usuários reais sem passar por validação. Para um produto de compliance com usuários pagantes, isso é inaceitável: um bug no sistema de cota, no webhook de pagamento ou na autenticação pode causar perda de acesso, cobrança incorreta ou exposição de dados.

O plano abaixo cria dois ambientes completamente isolados (banco, chaves, domínio, deploy) com um fluxo de promoção controlado e auditável.

---

## Arquitetura final

```
GitHub: diogoney-hub/odontoreg
│
├── branch: develop
│   └── Auto-deploy → Vercel: odonto-conforme-staging
│                     ├── Domínio: staging.app.odontoconforme.com.br
│                     ├── Supabase: projeto staging (banco separado)
│                     ├── Asaas: sandbox (já é o atual)
│                     └── Gemini: mesma chave ou chave de dev
│
└── branch: main  (protegida — só aceita merge via PR)
    └── Deploy MANUAL → Vercel: odonto-conforme (produção)
                        ├── Domínio: app.odontoconforme.com.br
                        ├── Supabase: projeto produção (banco real)
                        ├── Asaas: produção (chave real)
                        └── Gemini: chave de produção
```

---

## Passo 1 — Criar a branch `develop` no GitHub

**Motivo:** Toda a base de código atual está em `main`, que vai direto para produção. A branch `develop` se torna o destino padrão de todo desenvolvimento novo. A `main` passa a ser sagrada — representa exatamente o que está em produção.

**Ações:**
1. Criar a branch `develop` a partir do estado atual da `main`
2. Definir `develop` como branch padrão do repositório no GitHub (Settings → Branches → Default branch)
3. A partir deste momento, todo trabalho novo começa em `develop` (ou em feature branches que fazem merge em `develop`)

**Resultado:** Dois trilhos de código — um para desenvolvimento contínuo (`develop`) e um que espelha produção (`main`).

---

## Passo 2 — Proteger a branch `main` no GitHub

**Motivo:** Sem proteção, qualquer pessoa com acesso pode fazer push direto na `main` e acionar um deploy de produção acidentalmente. A proteção força que toda mudança em `main` passe por um Pull Request revisado.

**Ações:**
1. Acessar GitHub → Settings → Branches → Add branch ruleset
2. Aplicar à branch `main`:
   - ✅ Require a pull request before merging
   - ✅ Require approvals: 1 (mesmo que seja você mesmo revisando)
   - ✅ Block force pushes
   - ✅ Restrict deletions
3. Opcional (recomendado a médio prazo): exigir que os checks de CI passem antes do merge

**Resultado:** Nenhum código chega à `main` sem ser explicitamente promovido via Pull Request. Cria um ponto de auditoria obrigatório.

---

## Passo 3 — Desabilitar auto-deploy de produção no Vercel

**Motivo:** O projeto atual faz deploy automático a cada push na `main`. Após a branch protection, pushes diretos não serão mais possíveis — mas o auto-deploy via merge de PR ainda aconteceria. O objetivo é que produção só seja atualizada quando houver decisão consciente.

**Ações:**
1. Acessar Vercel → projeto `odonto-conforme` → Settings → Git
2. Em "Production Branch", desabilitar deploy automático:
   - Desabilitar "Automatically deploy production on push"
   - Ou: mover o deploy de produção para ser acionado manualmente via Vercel dashboard ou CLI (`vercel deploy --prod`)
3. Manter preview deployments ativos para PRs (útil para revisão visual)

**Resultado:** A produção só é atualizada quando alguém conscientemente aperta o botão de deploy — não por reflexo de um merge.

---

## Passo 4 — Criar o projeto de staging no Vercel

**Motivo:** O staging precisa ser um ambiente independente com sua própria URL, suas próprias variáveis de ambiente e seu próprio banco. Não pode compartilhar nada com produção — senão um teste errado pode corromper dados reais ou consumir cota de usuários.

**Ações:**
1. No Vercel, criar novo projeto: `odonto-conforme-staging`
2. Conectar ao mesmo repositório GitHub (`diogoney-hub/odontoreg`)
3. Definir a branch de produção do projeto de staging como `develop`
4. Configurar auto-deploy: SIM (todo push em `develop` → deploy automático no staging)
5. Definir domínio: `staging.app.odontoconforme.com.br` (ou subdomínio à sua escolha)

**Resultado:** A branch `develop` tem seu próprio ambiente vivo, acessível para teste antes de qualquer promoção.

---

## Passo 5 — Criar projeto Supabase de staging

**Motivo:** Usar o banco de produção para testes é o erro mais comum e mais perigoso. Um teste de webhook pode criar pagamentos falsos. Um teste de cancelamento pode cancelar contas reais. O staging precisa de um banco completamente separado com dados de teste.

**Ações:**
1. Criar novo projeto no Supabase (ex: `odontoconforme-staging`)
2. Aplicar o mesmo schema de produção (tabelas `usuarios`, `consultas`, `pagamentos`, `eventos_assinatura`, `uso_mensal` com RLS)
3. Popular com dados de teste (usuários fictícios, assinaturas de teste)
4. Anotar as credenciais do novo projeto:
   - `NEXT_PUBLIC_SUPABASE_URL` (staging)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (staging)
   - `SUPABASE_SERVICE_ROLE_KEY` (staging)

**Resultado:** Banco de dados completamente isolado para o ambiente de staging. Testes destrutivos não afetam dados reais.

---

## Passo 6 — Configurar variáveis de ambiente no Vercel (por ambiente)

**Motivo:** Cada ambiente precisa de suas próprias chaves. O staging usa Asaas sandbox (já é o atual), Supabase de staging e pode usar a mesma chave do Gemini ou uma separada. A produção usa Asaas produção, Supabase de produção e chave Gemini de produção.

**Ações:**

No projeto Vercel de **staging** (`odonto-conforme-staging`):
```
NEXT_PUBLIC_SUPABASE_URL          → URL do Supabase staging
NEXT_PUBLIC_SUPABASE_ANON_KEY     → anon key do Supabase staging
SUPABASE_SERVICE_ROLE_KEY         → service role do Supabase staging
ASAAS_API_URL                     → https://sandbox.asaas.com/api/v3
ASAAS_API_KEY                     → chave sandbox (atual)
ASAAS_WEBHOOK_TOKEN               → token de teste
GEMINI_API_KEY                    → chave Gemini (pode ser a mesma)
```

No projeto Vercel de **produção** (`odonto-conforme`):
```
NEXT_PUBLIC_SUPABASE_URL          → URL do Supabase produção (já configurado)
NEXT_PUBLIC_SUPABASE_ANON_KEY     → anon key produção (já configurado)
SUPABASE_SERVICE_ROLE_KEY         → service role produção (já configurado)
ASAAS_API_URL                     → https://api.asaas.com/api/v3  ← TROCAR para produção
ASAAS_API_KEY                     → chave de PRODUÇÃO do Asaas     ← TROCAR
ASAAS_WEBHOOK_TOKEN               → token de produção              ← TROCAR
GEMINI_API_KEY                    → chave Gemini produção
```

⚠️ **Atenção:** Confirmar qual chave do Asaas está hoje em produção. As AGENTS.md estabelecem uso exclusivo de sandbox — antes do go-live real, as chaves de produção do Asaas precisam ser configuradas no ambiente de produção do Vercel.

**Resultado:** Cada ambiente tem seu próprio conjunto de credenciais. Impossível contaminar produção com dados de teste.

---

## Passo 7 — Configurar domínios

**Motivo:** URLs distintas tornam claro para todos (equipe, usuários beta, ferramentas de monitoramento) em qual ambiente estão. Evita o erro clássico de testar em produção achando que estava no staging.

**Ações:**
1. Manter `app.odontoconforme.com.br` (ou `odontoconforme.online` conforme hoje) apontando para produção
2. Criar subdomínio `staging.app.odontoconforme.com.br` apontando para o projeto de staging no Vercel
3. Adicionar registro DNS no provedor de domínio (CNAME apontando para o domínio Vercel do staging)

**Resultado:** Dois endereços distintos e inequívocos.

---

## Passo 8 — Definir o fluxo de trabalho da equipe (Git Flow simplificado)

**Motivo:** De nada adianta a infraestrutura de dois ambientes se o processo de trabalho não estiver claro. Todo colaborador (hoje e no futuro) precisa saber exatamente onde cada tipo de trabalho começa e como chega à produção.

**Fluxo padrão:**

```
1. Criar branch de feature a partir de develop:
   git checkout develop && git pull
   git checkout -b feature/nome-da-feature

2. Desenvolver e commitar normalmente na feature branch

3. Abrir PR: feature/nome → develop
   → Vercel gera preview deployment automático do PR
   → Revisar, aprovar, fazer merge

4. develop atualizada → Vercel faz deploy automático no staging
   → Testar no staging (staging.app.odontoconforme.com.br)

5. Quando staging está validado, abrir PR: develop → main
   → Descrever o que está sendo promovido
   → Revisar as mudanças com olhar de "isso vai para usuários reais"
   → Aprovar e fazer merge

6. Deploy de produção: manual
   → Vercel dashboard → projeto odonto-conforme → Deploy
   → OU: vercel deploy --prod (via CLI)
   → Monitorar logs por 10-15 minutos após o deploy
```

**Tipos de exceção — Hotfix crítico em produção:**
```
1. Criar branch a partir de main:
   git checkout main && git pull
   git checkout -b hotfix/descricao-do-problema

2. Corrigir, testar localmente, commitar

3. PR: hotfix/descricao → main (aprovação obrigatória)
   → Deploy manual em produção
   → Verificar correção

4. Cherry-pick de volta para develop:
   git checkout develop
   git cherry-pick <hash-do-commit>
```

**Resultado:** Processo claro, auditável, reversível. Qualquer pessoa que entrar no projeto entende o fluxo lendo este documento.

---

## Passo 9 — Atualizar documentação

**Motivo:** Decisões de infraestrutura que não estão documentadas não existem para quem entrar no projeto depois. O CLAUDE.md e o README precisam refletir o novo setup.

**Ações:**
1. Atualizar `CLAUDE.md` com a arquitetura de branches e ambientes
2. Atualizar `README.md` (hoje é boilerplate do Next.js) com:
   - Descrição do projeto
   - Como rodar localmente
   - Estrutura de branches
   - Variáveis de ambiente necessárias (sem os valores)
   - Fluxo de deploy
3. Adicionar `docs/odontoconforme-ambientes.md` descrevendo URLs, projetos Supabase e Vercel de cada ambiente

**Resultado:** Qualquer colaborador (humano ou IA) consegue entender o setup sem precisar reconstruir o contexto.

---

## Resumo de execução

| Passo | Ação | Onde | Estimativa |
|-------|------|------|------------|
| 1 | Criar branch `develop` | GitHub / local | 5min |
| 2 | Proteger branch `main` | GitHub Settings | 10min |
| 3 | Desabilitar auto-deploy de produção | Vercel Settings | 5min |
| 4 | Criar projeto staging no Vercel | Vercel | 10min |
| 5 | Criar projeto Supabase staging | Supabase | 20min |
| 6 | Configurar variáveis de ambiente | Vercel (2 projetos) | 15min |
| 7 | Configurar domínios | DNS + Vercel | 15min + propagação |
| 8 | Documentar fluxo de trabalho | Repositório | 20min |
| 9 | Atualizar documentação | Repositório | 20min |

**Total estimado:** ~2 horas de execução (excluindo propagação de DNS)

---

## O que NÃO fazer

- ❌ Não compartilhar banco de dados entre staging e produção
- ❌ Não usar chave de produção do Asaas no staging
- ❌ Não fazer push direto na `main` (mesmo sendo o dono do repo)
- ❌ Não promover `develop → main` sem testar no staging primeiro
- ❌ Não ignorar erros no staging achando que "em produção vai funcionar"

---

*Documento gerado em 2026-06-18. Manter atualizado conforme o setup evoluir.*
