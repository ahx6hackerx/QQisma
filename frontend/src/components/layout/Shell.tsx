import { ReactNode, useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Bell, LogOut, Sun, Moon, Languages, Menu, X, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Wallet, UserCircle, ShieldAlert } from "lucide-react";
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
  [key: string]: unknown;
}) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `sb-link ${collapsed ? "justify-center" : ""} ${isActive ? "sb-link-active" : ""}`
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
          <p className="font-display text-2xl font-bold sb-accent-text">ق</p>
        ) : (
          <>
            <p className="font-display text-2xl font-bold sb-title">{t("قِسمة")}</p>
            <p className="text-xs sb-muted">{brandTagline}</p>
          </>
        )}
      </div>

      {!collapsed && (
        <div className="mb-3 flex gap-2 px-2">
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? t("الوضع الفاتح") : t("الوضع الداكن")}
            className="sb-btn flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors"
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            {theme === "dark" ? t("الوضع الفاتح") : t("الوضع الداكن")}
          </button>
          <button
            onClick={toggleLanguage}
            title={language === "ar" ? "Switch to English" : "التبديل للعربية"}
            className="sb-btn flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors"
          >
            <Languages className="h-3.5 w-3.5" />
            {language === "ar" ? "English" : "العربية"}
          </button>
        </div>
      )}

      {!collapsed && (
        <div className="mb-6 px-2">
          <label className="mb-1 flex items-center gap-1.5 text-[11px] font-medium sb-muted">
            <Wallet className="h-3 w-3" />
            {language === "ar" ? "العملة" : "Currency"}
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            className="sb-select w-full rounded-md py-1.5 px-2 text-xs font-medium focus:outline-none"
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
          <NavItem
            key={item.to}
            item={item}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
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

      <div className="sb-divider mt-auto pt-4">
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
                <p className="truncate text-sm font-medium sb-title">{user?.fullName}</p>
                <p className="truncate text-xs sb-muted">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                title={t("تسجيل الخروج")}
                className="sb-icon-btn rounded-md p-2"
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
  const { t, dir } = useLanguage();
  const { user: currentUser } = useAuth();
  const restricted = currentUser && !currentUser.isAdmin ? currentUser.restrictedFeatures ?? [] : [];
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
        className={`sb relative hidden shrink-0 flex-col px-3 py-6 transition-all duration-200 md:flex ${
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
          className="sb-toggle absolute -end-3 top-8 flex h-6 w-6 items-center justify-center rounded-full"
          title={collapsed ? t("توسيع القائمة") : t("طي القائمة")}
        >
          {collapsed
            ? dir === "rtl" ? <PanelRightOpen className="h-3.5 w-3.5" /> : <PanelLeftOpen className="h-3.5 w-3.5" />
            : dir === "rtl" ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </button>
      </aside>

      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between sb sb-bar px-4 py-3 md:hidden">
        <button onClick={() => setMobileOpen(true)} className="sb-title">
          <Menu className="h-6 w-6" />
        </button>
        <p className="font-display text-lg font-bold sb-title">{t("قِسمة")}</p>
        <NavLink to={notificationsPath ?? homePath} className="relative sb-title">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -end-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brass-400 px-1 text-[10px] font-bold text-ink-900">
              {unreadCount}
            </span>
          )}
        </NavLink>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-ink-900/50" onClick={() => setMobileOpen(false)} />
          <aside className="sb absolute inset-y-0 start-0 flex w-72 flex-col px-4 py-6 shadow-xl">
            <button onClick={() => setMobileOpen(false)} className="sb-icon-btn absolute end-3 top-3 rounded-md p-1">
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
          {restricted.length > 0 && (
            <div className="mb-6 rounded-lg border border-brass-300 bg-brass-50 p-4 text-sm text-brass-700">
              <p className="mb-1 flex items-center gap-2 font-semibold">
                <ShieldAlert className="h-4 w-4" /> بعض الميزات غير متاحة لحسابك حاليًا
              </p>
              <ul className="space-y-0.5">
                {restricted.map((r) => (
                  <li key={r.feature}>
                    • <strong>{r.label}</strong> — {r.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
