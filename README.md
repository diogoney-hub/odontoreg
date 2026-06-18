# OdontoConforme — Gestão e Conformidade Odontológica

OdontoConforme é uma aplicação web construída em Next.js para auxiliar cirurgiões-dentistas e clínicas odontológicas no Brasil a cumprirem as normas do Conselho Federal de Odontologia (CFO) e Conselhos Regionais (CRO). O sistema valida peças publicitárias, posts e condutas profissionais usando a API do Gemini com Google Search grounding.

---

## 🛠️ Requisitos e Instalação

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Crie um arquivo `.env.local` na raiz do projeto contendo as seguintes chaves de ambiente:
   ```env
   # API do Gemini (Google AI Studio)
   GEMINI_API_KEY="<sua_gemini_api_key>"

   # Supabase (Banco de Dados e Autenticação)
   NEXT_PUBLIC_SUPABASE_URL="https://<projeto_id>.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="<sua_anon_key>"
   SUPABASE_SERVICE_ROLE_KEY="<sua_service_role_key>" # Somente no backend

   # Integração Asaas (Gateway de Pagamento - Modo Sandbox Obrigatório)
   ASAAS_API_URL="https://sandbox.asaas.com/api/v3"
   ASAAS_API_KEY="<sua_chave_sandbox_asaas>"
   ASAAS_WEBHOOK_TOKEN="<token_seguro_configurado_no_webhook_do_asaas>"
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

---

## 🗄️ Estrutura de Banco de Dados (Supabase)

A aplicação depende de cinco tabelas fundamentais no Supabase. Para criar as restrições corretas, funções atômicas de cota e segurança RLS (Row Level Security), execute o script SQL contido em [migrations.sql](file:///c:/DNA/Apps%20DNA/odontoreg/docs/migrations.sql) no painel de SQL Editor do seu Supabase Dashboard.

### Políticas de Segurança (RLS)
Todas as tabelas possuem **Row Level Security (RLS)** ativado por padrão:
- **`usuarios`**: Cada usuário tem acesso de leitura/escrita restrito apenas às suas próprias linhas (`auth.uid() = id`).
- **`consultas`**: Cada usuário só pode ver as consultas feitas por ele (`auth.uid() = usuario_id`).
- **`pagamentos`**: Cada usuário só pode ver suas faturas e histórico de pagamento (`auth.uid() = usuario_id`).
- **`eventos_assinatura`**: Cada usuário só pode ver seus logs de mudança de plano (`auth.uid() = usuario_id`).

O webhook do Asaas e as atualizações de gateway acessam o Supabase utilizando a chave `SUPABASE_SERVICE_ROLE_KEY` no backend (sem contexto de usuário logado), permitindo a correta sincronização de faturas e planos com segurança.

---

## 🔐 Segurança e Tratamento de Concorrência

1. **Autenticação em Cancelamentos**: O endpoint `/api/cancel` valida o token de autenticação via Supabase Client no servidor para garantir que apenas o próprio assinante possa solicitar a exclusão de sua conta no Asaas.
2. **Mandatoriedade de Token no Webhook**: O endpoint do webhook Asaas valida estritamente o header `asaas-access-token`. Se a chave `ASAAS_WEBHOOK_TOKEN` não estiver configurada ou for inválida, a requisição é negada imediatamente.
3. **Idempotência**: O webhook do Asaas previne eventos duplicados via restrição `UNIQUE` na coluna `origem` da tabela `eventos_assinatura`. Concorrências repetidas que violarem a restrição (erro Postgres `23505`) são silenciadas e retornam código de sucesso `200` sem duplicar faturas ou permissões.
4. **Contagem Atômica de Limites**: A verificação dos limites diários e mensais é feita de forma atômica no banco de dados através da chamada RPC `incrementar_consultas(user_id_arg, limit_dia_arg, limit_mes_arg, today_arg)`, que bloqueia a linha do usuário via `FOR UPDATE` para impedir que requisições paralelas burlem a cota.
5. **Escape contra XSS no PDF**: A exportação de consultas para formato PDF utiliza a função `escapeHtml` para higienizar qualquer entrada ou nome de usuário, prevenindo injeções de HTML.
