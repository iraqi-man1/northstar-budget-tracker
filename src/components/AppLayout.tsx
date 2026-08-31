import {
  ArrowRight,
  CircleUserRound,
  Goal,
  LayoutDashboard,
  LogOut,
  Menu,
  MoonStar,
  PiggyBank,
  ReceiptText,
  Settings,
  Sun,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useBudgetData } from "../hooks/useBudgetData";
import { useAction } from "../hooks/useAction";
import { initials } from "../lib/format";
import { updateProfile } from "../lib/api";
import { Brand } from "./Brand";
import { IconButton, PageSkeleton } from "./ui";
import { useLanguage } from "../context/LanguageContext";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/income", label: "Salary / Income", icon: TrendingUp },
  { to: "/expenses", label: "Expenses", icon: ReceiptText },
  { to: "/savings", label: "Savings", icon: PiggyBank },
  { to: "/goals", label: "Goals", icon: Goal },
  { to: "/transactions", label: "Transactions", icon: WalletCards },
  { to: "/settings", label: "Settings", icon: Settings },
];

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useLanguage();
  return <nav className="sidebar-nav">{nav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={onNavigate} className={({ isActive }) => isActive ? "active" : ""}><Icon /><span>{t(label)}</span><ArrowRight /></NavLink>)}</nav>;
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { data, isLoading, isError, refetch } = useBudgetData();
  const { busy: themeBusy, run } = useAction();
  const { resolved, setPreference } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const profileName = data?.profile.full_name || user?.user_metadata.full_name || user?.email?.split("@")[0] || t("Account");
  const avatar = data?.profile.avatar_url || user?.user_metadata.avatar_url;
  const title = t(nav.find((item) => location.pathname.startsWith(item.to))?.label || "Northstar");

  useEffect(() => { if (data?.profile.theme) setPreference(data.profile.theme); }, [data?.profile.theme, setPreference]);
  useEffect(() => { if (data?.profile.language) setLanguage(data.profile.language); }, [data?.profile.language, setLanguage]);

  async function toggleTheme() {
    if (!data) return;
    const next = resolved === "dark" ? "light" : "dark";
    setPreference(next);
    try {
      await run(() => updateProfile(data.profile.user_id, { full_name: data.profile.full_name, currency: data.profile.currency, theme: next, language }), "Appearance updated");
    } catch {
      setPreference(data.profile.theme);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top"><Brand /><span className="sidebar-caption">{t("Personal finance")}</span></div>
        <Navigation />
        <div className="sidebar-foot"><div className="privacy-note"><span className="privacy-dot" />{t("Private by design")}<strong>{t("Your data is isolated with RLS")}</strong></div></div>
      </aside>

      <div className={`mobile-drawer-backdrop ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(false)} />
      <aside className={`mobile-drawer ${menuOpen ? "open" : ""}`}>
        <div className="mobile-drawer-head"><Brand /><IconButton label={t("Close menu")} onClick={() => setMenuOpen(false)}><X /></IconButton></div>
        <Navigation onNavigate={() => setMenuOpen(false)} />
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left"><IconButton label={t("Open menu")} className="menu-button" onClick={() => setMenuOpen(true)}><Menu /></IconButton><div><span>{t("Workspace")}</span><strong>{title}</strong></div></div>
          <div className="topbar-right">
            <IconButton label={t(resolved === "dark" ? "Use light mode" : "Use dark mode")} disabled={themeBusy || !data} onClick={toggleTheme}>{resolved === "dark" ? <Sun /> : <MoonStar />}</IconButton>
            <div className="profile-menu-wrap">
              <button className="profile-trigger" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen}>
                {avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" /> : <span>{initials(profileName)}</span>}
                <span className="profile-trigger-name"><strong>{profileName}</strong><small>{user?.email}</small></span>
              </button>
              {profileOpen && <><button className="popover-scrim" aria-label={t("Close profile menu")} onClick={() => setProfileOpen(false)} /><div className="profile-popover"><div className="profile-popover-head"><CircleUserRound /><div><strong>{profileName}</strong><span>{user?.email}</span></div></div><NavLink to="/settings" onClick={() => setProfileOpen(false)}><Settings />{t("Account settings")}</NavLink><button onClick={() => signOut()}><LogOut />{t("Sign out")}</button></div></>}
            </div>
          </div>
        </header>
        <main className="main-content">
          {isLoading ? <PageSkeleton /> : isError ? <div className="load-error"><span>{t("Couldn’t load your workspace")}</span><p>{t("Check your connection and Supabase setup, then try again.")}</p><button onClick={() => refetch()}>{t("Try again")}</button></div> : children}
        </main>
      </div>

      <nav className="mobile-bottom-nav">
        {nav.slice(0, 5).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? "active" : ""}><Icon /><span>{t(label === "Salary / Income" ? "Income" : label)}</span></NavLink>)}
      </nav>
    </div>
  );
}
