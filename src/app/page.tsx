import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { getThemeCookie } from "@/lib/theme";
import { ThemeToggle } from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const [user, theme] = await Promise.all([getCurrentUser(), getThemeCookie()]);
  const canUseApp =
    !!user && (user.role === "admin" || user.status === "approved");
  const accountHref = user ? (canUseApp ? "/app" : "/pending") : "/register";

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-x-hidden">
      {/* Decorative glow behind the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(99,102,241,0.18),transparent_70%)]"
      />

      <NavBar user={user} canUseApp={canUseApp} theme={theme} />

      <main className="flex-1">
        <Hero user={user} canUseApp={canUseApp} accountHref={accountHref} />
        <StatsStrip />
        <Features />
        <HowItWorks />
        <LevelLadder />
        <Pricing />
        <Faq />
        <FinalCta canUseApp={canUseApp} accountHref={accountHref} />
      </main>

      <Footer />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Navigation                                                                */
/* -------------------------------------------------------------------------- */

function NavBar({
  user,
  canUseApp,
  theme,
}: {
  user: { name: string } | null;
  canUseApp: boolean;
  theme: "light" | "dark";
}) {
  const navLinks = [
    { href: "#features", label: "Recursos" },
    { href: "#how", label: "Como funciona" },
    { href: "#pricing", label: "Planos" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/70 backdrop-blur-lg dark:border-slate-800/70 dark:bg-slate-950/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle initial={theme} />

          {user ? (
            <Link
              href={canUseApp ? "/app" : "/pending"}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              {canUseApp ? "Entrar no app" : "Minha conta"}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:inline-block dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                Começar grátis
              </Link>
            </>
          )}

          {/* Mobile menu */}
          <details className="relative md:hidden">
            <summary className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 [&::-webkit-details-marker]:hidden">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M3 5.75A.75.75 0 013.75 5h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 5.75zm0 4.5A.75.75 0 013.75 9.5h12.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75zm0 4.5a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
              </svg>
            </summary>
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {l.label}
                </a>
              ))}
              {!user && (
                <Link
                  href="/login"
                  className="block rounded-lg px-3 py-2 text-sm font-semibold text-brand-600 transition hover:bg-slate-100 dark:text-brand-400 dark:hover:bg-slate-800"
                >
                  Entrar
                </Link>
              )}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg text-white shadow-sm">
        🗣️
      </span>
      <span className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
        English<span className="text-brand-600 dark:text-brand-400">Tutor</span>
      </span>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hero                                                                       */
/* -------------------------------------------------------------------------- */

function Hero({
  user,
  canUseApp,
  accountHref,
}: {
  user: { name: string } | null;
  canUseApp: boolean;
  accountHref: string;
}) {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-8 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:pt-20">
      <div className="text-center lg:text-left">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-900/60 dark:bg-brand-950/50 dark:text-brand-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
          </span>
          Tutor de inglês com IA adaptativa
        </span>

        <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
          Fale inglês de verdade,{" "}
          <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
            com ajuda na medida certa
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-slate-600 lg:mx-0 dark:text-slate-300">
          Um professor de IA que conversa com você, entrega um kit de sobrevivência
          com as palavras certas e corrige só o que importa — do{" "}
          <strong className="font-semibold text-slate-800 dark:text-slate-100">A1 ao C2</strong>,
          sem travar a conversa.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
          <Link
            href={accountHref}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 hover:shadow-brand-600/30 sm:w-auto"
          >
            {user
              ? canUseApp
                ? "Entrar no app"
                : "Ver minha conta"
              : "Começar grátis"}
            <svg className="h-4 w-4 transition group-hover:translate-x-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
            </svg>
          </Link>

          {!user && (
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Já tenho conta
            </Link>
          )}
        </div>

        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Sem cartão de crédito · Comece a conversar em segundos
        </p>
      </div>

      <ChatPreview />
    </section>
  );
}

/** A static mockup of the messenger UI to sell the experience visually. */
function ChatPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div
        aria-hidden
        className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-tr from-brand-500/20 via-transparent to-emerald-400/20 blur-2xl"
      />
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-2xl shadow-slate-900/10 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        {/* Mock header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm text-white">
              🗣️
            </span>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                English Tutor
              </p>
              <p className="text-[10px] text-slate-400">online agora</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-semibold text-orange-700 ring-1 ring-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:ring-orange-900/60">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> A2
          </span>
        </div>

        {/* Mock messages */}
        <div className="space-y-3 px-4 py-5">
          {/* Teacher bubble */}
          <div className="flex max-w-[85%] flex-col gap-2">
            <div className="rounded-2xl rounded-tl-md bg-slate-100 px-4 py-2.5 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              Hi! Let&apos;s talk about your weekend. What did you get up to?
            </div>
            {/* Survival kit */}
            <div className="rounded-xl border border-brand-100 bg-brand-50/70 p-3 dark:border-brand-900/50 dark:bg-brand-950/30">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-brand-600 dark:text-brand-300">
                🧰 Kit de sobrevivência
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["went out", "stayed in", "hung out", "I spent the…"].map((w) => (
                  <span
                    key={w}
                    className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* User bubble */}
          <div className="ml-auto max-w-[85%]">
            <div className="rounded-2xl rounded-tr-md bg-brand-600 px-4 py-2.5 text-sm text-white">
              I go to the beach and we play football.
            </div>
          </div>

          {/* Feedback card */}
          <div className="max-w-[90%] rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              ✅ Feedback
            </p>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <span className="rounded bg-rose-100 px-1 font-medium text-rose-700 line-through dark:bg-rose-950/50 dark:text-rose-300">
                I go
              </span>{" "}
              →{" "}
              <span className="rounded bg-emerald-100 px-1 font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                I went
              </span>{" "}
              ·{" "}
              <span className="rounded bg-rose-100 px-1 font-medium text-rose-700 line-through dark:bg-rose-950/50 dark:text-rose-300">
                we play
              </span>{" "}
              →{" "}
              <span className="rounded bg-emerald-100 px-1 font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                we played
              </span>
            </p>
            <p className="mt-2 text-xs italic text-slate-500 dark:text-slate-400">
              &ldquo;I went to the beach and we played football.&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stats strip                                                               */
/* -------------------------------------------------------------------------- */

function StatsStrip() {
  const stats = [
    { value: "A1 → C2", label: "6 níveis adaptativos" },
    { value: "Tempo real", label: "Correções na conversa" },
    { value: "Fala & ouve", label: "Prática de voz nativa" },
    { value: "24/7", label: "Seu professor sempre online" },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white/60 p-6 backdrop-blur sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-900/40">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl">
              {s.value}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Features                                                                  */
/* -------------------------------------------------------------------------- */

function Features() {
  const features = [
    {
      icon: <IconKit />,
      title: "Kit de sobrevivência",
      body: "Verbos, expressões e conectores prontos para você nunca ficar sem palavra no meio da frase.",
      tint: "brand",
    },
    {
      icon: <IconLevels />,
      title: "Níveis adaptativos A1–C2",
      body: "A quantidade de ajuda sobe e desce sozinha conforme o seu desempenho. Você sempre no ponto certo.",
      tint: "emerald",
    },
    {
      icon: <IconCheck />,
      title: "Correção inteligente",
      body: "Feedback seletivo: só o que importa, com a versão exata que um nativo usaria no seu lugar.",
      tint: "sky",
    },
    {
      icon: <IconPattern />,
      title: "Percebi um padrão",
      body: "O tutor identifica erros que se repetem e propõe mini-exercícios para corrigir de vez.",
      tint: "amber",
    },
    {
      icon: <IconSteps />,
      title: "Travou? Ajuda em 3 níveis",
      body: "Do empurrãozinho à resposta modelo: peça uma dica, uma estrutura ou o exemplo completo.",
      tint: "violet",
    },
    {
      icon: <IconMic />,
      title: "Voz nativa",
      body: "Fale e vire texto pelo microfone, e ouça a pronúncia correta com um toque. Treine ouvido e fala.",
      tint: "rose",
    },
  ];

  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6">
      <SectionHeading
        eyebrow="Recursos"
        title="Tudo para você conversar com confiança"
        subtitle="Cada detalhe foi pensado para manter a conversa fluindo enquanto você aprende de verdade."
      />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <FeatureCard key={f.title} {...f} />
        ))}
      </div>
    </section>
  );
}

const TINT: Record<string, string> = {
  brand: "bg-brand-50 text-brand-600 ring-brand-100 dark:bg-brand-950/40 dark:text-brand-300 dark:ring-brand-900/50",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50",
  sky: "bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900/50",
  amber: "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/50",
  violet: "bg-violet-50 text-violet-600 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/50",
  rose: "bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/50",
};

function FeatureCard({
  icon,
  title,
  body,
  tint,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  tint: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700">
      <div className={`grid h-11 w-11 place-items-center rounded-xl ring-1 ${TINT[tint]}`}>
        {icon}
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {body}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  How it works                                                              */
/* -------------------------------------------------------------------------- */

function HowItWorks() {
  const steps = [
    {
      n: "1",
      title: "Crie sua conta",
      body: "Cadastro rápido e gratuito. Em segundos você já tem seu professor pessoal.",
    },
    {
      n: "2",
      title: "Comece a conversar",
      body: "O tutor puxa assunto e entrega o kit de sobrevivência para você responder sem medo.",
    },
    {
      n: "3",
      title: "Receba feedback na hora",
      body: "Correções seletivas e a versão nativa da sua frase, sem interromper o papo.",
    },
    {
      n: "4",
      title: "Evolua de nível",
      body: "Conforme você melhora, a ajuda diminui e o desafio cresce — de A1 até C2.",
    },
  ];

  return (
    <section id="how" className="scroll-mt-24 border-y border-slate-200/70 bg-white/40 py-16 dark:border-slate-800/70 dark:bg-slate-900/30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Como funciona"
          title="Do primeiro oi ao inglês fluente"
          subtitle="Quatro passos simples. O resto o tutor faz por você."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.n} className="relative">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-extrabold text-white shadow-lg shadow-brand-600/20">
                {s.n}
              </div>
              {i < steps.length - 1 && (
                <div
                  aria-hidden
                  className="absolute left-14 top-6 hidden h-px w-[calc(100%-3.5rem)] bg-gradient-to-r from-slate-300 to-transparent lg:block dark:from-slate-700"
                />
              )}
              <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Level ladder                                                              */
/* -------------------------------------------------------------------------- */

function LevelLadder() {
  const levels = [
    { code: "A1", label: "Beginner", dot: "bg-rose-500" },
    { code: "A2", label: "Elementary", dot: "bg-orange-500" },
    { code: "B1", label: "Intermediate", dot: "bg-amber-500" },
    { code: "B2", label: "Upper-int.", dot: "bg-emerald-500" },
    { code: "C1", label: "Advanced", dot: "bg-sky-500" },
    { code: "C2", label: "Proficient", dot: "bg-violet-500" },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-brand-50/50 p-8 sm:p-10 dark:border-slate-800 dark:from-slate-900 dark:to-brand-950/30">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
            Progresso
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Um caminho claro do iniciante ao proficiente
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            O tutor ajusta a ajuda em cada nível do quadro europeu (CEFR). Você
            sente a evolução acontecer.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {levels.map((l) => (
            <div
              key={l.code}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-800/60"
            >
              <span className={`h-3 w-3 shrink-0 rounded-full ${l.dot}`} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {l.code}
                </p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {l.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Pricing                                                                   */
/* -------------------------------------------------------------------------- */

function Pricing() {
  const plans = [
    {
      name: "Grátis",
      price: "R$ 0",
      period: "/mês",
      tagline: "Para experimentar sem compromisso.",
      features: [
        "Conversa adaptativa A1–C2",
        "Kit de sobrevivência",
        "Correções essenciais",
        "1 conversa por vez",
      ],
      cta: "Criar conta grátis",
      href: "/register",
      highlight: false,
    },
    {
      name: "Pro",
      price: "R$ 29",
      period: "/mês",
      tagline: "Para evoluir o mais rápido possível.",
      features: [
        "Tudo do Grátis",
        "Conversas ilimitadas",
        "Voz: falar e ouvir",
        "Detecção de padrões + drills",
        "Feedback avançado com versão nativa",
        "Histórico completo salvo",
      ],
      cta: "Assinar o Pro",
      href: "/register",
      highlight: true,
    },
    {
      name: "Turmas",
      price: "Sob consulta",
      period: "",
      tagline: "Para escolas e equipes.",
      features: [
        "Tudo do Pro",
        "Painel de administração",
        "Aprovação de alunos",
        "Relatórios de progresso",
        "Suporte dedicado",
      ],
      cta: "Falar com a gente",
      href: "/register",
      highlight: false,
    },
  ];

  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6">
      <SectionHeading
        eyebrow="Planos"
        title="Comece grátis, evolua quando quiser"
        subtitle="Preços simples e transparentes. Sem surpresas, cancele quando quiser."
      />
      <div className="mt-12 grid items-start gap-6 lg:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.name}
            className={
              p.highlight
                ? "relative rounded-3xl border-2 border-brand-500 bg-white p-7 shadow-xl shadow-brand-600/10 dark:bg-slate-900"
                : "relative rounded-3xl border border-slate-200 bg-white/70 p-7 backdrop-blur dark:border-slate-800 dark:bg-slate-900/50"
            }
          >
            {p.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                Mais popular
              </span>
            )}
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {p.name}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {p.tagline}
            </p>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {p.price}
              </span>
              {p.period && (
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {p.period}
                </span>
              )}
            </div>

            <Link
              href={p.href}
              className={
                p.highlight
                  ? "mt-6 block rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                  : "mt-6 block rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              }
            >
              {p.cta}
            </Link>

            <ul className="mt-6 space-y-3">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  FAQ                                                                       */
/* -------------------------------------------------------------------------- */

function Faq() {
  const items = [
    {
      q: "Preciso pagar para começar?",
      a: "Não. Você cria sua conta gratuitamente e já começa a conversar. O plano Pro libera voz, conversas ilimitadas e feedback avançado quando você quiser acelerar.",
    },
    {
      q: "Como a IA adapta o meu nível?",
      a: "A cada resposta o tutor mede o seu desempenho e ajusta a quantidade de ajuda — do A1 (kit completo + resposta modelo) ao C2 (apenas correções sutis de estilo).",
    },
    {
      q: "Funciona no celular?",
      a: "Sim. A interface é responsiva, no estilo de um mensageiro, e a prática de voz usa a Web Speech API do próprio navegador — sem instalar nada.",
    },
    {
      q: "A correção não atrapalha a conversa?",
      a: "Não. O feedback é seletivo: primeiro a conversa flui, depois vêm só as correções que realmente importam, com a versão que um nativo usaria.",
    },
    {
      q: "Meu progresso fica salvo?",
      a: "Sim. Suas conversas ficam guardadas com segurança e o seu nível evolui junto com você a cada sessão.",
    },
    {
      q: "Meus dados estão seguros?",
      a: "Sim. As senhas são protegidas com scrypt, a sessão usa cookie HttpOnly e cada conversa é acessível apenas pelo seu dono.",
    },
  ];

  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-16 sm:px-6">
      <SectionHeading
        eyebrow="FAQ"
        title="Perguntas frequentes"
        subtitle="Ainda com dúvidas? Comece grátis — dá para sentir na prática."
      />
      <div className="mt-10 space-y-3">
        {items.map((it) => (
          <details
            key={it.q}
            className="group rounded-2xl border border-slate-200 bg-white/70 p-5 backdrop-blur transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-slate-900 dark:text-white [&::-webkit-details-marker]:hidden">
              {it.q}
              <svg className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {it.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Final CTA                                                                 */
/* -------------------------------------------------------------------------- */

function FinalCta({
  canUseApp,
  accountHref,
}: {
  canUseApp: boolean;
  accountHref: string;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 pt-4 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-14 text-center shadow-2xl shadow-brand-900/20 sm:px-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_60%_at_80%_10%,rgba(255,255,255,0.18),transparent)]"
        />
        <h2 className="relative text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Pronto para destravar o seu inglês?
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-brand-100">
          Junte-se a quem já conversa com confiança. Seu professor de IA está a um
          clique de distância.
        </p>
        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={accountHref}
            className="inline-flex w-full items-center justify-center rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-brand-700 shadow-lg transition hover:bg-brand-50 sm:w-auto"
          >
            {canUseApp ? "Entrar no app" : "Começar grátis agora"}
          </Link>
          {!canUseApp && (
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-xl border border-white/30 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-white/10 sm:w-auto"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Footer                                                                    */
/* -------------------------------------------------------------------------- */

function Footer() {
  return (
    <footer className="border-t border-slate-200/70 bg-white/50 dark:border-slate-800/70 dark:bg-slate-950/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-slate-500 dark:text-slate-400">
            Seu professor de inglês com IA adaptativa. Converse, erre sem medo e
            evolua do A1 ao C2.
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Produto
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href="#features" className="text-slate-600 transition hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
                Recursos
              </a>
            </li>
            <li>
              <a href="#how" className="text-slate-600 transition hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
                Como funciona
              </a>
            </li>
            <li>
              <a href="#pricing" className="text-slate-600 transition hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
                Planos
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Conta
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/login" className="text-slate-600 transition hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
                Entrar
              </Link>
            </li>
            <li>
              <Link href="/register" className="text-slate-600 transition hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
                Criar conta
              </Link>
            </li>
            <li>
              <a href="#faq" className="text-slate-600 transition hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
                FAQ
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200/70 py-6 dark:border-slate-800/70">
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          © {new Date().getFullYear()} EnglishTutor · Feito para quem quer falar
          inglês de verdade.
        </p>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shared bits                                                               */
/* -------------------------------------------------------------------------- */

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
        {title}
      </h2>
      <p className="mt-3 text-slate-600 dark:text-slate-300">{subtitle}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Icons                                                                     */
/* -------------------------------------------------------------------------- */

function IconKit() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 5V3h6v2M4 8h16v11a2 2 0 01-2 2H6a2 2 0 01-2-2V8zM12 12v4M10 14h4" />
    </svg>
  );
}
function IconLevels() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconPattern() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3a9 9 0 100 18M12 3v9l6 3M12 3a9 9 0 019 9" />
    </svg>
  );
}
function IconSteps() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 18h4v-4M10 14h4v-4M16 10h4V6" />
    </svg>
  );
}
function IconMic() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 15a3 3 0 003-3V6a3 3 0 00-6 0v6a3 3 0 003 3zM5 11a7 7 0 0014 0M12 18v3" />
    </svg>
  );
}
