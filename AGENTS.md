<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:odontoconforme-rules -->
## REGRAS INEGOCIÁVEIS (Segurança e Modelagem)

### Ambiente
1. Use SOMENTE a chave de SANDBOX do Asaas em tudo. Nunca a chave de produção. Antes de qualquer chamada ao Asaas, confirme qual chave está configurada no MCP e avise o usuário.
2. No Supabase, a chave service_role só roda no backend, nunca no front, nunca commitada. A chave anon vai para o cliente e depende de RLS para ser segura.

### Segredos
3. Nenhuma chave (Asaas, Supabase service_role, qualquer API) em código, prompt ou repositório. Tudo em variável de ambiente. Confirme que o `.gitignore` cobre os arquivos de ambiente e que nada sensível foi commitado.

### Banco de dados
4. Crie as cinco tabelas exatamente conforme o arquivo `docs/OdontoConforme - Estrutura de Dados (Supabase).md`: `usuarios`, `consultas`, `eventos_assinatura`, `pagamentos`, `uso_mensal`. Não invente campos nem remova os existentes sem avisar o usuário.
5. Toda mudança de schema é uma migration versionada e revisável. NÃO altere o banco com comandos avulsos. O usuário quer ver o diff e poder reverter.
6. Habilite RLS em TODAS as tabelas NO MESMO momento em que as cria, não depois. Política base: cada usuário só lê e escreve as próprias linhas (`auth.uid() = usuario_id`; na tabela `usuarios`, `auth.uid() = id`). Mostre a política de cada tabela.
7. Separe os dois caminhos de acesso: leitura do usuário via anon com RLS; escrita do sistema (webhook do Asaas) via service_role no backend, sem contexto de usuário logado. Não misture.

### Webhook do Asaas (ponto de maior risco)
8. O webhook DEVE validar a assinatura/token que o Asaas envia e rejeitar qualquer requisição sem ela. Sem isso, qualquer um manda um POST falso de "pagamento aprovado" e ganha acesso. Mostre o trecho que faz essa validação.
9. Idempotência: trate evento repetido sem duplicar pagamento nem liberar acesso duas vezes. Use o id do evento do Asaas como chave para ignorar repetição.
10. Regra de ouro do acesso: libere acesso SOMENTE quando o status for de pagamento confirmado E a assinatura válida. Nunca antes, nunca por inferência. O campo `status_assinatura` é a única fonte que o app consulta para liberar.

### Trava antifraude de trial
11. Constraint de unicidade no campo `documento` (CPF ou CNPJ), para impedir a mesma pessoa de refazer o trial com e-mail diferente.
12. Caso de borda (nulo temporário): `documento` modelado como UNIQUE mas com nulo permitido, para fechar a trava apenas na cobrança.

### Contadores de uso
13. Os limites são DOIS: diário e mensal. Cheque OS DOIS antes de liberar uma consulta. Se bater o teto diário OU mensal, bloqueie e ofereça upgrade.
14. O reset é por comparação de data: o contador guarda a data e zera quando a data corrente muda (sem cron jobs).
15. Toda consulta é gravada na tabela `consultas` no MESMO momento em que o contador incrementa.

### LGPD
16. A exclusão lógica via `deletado_em` tem que esconder o usuário das consultas do app de fato.
17. O consentimento de marketing é gravado separado dos termos de uso, com versão, data e IP.

## COMO REPORTAR AO USUÁRIO
Não implemente tudo de uma vez. Implemente passo a passo e mostre, item a item:
- A política RLS de cada tabela.
- O trecho de validação do webhook e a idempotência.
- Onde as chaves estão (variáveis de ambiente, não commitadas).
- A lógica de contagem dupla de limites de uso.
- Responda: "e se chegar um POST no webhook sem o token, o que acontece?" para provar o bloqueio de requisições falsas.
<!-- END:odontoconforme-rules -->
