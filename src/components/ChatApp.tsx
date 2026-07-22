"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CEFRLevel, TeacherTurn } from "@/lib/ai/schema";
import type { ClientMessage } from "@/lib/services/conversation";
import type { AppUser } from "@/lib/auth/types";
import { logoutAction } from "@/lib/auth/actions";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ChatInput } from "./ChatInput";
import { StuckHelp } from "./StuckHelp";
import { LevelBadge } from "./LevelBadge";
import { ThemeToggle } from "./ThemeToggle";

const STORAGE_KEY = "english-tutor-session-id";

export function ChatApp({ user }: { user: AppUser }) {
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
  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="mx-auto flex h-[100dvh] max-w-3xl flex-col">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white/70 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg text-white shadow-sm">
            🗣️
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold leading-tight text-slate-800 dark:text-slate-100">
              English Conversation Tutor
            </h1>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              Adaptive practice · speak with a little help
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LevelBadge level={level} />

          <ThemeToggle initial={user.theme} />

          {user.role === "admin" && (
            <Link
              href="/admin"
              title="Administração"
              aria-label="Administração"
              className="hidden h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 sm:grid dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M10 1l7 3v5c0 4.25-2.9 8.06-7 9-4.1-.94-7-4.75-7-9V4l7-3zm0 5.5A2.25 2.25 0 107.75 8.75h4.5A2.25 2.25 0 0010 6.5z" clipRule="evenodd" />
              </svg>
            </Link>
          )}

          <button
            type="button"
            onClick={handleNewConversation}
            disabled={sending || booting}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            title="Start a fresh conversation"
          >
            New
          </button>

          <div
            className="hidden h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 sm:grid dark:bg-brand-900/50 dark:text-brand-200"
            title={`${user.name} · ${user.email}`}
          >
            {initial}
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              title="Sair"
              aria-label="Sair"
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M3 4.75A2.75 2.75 0 015.75 2h4.5a.75.75 0 010 1.5h-4.5c-.69 0-1.25.56-1.25 1.25v10.5c0 .69.56 1.25 1.25 1.25h4.5a.75.75 0 010 1.5h-4.5A2.75 2.75 0 013 15.25V4.75z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M13.03 6.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 11-1.06-1.06l1.97-1.97H8.75a.75.75 0 010-1.5h6.25l-1.97-1.97a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
            </button>
          </form>
        </div>
      </header>

      {/* Chat area */}
      <div ref={scrollRef} className="scroll-slim flex-1 overflow-y-auto px-3 py-5 sm:px-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {booting && (
            <div className="flex flex-col items-center gap-3 pt-16 text-center text-slate-400 dark:text-slate-500">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600 dark:border-brand-900 dark:border-t-brand-400" />
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
            <div className="mx-auto rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
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
