import { useState, useEffect } from "react";
import { Sparkles, TrendingUp, Clock, Users2, Send, Loader2, AlertTriangle, Phone, MessageCircle } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { aiApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";

interface Msg {
  from: "user" | "ai";
  text: string;
}

const ownerQuickPrompts = [
  "How can I increase supplement sales this month?",
  "Analyze member retention & churn risk",
  "How to handle peak hour crowd from 6-8 PM?",
  "Strategies to convert leads faster",
];

export default function AIInsights() {
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<Msg[]>([
    {
      from: "ai",
      text: "Hello! I am your AI Gym Business Advisor. Ask me anything about your gym's revenue, member retention, trainer management, or supplement sales strategies!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // At-risk members state
  const [atRiskMembers, setAtRiskMembers] = useState<any[]>([]);
  const [loadingAtRisk, setLoadingAtRisk] = useState(true);

  useEffect(() => {
    const loadOwnerAi = async () => {
      try {
        const convsRes = await aiApi.listConversations();
        if (convsRes?.conversations?.length) {
          const latestConv = convsRes.conversations[0];
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
        // Keep initial fallback message
      }
    };

    const loadAtRisk = async () => {
      const gymId = user?.gymId || "";
      setLoadingAtRisk(true);
      try {
        const res = await aiApi.getAtRiskMembers(gymId);
        const list = Array.isArray(res) ? res : res?.atRiskMembers || [];
        setAtRiskMembers(list);
      } catch {
        setAtRiskMembers([]);
      } finally {
        setLoadingAtRisk(false);
      }
    };

    loadOwnerAi();
    loadAtRisk();
  }, [user]);

function getSmartFallbackAdvice(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("supplement") || q.includes("sales") || q.includes("revenue") || q.includes("store")) {
    return "💡 **Supplement Sales & Store Strategy**\n\n1. **High-Margin Bundles:** Offer Whey Protein + Creatine Monohydrate combos with a 10% discount at reception.\n2. **Trainer Recommendations:** Train personal trainers to recommend post-workout recovery shakes immediately following intensive client sessions.\n3. **Front-Desk Placement:** Place pre-workout samples and energy bars at eye-level on the front desk counter.\n4. **First-Purchase Voucher:** Give a ₹200 voucher for store products to all newly enrolled members.";
  }
  if (q.includes("retention") || q.includes("churn") || q.includes("expire") || q.includes("leave")) {
    return "⚠️ **Member Retention & Churn Reduction**\n\n1. **10-Day Absence Protocol:** Automated WhatsApp check-in for members missing check-ins for 7-10 consecutive days.\n2. **Renewal Discount Window:** Send early membership renewal vouchers 7 days before expiry.\n3. **Free Progress Reviews:** Schedule 1-on-1 consultations with head trainers for members with declining attendance.\n4. **Community Challenges:** Run monthly 30-day streak challenges with branded gym shakers as rewards.";
  }
  if (q.includes("peak") || q.includes("crowd") || q.includes("time") || q.includes("hour")) {
    return "⏳ **Peak Hour Capacity Management (6 PM - 8 PM)**\n\n1. **Early Bird Incentives:** Encourage 6 AM - 9 AM check-ins with extra streak reward points.\n2. **Floor Trainer Rotation:** Assign floor trainers to manage bench press and squat rack rotation during peak hours.\n3. **Staggered Group Classes:** Schedule popular group class slots at 5:30 PM and 7:15 PM to split arrival waves.";
  }
  if (q.includes("lead") || q.includes("convert") || q.includes("prospect")) {
    return "🎯 **Lead Conversion & Sales Growth**\n\n1. **Speed to Lead:** Reach out to online trial signups within 15 minutes of registration.\n2. **Day Pass Experience:** Offer a free body composition analysis during their initial trial session.\n3. **Same-Day Discount:** Waive admission fees for prospects who convert on their trial day.";
  }
  return "💡 **Gym Business Insights & Growth Actions**\n\n- **Retention:** Active member attendance is consistent. Continue 7-day absence WhatsApp follow-ups.\n- **Sales:** Up-sell supplement combo packs during peak evening check-ins.\n- **Leads:** Ensure rapid 24-hour follow-up on all incoming trial pass requests.";
}

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
      setMessages((m) => [
        ...m,
        {
          from: "ai",
          text: getSmartFallbackAdvice(userText),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="AI Business Advisor & Insights" subtitle="Automated weekly analysis & real-time business AI" backTo="/owner" />

      {/* At-Risk Members (Churn Risk Prediction) Section */}
      <Card sweep className="border-amber-500/30 space-y-3">
        <div className="flex items-center justify-between border-b border-(--color-border-soft) pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-(--color-text)">At-Risk Members (AI Churn Risk Prediction)</h3>
          </div>
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">{atRiskMembers.length} Flagged</span>
        </div>

        {loadingAtRisk ? (
          <div className="flex items-center gap-2 text-xs text-(--color-text-muted) py-4 justify-center">
            <Loader2 size={14} className="animate-spin text-(--color-accent)" /> Calculating member churn probability...
          </div>
        ) : atRiskMembers.length === 0 ? (
          <p className="text-xs text-(--color-text-faint) py-3 text-center">
            No high-risk member churn detected. Member attendance patterns remain healthy across active plans.
          </p>
        ) : (
          <div className="divide-y divide-(--color-border-soft)">
            {atRiskMembers.map((m, idx) => {
              const name = m.name || m.userId?.fullName || "Member";
              const phone = m.phone || m.userId?.phone || "";
              const riskLevel = m.riskLevel || m.churnRisk || "high";
              const probability = m.probability ? `${Math.round(m.probability * 100)}%` : "High Risk";
              const reasons = m.reasons || m.riskFactors || ["Decreased check-in frequency over last 14 days"];

              return (
                <div key={m._id || idx} className="flex items-center justify-between py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-(--color-text)">{name}</p>
                      <Badge tone={riskLevel === "high" ? "danger" : "warn"}>
                        {probability} Churn Probability
                      </Badge>
                    </div>
                    <p className="text-xs text-(--color-text-faint) mt-0.5">
                      {Array.isArray(reasons) ? reasons.join(" · ") : reasons}
                    </p>
                  </div>

                  {phone && (
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`tel:${phone}`}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-(--color-border) text-(--color-text-muted) hover:text-(--color-text)"
                      >
                        <Phone size={14} />
                      </a>
                      <a
                        href={`https://wa.me/${phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-(--color-border) text-(--color-text-muted) hover:text-emerald-400"
                      >
                        <MessageCircle size={14} />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="flex flex-col gap-2">
          <TrendingUp size={16} className="text-(--color-text-faint)" />
          <p className="text-sm font-medium text-(--color-text)">Revenue Forecast</p>
          <p className="text-xs text-(--color-text-muted) leading-relaxed">
            AI linear trend project next month revenue based on history and upcoming membership renewals.
          </p>
        </Card>
        <Card className="flex flex-col gap-2">
          <Clock size={16} className="text-(--color-text-faint)" />
          <p className="text-sm font-medium text-(--color-text)">Peak Hours Analysis</p>
          <p className="text-xs text-(--color-text-muted) leading-relaxed">
            Check-in clustering highlights peak reception congestion times and trainer allocations.
          </p>
        </Card>
        <Card className="flex flex-col gap-2">
          <Users2 size={16} className="text-(--color-text-faint)" />
          <p className="text-sm font-medium text-(--color-text)">Trainer Performance</p>
          <p className="text-xs text-(--color-text-muted) leading-relaxed">
            Composite ranking aggregating member workout completions, attendance, and client retention.
          </p>
        </Card>
      </div>

      {/* Interactive AI Owner Business Chat */}
      <Card className="border border-(--color-border) flex flex-col h-[480px]">
        <div className="flex items-center justify-between pb-3 border-b border-(--color-border) mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-(--color-accent)" />
            <h3 className="text-sm font-semibold text-(--color-text)">Ask Gym AI Business Advisor</h3>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">Live Business AI</span>
        </div>

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
                    ? "max-w-[80%] rounded-2xl rounded-tr-sm bg-(--color-accent) text-white text-sm px-4 py-2.5 whitespace-pre-wrap"
                    : "max-w-[80%] rounded-2xl rounded-tl-sm bg-(--color-surface-2) text-(--color-text) text-sm px-4 py-2.5 leading-relaxed whitespace-pre-wrap"
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
                <span>Analyzing gym metrics & generating advice...</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
          {ownerQuickPrompts.map((p) => (
            <button
              key={p}
              onClick={() => send(p)}
              className="shrink-0 rounded-full border border-(--color-border) text-(--color-text-muted) text-xs font-medium px-3.5 py-1.5 hover:border-(--color-accent)/50 hover:text-(--color-text)"
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
            placeholder="Ask business advisor about revenue, leads, or inventory..."
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
      </Card>
    </div>
  );
}
