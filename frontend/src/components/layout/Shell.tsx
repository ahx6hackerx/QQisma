import { ReactNode, useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Bell, LogOut, Sun, Moon, Languages, Menu, X, PanelLeftClose, PanelLeftOpen, Wallet, UserCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { useCurrency } from "../../context/CurrencyContext";
import { CURRENCIES, CurrencyCode } from "../../i18n/currency";
import { notificationsApi } from "../../api/client";

export interface ShellNavItem {
  to: string;
  icon: ReactNode;
  label: string;
  end?: boolean;
}

function NavItem({
  item,
  collapsed,
  onNavigate,
}: {
  item: ShellNavItem;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
          collapsed ? "justify-center" : ""
        } ${isActive ? "bg-ink-700 text-parchment-50" : "text-ink-300 hover:bg-ink-700/60 hover:text-parchment-50"}`
      }
    >
      {item.icon}
      {!collapsed && item.label}
    </NavLink>
  );
}

function SidebarContent({
  collapsed,
  onNavigate,
  unreadCount,
  navItems,
  profilePath,
  brandTagline,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  unreadCount: number;
  navItems: ShellNavItem[];
  profilePath: string;
  brandTagline: string;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const { currency, setCurrency } = useCurrency();

  return (
    <>
      <div className={`mb-4 px-2 ${collapsed ? "text-center" : ""}`}>
        {collapsed ? (
          <p className="font-display text-2xl font-bold text-brass-400">ق</p>
        ) : (
          <>
            <p className="font-display text-2xl font-bold text-parchment-50">{t("قِسمة")}</p>
            <p className="text-xs text-ink-300">{brandTagline}</p>
          </>
        )}
      </div>

      {!collapsed && (
        <div className="mb-3 flex gap-2 px-2">
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? t("الوضع الفاتح") : t("الوضع الداكن")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-ink-600 py-1.5 text-xs font-medium text-ink-300 transition-colors hover:bg-ink-700 hover:text-parchment-50"
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            {theme === "dark" ? t("الوضع الفاتح") : t("الوضع الداكن")}
          </button>
          <button
            onClick={toggleLanguage}
            title={language === "ar" ? "Switch to English" : "التبديل للعربية"}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-ink-600 py-1.5 text-xs font-medium text-ink-300 transition-colors hover:bg-ink-700 hover:text-parchment-50"
          >
            <Languages className="h-3.5 w-3.5" />
            {language === "ar" ? "English" : "العربية"}
          </button>
        </div>
      )}

      {!collapsed && (
        <div className="mb-6 px-2">
          <label className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-ink-400">
            <Wallet className="h-3 w-3" />
            {language === "ar" ? "العملة" : "Currency"}
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            className="w-full rounded-md border border-ink-600 bg-ink-700 py-1.5 px-2 text-xs font-medium text-parchment-50 focus:outline-none"
          >
            {Object.values(CURRENCIES).map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {language === "ar" ? c.nameAr : c.nameEn}
              </option>
            ))}
          </select>
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
        <NavItem
          item={{
            to: profilePath,
            icon: <UserCircle className="h-4 w-4" />,
            label: language === "ar" ? "الملف الشخصي" : "Profile",
          }}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      </nav>

      <div className="mt-auto border-t border-ink-600 pt-4">
        <div className={`flex items-center gap-2 px-2 ${collapsed ? "justify-center" : ""}`}>
          <NavLink to={profilePath} onClick={onNavigate} className="shrink-0">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brass-500 font-display text-sm font-bold text-ink-900">
                {user?.fullName?.charAt(0)}
              </div>
            )}
          </NavLink>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-parchment-50">{user?.fullName}</p>
                <p className="truncate text-xs text-ink-300">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                title={t("تسجيل الخروج")}
                className="rounded-md p-2 text-ink-300 hover:bg-ink-700 hover:text-parchment-50"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// Shared shell used by both the owner app (AppLayout) and the broker
// workspace (BrokerLayout): identical sidebar mechanics (collapse, mobile
// drawer, theme/language/currency), only the nav items and notification
// bell target differ between the two.
export default function Shell({
  navItems,
  profilePath,
  homePath,
  brandTagline,
  notificationsPath,
}: {
  navItems: ShellNavItem[];
  profilePath: string;
  homePath: string;
  brandTagline: string;
  notificationsPath?: string;
}) {
  const { t } = useLanguage();
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("qisma_sidebar_collapsed") === "true");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("qisma_sidebar_collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    let mounted = true;
    function poll() {
      notificationsApi
        .list(true)
        .then((data) => mounted && setUnreadCount(data.unreadCount))
        .catch(() => {});
    }
    poll();
    const interval = setInterval(poll, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-parchment-100">
      <aside
        className={`relative hidden shrink-0 flex-col bg-ink-800 px-3 py-6 transition-all duration-200 md:flex ${
          collapsed ? "w-20 px-2" : "w-64"
        }`}
      >
        <SidebarContent
          collapsed={collapsed}
          unreadCount={unreadCount}
          navItems={navItems}
          profilePath={profilePath}
          brandTagline={brandTagline}
        />
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -left-3 top-8 flex h-6 w-6 items-center justify-center rounded-full border border-ink-600 bg-ink-800 text-ink-300 hover:text-parchment-50"
          title={collapsed ? t("توسيع القائمة") : t("طي القائمة")}
        >
          {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </button>
      </aside>

      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-ink-100 bg-ink-800 px-4 py-3 md:hidden">
        <button onClick={() => setMobileOpen(true)} className="text-parchment-50">
          <Menu className="h-6 w-6" />
        </button>
        <p className="font-display text-lg font-bold text-parchment-50">{t("قِسمة")}</p>
        <NavLink to={notificationsPath ?? homePath} className="relative text-parchment-50">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -left-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brass-400 px-1 text-[10px] font-bold text-ink-900">
              {unreadCount}
            </span>
          )}
        </NavLink>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-ink-900/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-72 flex-col bg-ink-800 px-4 py-6 shadow-xl">
            <button onClick={() => setMobileOpen(false)} className="absolute left-3 top-3 text-ink-300">
              <X className="h-5 w-5" />
            </button>
            <SidebarContent
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
              unreadCount={unreadCount}
              navItems={navItems}
              profilePath={profilePath}
              brandTagline={brandTagline}
            />
          </aside>
        </div>
      )}

      <main className="flex-1 overflow-x-hidden pt-14 md:pt-0">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
