import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, X } from "lucide-react";
import { useAdminAuth } from "../../admin/admin-auth";
import { fetchAdminNotifications, markAdminNotificationRead, markAllAdminNotificationsRead, subscribeToAdminNotifications } from "../../admin/admin-notifications-api";
import type { AdminNotification } from "../../admin/admin-notifications-types";
import { navigateTo } from "../../router";

function relativeDate(value: string): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const minutes = Math.round((timestamp - Date.now()) / 60000);
  const absolute = Math.abs(minutes);
  if (absolute < 1) return "Just now";
  if (absolute < 60) return absolute + "m ago";
  const hours = Math.round(absolute / 60);
  if (hours < 24) return hours + "h ago";
  const days = Math.round(hours / 24);
  if (days < 7) return days + "d ago";
  return new Intl.DateTimeFormat("en-BT", { day: "numeric", month: "short" }).format(new Date(value));
}

export function AdminNotificationBell() {
  const { status, email } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (status !== "allowed" || !email) return;
    try {
      setError(null);
      setNotifications(await fetchAdminNotifications(email));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Admin notifications could not be loaded.");
    }
  }, [email, status]);

  useEffect(() => {
    if (status !== "allowed" || !email) {
      setNotifications([]);
      setOpen(false);
      return;
    }
    void refresh();
    const unsubscribe = subscribeToAdminNotifications(() => void refresh());
    const interval = window.setInterval(() => void refresh(), 30_000);
    const onFocus = () => void refresh();
    const onVisibility = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      unsubscribe();
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [email, refresh, status]);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.readAt).length, [notifications]);
  if (status !== "allowed" || !email) return null;
  const adminEmail = email;

  async function readOne(notification: AdminNotification) {
    if (notification.readAt || busy) return;
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, readAt } : item));
    try {
      await markAdminNotificationRead(adminEmail, notification.id);
    } catch {
      void refresh();
    }
  }

  async function readAll() {
    if (busy || unreadCount === 0) return;
    setBusy(true);
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
    try {
      await markAllAdminNotificationsRead(adminEmail);
    } catch {
      void refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative shrink-0">
      <button className="relative grid h-11 w-11 place-items-center rounded-full border-2 border-brand-forest/20 bg-brand-white/65 text-brand-forest transition-colors hover:bg-brand-mint hover:text-brand-green-ink focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-4" type="button" aria-label={"Admin notifications" + (unreadCount ? ", " + unreadCount + " unread" : "")} aria-expanded={open} aria-haspopup="dialog" onClick={() => { setOpen((current) => !current); if (!open) void refresh(); }}>
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 ? <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-brand-forest bg-brand-orange px-1 text-[0.65rem] font-bold leading-none text-brand-white" aria-hidden="true">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.7rem)] z-50 grid w-[min(25rem,calc(100vw-1rem))] gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-warm-white p-3 text-left shadow-brand-big" role="dialog" aria-label="Admin notifications">
          <div className="flex items-center justify-between gap-3 border-b-2 border-dashed border-brand-forest/20 pb-2">
            <div><p className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Admin updates</p><h2 className="font-primary text-xl font-bold text-brand-green-ink">Notifications</h2></div>
            <div className="flex items-center gap-1">
              <button className="rounded-full p-2 text-brand-green-ink hover:bg-brand-yellow disabled:opacity-40" type="button" title="Mark all as read" aria-label="Mark all admin notifications as read" disabled={busy || unreadCount === 0} onClick={() => void readAll()}><CheckCheck className="h-4.5 w-4.5" /></button>
              <button className="rounded-full p-2 text-brand-green-ink hover:bg-brand-yellow" type="button" aria-label="Close admin notifications" onClick={() => setOpen(false)}><X className="h-4.5 w-4.5" /></button>
            </div>
          </div>
          {error ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 p-3 text-xs font-semibold text-brand-black" role="alert">{error}</p> : null}
          <div className="grid max-h-[min(30rem,65vh)] gap-2 overflow-y-auto">
            {notifications.length === 0 && !error ? <p className="p-5 text-center text-sm text-brand-black/60">You’re all caught up.</p> : null}
            {notifications.map((notification) => (
              <div className={"grid gap-1 rounded-wobbly-md border-2 p-3 " + (notification.readAt ? "border-brand-forest/10 bg-brand-white" : "border-brand-forest bg-brand-mint")} key={notification.id}>
                <div className="flex items-start justify-between gap-2"><p className="text-sm font-bold text-brand-green-ink">{notification.title}</p><span className="shrink-0 text-[0.68rem] text-brand-black/50">{relativeDate(notification.createdAt)}</span></div>
                <p className="text-xs leading-relaxed text-brand-black/70">{notification.message}</p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button className="text-xs font-bold text-brand-green-ink underline decoration-dashed underline-offset-4" type="button" onClick={() => { void readOne(notification); setOpen(false); if (notification.link) navigateTo(notification.link); }}>{notification.link ? "View update" : "Mark as read"}</button>
                  {!notification.readAt ? <button className="text-xs font-bold text-brand-black/55 underline decoration-dashed underline-offset-4" type="button" onClick={() => void readOne(notification)}>Mark as read</button> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
