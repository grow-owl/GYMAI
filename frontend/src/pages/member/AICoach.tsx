import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { recoveryScore } from "@/data/mock";

const quickPrompts = ["Workout Advice", "Diet Advice", "Recovery", "My Progress"];

interface Msg {
  from: "user" | "ai";
  text: string;
}

const replies: Record<string, string> = {
  "Workout Advice":
    "Your Push session is scheduled today. Since recovery is good, stick to the planned weights — try adding one extra rep on your final bench set.",
  "Diet Advice":
    "You're at 1,790 of 2,700 kcal today with 168g protein logged. A dinner with rice and paneer would round out your carbs and protein target well.",
  Recovery:
    "Recovery score is 82 — in the good range. Sleep and hydration are both on track, so no adjustments needed today.",
  "My Progress":
    "Chest strength is up about 8% over the last four weeks, and your streak is holding at 18 days. Keep the consistency going.",
};

export default function AICoach() {
  const [messages, setMessages] = useState<Msg[]>([
    { from: "ai", text: recoveryScore.insight },
  ]);
  const [input, setInput] = useState("");

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { from: "user", text }]);
    const reply = replies[text] ?? "Got it — logging that and factoring it into your next plan update.";
    setTimeout(() => setMessages((m) => [...m, { from: "ai", text: reply }]), 400);
    setInput("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      <PageHeader title="AI Fitness Coach" backTo="/member" />

      <Card sweep className="mb-4 border-(--color-accent)/25">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-(--color-text-faint) uppercase tracking-wide mb-1">Recovery Score</p>
            <p className="font-display text-4xl font-semibold text-(--color-text) tabular-nums">{recoveryScore.score}</p>
            <p className="text-xs font-medium text-(--color-good) mt-0.5">{recoveryScore.label}</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs text-(--color-text-muted)">Sleep <span className="font-mono text-(--color-text)">{recoveryScore.sleep}</span></p>
            <p className="text-xs text-(--color-text-muted)">Water <span className="font-mono text-(--color-text)">{recoveryScore.water}</span></p>
            <p className="text-xs text-(--color-text-muted)">Workout <span className="text-(--color-good)">{recoveryScore.workout}</span></p>
          </div>
        </div>
      </Card>

      <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">
        {messages.map((m, i) => (
          <div key={i} className={m.from === "user" ? "flex justify-end" : "flex justify-start"}>
            {m.from === "ai" && (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--color-accent-soft) text-(--color-accent-text) mr-2">
                <Sparkles size={13} />
              </span>
            )}
            <div
              className={
                m.from === "user"
                  ? "max-w-[80%] rounded-2xl rounded-tr-sm bg-(--color-accent) text-white text-sm px-4 py-2.5"
                  : "max-w-[80%] rounded-2xl rounded-tl-sm bg-(--color-surface-2) text-(--color-text) text-sm px-4 py-2.5 leading-relaxed"
              }
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
        {quickPrompts.map((p) => (
          <button
            key={p}
            onClick={() => send(p)}
            className="shrink-0 rounded-full border border-(--color-border) text-(--color-text-muted) text-xs font-medium px-3.5 py-2 hover:border-(--color-accent)/50 hover:text-(--color-text)"
          >
            {p}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface) px-2 py-1.5"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your AI Coach..."
          className="flex-1 bg-transparent text-sm px-2 py-1.5 outline-none placeholder:text-(--color-text-faint)"
        />
        <button
          type="submit"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--color-accent) text-white"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
