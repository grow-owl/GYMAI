import { Phone, MessageCircle, ArrowRightCircle } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { leads, leadPipeline } from "@/data/mock";

export default function Leads() {
  return (
    <div>
      <PageHeader title="Leads & Trials" backTo="/reception" />
      <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-5">
        {leadPipeline.map((s) => (
          <Card key={s.stage} className="text-center py-4">
            <p className="font-display text-xl sm:text-2xl font-semibold text-(--color-text)">{s.count}</p>
            <p className="text-[11px] text-(--color-text-faint) mt-1 uppercase tracking-wide">{s.stage}</p>
          </Card>
        ))}
      </div>
      <div className="space-y-3">
        {leads.map((l) => (
          <Card key={l.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-(--color-text)">{l.name}</p>
              <p className="text-xs text-(--color-text-faint) mt-0.5">
                Interested: {l.interest} · Source: {l.source}
              </p>
              {l.trialDate && <p className="text-xs text-(--color-accent-text) mt-1">Trial: {l.trialDate}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button className="flex h-8 w-8 items-center justify-center rounded-full border border-(--color-border) text-(--color-text-muted)">
                <Phone size={14} />
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded-full border border-(--color-border) text-(--color-text-muted)">
                <MessageCircle size={14} />
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded-full bg-(--color-accent) text-white">
                <ArrowRightCircle size={14} />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
