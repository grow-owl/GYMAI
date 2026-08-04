import { NavLink, useNavigate } from "react-router-dom";
import * as icons from "lucide-react";
import clsx from "clsx";
import { Dumbbell, ChevronsLeft, LogOut } from "lucide-react";
import { useAuth } from "@/store/authStore";

interface NavEntry {
  label: string;
  path: string;
  icon: string;
}

export default function Sidebar({
  primary,
  secondary,
  collapsed,
  onToggle,
  roleLabel,
}: {
  primary: NavEntry[];
  secondary?: NavEntry[];
  collapsed: boolean;
  onToggle: () => void;
  roleLabel: string;
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleSwitchRole = () => {
    logout();
    navigate("/login");
  };

  const renderItem = (item: NavEntry, accent?: boolean) => {
    const Icon = (icons as unknown as Record<string, icons.LucideIcon>)[item.icon] ?? icons.Circle;
    return (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.path === "/owner" || item.path === "/trainer" || item.path === "/reception"}
        className={({ isActive }) =>
          clsx(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
            collapsed && "justify-center px-0",
            isActive
              ? accent
                ? "bg-(--color-accent) text-(--color-sidebar)"
                : "bg-white/10 text-(--color-sidebar-text)"
              : "text-(--color-sidebar-text-muted) hover:text-(--color-sidebar-text) hover:bg-white/5"
          )
        }
        title={collapsed ? item.label : undefined}
      >
        <Icon size={18} strokeWidth={2} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </NavLink>
    );
  };

  return (
    <aside
      className={clsx(
        "hidden md:flex h-screen sticky top-0 shrink-0 flex-col border-r border-(--color-sidebar-border) bg-(--color-sidebar) transition-all duration-200",
        collapsed ? "w-[76px]" : "w-64"
      )}
    >
      <div className={clsx("flex items-center gap-2.5 px-4 py-5", collapsed && "justify-center px-0")}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--color-accent) text-(--color-sidebar)">
          <Dumbbell size={18} strokeWidth={2.5} />
        </span>
        {!collapsed && (
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold text-(--color-sidebar-text)">GYMAI</p>
            <p className="text-[11px] text-(--color-sidebar-text-muted)">{roleLabel}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3 overflow-y-auto">{primary.map((item) => renderItem(item))}</nav>

      {secondary && (
        <div className="px-3 pt-3 mt-3 border-t border-(--color-sidebar-border) space-y-1">
          {secondary.map((item) => renderItem(item, item.icon === "Sparkles"))}
        </div>
      )}

      <div className="px-3 py-4 border-t border-(--color-sidebar-border) space-y-1">
        <button
          onClick={handleSwitchRole}
          className={clsx(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-(--color-sidebar-text-muted) hover:text-(--color-sidebar-text) hover:bg-white/5 transition-colors btn-press",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut size={18} />
          {!collapsed && <span>Log out</span>}
        </button>
        <button
          onClick={onToggle}
          className={clsx(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-(--color-sidebar-text-muted) hover:text-(--color-sidebar-text) hover:bg-white/5 transition-colors",
            collapsed && "justify-center px-0"
          )}
        >
          <ChevronsLeft size={18} className={clsx("transition-transform", collapsed && "rotate-180")} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
