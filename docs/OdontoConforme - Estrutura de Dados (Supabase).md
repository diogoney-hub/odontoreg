---
tags: [dna-clinic, produto, odontoconforme, banco-de-dados, supabase, lancamento]
produto: "OdontoConforme"
status: "pré-lançamento"
created: 2026-06-05
---

# OdontoConforme · Estrutura de Dados (Supabase)

> Referência do banco para o lançamento. Ver decisões gerais em [[OdontoConforme - Decisões de Lançamento]].
> Princípio: capturar todo dado irreversível desde o dia 1. NÃO construir relatórios ou dashboards agora, só capturar. A análise vem depois; o dado não capturado some para sempre.

## Princípios de modelagem

1. **Estado atual fica na tabela do usuário. Histórico fica em tabela de eventos.** Um campo guarda o agora; uma tabela de eventos guarda a sequência no tempo.
2. **Fonte da verdade é o log de consultas.** Contadores e fechamento mensal são derivados dele.
3. **Segurança (RLS) e LGPD não são opcionais.** Ver seções no fim.
4. Cinco tabelas: `usuarios`, `consultas`, `eventos_assinatura`, `pagamentos`, `uso_mensal`.

Observação Supabase: e-mail e senha vivem na tabela nativa `auth.users`. A tabela `usuarios` abaixo é o perfil da aplicação, com `id` referenciando `auth.users(id)`.

---

## 1. `usuarios` (perfil e estado atual)

### Identidade e cadastro (etapa 1 + retorno do Asaas)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | referencia auth.users(id) |
| nome_completo | text | obrigatório |
| tipo_documento | text | 'cpf' ou 'cnpj' |
| documento | text, UNIQUE | só números. Aceita nulo temporário até passar pelo Asaas. Trava antifraude de trial. Vem do retorno do Asaas, não do formulário |
| perfil_atuacao | text | dono/sócio, autônomo, contratado, gestão (mkt), gestão (admin/jurídico), estudante, outros |
| conselho_regional | text | ex.: 'CRO-SP'. Necessário para enviar o relatório certo. Nulo até capturar |
| criado_em | timestamptz | default now() |
| atualizado_em | timestamptz | |
| deletado_em | timestamptz | exclusão lógica (direito ao esquecimento) |

### Consentimento (LGPD)
| Campo | Tipo | Notas |
|---|---|---|
| consentimento_termos | boolean | aceite dos termos de uso |
| consentimento_marketing | boolean | separado dos termos. Habilita prospecção dos outros produtos DNA Clinic |
| consentimento_versao | text | versão do texto aceito |
| consentimento_data | timestamptz | quando aceitou |
| consentimento_ip | inet | IP no aceite (prova) |

### Assinatura (estado atual, sincronizado do Asaas via webhook)
| Campo | Tipo | Notas |
|---|---|---|
| asaas_customer_id | text, UNIQUE | amarra usuário ao cliente no Asaas |
| status_assinatura | text | trial, ativo, pagamento_pendente, cancelado, expirado. **Campo mais crítico: o app lê isto para liberar/bloquear acesso** |
| plano_atual | text | essencial, completo. Nulo no trial puro |
| trial_inicio | timestamptz | |
| trial_fim | timestamptz | |
| data_inicio_pagante | timestamptz | início como pagante. Base do LTV. Nulo até converter |
| data_cancelamento | timestamptz | nulo enquanto ativo |
| data_proxima_cobranca | date | |

### Uso (contadores do período corrente; resetam)
| Campo | Tipo | Notas |
|---|---|---|
| consultas_dia | int | default 0 |
| data_ref_dia | date | qual dia o contador representa (saber quando zerar) |
| consultas_mes | int | default 0 |
| data_ref_mes | date | qual mês o contador representa |

> A lógica de uso checa OS DOIS antes de liberar: se bateu o teto diário OU o mensal, bloqueia e oferece upgrade.

### Ativação e engajamento (carimbos irreversíveis)
| Campo | Tipo | Notas |
|---|---|---|
| primeira_consulta_em | timestamptz | ativação (cadastrou e de fato usou) |
| ultima_atividade_em | timestamptz | sinal de churn iminente |

### Atribuição de aquisição (capturada no cadastro, irreversível)
| Campo | Tipo | Notas |
|---|---|---|
| utm_source | text | de onde veio |
| utm_medium | text | |
| utm_campaign | text | qual campanha |
| utm_content | text | qual anúncio específico |
| referrer | text | |
| headline_variante | text | qual headline A/B a pessoa viu |

> Sem isto você não liga assinante pagante ao anúncio que o trouxe, que é o motivo de rodar criativos diferentes. O funil ANTES do cadastro (impressão, clique, abandono) mora no Pixel da Meta, não aqui: instalar o Pixel antes de ligar o tráfego.

### Qualificação de lead (etapa 2, brinde; opcional, nulo até preencher)
| Campo | Tipo | Notas |
|---|---|---|
| whatsapp | text | melhor canal de reativação. Pedir na etapa 2 ou no app após a 1ª consulta, não na entrada |
| especialidades | text[] | multivalor (array) |
| tempo_formado | int | anos |
| instagram | text | qualifica E é insumo do produto (consultas sobre posts) |
| numero_cadeiras | int | proxy de porte. Opcional para quem não tem clínica |
| cidade | text | |
| estado | text | |
| ebook_resgatado | boolean | default false. Quem completou a etapa 2 |

---

## 2. `consultas` (log de cada consulta: a fonte da verdade)

| Campo | Tipo | Notas |
|---|---|---|
| id | bigserial/uuid (PK) | |
| usuario_id | uuid (FK → usuarios.id) | indexado |
| criado_em | timestamptz | default now(), indexado |
| pergunta | text | **pode conter dado de paciente/contrato: cobrir na política de privacidade e orientar o usuário a não colar dado identificável** |
| resposta | text | |
| fontes | jsonb | fontes citadas na resposta (a resposta tem fontes) |
| categoria | text | post, contrato, conduta, publicidade, outro. Pode classificar depois |
| modelo | text | ex.: 'gemini-flash-3.1'. Rastreia troca de modelo |
| tokens_entrada | int | |
| tokens_saida | int | |
| custo_real | numeric(10,5) | custo de fato, não a média de R$0,0144 |
| avaliacao | int | opcional, se deixar o usuário avaliar a resposta |

> Necessário em 3 frentes: produto (o que perguntam de fato), custo (real por usuário), jurídico (rastreabilidade do que foi orientado, defesa se um dentista disser "a ferramenta falou que podia"). O `uso_mensal` é derivável deste log.

---

## 3. `eventos_assinatura` (histórico de mudanças de plano e status)

| Campo | Tipo | Notas |
|---|---|---|
| id | bigserial/uuid (PK) | |
| usuario_id | uuid (FK → usuarios.id) | indexado |
| criado_em | timestamptz | default now() |
| tipo_evento | text | iniciou_trial, virou_pagante, mudou_plano, cancelou, reativou, pagamento_falhou, expirou |
| plano_anterior | text | nulo quando não se aplica |
| plano_novo | text | nulo quando não se aplica |
| motivo_cancelamento | text | preenchido nos eventos de cancelamento (pergunta curta na hora). Ouro para reduzir churn |
| origem | text | webhook_asaas, app, admin |

> Responde "quem fez upsell" e "quanto tempo leva do Essencial ao Completo".

---

## 4. `pagamentos` (cada cobrança do Asaas)

| Campo | Tipo | Notas |
|---|---|---|
| id | bigserial/uuid (PK) | |
| usuario_id | uuid (FK → usuarios.id) | indexado |
| asaas_payment_id | text, UNIQUE | id do pagamento no Asaas |
| criado_em | timestamptz | default now() |
| data_vencimento | date | |
| data_pagamento | timestamptz | nulo até pagar |
| valor | numeric(10,2) | **preço pago de fato, não só o nome do plano. Você vai testar preços e ter valores diferentes pelo mesmo plano** |
| status | text | pendente, confirmado, recebido, falhou, estornado, chargeback |
| metodo | text | cartao, pix, boleto |
| plano | text | plano a que a cobrança se refere |
| tentativa | int | para retry de cartão falho |

> Dá MRR real, LTV sobre pagamento recebido (não teórico) e churn involuntário (cartão que falha, grande causa de perda recuperável).

---

## 5. `uso_mensal` (fechamento mensal; opcional, derivável)

| Campo | Tipo | Notas |
|---|---|---|
| id | bigserial/uuid (PK) | |
| usuario_id | uuid (FK → usuarios.id) | indexado |
| mes_referencia | date | 1º dia do mês (ex.: 2026-06-01) |
| total_consultas | int | |
| custo_total | numeric(10,5) | |
| plano_no_mes | text | |

> UNIQUE(usuario_id, mes_referencia). Toda virada de mês, grava o fechamento. Existe por performance: dá para recalcular a partir de `consultas`. Te dá média de uso da base, usuários pesados (upsell/lead de clínica) e quem parou de usar (churn).

---

## Relacionamentos e índices

- Todas as tabelas filhas têm `usuario_id` com FK para `usuarios(id)`.
- Índices em `usuario_id` e nos campos de data de `consultas` e `pagamentos` (consultas frequentes por usuário e por período).
- `documento` UNIQUE com nulo permitido (Postgres permite múltiplos nulos; é o desejado para o nulo temporário antes do Asaas).

## Segurança (RLS) e LGPD

- **Row Level Security no Supabase é obrigatório.** Sem política de RLS, um usuário consegue ler dados de outro. Cada tabela precisa de política do tipo "usuário só lê e escreve as próprias linhas" (`auth.uid() = usuario_id`). Esquecer isso é vazamento de dados, inclusive de CPF e de conteúdo de consultas.
- A chave de serviço (service_role) do Supabase ignora RLS. Usar só no backend, nunca no front. Nunca expor no cliente.
- LGPD: consentimento de marketing separado dos termos, com versão, data e IP. Exclusão lógica via `deletado_em`. Definir prazo de retenção do log de consultas. Orientar o usuário a não colar dado identificável de paciente.

## Pendências de decisão (na hora de modelar)

- Usar Postgres ENUM ou text com CHECK para os campos de opção fixa (status, perfil, etc.). Text com CHECK é mais simples de evoluir.
- Confirmar no Asaas se o CPF/CNPJ volta no retorno da criação do cliente ou só via webhook, para saber quando popular `documento`.
- Caso de borda: o usuário cria conta (auth) antes de chegar no Asaas, então existe por instantes um usuário sem `documento`. A trava antifraude só fecha após a cobrança. Modelar `documento` como UNIQUE mas nulo-permitido cobre isso.

---

## Apêndice: SQL inicial (ponto de partida, revisar)

```sql
-- Perfil e estado atual
create table public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome_completo text not null,
  tipo_documento text check (tipo_documento in ('cpf','cnpj')),
  documento text unique,
  perfil_atuacao text,
  conselho_regional text,
  -- consentimento
  consentimento_termos boolean default false,
  consentimento_marketing boolean default false,
  consentimento_versao text,
  consentimento_data timestamptz,
  consentimento_ip inet,
  -- assinatura (sync Asaas)
  asaas_customer_id text unique,
  status_assinatura text default 'trial',
  plano_atual text,
  trial_inicio timestamptz,
  trial_fim timestamptz,
  data_inicio_pagante timestamptz,
  data_cancelamento timestamptz,
  data_proxima_cobranca date,
  -- uso (período corrente)
  consultas_dia int default 0,
  data_ref_dia date,
  consultas_mes int default 0,
  data_ref_mes date,
  -- ativação
  primeira_consulta_em timestamptz,
  ultima_atividade_em timestamptz,
  -- atribuição
  utm_source text, utm_medium text, utm_campaign text, utm_content text,
  referrer text, headline_variante text,
  -- qualificação (etapa 2)
  whatsapp text,
  especialidades text[],
  tempo_formado int,
  instagram text,
  numero_cadeiras int,
  cidade text,
  estado text,
  ebook_resgatado boolean default false,
  -- controle
  criado_em timestamptz default now(),
  atualizado_em timestamptz,
  deletado_em timestamptz
);

create table public.consultas (
  id bigserial primary key,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  criado_em timestamptz default now(),
  pergunta text,
  resposta text,
  fontes jsonb,
  categoria text,
  modelo text,
  tokens_entrada int,
  tokens_saida int,
  custo_real numeric(10,5),
  avaliacao int
);
create index on public.consultas (usuario_id);
create index on public.consultas (criado_em);

create table public.eventos_assinatura (
  id bigserial primary key,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  criado_em timestamptz default now(),
  tipo_evento text,
  plano_anterior text,
  plano_novo text,
  motivo_cancelamento text,
  origem text
);
create index on public.eventos_assinatura (usuario_id);

create table public.pagamentos (
  id bigserial primary key,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  asaas_payment_id text unique,
  criado_em timestamptz default now(),
  data_vencimento date,
  data_pagamento timestamptz,
  valor numeric(10,2),
  status text,
  metodo text,
  plano text,
  tentativa int
);
create index on public.pagamentos (usuario_id);

create table public.uso_mensal (
  id bigserial primary key,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  mes_referencia date,
  total_consultas int,
  custo_total numeric(10,5),
  plano_no_mes text,
  unique (usuario_id, mes_referencia)
);
create index on public.uso_mensal (usuario_id);

-- LEMBRETE: habilitar RLS e criar políticas (auth.uid() = usuario_id) em TODAS as tabelas.
-- alter table public.usuarios enable row level security; (e assim por diante)
```
