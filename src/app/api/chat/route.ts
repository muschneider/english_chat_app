import { NextResponse } from "next/server";
import { z } from "zod";
import { advanceConversation } from "@/lib/services/conversation";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  intent: z.enum(["reply", "hint"]),
  message: z.string().max(4000).optional(),
  hintLevel: z.number().int().min(1).max(3).optional(),
  /** The learner's LOCAL time of day, computed on the client. */
  daypart: z.enum(["morning", "afternoon", "evening", "night"]).optional(),
});

/** POST /api/chat -> advance the conversation (reply or request a hint). */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (user.role !== "admin" && user.status !== "approved") {
    return NextResponse.json({ error: "Account not approved." }, { status: 403 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (parsed.intent === "reply" && !parsed.message?.trim()) {
    return NextResponse.json(
      { error: "A reply must include a message." },
      { status: 400 },
    );
  }

  try {
    const result = await advanceConversation({ ...parsed, userId: user.id });
    if (!result) {
      return NextResponse.json(
        { error: "Session not found or empty message." },
        { status: 404 },
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/chat POST]", error);
    return NextResponse.json(
      { error: "The tutor could not respond. Please try again." },
      { status: 500 },
    );
  }
}
