import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  timestamp,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import type { TeacherTurn, CEFRLevel } from "@/lib/ai/schema";

export type UserRole = "admin" | "user";
export type UserStatus = "pending" | "approved" | "rejected";
export type Theme = "light" | "dark";

/** Buckets used to organize durable facts the tutor remembers about a learner. */
export type MemoryCategory =
  | "personal"
  | "family"
  | "work"
  | "education"
  | "preferences"
  | "goals"
  | "health"
  | "other";

/**
 * Application users. Self-registration creates a `pending` account that an
 * admin must approve before it can use the tutor. The chosen UI `theme` is
 * stored per user so the preference follows them across devices.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 16 }).$type<UserRole>().default("user").notNull(),
  status: varchar("status", { length: 16 })
    .$type<UserStatus>()
    .default("pending")
    .notNull(),
  // Self-declared CEFR level chosen at registration and editable in settings.
  // New conversations start here; the adaptive engine drifts from this baseline.
  englishLevel: varchar("english_level", { length: 4 })
    .$type<CEFRLevel>()
    .default("A2")
    .notNull(),
  theme: varchar("theme", { length: 8 }).$type<Theme>().default("light").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Server-side auth sessions. The browser cookie holds an opaque random token;
 * only its SHA-256 hash lives here, so a database leak never exposes a usable
 * session token.
 */
export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("auth_sessions_user_idx").on(table.userId)],
);

/**
 * A conversation session. Each session tracks the learner's current adaptive
 * CEFR level, which drifts up or down as the conversation progresses, and
 * belongs to the user who created it.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    title: text("title").default("New conversation").notNull(),
    currentLevel: varchar("current_level", { length: 4 })
      .$type<CEFRLevel>()
      .default("A2")
      .notNull(),
    // The conversation subject (a slug from lib/topics). Chosen by the learner
    // or picked at random when a new conversation starts.
    topic: varchar("topic", { length: 32 }),
    // Rolling count of "important" errors in recent turns, used to nudge the
    // adaptive level down when the learner struggles.
    recentErrorScore: integer("recent_error_score").default(0).notNull(),
    // Learner replies since the last level assessment. When it reaches the
    // cadence threshold, the tutor runs a fresh CEFR assessment and resets it.
    turnsSinceAssessment: integer("turns_since_assessment").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("sessions_user_idx").on(table.userId, table.updatedAt)],
);

/**
 * Durable, cross-session facts the tutor knows about a learner (name of their
 * spouse, job, city, kids, goals, likes…). Scoped to the USER (not a session)
 * so knowledge persists across every conversation and over long time spans.
 * `key` is a stable slug so a changed fact overwrites the old value.
 */
export const userMemories = pgTable(
  "user_memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    key: varchar("key", { length: 64 }).notNull(),
    fact: text("fact").notNull(),
    category: varchar("category", { length: 16 })
      .$type<MemoryCategory>()
      .default("personal")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("user_memories_user_key_unique").on(table.userId, table.key),
    index("user_memories_user_idx").on(table.userId, table.updatedAt),
  ],
);

/**
 * Every message exchanged. User messages store plain text in `content`.
 * Teacher messages ALSO store the full structured payload (toolkit, feedback,
 * mini-structure, model answer, detected pattern, level) in `payload`.
 */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .references(() => sessions.id, { onDelete: "cascade" })
      .notNull(),
    role: varchar("role", { length: 12 }).$type<"teacher" | "user">().notNull(),
    content: text("content").notNull(),
    // Structured teacher turn (null for user messages).
    payload: jsonb("payload").$type<TeacherTurn | null>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("messages_session_idx").on(table.sessionId, table.createdAt)],
);

/**
 * Recurring error tracker. When the same `errorType` reaches 3 occurrences,
 * the teacher pauses to run a short targeted drill.
 */
export const errorPatterns = pgTable(
  "error_patterns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .references(() => sessions.id, { onDelete: "cascade" })
      .notNull(),
    errorType: varchar("error_type", { length: 64 }).notNull(),
    label: text("label").notNull(),
    count: integer("count").default(1).notNull(),
    drilledAt: timestamp("drilled_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("error_patterns_session_idx").on(table.sessionId, table.errorType)],
);

export type UserRow = typeof users.$inferSelect;
export type AuthSessionRow = typeof authSessions.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type MessageRow = typeof messages.$inferSelect;
export type ErrorPatternRow = typeof errorPatterns.$inferSelect;
export type UserMemoryRow = typeof userMemories.$inferSelect;
