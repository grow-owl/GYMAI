import { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import * as icons from "lucide-react";
import { X, Dumbbell } from "lucide-react";
import clsx from "clsx";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { useAuth } from "@/context/AuthContext";

interface NavEntry {
  label: string;
  path: string;
  icon: string;
}

export default function DashboardShell({
  primary,
  secondary,
  roleLabel,
  greeting,
  subtitle,
  avatarInitial,
}: {
  primary: NavEntry[];
  secondary?: NavEntry[];
  roleLabel: string;
  greeting: string;
  subtitle?: string;
  avatarInitial?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const allItems = [...primary, ...(secondary ?? [])];
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-(--color-base)">
      <Sidebar
        primary={primary}
        secondary={secondary}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        roleLabel={roleLabel}
      />

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-(--color-navbar) border-r border-(--color-navbar-border) p-4 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-(--color-accent) text-(--color-navbar)">
                  <Dumbbell size={18} strokeWidth={2.5} />
                </span>
                <div className="leading-tight">
                  <p className="font-display text-sm font-semibold text-(--color-navbar-text)">GYMAI</p>
                  <p className="text-[11px] text-(--color-navbar-text-muted)">{roleLabel}</p>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-(--color-navbar-text-muted)">
                <X size={20} />
              </button>
            </div>
            <nav className="space-y-1">
              {allItems.map((item) => {
                const Icon = (icons as unknown as Record<string, icons.LucideIcon>)[item.icon] ?? icons.Circle;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === primary[0]?.path}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                        isActive ? "bg-white/10 text-(--color-navbar-text)" : "text-(--color-navbar-text-muted)"
                      )
                    }
                  >
                    <Icon size={18} />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
            <button onClick={handleLogout} className="btn-press mt-auto text-left text-sm text-(--color-navbar-text-muted) px-3 py-2.5">
              ← Log out
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <TopBar
          greeting={greeting}
          subtitle={subtitle}
          onMenuClick={() => setMobileOpen(true)}
          avatarInitial={avatarInitial}
          navItems={allItems}
          roleLabel={roleLabel}
          onLogout={handleLogout}
        />
        <main className="px-4 sm:px-6 py-6 max-w-[1400px]">
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
