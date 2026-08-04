import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Search, Menu, LogOut, User, X } from "lucide-react";
import { gym } from "@/data/mock";

interface NavEntry {
  label: string;
  path: string;
  icon: string;
}

interface NotificationItem {
  id: string;
  title: string;
  time: string;
}

const defaultNotifications: NotificationItem[] = [
  { id: "n1", title: "3 memberships expiring this week", time: "2h ago" },
  { id: "n2", title: "New lead assigned to you", time: "5h ago" },
  { id: "n3", title: "Payment overdue for Aman Verma", time: "1d ago" },
];

export default function TopBar({
  greeting,
  subtitle,
  onMenuClick,
  avatarInitial = "D",
  navItems = [],
  roleLabel,
  onLogout,
}: {
  greeting: string;
  subtitle?: string;
  onMenuClick?: () => void;
  avatarInitial?: string;
  navItems?: NavEntry[];
  roleLabel?: string;
  onLogout?: () => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return navItems.filter((item) => item.label.toLowerCase().includes(q)).slice(0, 6);
  }, [query, navItems]);

  // Close any open dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function goTo(path: string) {
    navigate(path);
    setQuery("");
    setSearchOpen(false);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-(--color-border) bg-(--color-surface) backdrop-blur px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="md:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-(--color-border) text-(--color-text-muted)"
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-lg sm:text-xl font-semibold text-(--color-text) truncate">{greeting}</h1>
            {subtitle && <p className="text-xs sm:text-sm text-(--color-text-muted) mt-0.5">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Search */}
          <div ref={searchRef} className="relative hidden lg:block">
            <div className="flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface) px-3.5 py-2 text-sm text-(--color-text-muted) w-64 focus-within:text-(--color-text)">
              <Search size={15} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search pages..."
                className="w-full bg-transparent outline-none text-(--color-text) placeholder:text-(--color-text-muted)"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-(--color-text-muted)">
                  <X size={13} />
                </button>
              )}
            </div>
            {searchOpen && query.trim() && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-(--color-border) bg-(--color-surface) shadow-lg overflow-hidden z-30">
                {results.length === 0 ? (
                  <p className="px-3.5 py-3 text-xs text-(--color-text-muted)">No matching pages</p>
                ) : (
                  results.map((r) => (
                    <button
                      key={r.path}
                      onClick={() => goTo(r.path)}
                      className="w-full text-left px-3.5 py-2.5 text-sm text-(--color-text) hover:bg-(--color-surface-2)"
                    >
                      {r.label}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => {
                setNotifOpen((o) => !o);
                setProfileOpen(false);
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-(--color-border) bg-(--color-surface) text-(--color-text-muted)"
            >
              <Bell size={17} />
              <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-(--color-accent)" />
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-(--color-border) bg-(--color-surface) shadow-lg overflow-hidden z-30">
                <p className="px-4 py-3 text-xs font-semibold text-(--color-text-muted) border-b border-(--color-border)">
                  Notifications
                </p>
                {defaultNotifications.map((n) => (
                  <div key={n.id} className="px-4 py-3 border-b border-(--color-border-soft) last:border-0">
                    <p className="text-sm text-(--color-text)">{n.title}</p>
                    <p className="text-[11px] text-(--color-text-muted) mt-0.5">{n.time}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Profile */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => {
                setProfileOpen((o) => !o);
                setNotifOpen(false);
              }}
              className="hidden sm:flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface) pl-1 pr-3 py-1"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-(--color-accent) text-[11px] font-semibold text-white">
                {avatarInitial}
              </span>
              <span className="text-xs text-(--color-text-muted)">{gym.name}</span>
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-(--color-border) bg-(--color-surface) shadow-lg overflow-hidden z-30">
                {roleLabel && (
                  <p className="px-4 py-3 text-xs font-semibold text-(--color-text-muted) border-b border-(--color-border)">
                    {roleLabel}
                  </p>
                )}
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/member/profile");
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-(--color-text) hover:bg-(--color-surface-2)"
                >
                  <User size={15} /> View profile
                </button>
                {onLogout && (
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-(--color-danger) hover:bg-(--color-surface-2)"
                  >
                    <LogOut size={15} /> Log out
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
