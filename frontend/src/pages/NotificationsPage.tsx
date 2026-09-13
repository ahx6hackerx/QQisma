import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { notificationsApi } from "../api/client";
import { PageSpinner } from "../components/ui/Spinner";
import { EmptyState } from "../components/ui/EmptyState";
import { formatDateTime } from "../lib/format";
import { useLanguage } from "../context/LanguageContext";
import type { Notification } from "../types";

export default function NotificationsPage() {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[] | null>(null);

  function load() {
    notificationsApi.list().then((data) => setNotifications(data.notifications));
  }

  useEffect(() => {
    load();
  }, []);

  async function markAllRead() {
    await notificationsApi.markAllRead();
    load();
  }

  async function openNotification(n: Notification) {
    if (!n.isRead) await notificationsApi.markRead(n.id);
    load();
  }

  if (!notifications) return <PageSpinner />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink-800">{t("الإشعارات")}</h1>
        <button onClick={markAllRead} className="btn-outline text-sm">
          <CheckCheck className="h-4 w-4" />
          {t("تعليم الكل كمقروء")}
        </button>
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon={<Bell className="h-8 w-8" />} title={t("لا توجد إشعارات")} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-ink-100 bg-white">
          {notifications.map((n) => {
            const content = (
              <div className={`flex items-start gap-3 border-b border-ink-100 px-4 py-3 last:border-0 ${!n.isRead ? "bg-brass-50/50" : ""}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!n.isRead ? "bg-brass-400" : "bg-transparent"}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink-800">{n.title}</p>
                  <p className="text-sm text-ink-500">{n.message}</p>
                  <p className="mt-1 text-xs text-ink-400">
                    {n.property?.name && `${n.property.name} — `}
                    {formatDateTime(n.createdAt)}
                  </p>
                </div>
              </div>
            );
            return n.property ? (
              <Link key={n.id} to={`/app/properties/${n.property.id}`} onClick={() => openNotification(n)}>
                {content}
              </Link>
            ) : (
              <div key={n.id} onClick={() => openNotification(n)} className="cursor-pointer">
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
