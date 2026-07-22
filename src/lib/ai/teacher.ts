import { generateObject, type ModelMessage } from "ai";
import { getTeacherModel } from "./provider";
import { teacherTurnSchema, type TeacherTurn } from "./schema";
import { TEACHER_SYSTEM_PROMPT, buildContextBlock, type TurnContext } from "./prompt";

export interface GenerateTurnArgs {
  history: ModelMessage[];
  context: TurnContext;
}

/**
 * Calls Claude Sonnet 5 (via opencode Zen) and returns the structured
 * teacher turn. The dynamic tutor state is merged into the system prompt so it
 * never leaks into the visible conversation text.
 */
export async function generateTeacherTurn({
  history,
  context,
}: GenerateTurnArgs): Promise<TeacherTurn> {
  const system = `${TEACHER_SYSTEM_PROMPT}\n\n${buildContextBlock(context)}`;

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
    maxOutputTokens: 1500,
    maxRetries: 2,
  });

  return object;
}
