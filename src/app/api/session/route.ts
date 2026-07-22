import { NextResponse } from "next/server";
import { createSession, getSession } from "@/lib/services/conversation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/session -> create a new conversation and get the opening turn. */
export async function POST() {
  try {
    const { session, message } = await createSession();
    return NextResponse.json({
      session: {
        id: session.id,
        title: session.title,
        currentLevel: session.currentLevel,
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

/** GET /api/session?id=... -> load an existing conversation transcript. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing session id." }, { status: 400 });
  }

  try {
    const result = await getSession(id);
    if (!result) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }
    return NextResponse.json({
      session: {
        id: result.session.id,
        title: result.session.title,
        currentLevel: result.session.currentLevel,
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
