"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CEFRLevel, TeacherTurn } from "@/lib/ai/schema";
import type { ClientMessage } from "@/lib/services/conversation";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ChatInput } from "./ChatInput";
import { StuckHelp } from "./StuckHelp";
import { LevelBadge } from "./LevelBadge";

const STORAGE_KEY = "english-tutor-session-id";

export function ChatApp() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [level, setLevel] = useState<CEFRLevel>("A2");
  const [booting, setBooting] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stuck, setStuck] = useState<TeacherTurn["stuckHelp"]>(null);
  const [hintLevel, setHintLevel] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, stuck, scrollToBottom]);

  // Boot: resume an existing session or create a new one.
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const existing = localStorage.getItem(STORAGE_KEY);
      try {
        if (existing) {
          const res = await fetch(`/api/session?id=${existing}`);
          if (res.ok) {
            const data = await res.json();
            if (!cancelled) {
              setSessionId(data.session.id);
              setLevel(data.session.currentLevel);
              setMessages(data.messages);
              setBooting(false);
            }
            return;
          }
          localStorage.removeItem(STORAGE_KEY);
        }
        await startNewSession(cancelled);
      } catch {
        if (!cancelled) {
          setError("Could not start the tutor. Check your connection and refresh.");
          setBooting(false);
        }
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startNewSession(cancelled = false) {
    setBooting(true);
    setError(null);
    setStuck(null);
    setHintLevel(0);
    const res = await fetch("/api/session", { method: "POST" });
    if (!res.ok) throw new Error("failed to create session");
    const data = await res.json();
    if (cancelled) return;
    localStorage.setItem(STORAGE_KEY, data.session.id);
    setSessionId(data.session.id);
    setLevel(data.session.currentLevel);
    setMessages([data.message]);
    setBooting(false);
  }

  const handleNewConversation = async () => {
    if (sending || booting) return;
    setMessages([]);
    try {
      await startNewSession();
    } catch {
      setError("Could not start a new conversation.");
      setBooting(false);
    }
  };

  const handleSend = async (textValue: string) => {
    if (!sessionId || sending) return;
    setError(null);
    setStuck(null);
    setHintLevel(0);

    const optimistic: ClientMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: textValue,
      payload: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, intent: "reply", message: textValue }),
      });
      if (!res.ok) throw new Error("chat failed");
      const data = await res.json();
      if (data.teacherMessage) {
        setMessages((prev) => [...prev, data.teacherMessage]);
      }
      if (data.level) setLevel(data.level);
    } catch {
      setError("The tutor could not respond. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleHint = async () => {
    if (!sessionId || sending) return;
    setError(null);
    const nextHint = Math.min(hintLevel + 1, 3);
    setHintLevel(nextHint);
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, intent: "hint", hintLevel: nextHint }),
      });
      if (!res.ok) throw new Error("hint failed");
      const data = await res.json();
      setStuck(data.turn?.stuckHelp ?? null);
    } catch {
      setError("Could not fetch a hint. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const lastTeacherId = [...messages].reverse().find((m) => m.role === "teacher")?.id;

  return (
    <div className="mx-auto flex h-[100dvh] max-w-3xl flex-col">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white/70 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg text-white shadow-sm">
            🗣️
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight text-slate-800">
              English Conversation Tutor
            </h1>
            <p className="text-xs text-slate-500">
              Adaptive practice · speak with a little help
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LevelBadge level={level} />
          <button
            type="button"
            onClick={handleNewConversation}
            disabled={sending || booting}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            title="Start a fresh conversation"
          >
            New
          </button>
        </div>
      </header>

      {/* Chat area */}
      <div ref={scrollRef} className="scroll-slim flex-1 overflow-y-auto px-3 py-5 sm:px-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {booting && (
            <div className="flex flex-col items-center gap-3 pt-16 text-center text-slate-400">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
              <p className="text-sm">Warming up your tutor…</p>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isLatestTeacher={m.id === lastTeacherId}
            />
          ))}

          {stuck && <StuckHelp help={stuck} />}

          {sending && <TypingIndicator />}

          {error && (
            <div className="mx-auto rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      {!booting && (
        <ChatInput
          onSend={handleSend}
          onHint={handleHint}
          disabled={sending}
          hintLevel={hintLevel}
        />
      )}
    </div>
  );
}
