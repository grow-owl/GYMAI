import { useState, useEffect } from "react";
import { CheckCircle2, Shield, Zap, Mail, PhoneCall } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { paymentApi } from "@/lib/endpoints";
import { toast } from "sonner";

const plans = [
  {
    id: "starter",
    name: "Starter Gym",
    price: "₹2,499",
    period: "/month",
    features: ["Up to 150 Active Members", "1 Branch Support", "QR Check-in System", "Basic Reports"],
    popular: false,
  },
  {
    id: "pro",
    name: "Pro AI SaaS",
    price: "₹4,999",
    period: "/month",
    features: [
      "Unlimited Members & Trainers",
      "Up to 3 Gym Branches",
      "AI Coach & Supplement Upsell Engine",
      "Lead CRM & WhatsApp Integration",
      "POS Store & Inventory System",
    ],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise Chain",
    price: "₹9,999",
    period: "/month",
    features: [
      "Unlimited Branches & Franchises",
      "Dedicated AI Business Advisor",
      "Custom Brand White-Labeling",
      "24/7 Priority Support & Setup",
    ],
    popular: false,
  },
];

export default function Billing() {
  const [currentPlan, setCurrentPlan] = useState("pro");
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<any | null>(null);

  useEffect(() => {
    paymentApi
      .getPlatformBilling()
      .then((res) => {
        if (res?.plan) setCurrentPlan(res.plan.toLowerCase());
      })
      .catch(() => {});
  }, []);

  const handleOpenUpgradeModal = (plan: any) => {
    setSelectedPlanForUpgrade(plan);
  };

  const handleConfirmRequest = () => {
    toast.success(`Upgrade request for ${selectedPlanForUpgrade?.name} submitted! Super Admin will contact you for offline invoice processing.`);
    setSelectedPlanForUpgrade(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Platform Subscription & Billing"
        subtitle="Manage your Gym AI SaaS tier and billing plan"
        backTo="/owner"
      />

      <Card sweep className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-(--color-text-muted) mb-1">Active SaaS Plan</p>
            <p className="text-2xl font-bold text-(--color-text) capitalize flex items-center gap-2">
              {currentPlan} Plan <Badge tone="good">Active</Badge>
            </p>
            <p className="text-xs text-(--color-text-faint) mt-1">Manual offline billing · Admin recorded</p>
          </div>
          <div className="p-3 rounded-full bg-(--color-accent-soft) text-(--color-accent-text)">
            <Shield size={24} />
          </div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-3 gap-4">
        {plans.map((p) => (
          <Card
            key={p.id}
            className={`flex flex-col justify-between p-5 ${
              p.popular ? "border-2 border-(--color-accent) shadow-lg" : ""
            }`}
          >
            <div>
              {p.popular && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-(--color-accent) text-white inline-block mb-2">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-bold text-(--color-text)">{p.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-(--color-text)">{p.price}</span>
                <span className="text-xs text-(--color-text-faint)">{p.period}</span>
              </div>
              <ul className="mt-4 space-y-2 text-xs text-(--color-text-muted)">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              disabled={currentPlan === p.id}
              onClick={() => handleOpenUpgradeModal(p)}
              className={`mt-6 w-full py-2.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                currentPlan === p.id
                  ? "bg-(--color-surface-3) text-(--color-text-muted) cursor-default"
                  : "bg-(--color-accent) text-white hover:opacity-90 shadow-md"
              }`}
            >
              {currentPlan === p.id ? (
                "Current Active Plan"
              ) : (
                <>
                  <Zap size={14} /> Request Upgrade
                </>
              )}
            </button>
          </Card>
        ))}
      </div>

      {/* Offline Upgrade Request Guidance Modal */}
      {selectedPlanForUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 w-full max-w-md space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="text-(--color-accent)" size={20} />
              <h3 className="text-base font-semibold text-(--color-text)">
                Upgrade to {selectedPlanForUpgrade.name} ({selectedPlanForUpgrade.price})
              </h3>
            </div>

            <p className="text-xs text-(--color-text-muted) leading-relaxed">
              SaaS platform subscriptions run on <strong>Manual/Offline Payment Entry</strong> (Cash, UPI, Bank Transfer). Payment gateway is disabled in production.
            </p>

            <div className="p-3 rounded-xl bg-(--color-surface-2) space-y-2 text-xs text-(--color-text-muted)">
              <p className="font-semibold text-(--color-text)">How to Upgrade:</p>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-(--color-accent)" />
                <span>Contact Super Admin: <strong>admin@gymsaas.com</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <PhoneCall size={14} className="text-(--color-accent)" />
                <span>Phone / UPI Support: <strong>+91 98765 43210</strong></span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPlanForUpgrade(null)}
                className="px-4 py-2 text-xs font-medium text-(--color-text-muted)"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleConfirmRequest}
                className="px-4 py-2 text-xs font-medium rounded-full bg-(--color-accent) text-white"
              >
                Submit Upgrade Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
