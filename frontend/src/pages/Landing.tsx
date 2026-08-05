import { Link } from "react-router-dom";
import {
  Dumbbell,
  ArrowRight,
  Sparkles,
  Users,
  CreditCard,
  QrCode,
  BarChart3,
  HeartPulse,
  ShieldCheck,
  Check,
  ScanLine,
  ClipboardList,
  LineChart,
  UserCog,
} from "lucide-react";
import heroImg from "@/assets/hero-gym.png";

const steps = [
  {
    n: "01",
    title: "Check in",
    desc: "Members scan the live QR code at the front desk to check in — and again on the way out.",
    icon: ScanLine,
  },
  {
    n: "02",
    title: "Train",
    desc: "Trainers hand out AI-generated workout & diet plans members can follow straight from their phone.",
    icon: Dumbbell,
  },
  {
    n: "03",
    title: "Track",
    desc: "Owners watch attendance, renewals and revenue update live — no spreadsheet, no guesswork.",
    icon: LineChart,
  },
];

const features = [
  {
    icon: Users,
    tone: "blue",
    title: "Owner dashboard",
    desc: "Every member, every branch, active vs inactive, and membership expiries — on one screen.",
  },
  {
    icon: Sparkles,
    tone: "pink",
    title: "AI coach & insights",
    desc: "Auto-generated workout & diet plans, plus churn-risk and revenue insights your team can act on.",
  },
  {
    icon: QrCode,
    tone: "green",
    title: "Check-in & attendance",
    desc: "QR check-in at the front desk, live attendance tracking, and streaks that keep members coming back.",
  },
  {
    icon: CreditCard,
    tone: "orange",
    title: "Payments & leads",
    desc: "Collect payments, chase renewals, and convert trial leads without leaving the dashboard.",
  },
  {
    icon: BarChart3,
    tone: "purple",
    title: "Reports that matter",
    desc: "Attendance history, revenue and retention trends — exportable whenever you need them.",
  },
  {
    icon: HeartPulse,
    tone: "teal",
    title: "Recovery alerts",
    desc: "Flag members at risk of injury or drop-off so trainers can step in before it's too late.",
  },
];

const roleCards = [
  {
    label: "Owners",
    tone: "blue",
    icon: UserCog,
    points: [
      "See every member and their status at a glance",
      "Track membership expiry and record payments",
      "Add trainers and reception staff in seconds",
    ],
  },
  {
    label: "Trainers",
    tone: "purple",
    icon: Dumbbell,
    points: [
      "View only the members assigned to you",
      "Build workout plans day by day",
      "Create diet plans with per-meal breakdowns",
    ],
  },
  {
    label: "Members",
    tone: "orange",
    icon: ClipboardList,
    points: [
      "Check in and out with a QR scan",
      "See today's workout and diet plan",
      "Log progress and build a streak",
    ],
  },
];

import { landingPlans as plans } from "@/data/pricing";

const toneBg: Record<string, string> = {
  blue: "bg-(--tone-blue)",
  pink: "bg-(--tone-pink)",
  green: "bg-(--tone-green)",
  orange: "bg-(--tone-orange)",
  purple: "bg-(--tone-purple)",
  teal: "bg-(--tone-teal)",
};

export default function Landing() {
  return (
    <div className="relative z-10 min-h-screen bg-(--color-surface)">
      {/* Navbar — clean white bar, sits above the dark hero */}
      <header className="sticky top-0 z-30 border-b border-(--color-border) bg-(--color-surface)/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 sm:px-10 py-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-2.5 animate-fade-in">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-(--color-accent) text-(--color-navbar) shadow-md">
              <Dumbbell size={18} strokeWidth={2.5} />
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-(--color-text)">GYMAI</span>
          </div>
          <nav className="hidden sm:flex items-center gap-7 animate-fade-in">
            <a href="#features" className="text-sm font-medium text-(--color-text-muted) hover:text-(--color-text) transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-(--color-text-muted) hover:text-(--color-text) transition-colors">
              How it works
            </a>
            <a href="#pricing" className="text-sm font-medium text-(--color-text-muted) hover:text-(--color-text) transition-colors">
              Pricing
            </a>
            <Link to="/login" className="text-sm font-medium text-(--color-text-muted) hover:text-(--color-text) transition-colors">
              Sign in
            </Link>
          </nav>
          <Link
            to="/register"
            className="btn-press text-sm font-semibold text-(--color-navbar) bg-(--color-accent) hover:bg-(--color-accent-strong) hover:shadow-[0_10px_30px_-8px_var(--color-accent-soft)] rounded-xl px-4 py-2.5 transition-all animate-fade-in"
          >
            Start Free Trial
          </Link>
        </div>
      </header>

      {/* Hero — dark, image-backed, motivational */}
      <section className="relative overflow-hidden bg-(--color-navbar)">
        <img
          src={heroImg}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 h-full w-full sm:w-3/4 lg:w-3/5 object-cover object-[75%_30%] opacity-90"
        />
        {/* Gradient scrim: solid navy on the left where the copy sits, fading out over the photo */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, #14213D 0%, #14213D 42%, rgba(20,33,61,0.85) 55%, rgba(20,33,61,0.35) 72%, transparent 88%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "34px 34px",
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6 sm:px-10 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 mb-6 animate-fade-in-up">
              <Sparkles size={13} className="text-(--color-accent)" />
              <span className="text-xs font-semibold tracking-[0.15em] uppercase text-white/80">
                A new way to gym
              </span>
            </div>

            <h1
              className="font-display text-4xl sm:text-5xl lg:text-[3.4rem] font-bold uppercase leading-[1.05] text-white animate-fade-in-up stagger-item"
              style={{ ["--stagger-i" as string]: 1 }}
            >
              Train harder.
              <br />
              Manage <span className="text-(--color-accent)">smarter.</span>
            </h1>

            <p
              className="mt-5 text-base sm:text-lg text-white/70 max-w-md leading-relaxed animate-fade-in-up stagger-item"
              style={{ ["--stagger-i" as string]: 2 }}
            >
              GYMAI replaces the register, the spreadsheet and the WhatsApp groups with one AI-powered dashboard for
              owners, trainers and members — so your gym runs itself, and your members actually show up.
            </p>

            <div
              className="mt-8 flex flex-wrap items-center gap-3 animate-fade-in-up stagger-item"
              style={{ ["--stagger-i" as string]: 3 }}
            >
              <Link
                to="/register"
                className="btn-press flex items-center gap-2 rounded-xl bg-(--color-accent) hover:bg-(--color-accent-strong) hover:shadow-[0_10px_30px_-8px_var(--color-accent-soft)] text-(--color-navbar) font-semibold text-sm px-6 py-3.5 transition-all"
              >
                Start 1-week free trial <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                className="btn-press flex items-center gap-2 rounded-xl border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm px-6 py-3.5 transition-all"
              >
                Sign in
              </Link>
            </div>
            <p
              className="mt-3 text-xs text-white/50 animate-fade-in-up stagger-item"
              style={{ ["--stagger-i" as string]: 4 }}
            >
              No card required. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 sm:px-10 py-20">
        <p className="text-xs font-semibold tracking-wide uppercase text-(--color-accent-text) mb-2">How it works</p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-(--color-text) mb-10">
          Three steps, one loop.
        </h2>
        <div className="grid sm:grid-cols-3 gap-8 sm:gap-6">
          {steps.map(({ n, title, desc, icon: Icon }, i) => (
            <div key={n} className="animate-fade-in-up stagger-item" style={{ ["--stagger-i" as string]: i }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-(--color-accent-soft) text-(--color-accent-text)">
                  <Icon size={17} strokeWidth={2.25} />
                </span>
                <span className="font-mono text-xs font-semibold text-(--color-text-faint)">{n}</span>
              </div>
              <p className="font-display text-lg font-bold text-(--color-text)">{title}</p>
              <p className="text-sm text-(--color-text-muted) mt-1.5 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-(--color-surface-2) border-y border-(--color-border-soft)">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-20">
          <p className="text-xs font-semibold tracking-wide uppercase text-(--color-accent-text) mb-2">Everything included</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-(--color-text) mb-10">
            Built for the whole gym floor.
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(({ icon: Icon, tone, title, desc }, i) => (
              <div
                key={title}
                data-tone={tone}
                className="glow-hover card-hover rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-5 animate-fade-in-up stagger-item"
                style={{ ["--stagger-i" as string]: i }}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-white mb-4 ${toneBg[tone]}`}
                >
                  <Icon size={18} strokeWidth={2.25} />
                </span>
                <p className="font-display text-base font-semibold text-(--color-text)">{title}</p>
                <p className="text-sm text-(--color-text-muted) mt-1.5 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="max-w-6xl mx-auto px-6 sm:px-10 py-20">
        <p className="text-xs font-semibold tracking-wide uppercase text-(--color-accent-text) mb-2">One login, every role</p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-(--color-text) mb-10">
          Built for everyone in the gym.
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {roleCards.map(({ label, tone, icon: Icon, points }, i) => (
            <div
              key={label}
              className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-5 animate-fade-in-up stagger-item"
              style={{ ["--stagger-i" as string]: i }}
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-white mb-4 ${toneBg[tone]}`}>
                <Icon size={18} strokeWidth={2.25} />
              </span>
              <p className="font-display text-xs font-bold tracking-wide uppercase text-(--color-text)">{label}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-(--color-text-muted) leading-snug">
                    <Check size={14} className="text-(--color-good) shrink-0 mt-0.5" /> {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-(--color-surface-2) border-y border-(--color-border-soft)">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-20">
          <p className="text-xs font-semibold tracking-wide uppercase text-(--color-accent-text) mb-2">Simple pricing</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-(--color-text) mb-10">
            One app for your whole gym. Pick a plan.
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan, i) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-(--radius-card) border p-5 animate-fade-in-up stagger-item ${
                  plan.popular
                    ? "border-(--color-accent) bg-(--color-surface) shadow-lg"
                    : "border-(--color-border) bg-(--color-surface)"
                }`}
                style={{ ["--stagger-i" as string]: i }}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-5 rounded-full bg-(--color-accent) text-(--color-navbar) text-[10px] font-bold tracking-wide uppercase px-2.5 py-1">
                    Popular
                  </span>
                )}
                <p className="text-xs font-semibold tracking-wide uppercase text-(--color-text-faint)">{plan.name}</p>
                <p className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-2xl font-bold text-(--color-text)">{plan.price}</span>
                  {plan.period && <span className="text-xs text-(--color-text-faint)">{plan.period}</span>}
                </p>
                {plan.sub && <p className="text-xs text-(--color-text-faint) mt-1">{plan.sub}</p>}
                <ul className="mt-4 flex flex-col gap-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-(--color-text-muted) leading-snug">
                      <Check size={14} className="text-(--color-good) shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`mt-5 text-center rounded-xl text-sm font-semibold py-2.5 transition-colors ${
                    plan.tone === "accent"
                      ? "bg-(--color-accent) hover:bg-(--color-accent-strong) text-(--color-navbar)"
                      : "bg-(--color-surface-3) hover:bg-(--color-border) text-(--color-text)"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section id="trust" className="max-w-4xl mx-auto px-6 sm:px-10 py-20">
        <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-(--color-accent-soft) text-(--color-accent-text)">
            <ShieldCheck size={22} />
          </span>
          <div className="flex-1">
            <p className="font-display text-base font-semibold text-(--color-text)">
              Role-based access, built in.
            </p>
            <p className="text-sm text-(--color-text-muted) mt-1 leading-relaxed">
              Every dashboard is only visible to its own signed-in account — owners, trainers, reception and members
              each see exactly what they need, nothing more.
            </p>
          </div>
          <ul className="flex flex-col gap-1.5 text-sm text-(--color-text-muted) shrink-0">
            {["Secure sign in", "Per-role dashboards", "No shared logins"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check size={14} className="text-(--color-good)" /> {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-(--color-navbar) border-t border-(--color-navbar-border)">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 py-20 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase text-white">
            Run your gym from one screen.
          </h2>
          <p className="text-white/60 mt-3 max-w-lg mx-auto leading-relaxed">
            Set up your gym in a couple of minutes and start checking members in today.
          </p>
          <Link
            to="/register"
            className="btn-press mt-8 inline-flex items-center gap-2 rounded-xl bg-(--color-accent) hover:bg-(--color-accent-strong) hover:shadow-[0_10px_30px_-8px_var(--color-accent-soft)] text-(--color-navbar) font-semibold text-sm px-6 py-3.5 transition-all"
          >
            Start 1-week free trial <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer — dark navy/black bar, yellow accent, gray text */}
      <footer className="border-t border-(--color-navbar-border) bg-(--color-navbar)">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-8">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-(--color-accent) text-(--color-navbar) shadow-md">
                  <Dumbbell size={18} strokeWidth={2.5} />
                </span>
                <span className="font-display text-lg font-semibold text-(--color-navbar-text)">GYMAI</span>
              </div>
              <p className="text-sm text-(--color-navbar-text-muted) mt-3 leading-relaxed">
                AI-powered gym management for owners, trainers, reception and members — one dashboard, every role.
              </p>
            </div>

            <div className="flex flex-wrap gap-10">
              <div>
                <p className="text-xs font-semibold tracking-wide uppercase text-(--color-accent) mb-3">Product</p>
                <ul className="flex flex-col gap-2 text-sm text-(--color-navbar-text-muted)">
                  <li><a href="#features" className="hover:text-(--color-navbar-text) transition-colors">Features</a></li>
                  <li><a href="#how-it-works" className="hover:text-(--color-navbar-text) transition-colors">How it works</a></li>
                  <li><a href="#pricing" className="hover:text-(--color-navbar-text) transition-colors">Pricing</a></li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide uppercase text-(--color-accent) mb-3">Account</p>
                <ul className="flex flex-col gap-2 text-sm text-(--color-navbar-text-muted)">
                  <li><Link to="/login" className="hover:text-(--color-navbar-text) transition-colors">Sign in</Link></li>
                  <li><Link to="/register" className="hover:text-(--color-navbar-text) transition-colors">Start free trial</Link></li>
                  <li><Link to="/roles" className="hover:text-(--color-navbar-text) transition-colors">Explore demo</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-(--color-navbar-border) flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-(--color-navbar-text-muted)">
            <span>© {new Date().getFullYear()} GYMAI. Not just attendance.</span>
            <span>Owner accounts require an invite code — ask your GYMAI admin.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}