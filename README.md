# English Conversation Tutor

Um app web de **conversação em inglês** onde você conversa com o **Sam** — um
amigo (de IA) que fala inglês e, sem você perceber, é um ótimo professor. O chat
é só chat: nenhuma correção, nenhuma dica, nenhum "muito bem!". Toda a pedagogia
acontece **fora da conversa**, em painéis laterais: um **"kit de sobrevivência"**
(verbos, expressões, conectores, dica de gramática) antes de você responder e um
**feedback seletivo** depois. O nível de ajuda sobe e desce sozinho conforme o
seu desempenho (A1 → C2).

Interface estilo mensageiro (WhatsApp/Telegram): Sam à esquerda, você à
direita, input com **microfone** (fala → texto) e botão **ouvir** (texto → fala).

---

## O tutor como pessoa

A maior causa de "cheiro de robô" em chats de IA é a **ausência de um eu
estável**: sem identidade fixa, o modelo inventa uma pessoa diferente a cada
turno e nunca consegue ter uma opinião, uma piada recorrente ou uma vida.

Por isso o tutor é uma pessoa específica, definida em
[`src/lib/ai/persona.ts`](src/lib/ai/persona.ts):

> **Sam**, 34, de Portland, mora em Lisboa há 4 anos, designer de produto
> remoto, tem um gato cinzento e barulhento chamado Pepper, corre mal e a
> contragosto, é esnobe com café — e está **aprendendo português com muita
> dificuldade**.

Esse último detalhe é o coração do design: Sam também é um aprendiz sofrendo com
uma língua. Isso torna a relação recíproca em vez de professor-sobre-aluno e diz
silenciosamente ao aluno que errar é normal e sobrevivível.

**Quer outro amigo?** Edite só o `TUTOR_PERSONA` — nome, inicial e bio. A voz
inteira do app muda junto (avatar, header e prompt), sem tocar em mais nada.

### O que faz o chat soar humano

O prompt ([`src/lib/ai/prompt.ts`](src/lib/ai/prompt.ts)) apoia-se nas três
alavancas que realmente mudam a voz de um modelo — adjetivos abstratos ("seja
caloroso") não fazem quase nada:

| Alavanca | O que é |
| --- | --- |
| **Identidade fixa** | A persona acima, injetada em todo turno. |
| **Lista de tiques proibidos** | "That's fascinating!", "I'd love to hear more", "thank you for sharing", repetir a frase do aluno de volta, elogiar o aluno por escrever, usar o nome dele toda hora, começar duas mensagens igual, terminar toda mensagem com pergunta, markdown/listas/negrito. |
| **Exemplos ruim → bom** | 5 pares concretos de resposta má vs. resposta humana, para as situações mais comuns (resposta de uma palavra, notícia ruim, abertura de sessão…). |

Mais o que vem junto:

- **Ritmo variável** — a maioria das mensagens tem 1–2 frases, algumas têm quatro
  palavras, e o modelo é instruído a nunca repetir o formato do turno anterior.
- **Reciprocidade** — Sam tem opiniões, reclama do calor, conta o que o gato
  aprontou. Só ~3 em 4 mensagens terminam com pergunta; o resto deixa o assunto
  respirar. Sem isso vira entrevista.
- **Input compreensível** — a personalidade não muda com o nível, mas o
  vocabulário sim: um "amigo totalmente natural" seria ilegível para um A1.
- **Consciência de tempo** — o tutor recebe o dia da semana, a parte do dia e
  **há quanto tempo você não escreve** (`describeGap` em `lib/time.ts`), então
  ele diz "sumido!" depois de três dias em vez de continuar no meio da frase.
- **Língua nativa** — Sam sabe de onde você é. Serve para naturalidade e, sem
  aparecer, para antecipar erros típicos de falantes daquela língua.
- **Casos difíceis** — o que fazer quando você escreve em português, responde só
  "yes", está sendo grosso, conta uma tragédia, ou pergunta se ele é uma IA
  (resposta: ele **admite honestamente**, em uma linha, sem drama, e segue a
  conversa — ele nunca finge ser humano).

---

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Vercel AI SDK v7** (`ai`, `@ai-sdk/anthropic`) para o LLM
- **opencode Zen** como gateway do LLM → **Claude Sonnet 5**
- **Neon PostgreSQL 18** + **Drizzle ORM**
- Deploy na **Vercel**

---

## Por que Claude Sonnet 5 (opencode Zen)?

Avaliei os modelos disponíveis no opencode Zen para esta tarefa (tutor de
conversação com saída estruturada). O melhor custo/benefício é o
**`claude-sonnet-5`**:

| Necessidade do app | Por que Sonnet 5 |
| --- | --- |
| Seguir a lógica adaptativa complexa (A1–C2, quando mostrar/omitir ajuda) | Instruction-following de ponta |
| Painéis de kit + feedback exigem **JSON estruturado confiável** | Tool-use nativo da Anthropic, muito estável com `generateObject` |
| Correção gramatical com nuance (present perfect, colocações) | Forte entendimento de língua/registro |
| App "conversa" com muitos turnos → **custo importa** | US$ 2 in / US$ 10 out por 1M — meio-termo ideal (vs Opus US$ 5/US$ 25) |

Alternativas: `claude-haiku-4-5` (mais barato, defina em `OPENCODE_MODEL`) ou
`gemini-3.5-flash`. Opus 4.x seria overkill de custo para um chat contínuo.

> O modelo é configurável via `OPENCODE_MODEL` (padrão `claude-sonnet-5`).
> A chamada usa o endpoint Anthropic-compatível `https://opencode.ai/zen/v1`
> com header `x-api-key` (tratado pelo AI SDK).

---

## Pré-requisitos

- [mise](https://mise.jdx.dev) (gerencia Node e as tasks)
- Uma conta **opencode Zen** (variável `OPENCODE_API_KEY`)
- Um banco **Neon** (variável `DATABASE_URL`)

O `mise.toml` já fixa o **Node 26**.

---

## Setup

```bash
# 1) Crie o arquivo de segredos (NÃO vai para o git)
cp .env.example .env.local
# edite .env.local e preencha OPENCODE_API_KEY e DATABASE_URL

# 2) Instale dependências e crie as tabelas no Neon
mise run setup        # = install + db:push

# 3) Rode em desenvolvimento
mise run dev          # http://localhost:3000
```

### Variáveis de ambiente (`.env.local`)

```env
OPENCODE_API_KEY="sua-chave-opencode-zen"
OPENCODE_MODEL="claude-sonnet-5"   # opcional
DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"

# Para o fluxo "esqueci minha senha" (SMTP). Default é Gmail — veja abaixo.
# SMTP_HOST="smtp.gmail.com"          # default
# SMTP_PORT="587"                     # 587 (STARTTLS) ou 465 (SSL)
# SMTP_USER="voce@gmail.com"
# SMTP_PASSWORD="xxxx xxxx xxxx xxxx"  # App Password de 16 chars
# SMTP_FROM="English Conversation Tutor <voce@gmail.com>"  # opcional
# PUBLIC_BASE_URL="https://seudominio.com"   # usado no link do e-mail
```

---

## Contas, aprovação e tema

O app é protegido por login. O fluxo:

1. **Cadastro** (`/register`) com nome, e-mail, senha, **nível de inglês** e
   **língua nativa** (Português BR/PT, Espanhol, Francês, Alemão, Italiano,
   Holandês, Polonês, Turco, Russo, Ucraniano, Grego, Tcheco, Romeno,
   Húngaro, Sueco, Dinamarquês, Norueguês, Finlandês, Chinês, Japonês,
   Coreano, Árabe, Hebraico, Persa, Hindi, Bengali, Urdu, Tailandês,
   Vietnamita, Indonésio, Malaio, Filipino) → a conta nasce **`pending`**
   (aguardando aprovação).
2. Um **admin** aprova/rejeita em **`/admin`**. Só contas **`approved`** (ou o
   próprio admin) acessam o tutor.
3. **Tema claro/escuro** é escolhido pelo botão no cabeçalho e fica salvo **por
   usuário** (coluna `users.theme` + cookie espelho, sem “flash” ao carregar).

Segurança: senhas com **scrypt** (nativo do Node), sessão via cookie
**HttpOnly** com apenas o hash do token guardado no banco (`auth_sessions`), e
cada conversa é escopada ao seu dono.

### Esqueci minha senha / trocar senha

- **`/forgot`** → o usuário informa o e-mail. O sistema gera um token
  single-use (TTL 1h) e envia o link via **SMTP** (Gmail por padrão, ou
  qualquer outro provedor trocando as env vars). A resposta é sempre a mesma
  para não vazar quais e-mails existem.
- **`/reset?token=…`** → o usuário define a nova senha. O token é consumido
  (não pode ser reusado), todas as sessões do usuário são invalidadas e uma
  nova é criada automaticamente.
- **`/settings`** → cartão "Senha" para trocar a senha **logado** (pede a
  senha atual e desconecta as outras sessões). Botão "Sair de todos os outros
  dispositivos".

Tokens armazenados em `password_reset_tokens` (apenas o **SHA-256** do token
bruto, igual ao esquema de `auth_sessions`). Rate limit embutido:
`RESET_RATE_LIMIT = 3` pedidos por usuário a cada 15 min.

Sem `SMTP_USER` + `SMTP_PASSWORD`, o fluxo `/forgot` devolve a mesma mensagem
genérica e loga o erro no servidor — preencha as credenciais em
`.env.local` para testar.

#### Configurar Gmail (recomendado para quem não tem domínio)

1. **Ativar verificação em duas etapas** na sua conta Google
   (https://myaccount.google.com/security).
2. **Criar um App Password**: https://myaccount.google.com/apppasswords
   - Aplicativo: "Outro (nome personalizado)" → `English Chat App`
   - O Google mostra uma senha de 16 caracteres (com espaços).
3. Colar no `.env.local`:
   ```env
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT="587"
   SMTP_USER="seu.email@gmail.com"
   SMTP_PASSWORD="abcd efgh ijkl mnop"
   PUBLIC_BASE_URL="http://localhost:3000"   # em prod: a URL da Vercel
   ```
4. (Opcional) `SMTP_FROM` se quiser outro nome visível; precisa coincidir
   com o `SMTP_USER` ou estar configurado em "Enviar e-mail como" no Gmail.

Limite do Gmail: **500 envios/dia** por conta. Suficiente para um app
pequeno. Se crescer, troque `SMTP_HOST` para Outlook, Mailgun, Brevo, etc. —
o código é o mesmo (wrapper SMTP genérico via Nodemailer).

### Criar o admin (seed)

Depois de aplicar o schema, rode uma vez (idempotente):

```bash
ADMIN_EMAIL="voce@exemplo.com" ADMIN_NAME="Seu Nome" mise run db:seed
```

Sem `ADMIN_PASSWORD`, uma senha forte é **gerada e impressa uma única vez**.
Para aplicar a migração de forma não-interativa: `mise run db:apply`.

---

## Tasks do mise

| Task | O que faz |
| --- | --- |
| `mise run install` | Instala as dependências npm |
| `mise run setup` | Install + aplica o schema no Neon (primeira vez) |
| `mise run dev` | Servidor de desenvolvimento |
| `mise run build` | Build de produção |
| `mise run start` | Sobe o build de produção |
| `mise run typecheck` | Checagem de tipos (tsc --noEmit) |
| `mise run db:generate` | Gera migrações SQL a partir do schema Drizzle |
| `mise run db:migrate` | Aplica migrações no Neon |
| `mise run db:push` | Empurra o schema direto para o Neon (dev) |
| `mise run db:studio` | Abre o Drizzle Studio |

O `mise.toml` carrega automaticamente o `.env.local` em todas as tasks.

---

## Deploy na Vercel

1. Suba o repositório no GitHub (os segredos ficam de fora — veja abaixo).
2. Importe o projeto na Vercel (framework **Next.js** é detectado sozinho).
3. Em **Settings → Environment Variables**, adicione:
   - `OPENCODE_API_KEY`
   - `DATABASE_URL` (a connection string do Neon)
   - `OPENCODE_MODEL` (opcional)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` (para o fluxo
     "esqueci minha senha" — defaults do Gmail; veja acima)
   - `SMTP_FROM` (opcional)
   - `PUBLIC_BASE_URL` (ex.: `https://seu-app.vercel.app`, usado no link do e-mail)
4. Aplique o schema no banco de produção (uma vez):
   `mise run db:migrate` (localmente, apontando `DATABASE_URL` para o Neon).
5. Deploy.

As rotas de API declaram `maxDuration = 60`, suficiente para a chamada do LLM
(~10–13s por turno).

---

## Segurança dos segredos

- `.env.local` está no **`.gitignore`** (chave da API e string do Neon **nunca**
  vão para o Git). Verificado com `git check-ignore .env.local`.
- Somente `.env.example` (template sem segredos) é versionado.
- As chaves são lidas apenas no servidor (rotas `/api/*`, runtime Node), nunca no
  bundle do cliente.

---

## Estrutura

```
src/
  app/
    api/chat/route.ts       # avança a conversa (resposta ou dica)
    api/session/route.ts    # cria (com tópico opcional) / carrega sessão
    api/translate/route.ts  # traduz um trecho curto para a língua do aluno
    forgot/page.tsx         # pedir link de redefinição de senha
    reset/page.tsx          # definir nova senha a partir do link do e-mail
    settings/page.tsx       # nível + língua + senha + memória do tutor
    page.tsx, layout.tsx, globals.css
  components/                # ChatApp, MessageBubble, SurvivalKit, FeedbackCard,
                             # StuckHelp, PatternAlert, AssessmentCard,
                             # TopicPicker, ChatInput, TranslatableText,
                             # LanguageSettingsForm, LevelSettingsForm,
                             # auth/{AuthShell,LoginForm,RegisterForm,
                             # ForgotForm,ResetForm,ChangePasswordForm}...
  lib/
    ai/
      provider.ts            # opencode Zen (Claude Sonnet 5)
      schema.ts              # schemas Zod (turno, memoryUpdates, assessment)
      persona.ts             # QUEM é o tutor (Sam) — o único knob da voz dele
      prompt.ts              # system prompt + perfil/memória + estado do turno
      teacher.ts             # chamada generateObject (com perfil + memórias)
      translatePrompt.ts     # prompt focado do tradutor (lib/ai/translatePrompt.ts)
    auth/
      actions.ts             # register, login, logout, aprovar/rejeitar,
                             # update level/language, forgetMemory,
                             # forgot/reset/changePassword, logoutAllOther
      password.ts            # hash/verify (scrypt)
      reset.ts               # tokens de reset (criar, validar, consumir)
      session.ts             # sessão por cookie HttpOnly (auth_sessions)
      validation.ts          # Zod (register, login, password, reset, change)
    email/smtp.ts            # wrapper Nodemailer/SMTP (envio do e-mail de reset)
    languages.ts             # lista de línguas nativas suportadas (código + label)
    db/
      schema.ts              # users, auth_sessions, sessions, messages,
                             # error_patterns, user_memories,
                             # password_reset_tokens
      index.ts               # cliente Drizzle + Neon (lazy)
    services/conversation.ts # orquestra IA + banco + nível + memória + avaliação
    topics.ts                # 19 tópicos (slug/pt/en) + sorteio
    time.ts                  # daypart, weekday e "há quanto tempo você sumiu"
    levels.ts                # histerese do nível adaptativo (ver abaixo)
    levelMeta.ts
drizzle/                     # migrações SQL geradas
```

---

## Como as funcionalidades mapeiam no código

- **Kit de sobrevivência / mini-estrutura / modelo de resposta** →
  `SurvivalKit.tsx`, campos `toolkit`/`miniStructure`/`modelAnswer` do schema.
- **Níveis de ajuda adaptativos (A1–C2)** → `prompt.ts` (regras por nível) +
  `levels.ts` (drift de nível) + gating visual nos componentes.
  O modelo sugere `up`/`down`/`same` **a cada turno**, mas isso é só um *voto*:
  `applyLevelSignal()` acumula os votos em `sessions.level_drift` e só move o
  nível quando a evidência é consistente. Duas assimetrias de propósito:
  **promover exige 3 sinais, rebaixar exige 2** (ficar sem ajuda desanima, ficar
  com ajuda demais só é redundante), e um sinal contrário **zera** o momentum,
  então ruído `up/down/up/down` nunca chega ao limiar. Promoção também é
  bloqueada enquanto o `recentErrorScore` mostra que o aluno está penando.
  Antes disso o nível pulava A1 → B1 em dois turnos e o aluno perdia todo o
  andaime no meio da conversa.
- **Correção inteligente** → `FeedbackCard.tsx` + `feedback` do schema
  (correções seletivas, versão nativa, explicação curta).
- **"Percebi um padrão" após 3 erros iguais** → tabela `error_patterns` +
  `conversation.ts` (contagem por `errorType`) + `PatternAlert.tsx`.
- **Travou? Ajuda em 3 níveis** → botão "I'm stuck" → `stuckHelp` → `StuckHelp.tsx`.
- **Voz** → Web Speech API (mic e "listen"), client-side, com fallback.
- **Nível de inglês no cadastro + configurações** → coluna `users.english_level`
  (escolhido no `/register`, editável em `/settings`). Novas conversas começam
  nesse nível; o motor adaptativo continua ajustando durante o papo.
- **Língua nativa + tradução sob demanda** → coluna `users.native_language`
  (escolhida no `/register`, editável em `/settings`). Também é injetada no
  prompt: Sam sabe de onde você é e usa isso silenciosamente para antecipar
  erros típicos de falantes daquela língua. A resposta do tutor,
  o **feedback** (explicações e mensagem de encorajamento) e a **dica de
  gramática** do Helpful Toolkit ganham um botão 🌐 que, ao ser clicado,
  traduz aquele trecho para a língua do aluno via `/api/translate`
  (`generateText` com prompt focado de tradução, cache client-side).
  No Feedback e no Toolkit, **só a explicação é traduzida** — os verbos,
  expressões, conectores, o par errado→correto e a versão "Like a native"
  continuam em inglês (é o que o aluno está ali para aprender).
- **Assunto aleatório (ou escolhido)** → `lib/topics.ts` (19 tópicos) +
  `TopicPicker.tsx` no botão "Nova". Sem escolha, sorteia um; o slug fica em
  `sessions.topic` e ancora a conversa (`prompt.ts`).
- **Avaliação periódica de nível** → a cada 6 respostas (`turns_since_assessment`)
  o professor devolve `assessment` (nível estimado + pontos fortes/focos) →
  `AssessmentCard.tsx`, com botão para aplicar a sugestão.
- **Memória de longo prazo** → tabela `user_memories` (escopo por **usuário**, não
  por conversa). O professor extrai fatos duráveis (`memoryUpdates`) e eles são
  reinjetados no prompt em toda sessão — então ele lembra quem é a esposa mesmo
  um mês depois. Gerenciável em `/settings`.
- **Consciência de tempo** → o cliente manda o `daypart` e o `weekday` **locais**
  (o servidor roda em UTC e erraria a saudação); o servidor calcula o silêncio
  desde a sua última mensagem com `describeGap()`. Gaps abaixo de 10 minutos são
  ignorados — pausa normal de conversa não merece comentário.

> **Após atualizar:** aplique a migração nova no Neon uma vez —
> `mise run db:apply` (ou `mise run db:push`). Ela só adiciona colunas/tabela
> (aditiva, sem perda de dados). A última é `0005` (`sessions.level_drift`).

---

## Melhorias ainda não feitas

Coisas que valem a pena e que **não** foram implementadas:

1. **Streaming da resposta.** Hoje cada turno usa `generateObject` e leva 10–13s
   com a tela parada. `streamObject` deixaria o texto do chat aparecer enquanto
   os painéis ainda estão sendo gerados — é de longe o maior ganho de UX
   disponível, mas mexe no `ChatApp`, na rota e no serviço.
2. **Prompt caching (Anthropic).** O system prompt é grande e ~90% estático em
   todo turno. Cachear a parte fixa cortaria custo e latência. Não foi feito
   porque depende de o gateway opencode Zen repassar `cache_control`, e isso
   precisa ser verificado contra a API real antes.
3. **`error_patterns` por usuário, não por sessão.** Hoje os padrões recorrentes
   zeram quando você começa uma conversa nova, então um erro crônico pode nunca
   chegar às 3 ocorrências. Precisa de migração + backfill.
4. **Compactação de histórico.** `HISTORY_LIMIT = 24` corta a conversa em cru; em
   papos longos o começo simplesmente desaparece. Um resumo rolante preservaria
   o fio da meada.
