# English Conversation Tutor

Um app web de **conversação em inglês** com um professor de IA adaptativo. A cada
turno o professor conversa naturalmente em inglês, entrega um **"kit de
sobrevivência"** (verbos, expressões, conectores, dica de gramática), sugere uma
**mini-estrutura** de resposta e, depois que você responde, dá **feedback
seletivo** com correções e a versão que um nativo usaria. O nível de ajuda
sobe e desce sozinho conforme o seu desempenho (A1 → C2).

Interface estilo mensageiro (WhatsApp/Telegram): professor à esquerda, você à
direita, input com **microfone** (fala → texto) e botão **ouvir** (texto → fala).

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
```

---

## Contas, aprovação e tema

O app é protegido por login. O fluxo:

1. **Cadastro** (`/register`) com nome, e-mail e senha → a conta nasce
   **`pending`** (aguardando aprovação).
2. Um **admin** aprova/rejeita em **`/admin`**. Só contas **`approved`** (ou o
   próprio admin) acessam o tutor.
3. **Tema claro/escuro** é escolhido pelo botão no cabeçalho e fica salvo **por
   usuário** (coluna `users.theme` + cookie espelho, sem “flash” ao carregar).

Segurança: senhas com **scrypt** (nativo do Node), sessão via cookie
**HttpOnly** com apenas o hash do token guardado no banco (`auth_sessions`), e
cada conversa é escopada ao seu dono.

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
    api/session/route.ts    # cria/carrega sessão
    page.tsx, layout.tsx, globals.css
  components/                # ChatApp, MessageBubble, SurvivalKit,
                             # FeedbackCard, StuckHelp, PatternAlert, ChatInput...
  lib/
    ai/
      provider.ts            # opencode Zen (Claude Sonnet 5)
      schema.ts              # schemas Zod da saída do professor
      prompt.ts              # persona + lógica adaptativa (A1–C2)
      teacher.ts             # chamada generateObject
    db/
      schema.ts              # sessions, messages, error_patterns
      index.ts               # cliente Drizzle + Neon (lazy)
    services/conversation.ts # orquestra IA + banco + evolução de nível
    levels.ts, levelMeta.ts
drizzle/                     # migrações SQL geradas
```

---

## Como as funcionalidades mapeiam no código

- **Kit de sobrevivência / mini-estrutura / modelo de resposta** →
  `SurvivalKit.tsx`, campos `toolkit`/`miniStructure`/`modelAnswer` do schema.
- **Níveis de ajuda adaptativos (A1–C2)** → `prompt.ts` (regras por nível) +
  `levels.ts` (drift de nível) + gating visual nos componentes.
- **Correção inteligente** → `FeedbackCard.tsx` + `feedback` do schema
  (correções seletivas, versão nativa, explicação curta).
- **"Percebi um padrão" após 3 erros iguais** → tabela `error_patterns` +
  `conversation.ts` (contagem por `errorType`) + `PatternAlert.tsx`.
- **Travou? Ajuda em 3 níveis** → botão "I'm stuck" → `stuckHelp` → `StuckHelp.tsx`.
- **Voz** → Web Speech API (mic e "listen"), client-side, com fallback.
