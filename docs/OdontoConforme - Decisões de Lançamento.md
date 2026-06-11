---
tags: [dna-clinic, produto, odontoconforme, lancamento, saas]
produto: "OdontoConforme"
status: "pré-lançamento"
created: 2026-06-01
---

# OdontoConforme · Decisões de Lançamento

> Registro consolidado das decisões tomadas sobre o produto OdontoConforme (antigo OdontoReg). Documento vivo. Atualizar conforme as decisões evoluem.

## Resumo

SaaS de consulta de conformidade ético-regulatória para cirurgiões-dentistas, baseado nas normas do Conselho Federal de Odontologia (CFO) e dos Conselhos Regionais (CROs). Função estratégica: motor de aquisição de leads qualificados para o [[Diagnóstico DNA 360°]] e a [[Consultoria]], com receita de assinatura que cobre o próprio custo de aquisição.

## Definição do produto

Ponto de consulta sobre o universo regulatório odontológico. O dentista pergunta com as próprias palavras e recebe orientação fundamentada sobre:
- Publicidade e posts em redes sociais (o caso de uso mais frequente)
- Contratos de paciente, parcerias e prestação de serviço
- Conduta, ética, sigilo, responsabilidade técnica, divulgação de especialidade
- Publicidade de preços, descontos e promoções (área de alto risco)

Uso esperado: quase diário, atrelado ao fluxo de trabalho (cada post a publicar gera uma consulta). Essa frequência é o que sustenta a recorrência e derruba o risco de "usa uma vez e cancela".

## Nome

**Decisão fechada: OdontoConforme.** Eixo conceitual escolhido: conformidade somada a odontologia.

Validações concluídas:
- Instagram @odontoconforme disponível
- INPI sem registro conflitante
- Domínio disponível

Por que esse nome venceu: clareza acima de inteligência (importa para tráfego pago frio), carrega o gatilho de compra (proteção/conformidade) e escapa do mar genérico de "Odonto-X". Descartados: "Pode Postar?" (subescopa o produto nos posts), nomes com "CRO/conselho" no corpo (risco de sugerir vínculo oficial).

## Domínio

- Principal: **odontoconforme.com.br** (público e tema brasileiros pedem o .com.br, que transmite seriedade)
- Defensivo opcional: odontoconforme.com redirecionando para o principal
- Demais extensões (.ai, .io, .cloud etc.) descartadas: não fazem sentido para o público atual

## Modelo e precificação

- Modelo: assinatura mensal, cartão de crédito, self-service, sem reunião de venda
- Trial: **7 dias e 10 consultas**, com cartão na entrada (aumenta qualidade do lead e conversão trial para pago)

**Por que não é ilimitado:** o app roda sobre a API do Gemini (custo por consulta), então ilimitado expõe a três riscos: abuso por bot, custo de API maior que a receita, e compartilhamento de uma conta entre vários dentistas. Limites resolvem os três.

**Dois planos:**

| Plano | Preço | Limite diário | Limite mensal | Extras |
|---|---|---|---|---|
| Essencial | R$29/mês | 30 consultas | 300 | só consultas |
| Completo | R$39/mês | 50 consultas | 750 | + relatório mensal de atualizações dos Conselhos + dicas mensais de postagem |

- Limite diário: freio anti-abuso de bot em janela curta. Limite mensal: controle de custo.
- Estouro de limite (diário ou mensal): o usuário pode fazer upgrade no próprio período para ter limite maior, ou aguardar o reset. Quem precisa de mais que o Completo tem perfil de clínica e entra no funil da [[Consultoria]] (onde o OdontoConforme vem incluso, com limites bem maiores, ex.: até ~5.000/mês e 200/dia, a medir).
- Tratamento do estouro vira gatilho de upsell ("você atingiu o limite, faça upgrade"), não bloqueio seco.

**Custo e margem (API a R$0,01443 por consulta, modelo 3.1 Flash, desconto Asaas ~4,7%):**
- Essencial no teto (300): custo de API ~R$4,33; receita líquida ~R$28,52; margem ~R$24 mesmo no uso máximo.
- Completo no teto (750): custo de API ~R$10,82; receita líquida ~R$38,22; margem ~R$27 no uso máximo.
- Conclusão: a R$0,0144/consulta o volume quase não afeta margem. O Completo dá mais margem absoluta E é o destino desejado. Ancoragem saudável.

- Decisão estratégica: o produto é motor de leads, não SaaS autônomo. A assinatura cobre o CAC com folga. O lucro real está na conversão para o funil.

**Diferenciação dos planos:** o volume quase não é sentido (dentista solo raramente passa de 300/mês), então o que de fato leva ao Completo é o **relatório mensal de atualizações dos Conselhos** e as **dicas mensais de postagem**. Ambos são conteúdo um-para-muitos (um por conselho / um por mês para todos), baratos e escaláveis.

**Cortado do escopo (não confundir):** a **análise mensal de risco do perfil individual** foi removida e não volta. Era um-para-um (scrap do perfil de cada dentista, manual no NotebookLM), não escalava e travaria o lançamento. Não é "em breve", está fora. O **relatório mensal de atualizações dos Conselhos** (incluído no Completo) é outra coisa: é um-para-muitos, igual para todos, e por isso escala. As dicas de postagem entram no Completo pelo mesmo motivo. Cuidado com o padrão de, a cada rodada, reintroduzir o que foi cortado: o relatório só entrou porque é de natureza diferente da análise individual.

## Público e aquisição

- Público do tráfego: cirurgião-dentista (não só dono de clínica)
- Comprador dos produtos de alto valor (Diagnóstico, Consultoria): dono/gestor
- Implicação: capturar no cadastro um campo "é dono/sócio ou atua como dentista", para separar o lead de funil do lead só-SaaS e direcionar o cross-sell apenas a quem tem perfil

## Números de referência (estimativas, validar com dado real)

- CPL (custo por lead/trial): ~R$10
- Conversão lead para assinante pago: ~15% (estimativa do Diogo, plausível dada a dor validada)
- CAC real por assinante pago: ~R$67 (R$10 dividido por 0,15)
- Conversão assinante para Diagnóstico: 1% a 3% (realista; público é dentista, não dono)
- Leitura: o modelo fecha no cenário pessimista. A assinatura paga o CAC sozinha. Qualquer conversão para o funil é lucro.

> Substituir essas estimativas por números medidos após 60 dias de tráfego.

## Landing page

Status: copy e HTML construídos e revisados após teste com 20 dentistas (arquivos `odontoconforme_landing_copy.md` e `odontoconforme_landing.html`).
- **Headline:** "Você está em conformidade com o CRO?". O antigo "em dia com o CRO" foi descartado no teste, quase todos os 20 dentistas leram "em dia" como estar quite com a anuidade do conselho, não com as normas. Correção crítica vinda da validação.
- Estrutura por funil: dor, virada, casos de uso, benefício, preço, objeção, fechamento
- Herói em duas colunas: texto à esquerda, foto de dentista tranquila à direita (recortada do banner enviado, sem o headline antigo embutido)
- CTA repetido: "Testar grátis por 7 dias"
- Preço: dois planos lado a lado, Essencial e Completo, com o Completo destacado ("Mais escolhido")
- Caso de uso extra: "Para se manter atualizado" (relatório mensal de atualizações), marcado como Plano Completo
- Benefícios: removido o ângulo "economize com advogado" (risco de conflito com advogados e de induzir dispensa do profissional). Substituído por "ganhe clareza antes de decidir" e "torne a conformidade uma rotina"
- Cor de marca: verde (conforme/aprovado). Logo horizontal embutido no header (base64), ícone no rodapé e favicon
- Travessões (,) removidos de toda a landing e da copy, por feedback do teste (lê como texto de IA). Regra válida para qualquer material novo
- Disclaimer obrigatório no rodapé e no FAQ: orienta, não emite aval/selo oficial, não substitui assessoria jurídica
- Pendências antes de publicar: inserir o print da ferramenta (slot pronto na seção "A solução"), apontar os botões para o checkout real, preencher CNPJ, inserir prova social só quando houver clientes reais

## Validação (teste com 20 dentistas)

Antes de qualquer verba de tráfego, o pitch, a landing e o produto foram testados com 20 dentistas. Resultados que viraram decisão: a dor é validada; o headline "em dia" confundia com anuidade (corrigido); pedido de incluir o relatório de atualizações e reforçar simplicidade/rotina/tranquilidade; ajuste no ângulo de advogado; troca da identidade visual para o logo definitivo. Próximo dado a coletar só vem com tráfego real: CPL, conversão trial para pago, melhor ângulo.

## Campanha

- Plataforma inicial: só Meta (Instagram/Facebook). Google depois.
- Estrutura: 1 campanha, 1 conjunto, 3 a 4 criativos. Não fragmentar a verba.
- Ângulos de criativo: medo/perda, alívio/certeza, custo/comparação, rotina/hábito
- Orçamento de teste: R$30 a R$50/dia por 7 a 10 dias
- Objetivo da fase: descobrir os números reais (CPL, conversão trial para pago, melhor ângulo), não lucro

## Stack de cobrança e acesso (recomendação)

São duas camadas distintas, não uma só:

**Financeiro (cobrança recorrente):** recomendação **Asaas.** Não tem plano/mensalidade; a conta é grátis e você paga por transação recebida (por isso não existe "página de produto com preço", só a tabela de taxas em asaas.com/precos-e-taxas).
- Brasileiro, cartão e Pix recorrentes, boleto, débito automático
- Sem mensalidade nem taxa de adesão
- Cartão de crédito à vista: R$0,49 + 2,99% por cobrança (padrão), ou R$0,49 + 1,99% nos 3 primeiros meses (promoção). Custo efetivo numa cobrança de R$29: ~4,7% padrão (~3,7% na promoção)
- Pix: taxa fixa de R$1,99 por transação recebida (R$0,99 nos 3 primeiros meses), não é percentual. Em ticket de R$29 fica ~6,9%, pior que cartão. Para R$29/mês recorrente, cartão é o trilho certo
- Nota fiscal eletrônica (NFS-e): R$0,49 por nota emitida
- Dashboard de assinantes, régua de cobrança (dunning), API com checkout transparente e webhooks
- Confirmar o percentual exato de "assinatura" no simulador da página de preços e, com conta criada, em Menu do usuário > Taxas (a página oficial tem fraseado ambíguo entre 2,99% e 1,99%)
- Stripe descartado: não suporta Pix recorrente e tem operação instável no Brasil. Vindi descartada: planos a partir de ~R$499/mês, caro demais para esta fase.

**Acesso (login/autenticação):** camada separada, dentro do próprio app (Vercel). Decisão: **Supabase.**
- O Asaas cuida do dinheiro, não do login do app.
- Supabase escolhido por dar login E banco de dados (status da assinatura por usuário) na mesma ferramenta e mesmo tier grátis. Clerk faria só o login, exigindo um banco à parte.
- Arquitetura: Supabase faz o login e guarda o status do assinante, o Asaas faz a cobrança, um webhook do Asaas escreve no Supabase quando o pagamento é confirmado ou falha, o app libera ou bloqueia o acesso lendo esse campo.

**Risco fiscal a tratar:** todo SaaS por assinatura é prestador de serviço e precisa emitir NFS-e. ISS de 2% a 5% conforme o município. Confirmar com o contador junto da definição do CNAE.

## Custos de infraestrutura (verificado jun/2026)

Atenção a camadas: GoDaddy Economy e Hostinger Business são hospedagem de site compartilhada (PHP/WordPress/estático). Servem para a landing estática e e-mail profissional, NÃO para rodar o app. O app dinâmico (login, API, webhook) roda no Vercel.

**Custo fixo para operar como SaaS comercial:**
- Vercel Pro: ~US$20/mês (~R$115). O tier grátis Hobby é só para uso não comercial; cobrar de clientes exige Pro.
- Supabase Pro: ~US$25/mês (~R$145). O Free pausa o projeto após 1 semana de inatividade; Pro remove isso e dá backups.
- Asaas: R$0 fixo, ~4,7% por transação.
- Domínio: ~R$40 a R$70/ano.
- **Total fixo: ~R$260/mês.**

**Break-even de infraestrutura: ~10 assinantes pagos.** A R$29 (líquido ~R$27,6), dez assinantes cobrem os R$260. A infra não é obstáculo.

**Caminho enxuto para validar:** durante construção e teste, Vercel Hobby + Supabase Free + Asaas = custo fixo perto de zero. Subir para os planos pagos só quando começar a cobrar de verdade (uso comercial no Vercel, fim do pausamento no Supabase).

## Cadastro e estrutura de dados

Estrutura completa do banco em [[OdontoConforme - Estrutura de Dados (Supabase)]] (5 tabelas, com tipos, RLS, LGPD e SQL inicial).

**Cadastro em duas etapas:**
- Etapa 1 (entrada, mínima): e-mail (login, no auth do Supabase), nome, senha, perfil de atuação, checkbox de consentimento de marketing (separado dos termos). Documento (CPF/CNPJ) é coletado pelo Asaas na cobrança e gravado com unicidade (trava antifraude de trial), não pedido no formulário visível.
- Etapa 2 (com brinde, um ebook): WhatsApp, especialidades, tempo de formado, Instagram, número de cadeiras, cidade. Tudo opcional, trocado pelo brinde.

**Pergunta de perfil (seleção única):** dono/sócio de clínica/consultório; dentista por conta própria; contratado ou presta serviço em clínica de terceiros; gestão de marketing de clínica; gestão administrativa/jurídica de clínica; estudante; outros. Marketing e administrativo ficam separados porque há produtos avulsos distintos para cada pilar (kit de precificação, kit de templates).

**Dado irreversível a capturar desde o dia 1** (some se não capturar): log de cada consulta (pergunta, resposta, custo, fontes), atribuição de origem (UTM, anúncio, variação de headline), datas de ativação e de início de pagamento, motivo de cancelamento. Pixel da Meta instalado antes do tráfego para o funil pré-cadastro. Capturar agora, analisar depois.

## CNAE

CNAE de venda de SaaS encaminhado ao contador: **62.03-1-00** (desenvolvimento e licenciamento de software não customizável). Os CNAEs antigos não cobriam venda de software.

## Próximos passos (ordem de execução)

1. Subir a landing em odontoconforme.com.br
2. Configurar Asaas (planos Essencial R$29 e Completo R$39, com trial) e auth no app, ligados por webhook
3. Configurar checkout no botão da landing
4. Subir campanha Meta com R$30 a R$50/dia
5. Medir por 60 dias e substituir as estimativas por dados reais

## Padrão a observar

Esta fase entra em território de configuração de ferramentas, que é uma zona conhecida de fuga (ver [[DNA_MASTER_DOC_v2.1]], seção 28, padrão 6). A configuração de cobrança e login aqui é trabalho necessário, não fuga. O que seria fuga: comparar oito gateways, refinar o fluxo de billing além do mínimo, ressuscitar a análise de risco ou construir dicas/modelos de contrato antes do primeiro pagante, mexer de novo na copy ou no preço. Critério único de progresso nas próximas semanas: existe uma landing no ar recebendo tráfego pago e capaz de cobrar?
