import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import type { TeacherTurn, CEFRLevel } from "@/lib/ai/schema";

/**
 * A conversation session. Each session tracks the learner's current adaptive
 * CEFR level, which drifts up or down as the conversation progresses.
 */
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").default("New conversation").notNull(),
  currentLevel: varchar("current_level", { length: 4 })
    .$type<CEFRLevel>()
    .default("A2")
    .notNull(),
  // Rolling count of "important" errors in recent turns, used to nudge the
  // adaptive level down when the learner struggles.
  recentErrorScore: integer("recent_error_score").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

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

export type SessionRow = typeof sessions.$inferSelect;
export type MessageRow = typeof messages.$inferSelect;
export type ErrorPatternRow = typeof errorPatterns.$inferSelect;
