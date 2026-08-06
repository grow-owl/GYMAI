import { NavLink, Outlet, useLocation } from "react-router-dom";
import * as icons from "lucide-react";
import clsx from "clsx";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { memberNav } from "@/data/nav";
import { useAuth } from "@/store/authStore";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function MobileShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-(--color-base)">
      <Sidebar
        primary={memberNav}
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
        roleLabel="Member"
      />

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-(--color-navbar) border-r border-(--color-navbar-border) p-4 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="leading-tight">
                <p className="font-display text-sm font-semibold text-(--color-navbar-text)">GYMAI</p>
                <p className="text-[11px] text-(--color-navbar-text-muted)">Member</p>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-(--color-navbar-text-muted)">
                <icons.X size={20} />
              </button>
            </div>
            <nav className="space-y-1 flex-1 overflow-y-auto max-h-[calc(100vh-140px)]">
              {memberNav.map((item) => {
                const Icon = (icons as unknown as Record<string, icons.LucideIcon>)[item.icon] ?? icons.Circle;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/member"}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-(--color-accent) text-(--color-navbar) shadow-md font-semibold"
                          : "text-(--color-navbar-text-muted) hover:text-(--color-navbar-text) hover:bg-white/10 hover:translate-x-1"
                      )
                    }
                  >
                    <Icon size={18} className="icon-hover-pop shrink-0" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
            <button onClick={handleLogout} className="btn-press mt-auto flex items-center gap-2 text-left text-sm font-medium text-(--color-danger) hover:bg-white/10 rounded-xl px-3 py-2.5 transition-colors">
              <icons.LogOut size={16} /> Log out
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <TopBar
          greeting="Member Dashboard"
          subtitle="Your workouts, progress and attendance"
          onMenuClick={() => setMobileOpen(true)}
          avatarInitial="M"
          navItems={memberNav}
          roleLabel="Member"
          onLogout={handleLogout}
        />

        <main className="px-4 sm:px-6 py-6 max-w-[1400px] w-full pb-24 md:pb-6">
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-(--color-navbar-border) bg-(--color-navbar)/95 backdrop-blur-md px-2 py-1.5 md:hidden shadow-lg">
          <div className="flex items-center justify-around">
            {memberNav
              .filter((item) => ["/member", "/member/workout-plan", "/member/ai-coach", "/member/progress"].includes(item.path))
              .map((item) => {
                const Icon = (icons as unknown as Record<string, icons.LucideIcon>)[item.icon] ?? icons.Circle;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/member"}
                    className={({ isActive }) =>
                      clsx(
                        "group flex flex-col items-center gap-1 rounded-xl py-1 px-1.5 text-[10px] font-medium transition-all duration-200",
                        isActive ? "text-(--color-accent) font-semibold" : "text-(--color-navbar-text-muted) hover:text-(--color-navbar-text)"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={clsx(
                            "flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200 icon-hover-pop",
                            isActive ? "bg-(--color-accent-soft) text-(--color-accent)" : "group-hover:bg-white/10"
                          )}
                        >
                          <Icon size={18} strokeWidth={2} />
                        </span>
                        <span className="truncate max-w-[64px]">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            <button
              onClick={() => setMobileOpen(true)}
              className={clsx(
                "group flex flex-col items-center gap-1 rounded-xl py-1 px-1.5 text-[10px] font-medium transition-all duration-200",
                memberNav
                  .filter((item) => !["/member", "/member/workout-plan", "/member/ai-coach", "/member/progress"].includes(item.path))
                  .some((item) => location.pathname.startsWith(item.path))
                  ? "text-(--color-accent) font-semibold"
                  : "text-(--color-navbar-text-muted) hover:text-(--color-navbar-text)"
              )}
            >
              <span
                className={clsx(
                  "flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200 icon-hover-pop",
                  memberNav
                    .filter((item) => !["/member", "/member/workout-plan", "/member/ai-coach", "/member/progress"].includes(item.path))
                    .some((item) => location.pathname.startsWith(item.path))
                    ? "bg-(--color-accent-soft) text-(--color-accent)"
                    : "group-hover:bg-white/10"
                )}
              >
                <icons.Menu size={18} strokeWidth={2} />
              </span>
              <span>More</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
