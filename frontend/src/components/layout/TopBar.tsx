import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, Search, Menu, LogOut, User, X, Check, CheckCheck, ExternalLink } from "lucide-react";
import { gym } from "@/data/mock";
import { notificationApi } from "@/lib/endpoints";
import type { INotificationItem } from "@/lib/endpoints";
import { toast } from "sonner";

interface NavEntry {
  label: string;
  path: string;
  icon: string;
}

const defaultNotifications: INotificationItem[] = [
  {
    _id: "n1",
    title: "3 memberships expiring this week",
    body: "Memberships for Aman Verma, Priya Sharma, and Rohan Gupta are expiring.",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    _id: "n2",
    title: "New lead assigned to you",
    body: "Sunita Rao requested a trial pass.",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    _id: "n3",
    title: "Payment overdue for Aman Verma",
    body: "Monthly fee payment is 5 days overdue.",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

const READ_KEY = "gymai.read_notifications";

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadId(id: string) {
  try {
    const set = getReadIds();
    set.add(id);
    localStorage.setItem(READ_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

function saveAllReadIds(ids: string[]) {
  try {
    const set = getReadIds();
    ids.forEach((id) => set.add(id));
    localStorage.setItem(READ_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

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
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [notifications, setNotifications] = useState<INotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Determine current role base path
  const notificationPath = useMemo(() => {
    if (location.pathname.startsWith("/owner")) return "/owner/notifications";
    if (location.pathname.startsWith("/trainer")) return "/trainer/notifications";
    if (location.pathname.startsWith("/reception")) return "/reception/notifications";
    if (location.pathname.startsWith("/member")) return "/member/notifications";
    return "/owner/notifications";
  }, [location.pathname]);

  const loadNotifications = useCallback(async () => {
    const readSet = getReadIds();

    try {
      const [listRes, countRes] = await Promise.all([
        notificationApi.list({ limit: 5 }),
        notificationApi.getUnreadCount(),
      ]);

      const rawList = listRes?.notifications || (Array.isArray(listRes as any) ? (listRes as any) : []);
      const baseList = rawList && rawList.length > 0 ? rawList : defaultNotifications;
      
      const processedList = baseList.map((n) =>
        readSet.has(n._id || n.id || "") ? { ...n, isRead: true } : n
      );

      setNotifications(processedList);

      const realUnread = processedList.filter((n) => !n.isRead).length;
      if (countRes?.unreadCount !== undefined && rawList.length > 0) {
        setUnreadCount(Math.min(countRes.unreadCount, realUnread));
      } else {
        setUnreadCount(realUnread);
      }
    } catch {
      const processedList = defaultNotifications.map((n) =>
        readSet.has(n._id || n.id || "") ? { ...n, isRead: true } : n
      );
      setNotifications(processedList);
      setUnreadCount(processedList.filter((n) => !n.isRead).length);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    const handleSync = () => {
      loadNotifications();
    };

    window.addEventListener("gymai-notifications-updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("gymai-notifications-updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [loadNotifications]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveReadId(id);
    try {
      await notificationApi.markAsRead(id);
    } catch {
      // ignore
    }
    toast.success("Marked as read");
    setNotifications((prev) =>
      prev.map((n) => (n._id === id || n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    window.dispatchEvent(new CustomEvent("gymai-notifications-updated"));
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ids = notifications.map((n) => n._id || n.id || "");
    saveAllReadIds(ids);
    try {
      await notificationApi.markAllAsRead();
    } catch {
      // ignore
    }
    toast.success("All notifications marked as read");
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    window.dispatchEvent(new CustomEvent("gymai-notifications-updated"));
  };

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

          {/* Notifications Dropdown */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => {
                setNotifOpen((o) => !o);
                setProfileOpen(false);
              }}
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-(--color-border) bg-(--color-surface) text-(--color-text-muted) hover:text-(--color-text) transition-colors"
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-(--color-accent) text-[10px] font-bold text-white shadow-xs animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-(--color-border) bg-(--color-surface) shadow-xl overflow-hidden z-30 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border) bg-(--color-surface-2)/50">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-(--color-text)">Notifications</p>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-(--color-accent-soft) text-(--color-accent-text)">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[11px] font-medium text-(--color-accent) hover:underline inline-flex items-center gap-1"
                    >
                      <CheckCheck size={12} /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-(--color-border-soft)">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-(--color-text-muted)">No notifications</p>
                  ) : (
                    notifications.map((n) => {
                      const id = n._id || n.id || "";
                      return (
                        <div
                          key={id}
                          onClick={() => {
                            setNotifOpen(false);
                            navigate(notificationPath);
                          }}
                          className={`group px-4 py-3 cursor-pointer transition-colors flex items-start justify-between gap-2 ${
                            !n.isRead ? "bg-(--color-accent-soft)/15 hover:bg-(--color-accent-soft)/25" : "hover:bg-(--color-surface-2)"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {!n.isRead && (
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--color-accent)" />
                              )}
                              <p className="text-xs font-medium text-(--color-text) truncate">{n.title}</p>
                            </div>
                            <p className="text-[11px] text-(--color-text-muted) line-clamp-2 mt-0.5">
                              {n.body}
                            </p>
                          </div>
                          {!n.isRead && (
                            <button
                              onClick={(e) => handleMarkAsRead(id, e)}
                              title="Mark as read"
                              className="shrink-0 opacity-80 group-hover:opacity-100 p-1 rounded-full hover:bg-(--color-surface-3) text-(--color-text-muted) hover:text-(--color-accent)"
                            >
                              <Check size={13} />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-2 border-t border-(--color-border) bg-(--color-surface-2)/40 text-center">
                  <button
                    onClick={() => {
                      setNotifOpen(false);
                      navigate(notificationPath);
                    }}
                    className="w-full py-2 text-xs font-semibold text-(--color-accent) hover:bg-(--color-accent-soft)/20 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    View All Notifications <ExternalLink size={12} />
                  </button>
                </div>
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
