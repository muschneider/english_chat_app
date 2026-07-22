"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onSend: (text: string) => void;
  onHint: () => void;
  disabled: boolean;
  hintLevel: number;
}

export function ChatInput({ onSend, onHint, disabled, hintLevel }: Props) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const Ctor =
      typeof window !== "undefined"
        ? window.SpeechRecognition ?? window.webkitSpeechRecognition
        : undefined;
    setMicSupported(Boolean(Ctor));
  }, []);

  // Auto-grow the textarea.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const submit = () => {
    const value = text.trim();
    if (!value || disabled) return;
    onSend(value);
    setText("");
  };

  const toggleMic = () => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return;

    if (recording) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    let finalText = "";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else interim += transcript;
      }
      setText((prev) => {
        const base = prev.replace(/\s*\[…\].*$/, "");
        return interim ? `${finalText || base} [\u2026]${interim}`.trim() : (finalText || base).trim();
      });
    };
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => {
      setRecording(false);
      setText((prev) => prev.replace(/\s*\[\u2026\].*$/, "").trim());
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  };

  return (
    <div className="border-t border-slate-200 bg-white/80 px-3 py-3 backdrop-blur sm:px-4 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <button
          type="button"
          onClick={onHint}
          disabled={disabled}
          title="I'm stuck — get a hint"
          className="hidden shrink-0 items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:opacity-50 sm:inline-flex dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/40"
        >
          <span aria-hidden>🪜</span>
          {hintLevel > 0 ? `Hint ${Math.min(hintLevel, 3)}/3` : "I'm stuck"}
        </button>

        <div className="flex flex-1 items-end rounded-2xl border border-slate-300 bg-white shadow-sm focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:border-brand-500 dark:focus-within:ring-brand-900/60">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            disabled={disabled}
            placeholder="Type your answer in English…"
            aria-label="Your answer in English"
            className="max-h-40 flex-1 resize-none bg-transparent px-4 py-2.5 text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60 dark:text-slate-100 dark:placeholder:text-slate-500"
          />

          <div className="flex items-center gap-1 pb-1.5 pr-1.5">
            {/* Mobile hint button */}
            <button
              type="button"
              onClick={onHint}
              disabled={disabled}
              title="I'm stuck — get a hint"
              aria-label="I'm stuck, get a hint"
              className="grid h-9 w-9 place-items-center rounded-xl text-sky-600 transition hover:bg-sky-50 disabled:opacity-50 sm:hidden dark:text-sky-400 dark:hover:bg-sky-950/40"
            >
              🪜
            </button>

            {micSupported && (
              <button
                type="button"
                onClick={toggleMic}
                disabled={disabled}
                aria-label={recording ? "Stop recording" : "Speak your answer"}
                title={recording ? "Stop recording" : "Speak your answer"}
                className={`grid h-9 w-9 place-items-center rounded-xl transition disabled:opacity-50 ${
                  recording
                    ? "animate-rec bg-rose-500 text-white"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                }`}
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path d="M10 2a2.5 2.5 0 00-2.5 2.5v5a2.5 2.5 0 005 0v-5A2.5 2.5 0 0010 2z" />
                  <path d="M5.5 9.5a.75.75 0 00-1.5 0 6 6 0 005.25 5.954V17H8a.75.75 0 000 1.5h4a.75.75 0 000-1.5h-1.25v-1.546A6 6 0 0016 9.5a.75.75 0 00-1.5 0 4.5 4.5 0 01-9 0z" />
                </svg>
              </button>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={disabled || !text.trim()}
              aria-label="Send message"
              className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M3.4 2.6a1 1 0 00-1.34 1.24l1.85 5.16H11a1 1 0 010 2H3.91l-1.85 5.16a1 1 0 001.34 1.24l14-7a1 1 0 000-1.8l-14-7z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-1.5 max-w-3xl px-1 text-center text-[11px] text-slate-400 dark:text-slate-500">
        Press Enter to send · Shift+Enter for a new line
        {micSupported ? " · 🎤 mic & 🔊 listen enabled" : ""}
      </p>
    </div>
  );
}
