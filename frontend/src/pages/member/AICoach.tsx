import { useState, useEffect } from "react";
import { Sparkles, Send, ShoppingBag, Loader2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { recoveryScore } from "@/data/mock";
import { aiApi } from "@/lib/endpoints";
import { toast } from "sonner";

const quickPrompts = [
  "Which supplement should I take for muscle gain?",
  "Workout Advice for today",
  "How can I improve my recovery?",
  "Protein gap analysis",
];

interface Msg {
  from: "user" | "ai";
  text: string;
}

export default function AICoach() {
  const [messages, setMessages] = useState<Msg[]>([
    { from: "ai", text: recoveryScore.insight },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [upsellData, setUpsellData] = useState<any>(null);

  useEffect(() => {
    // Fetch initial AI recommendation & conversation history
    const loadAiData = async () => {
      try {
        const [upsellRes, convsRes] = await Promise.allSettled([
          aiApi.getUpsellRecommendation(),
          aiApi.listConversations(),
        ]);

        if (upsellRes.status === "fulfilled" && upsellRes.value) {
          setUpsellData(upsellRes.value);
        }

        if (convsRes.status === "fulfilled" && convsRes.value?.conversations?.length) {
          const latestConv = convsRes.value.conversations[0];
          setConversationId(latestConv._id);
          const historyRes = await aiApi.getHistory(latestConv._id);
          if (historyRes?.messages?.length) {
            setMessages(
              historyRes.messages.map((m) => ({
                from: m.role === "user" ? "user" : "ai",
                text: m.content,
              }))
            );
          }
        }
      } catch {
        // Fallback to initial state
      }
    };
    loadAiData();
  }, []);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userText = text.trim();
    setInput("");
    setMessages((m) => [...m, { from: "user", text: userText }]);
    setLoading(true);

    try {
      let replyText = "";
      if (!conversationId) {
        const res = await aiApi.startConversation(userText);
        setConversationId(res.conversation._id);
        replyText = res.replyMessage.content;
      } else {
        const res = await aiApi.sendMessage(conversationId, userText);
        replyText = res.replyMessage.content;
      }

      setMessages((m) => [...m, { from: "ai", text: replyText }]);
    } catch {
      toast.error("Failed to get AI response. Please try again.");
      setMessages((m) => [
        ...m,
        {
          from: "ai",
          text: "I am having trouble reaching the server right now. If you're looking for supplements like Whey Protein or Creatine, please ask our Gym Front Desk staff for genuine stock!",
        },
      ]);
    } finally {
      setLoading(false);
    }
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
            <p className="text-xs text-(--color-text-muted)">
              Sleep <span className="font-mono text-(--color-text)">{recoveryScore.sleep}</span>
            </p>
            <p className="text-xs text-(--color-text-muted)">
              Water <span className="font-mono text-(--color-text)">{recoveryScore.water}</span>
            </p>
            <p className="text-xs text-(--color-text-muted)">
              Workout <span className="text-(--color-good)">{recoveryScore.workout}</span>
            </p>
          </div>
        </div>
      </Card>

      {/* Gym Supplement Upsell Alert Card if Eligible */}
      {upsellData?.eligible && upsellData?.supplementRecommendation && (
        <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
          <ShoppingBag className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-300 mb-0.5">
              {upsellData.supplementRecommendation.title}
            </p>
            <p className="text-amber-200/90 leading-snug">
              {upsellData.supplementRecommendation.explanation}
            </p>
            <button
              onClick={() => send("Tell me more about gym supplements and protein gap")}
              className="mt-2 text-[11px] font-medium underline text-amber-300 hover:text-amber-100"
            >
              Ask AI Coach about Supplement Store &rarr;
            </button>
          </div>
        </div>
      )}

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
        {loading && (
          <div className="flex justify-start items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--color-accent-soft) text-(--color-accent-text) mr-2">
              <Sparkles size={13} className="animate-spin" />
            </span>
            <div className="rounded-2xl rounded-tl-sm bg-(--color-surface-2) text-(--color-text-muted) text-xs px-4 py-2 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>AI Coach is thinking...</span>
            </div>
          </div>
        )}
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
          disabled={loading}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--color-accent) text-white disabled:opacity-50"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
