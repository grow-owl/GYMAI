import { useState } from "react";
import { Settings as SettingsIcon, Save, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useFormValidation } from "@/lib/useFormValidation";

const STORAGE_KEY = "gymai.admin_settings";

const defaultAdminSettings = {
  supportEmail: "support@gymai-saas.com",
  defaultTrialDays: 14,
  platformCurrency: "INR",
  maintenanceMode: false,
  whatsappAlertsEnabled: true,
};

export default function AdminSettings() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const getInitialSettings = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultAdminSettings;
  };

  const initial = getInitialSettings();

  const { values, errors, touched, handleChange, handleBlur, validateAll } = useFormValidation(
    {
      supportEmail: initial.supportEmail,
      defaultTrialDays: initial.defaultTrialDays,
      platformCurrency: initial.platformCurrency,
      maintenanceMode: initial.maintenanceMode,
      whatsappAlertsEnabled: initial.whatsappAlertsEnabled,
    },
    {
      supportEmail: { required: "Support email is required", email: "Enter a valid email" },
      defaultTrialDays: { required: "Trial period days is required" },
    }
  );

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;

    const updated = {
      supportEmail: values.supportEmail,
      defaultTrialDays: Number(values.defaultTrialDays),
      platformCurrency: values.platformCurrency,
      maintenanceMode: values.maintenanceMode,
      whatsappAlertsEnabled: values.whatsappAlertsEnabled,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    setToastMessage("SaaS Platform settings updated successfully!");
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--color-text) flex items-center gap-2">
          <SettingsIcon className="text-(--color-accent)" size={26} /> SaaS Platform Control & Settings
        </h1>
        <p className="text-sm text-(--color-text-muted)">
          Global environment parameters, system maintenance flags, and trial configurations for Gym AI SaaS.
        </p>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 size={20} />
          <span>{toastMessage}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="p-6 rounded-2xl border border-(--color-border) bg-(--color-surface) space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-(--color-text)">Global SaaS Platform Parameters</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-(--color-text-muted) mb-1">
                Platform Support Email
              </label>
              <input
                type="email"
                value={values.supportEmail}
                onChange={(e) => handleChange("supportEmail", e.target.value)}
                onBlur={() => handleBlur("supportEmail")}
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-(--color-surface) text-sm text-(--color-text) outline-none focus:border-(--color-accent) ${
                  touched.supportEmail && errors.supportEmail ? "border-rose-500" : "border-(--color-border)"
                }`}
              />
              {touched.supportEmail && errors.supportEmail && (
                <p className="text-xs text-rose-400 mt-1">{errors.supportEmail}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-(--color-text-muted) mb-1">
                Default Trial Period (Days)
              </label>
              <input
                type="number"
                value={values.defaultTrialDays}
                onChange={(e) => handleChange("defaultTrialDays", e.target.value)}
                onBlur={() => handleBlur("defaultTrialDays")}
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-(--color-surface) text-sm text-(--color-text) outline-none focus:border-(--color-accent) ${
                  touched.defaultTrialDays && errors.defaultTrialDays ? "border-rose-500" : "border-(--color-border)"
                }`}
              />
              {touched.defaultTrialDays && errors.defaultTrialDays && (
                <p className="text-xs text-rose-400 mt-1">{errors.defaultTrialDays}</p>
              )}
            </div>
          </div>
        </div>

        {/* Feature Switches */}
        <div className="p-6 rounded-2xl border border-(--color-border) bg-(--color-surface) space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-(--color-text)">System Flags & Notifications</h2>

          <div className="flex items-center justify-between py-2 border-b border-(--color-border)">
            <div>
              <p className="text-sm font-semibold text-(--color-text)">Automated WhatsApp Notifications</p>
              <p className="text-xs text-(--color-text-muted)">
                Dispatch member welcome, renewal, and attendance alerts via WhatsApp Cloud API.
              </p>
            </div>
            <input
              type="checkbox"
              checked={values.whatsappAlertsEnabled}
              onChange={(e) => handleChange("whatsappAlertsEnabled", e.target.checked)}
              className="h-5 w-5 rounded accent-(--color-accent) cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-semibold text-rose-400 flex items-center gap-1.5">
                <ShieldAlert size={16} /> Platform Maintenance Mode
              </p>
              <p className="text-xs text-(--color-text-muted)">
                Temporarily restrict tenant access for scheduled core database maintenance.
              </p>
            </div>
            <input
              type="checkbox"
              checked={values.maintenanceMode}
              onChange={(e) => handleChange("maintenanceMode", e.target.checked)}
              className="h-5 w-5 rounded accent-rose-500 cursor-pointer"
            />
          </div>
        </div>

        <button
          type="submit"
          className="flex items-center justify-center gap-2 px-6 py-3 bg-(--color-accent) text-white font-semibold text-sm rounded-xl hover:bg-(--color-accent-strong) shadow-lg shadow-(--color-accent-soft) transition-all"
        >
          <Save size={18} /> Save Settings
        </button>
      </form>
    </div>
  );
}
