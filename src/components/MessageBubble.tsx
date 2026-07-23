"use client";

import { useCallback, useState } from "react";
import type { CEFRLevel } from "@/lib/ai/schema";
import type { ClientMessage } from "@/lib/services/conversation";
import { SurvivalKit } from "./SurvivalKit";
import { FeedbackCard } from "./FeedbackCard";
import { PatternAlert } from "./PatternAlert";
import { AssessmentCard } from "./AssessmentCard";

function SpeakButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 0.95;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  }, [text, speaking]);

  return (
    <button
      type="button"
      onClick={speak}
      aria-label={speaking ? "Stop audio" : "Listen to this message"}
      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400"
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path d="M10 3.75a.75.75 0 00-1.264-.546L5.203 6.5H3.167A1.167 1.167 0 002 7.667v4.666A1.167 1.167 0 003.167 13.5h2.036l3.533 3.296A.75.75 0 0010 16.25V3.75z" />
        <path d="M13.5 6.5a.75.75 0 011.06 0 5 5 0 010 7.07.75.75 0 11-1.06-1.06 3.5 3.5 0 000-4.95.75.75 0 010-1.06z" />
      </svg>
      {speaking ? "Stop" : "Listen"}
    </button>
  );
}

export function MessageBubble({
  message,
  isLatestTeacher,
  sessionId = null,
  currentLevel,
  onLevelAccepted,
}: {
  message: ClientMessage;
  isLatestTeacher: boolean;
  sessionId?: string | null;
  currentLevel?: CEFRLevel;
  onLevelAccepted?: (level: CEFRLevel) => void;
}) {
  if (message.role === "user") {
    return (
      <div className="animate-bubble-in flex justify-end">
        <div className="max-w-[82%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-brand-500 to-brand-600 px-4 py-2.5 text-white shadow-sm">
          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  const payload = message.payload;

  return (
    <div className="animate-bubble-in space-y-2">
      {payload?.feedback && <FeedbackCard feedback={payload.feedback} />}
      {payload?.detectedPattern && (
        <PatternAlert pattern={payload.detectedPattern} />
      )}
      {payload?.assessment && (
        <AssessmentCard
          assessment={payload.assessment}
          currentLevel={currentLevel ?? payload.assessment.estimatedLevel}
          sessionId={sessionId}
          onLevelAccepted={onLevelAccepted}
        />
      )}

      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-sm">
          T
        </div>
        <div className="min-w-0 flex-1">
          <div className="inline-block max-w-full rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 text-slate-800 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
            <p className="whitespace-pre-wrap break-words leading-relaxed">
              {message.content}
            </p>
          </div>
          <SpeakButton text={message.content} />

          {payload && (
            <SurvivalKit
              toolkit={payload.toolkit}
              miniStructure={payload.miniStructure}
              modelAnswer={payload.modelAnswer}
              defaultOpen={isLatestTeacher}
            />
          )}
        </div>
      </div>
    </div>
  );
}
