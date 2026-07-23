/**
 * The conversation topics a learner can practice. A new conversation opens on a
 * RANDOM topic by default, but the learner may pick any of these explicitly.
 *
 * - `slug`  : stable identifier stored in `sessions.topic` (never translated).
 * - `pt`    : label shown in the (Portuguese) UI.
 * - `en`    : label injected into the English tutor prompt so the opening
 *             question is about this subject.
 * - `emoji` : small visual cue for the picker.
 */
export interface Topic {
  slug: string;
  pt: string;
  en: string;
  emoji: string;
}

export const TOPICS: readonly Topic[] = [
  { slug: "work", pt: "Trabalho", en: "work and career", emoji: "💼" },
  { slug: "travel", pt: "Viagens", en: "travel", emoji: "✈️" },
  { slug: "fitness", pt: "Academia", en: "gym and fitness", emoji: "🏋️" },
  { slug: "business", pt: "Negócios", en: "business", emoji: "📈" },
  { slug: "technology", pt: "Tecnologia", en: "technology", emoji: "💻" },
  { slug: "movies", pt: "Filmes", en: "movies", emoji: "🎬" },
  { slug: "books", pt: "Livros", en: "books", emoji: "📚" },
  { slug: "routine", pt: "Rotina", en: "daily routine", emoji: "⏰" },
  { slug: "food", pt: "Alimentação", en: "food and eating", emoji: "🍽️" },
  { slug: "culture", pt: "Cultura", en: "culture", emoji: "🎭" },
  { slug: "hobbies", pt: "Hobbies", en: "hobbies", emoji: "🎨" },
  {
    slug: "entrepreneurship",
    pt: "Empreendedorismo",
    en: "entrepreneurship",
    emoji: "🚀",
  },
  { slug: "finance", pt: "Finanças", en: "personal finance", emoji: "💰" },
  { slug: "philosophy", pt: "Filosofia", en: "philosophy", emoji: "🤔" },
  { slug: "psychology", pt: "Psicologia", en: "psychology", emoji: "🧠" },
  { slug: "family", pt: "Família", en: "family", emoji: "👨‍👩‍👧" },
  { slug: "dreams", pt: "Sonhos", en: "dreams and aspirations", emoji: "🌙" },
  { slug: "goals", pt: "Objetivos", en: "personal goals", emoji: "🎯" },
  {
    slug: "job_interview",
    pt: "Entrevista de emprego",
    en: "a job interview (practice as if in one)",
    emoji: "🧑‍💼",
  },
] as const;

const BY_SLUG = new Map(TOPICS.map((t) => [t.slug, t]));

/** The set of valid topic slugs, handy for request validation. */
export const TOPIC_SLUGS = TOPICS.map((t) => t.slug);

export function isTopicSlug(value: unknown): value is string {
  return typeof value === "string" && BY_SLUG.has(value);
}

export function getTopic(slug: string | null | undefined): Topic | null {
  if (!slug) return null;
  return BY_SLUG.get(slug) ?? null;
}

/** Pick a random topic slug (used when a conversation starts with no choice). */
export function randomTopicSlug(): string {
  const i = Math.floor(Math.random() * TOPICS.length);
  return TOPICS[i].slug;
}

/** The English label to feed the tutor, or a neutral fallback. */
export function topicEnLabel(slug: string | null | undefined): string {
  return getTopic(slug)?.en ?? "everyday life";
}

/** The Portuguese label to show in the UI, or a neutral fallback. */
export function topicPtLabel(slug: string | null | undefined): string {
  return getTopic(slug)?.pt ?? "Conversa livre";
}
