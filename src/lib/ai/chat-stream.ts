/**
 * Client-side helpers for consuming the NDJSON stream produced by
 * `advanceConversationStream` (POST /api/chat with intent `reply`).
 *
 * Everything here is import-safe for the browser bundle: it depends only on the
 * plain `TeacherTurn` schema type (erased at build time) and a lightweight
 * local mirror of `ClientMessage`. Do NOT import server-only modules here.
 */
import type { TeacherTurn } from "./schema";

/** Lightweight recursive deep-partial type for streamed teacher turns. */
export type PartialConversation = {
  conversation?: string;
  topic?: string;
  // …other fields may stream in later, but only `conversation` is read by the
  // client during streaming — the structured panels only render after `done`.
  [key: string]: unknown;
};

/**
 * Local mirror of `ClientMessage` so the client bundle never pulls the
 * server-only `conversation.ts` module. Kept structurally identical.
 */
export interface ClientMessageLike {
  id: string;
  role: "teacher" | "user";
  content: string;
  payload: TeacherTurn | null;
  createdAt: string;
}

export interface ChatStreamPartial {
  type: "partial";
  partial: PartialConversation;
}
export interface ChatStreamUserMessage {
  type: "userMessage";
  userMessage: ClientMessageLike;
}
export interface ChatStreamDone {
  type: "done";
  turn: TeacherTurn;
  teacherMessage: ClientMessageLike;
  level: string;
}
export interface ChatStreamError {
  type: "error";
  error: string;
}
export type ChatStreamMessage =
  | ChatStreamPartial
  | ChatStreamUserMessage
  | ChatStreamDone
  | ChatStreamError;

/**
 * Reads an NDJSON (`application/x-ndjson`) streamed `Response` line-by-line and
 * invokes `onMessage` for each parsed `ChatStreamMessage`. Closes cleanly when
 * the stream ends; re-throws on a non-recoverable network error.
 */
export async function readChatStream(
  response: Response,
  onMessage: (msg: ChatStreamMessage) => void,
): Promise<void> {
  if (!response.body) {
    throw new Error("Streaming is not supported by this connection.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!line) continue;

      let parsed: ChatStreamMessage;
      try {
        parsed = JSON.parse(line) as ChatStreamMessage;
      } catch {
        // Skip malformed/unparseable chunks — the protocol is append-only.
        continue;
      }
      onMessage(parsed);
    }
  }
}