import { generateObject, type ModelMessage } from "ai";
import type { UserMemoryRow } from "@/lib/db/schema";
import { getTeacherModel } from "./provider";
import { teacherTurnSchema, type TeacherTurn } from "./schema";
import {
  TEACHER_SYSTEM_PROMPT,
  buildContextBlock,
  buildProfileBlock,
  type LearnerProfile,
  type TurnContext,
} from "./prompt";

export interface GenerateTurnArgs {
  history: ModelMessage[];
  context: TurnContext;
  /** Who the learner is — always known, so the tutor never loses their identity. */
  profile: LearnerProfile;
  /** Durable, cross-session facts the tutor already knows about the learner. */
  memories: UserMemoryRow[];
}

/**
 * Calls Claude Sonnet 5 (via opencode Zen) and returns the structured
 * teacher turn. The learner's identity + long-term memory and the dynamic tutor
 * state are merged into the system prompt so they never leak into the visible
 * conversation text.
 */
export async function generateTeacherTurn({
  history,
  context,
  profile,
  memories,
}: GenerateTurnArgs): Promise<TeacherTurn> {
  const system = [
    TEACHER_SYSTEM_PROMPT,
    buildProfileBlock(profile, memories),
    buildContextBlock(context),
  ].join("\n\n");

  // The AI SDK requires at least one message. On the very first turn there is
  // no learner message yet, so we seed a neutral kickoff instruction.
  const messages: ModelMessage[] =
    history.length > 0
      ? history
      : [
          {
            role: "user",
            content:
              "Let's begin our English conversation lesson. Please greet me briefly and ask your first contextual question.",
          },
        ];

  const { object } = await generateObject({
    model: getTeacherModel(),
    schema: teacherTurnSchema,
    system,
    messages,
    // Note: claude-sonnet-5 ignores `temperature`, so we omit it.
    maxOutputTokens: 1800,
    maxRetries: 2,
  });

  return object;
}
