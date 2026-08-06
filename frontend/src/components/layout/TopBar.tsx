import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, Search, Menu, LogOut, User, X, Check, CheckCheck, ExternalLink, Building2 } from "lucide-react";
import { notificationApi, gymApi } from "@/lib/endpoints";
import type { INotificationItem } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { useSearchStore } from "../../store/searchStore";
import CustomSelect from "@/components/ui/CustomSelect";
import { toast } from "sonner";

interface NavEntry {
  label: string;
  path: string;
  icon: string;
}

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
  const user = useAuthStore((s) => s.user);

  // Only show search bar on the owner dashboard (index route)
  const isDashboard = location.pathname === "/owner" || location.pathname === "/owner/";

  const { searchQuery, setSearchQuery } = useSearchStore();
  const query = searchQuery;
  const setQuery = setSearchQuery;

  useEffect(() => {
    setQuery("");
  }, [location.pathname]);

  const placeholderText = useMemo(() => {
    const path = location.pathname;
    if (path.includes("/members") || path.includes("/search")) return "Search members by name...";
    if (path.includes("/trainers")) return "Search trainers by name...";
    if (path.includes("/payments")) return "Search payments by ID or detail...";
    if (path.includes("/leads")) return "Search leads by name or status...";
    if (path.includes("/inventory")) return "Search products by name...";
    if (path.includes("/expenses")) return "Search expenses by title...";
    if (path.includes("/equipment")) return "Search machines by name...";
    return "Search pages...";
  }, [location.pathname]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [notifications, setNotifications] = useState<INotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Branch Switcher state
  const [branches, setBranches] = useState<any[]>([]);
  const storageKey = user?._id ? `gymai.selected_branch_id.${user._id}` : 'gymai.selected_branch_id';
  const branchesKey = user?._id ? `gymai.branches_list.${user._id}` : 'gymai.branches_list';
  const [activeBranchId, setActiveBranchId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return stored;
    } catch {}
    return user?.branchId || "";
  });

  useEffect(() => {
    if (user?.branchId && (!activeBranchId || activeBranchId === "65a000000000000000000002")) {
      setActiveBranchId(user.branchId);
    }
  }, [user?.branchId, activeBranchId]);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const fetchBranches = useCallback(async () => {
    try {
      const storedLocal = localStorage.getItem(branchesKey);
      if (storedLocal) {
        const parsed = JSON.parse(storedLocal);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBranches(parsed);
          return;
        }
      }
    } catch {}

    const gymId = user?.gymId || "";
    const userBranchId = user?.branchId || "";
    const userBranchName = user?.branchName || (user?.gymName ? `${user.gymName} Branch` : "");

    if (user?.role === "MEMBER" && userBranchId) {
      setBranches([{ _id: userBranchId, name: userBranchName || "My Branch" }]);
      return;
    }

    if (!gymId) {
      if (userBranchId) {
        setBranches([{ _id: userBranchId, name: userBranchName || "My Branch" }]);
      }
      return;
    }
    try {
      const res = await gymApi.listBranches(gymId);
      const bList = Array.isArray(res) ? res : res?.branches || [];
      if (bList.length > 0) {
        setBranches(bList);
      } else if (userBranchId) {
        setBranches([{ _id: userBranchId, name: userBranchName || "My Branch" }]);
      }
    } catch {
      if (userBranchId) {
        setBranches([{ _id: userBranchId, name: userBranchName || "My Branch" }]);
      }
    }
  }, [user?.gymId, user?.branchId, user?.branchName, user?.gymName, branchesKey]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const activeBranch = useMemo(() => {
    if (activeBranchId && branches.length > 0) {
      const found = branches.find((b) => (b._id || b.id) === activeBranchId);
      if (found) return found;
    }
    if (user?.branchName) {
      return { _id: user.branchId || "default", name: user.branchName };
    }
    return branches[0] || null;
  }, [branches, activeBranchId, user?.branchName, user?.branchId]);

  const handleSelectBranch = (bId: string) => {
    const storageKey = user?._id ? `gymai.selected_branch_id.${user._id}` : 'gymai.selected_branch_id';
    setActiveBranchId(bId);
    try {
      localStorage.setItem(storageKey, bId);
    } catch {}
    const chosen = branches.find((b) => (b._id || b.id) === bId);
    toast.success(`Switched active branch view to: ${chosen?.name || "Selected Branch"}`);
    window.dispatchEvent(new CustomEvent("gymai-branch-changed"));
  };

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
      const baseList = rawList || [];
      
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
      setNotifications([]);
      setUnreadCount(0);
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
    <header className="sticky top-0 z-20 border-b border-(--color-border) bg-(--color-surface) backdrop-blur px-3 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            onClick={onMenuClick}
            className="md:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-(--color-border) text-(--color-text-muted) hover:text-(--color-text) hover:bg-(--color-surface-2) transition-all hover:scale-105"
          >
            <Menu size={18} className="icon-hover-pop" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-base sm:text-xl font-semibold text-(--color-text) truncate">{greeting}</h1>
            {subtitle && (
              <p className="text-xs text-(--color-text-muted) mt-0.5 truncate hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Branch Selector or Member Branch Display */}
          {user?.role === "MEMBER" ? (
            activeBranch?.name ? (
              <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-(--color-border) bg-(--color-surface-2) text-xs font-medium text-(--color-text) shrink-0 max-w-[130px] sm:max-w-none">
                <Building2 size={14} className="text-(--color-accent) shrink-0" />
                <span className="truncate">{activeBranch.name}</span>
              </div>
            ) : null
          ) : (
            branches.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-(--color-border) bg-(--color-surface-2) text-xs font-medium text-(--color-text) hover:border-(--color-accent) transition-all shrink-0 max-w-[160px] sm:max-w-none">
                <Building2 size={14} className="text-(--color-accent) shrink-0 icon-hover-pop" />
                <CustomSelect
                  compact
                  value={activeBranchId || (branches[0]?._id || branches[0]?.id)}
                  onChange={handleSelectBranch}
                  options={branches.map((b) => ({
                    value: b._id || b.id,
                    label: `${b.name}${b.city ? ` (${b.city})` : ""}`,
                  }))}
                />
              </div>
            )
          )}

          {/* Search — visible only on Dashboard */}
          {isDashboard && (
            <div ref={searchRef} className="relative hidden lg:block">
              <div className="flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface) px-3.5 py-2 text-sm text-(--color-text-muted) w-64 focus-within:text-(--color-text) focus-within:border-(--color-accent) focus-within:shadow-sm transition-all">
                <Search size={15} className="icon-hover-pop" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setSearchOpen(true)}
                  placeholder={placeholderText}
                  className="w-full bg-transparent text-(--color-text) placeholder:text-(--color-text-muted)"
                  style={{ outline: "none" }}
                />
                {query && (
                  <button onClick={() => setQuery("")} className="text-(--color-text-muted) hover:text-(--color-text)">
                    <X size={13} />
                  </button>
                )}
              </div>

              {searchOpen && query.trim() && (
                <div className="absolute left-0 top-full mt-1.5 w-64 z-[9999] rounded-xl border border-(--color-border) bg-(--color-surface) shadow-lg overflow-hidden animate-fade-in">
                  {results.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-(--color-text-muted)">No matching pages found</p>
                  ) : (
                    results.map((r) => (
                      <button
                        key={r.path}
                        onClick={() => goTo(r.path)}
                        className="w-full text-left px-4 py-2.5 text-sm text-(--color-text) hover:bg-(--color-surface-2) hover:text-(--color-accent-text) transition-colors border-b border-(--color-border-soft) last:border-0"
                      >
                        {r.label}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notifications Dropdown */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => {
                setNotifOpen((o) => !o);
                setProfileOpen(false);
              }}
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-(--color-border) bg-(--color-surface) text-(--color-text-muted) hover:text-(--color-text) hover:border-(--color-accent) hover:bg-(--color-surface-2) transition-all hover:scale-105"
            >
              <Bell size={17} className="icon-hover-pop" />
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
              className="hidden sm:flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface) pl-1 pr-3 py-1 hover:border-(--color-accent) hover:bg-(--color-surface-2) transition-all hover:scale-102"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-(--color-accent) text-[11px] font-bold text-white uppercase">
                {avatarInitial || (user?.fullName ? user.fullName[0] : "S")}
              </span>
              <div className="text-left leading-tight">
                <span className="text-xs font-semibold text-(--color-text) block">
                  {user?.fullName || String(user?.gymName || "My Gym")}
                </span>
                <span className="text-[10px] text-(--color-text-muted) block">
                  {user?.role === "BRANCH_MANAGER"
                    ? "Branch Manager"
                    : user?.role === "KIOSK"
                    ? "Front Desk Staff"
                    : user?.role === "GYM_OWNER"
                    ? "Gym Owner"
                    : roleLabel || "Staff"}
                </span>
              </div>
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-(--color-border) bg-(--color-surface) shadow-xl overflow-hidden z-30 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-3 border-b border-(--color-border) bg-(--color-surface-2)/40">
                  <p className="text-xs font-bold text-(--color-text)">{user?.fullName || "Staff User"}</p>
                  <p className="text-[11px] text-(--color-accent) font-semibold mt-0.5">
                    {user?.role === "BRANCH_MANAGER"
                      ? "👔 Branch Manager"
                      : user?.role === "KIOSK"
                      ? "🖥️ Reception / Front Desk Staff"
                      : user?.role === "GYM_OWNER"
                      ? "👑 Gym Owner"
                      : roleLabel || "Staff Account"}
                  </p>
                </div>
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
