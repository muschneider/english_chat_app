export function TypingIndicator() {
  return (
    <div className="flex items-center gap-3" aria-live="polite" aria-label="Tutor is typing">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-sm">
        T
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
        <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" />
        <span
          className="typing-dot h-2 w-2 rounded-full bg-slate-400"
          style={{ animationDelay: "0.15s" }}
        />
        <span
          className="typing-dot h-2 w-2 rounded-full bg-slate-400"
          style={{ animationDelay: "0.3s" }}
        />
      </div>
    </div>
  );
}
