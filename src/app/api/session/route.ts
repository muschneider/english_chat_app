import { NextResponse } from "next/server";
import {
  createSession,
  getLatestSessionForUser,
  getSession,
} from "@/lib/services/conversation";
import { getCurrentUser } from "@/lib/auth/session";
import type { UserRow } from "@/lib/db/schema";
import { isTopicSlug } from "@/lib/topics";
import { isDaypart, type Daypart } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Best-effort read of the optional new-session options from the request body:
 * a chosen topic slug and the learner's local part of the day. The body can
 * only be consumed once, so both are parsed together.
 */
async function readSessionOptions(
  request: Request,
): Promise<{ topic?: string; daypart?: Daypart }> {
  try {
    const body = (await request.json()) as {
      topic?: unknown;
      daypart?: unknown;
    };
    return {
      topic: isTopicSlug(body?.topic) ? body.topic : undefined,
      daypart: isDaypart(body?.daypart) ? body.daypart : undefined,
    };
  } catch {
    return {};
  }
}

/** Resolve an authenticated + approved user, or an error response. */
async function requireApiUser(): Promise<
  { user: UserRow } | { response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }
  if (user.role !== "admin" && user.status !== "approved") {
    return { response: NextResponse.json({ error: "Account not approved." }, { status: 403 }) };
  }
  return { user };
}

/** POST /api/session -> create a new conversation and get the opening turn. */
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const { topic, daypart } = await readSessionOptions(request);

  try {
    const { session, message } = await createSession(auth.user.id, {
      topic,
      daypart,
    });
    return NextResponse.json({
      session: {
        id: session.id,
        title: session.title,
        currentLevel: session.currentLevel,
        topic: session.topic,
      },
      message,
    });
  } catch (error) {
    console.error("[api/session POST]", error);
    return NextResponse.json(
      { error: "Failed to start a new conversation." },
      { status: 500 },
    );
  }
}

/** GET /api/session?id=... -> load a specific conversation transcript. */
export async function GET(request: Request) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  try {
    // No id: resume the user's most recent conversation. This is what makes
    // the chat follow the learner across devices (computer, phone, tablet):
    // on a fresh device with no localStorage, we still pick up where they
    // left off instead of starting a brand-new session.
    if (!id) {
      const result = await getLatestSessionForUser(auth.user.id);
      if (!result) {
        return NextResponse.json({ error: "No session yet." }, { status: 404 });
      }
      return NextResponse.json({
        session: {
          id: result.session.id,
          title: result.session.title,
          currentLevel: result.session.currentLevel,
          topic: result.session.topic,
        },
        messages: result.messages,
      });
    }

    const result = await getSession(id, auth.user.id);
    if (!result) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }
    return NextResponse.json({
      session: {
        id: result.session.id,
        title: result.session.title,
        currentLevel: result.session.currentLevel,
        topic: result.session.topic,
      },
      messages: result.messages,
    });
  } catch (error) {
    console.error("[api/session GET]", error);
    return NextResponse.json(
      { error: "Failed to load the conversation." },
      { status: 500 },
    );
  }
}
