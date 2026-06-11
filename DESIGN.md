# DESIGN.md, OdontoConforme

Sistema de design do OdontoConforme. Serve como referência para qualquer interface do produto (landing, app, materiais), para tudo manter a mesma identidade. Quando um agente de código for estilizar uma tela nova, deve seguir este arquivo.

## 1. Princípio da marca

A cor central é o verde, escolhido de propósito. Verde significa conforme, aprovado, em ordem, que é o oposto exato da dor que o produto resolve (medo de processo no CRO). A interface inteira comunica tranquilidade e segurança, não alarme.

Identidade própria, separada da marca-mãe. O OdontoConforme usa verde. A DNA Solução Digital usa azul e vermelho. Não misturar as duas paletas.

Tom visual: sério, limpo, confiável. O produto fala de regulamentação, então a estética precisa transmitir autoridade e seriedade, sem parecer burocrática ou fria.

## 2. Cores (design tokens)

Bloco pronto para usar como variáveis CSS:

```css
:root{
  /* Texto e estrutura */
  --ink:#0d2233;        /* navy profundo, títulos e texto principal */
  --ink-soft:#3c5567;   /* texto secundário */

  /* Fundos */
  --paper:#f6f8f6;      /* fundo geral, off-white levemente esverdeado */
  --white:#ffffff;

  /* Verde, a cor da marca */
  --green:#137a52;        /* verde conforme, cor principal da marca */
  --green-bright:#16a06b; /* verde dos botões e CTAs */
  --green-soft:#e4f2ea;   /* fundo de destaque, pills, cards de apoio */

  /* Apoio */
  --line:#d8e3dc;       /* bordas e divisores */
  --amber:#c47a16;      /* alerta sutil, usado na seção de dor */
  --danger:#b3402f;     /* ações destrutivas, ex.: cancelar */
  --danger-soft:#fbeae7;

  /* Sombras */
  --shadow:0 10px 40px -12px rgba(13,34,51,.16);
  --shadow-lg:0 24px 60px -16px rgba(13,34,51,.28);

  /* Raio padrão */
  --radius:16px;
}
```

Cores para seções de fundo escuro (a seção de dor e o rodapé): fundo `--ink` (#0d2233) ou mais escuro (#081722 no rodapé). Sobre fundo escuro, texto claro: títulos em #ffffff, corpo em #aec6d4 ou #dce8ef, e o verde de destaque clareado para #7fd3ac (o verde escuro da marca não tem contraste suficiente sobre fundo escuro).

## 3. Tipografia

Duas famílias, ambas do Google Fonts:

- **Títulos: Inter Bold** (sem serifa).  Pesos 400 a 700.
- **Corpo: Inter** (sem serifa). Limpa e legível para textos e interface. Pesos 400 a 700.



Uso: todo `h1`, `h2`, `h3` em Inter Bold, peso 600 por padrão, com leve espaçamento negativo entre letras (letter-spacing -.01em). Todo o resto (parágrafos, botões, labels, interface) em Interk. Subtítulos de seção do tipo "eyebrow" (rótulo curto acima do título) em Inter, maiúsculas, peso 700, cor verde.

## 4. Logo

Três versões, todas com o escudo verde (dente mais check) e o wordmark OdontoConforme (Odonto em negrito, Conforme em regular):

- **Horizontal**: padrão de uso. Vai no cabeçalho e na maioria dos lugares.
- **Vertical**: quando o espaço for mais alto que largo, ou em formatos quadrados.
- **Ícone (só o escudo)**: favicon, rodapé, usos pequenos, avatar.

Regra de fundo: o wordmark tem o texto em cor escura, então sobre fundo claro usa o logo normal. Sobre fundo escuro (rodapé), o texto escuro some, então use o ícone (escudo, que aparece bem no escuro) mais o wordmark redesenhado em cor clara, não o logo padrão.

Não distorcer, não trocar as cores do logo, não colocar sobre fundo que reduza o contraste do escudo.

## 5. Componentes

**Botões e CTAs**: formato de pílula (border-radius 999px), fundo `--green-bright`, texto branco, peso 700. Sombra suave e leve elevação no hover. Variações: contorno verde com fundo transparente (botão secundário), e contorno vermelho para ação destrutiva (cancelar).

**Cards**: fundo branco, borda de 1px em `--line`, cantos arredondados (16 a 20px), sombra suave. Leve elevação no hover (translateY mais sombra maior). Ícone do card num quadrado arredondado com fundo `--green-soft` e ícone verde.

**Pills e tags**: fundo `--green-soft`, texto verde, peso 600, cantos totalmente arredondados. Usadas para rótulos curtos (ex.: "Plano Completo", "Conformidade com o CFO e os CROs").

**Card de plano em destaque**: o plano recomendado (Completo) ganha borda de 2px verde, sombra maior, e um badge no topo ("Mais escolhido"). O plano base (Essencial) fica com borda neutra. A diferença visual guia o olho para o recomendado (ancoragem).

## 6. Layout e princípios de página

- **Uma promessa central, não um inventário.** Cada página gira em torno de uma ideia (no OdontoConforme: parar de ter medo do CRO). Listar tudo dilui a conversão.
- **Um único CTA, repetido.** O mesmo botão ("Testar grátis por 7 dias") aparece em vários pontos. Não oferecer caminhos concorrentes numa página de venda self-service.
- **Respiro.** Bastante espaço em branco, formatação mínima. Não encher de negrito, caixas e elementos.
- **Contraste de seção para criar tensão.** A seção de dor é a única em fundo escuro, criando tensão antes do alívio das seções claras seguintes.
- **Hero em duas colunas.** Texto de um lado, imagem do outro. No mobile, empilha e centraliza, com a imagem acima do texto.

## 7. Imagens

- **Herói: mostre o estado desejado, não a dor.** Foto de dentista com feição de tranquilidade e segurança, em ambiente de clínica. Nunca foto de "dentista em dúvida ou aflito": lê como banco de imagem genérico e derruba a seriedade.
- **Seção "A solução": print real do produto.** A imagem mais importante de todas. Mostra que a ferramenta existe e funciona, reduz o risco percebido, e é de graça (o produto é seu). Apresentar numa moldura de navegador.
- **Seção de dor: imagem sóbria e opcional.** Se entrar, algo crível e discreto (ex.: a tela de uma notificação oficial num celular). Nunca dramático ou apelativo.
- **Não usar:** banco de imagem genérico que baixe a percepção de seriedade, personagens ou marcas de terceiros, qualquer imagem com direitos de terceiros, ou prova social inventada (depoimento só com cliente real).

## 8. Voz e texto

- **Tom:** profissional, direto, empático e sério. O produto trata de regulamentação; a comunicação transmite confiança, não informalidade.
- **Sem emojis** em materiais e interface, salvo decisão pontual e justificada.
- **Sem travessões (—) em nenhum texto.** Lê como geração de IA. Usar vírgula, ponto ou conectivos dentro da norma da língua portuguesa. Regra confirmada em teste com usuários e válida para todo material (landing, app, copy, notas, e-mails).
- **Precisão de linguagem acima de estilo.** Termo certo importa mais que frase bonita. Exemplo: "em conformidade com o CRO", não "em dia com o CRO", porque "em dia" foi lido por dentistas como anuidade paga.
- **Honestidade sempre.** Nada de selo ou aval oficial que o produto não emite, nada de case com meta não atingida, nada de depoimento inventado.

## 9. Disclaimer obrigatório

Em todo material público (rodapé da landing, FAQ, telas relevantes), deixar claro que o OdontoConforme orienta com base nas normas vigentes do CFO e dos CROs, mas não emite aval, selo ou certificação oficial, não substitui assessoria jurídica, e que a responsabilidade final pela conduta é do profissional. Isso é decisão de design e de texto, não só jurídica, porque define o que pode aparecer na interface.
