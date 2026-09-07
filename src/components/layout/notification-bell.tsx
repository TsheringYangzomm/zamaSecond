import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, X } from "lucide-react";
import { useCustomerAuth } from "../../checkout/customer-auth";
import { fetchCustomerNotifications, markAllNotificationsRead, markNotificationRead } from "../../returns/returns-notifications-api";
import type { CustomerNotification } from "../../returns/returns-types";

function relativeDate(value: string): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const minutes = Math.round((timestamp - Date.now()) / 60000);
  const absolute = Math.abs(minutes);
  if (absolute < 1) return "Just now";
  if (absolute < 60) return `${absolute}m ago`;
  const hours = Math.round(absolute / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-BT", { day: "numeric", month: "short" }).format(new Date(value));
}

function notificationHref(notification: CustomerNotification): string | null {
  if (notification.link) return notification.link;
  if (notification.returnId) return "#/account/orders?section=returns";
  if (notification.orderId) return "#/account/orders";
  return null;
}

function notificationActionLabel(notification: CustomerNotification): string {
  if (notification.returnId) return "View return";
  if (notification.type === "coupon_available") return "View coupons";
  if (notification.type === "product_available") return "View product";
  if (notification.orderId) return "View order";
  return "View update";
}

export function NotificationBell({ compact = false }: { compact?: boolean }) {
  const { status, profile } = useCustomerAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (status !== "signed-in" || !profile) return;
    try {
      setError(null);
      setNotifications(await fetchCustomerNotifications(profile.email));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Notifications could not be loaded.");
    }
  }, [profile, status]);

  useEffect(() => {
    if (status !== "signed-in" || !profile) {
      setNotifications([]);
      setOpen(false);
      return;
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30_000);
    const onFocus = () => void refresh();
    const onVisibility = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [profile, refresh, status]);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.readAt).length, [notifications]);
  if (status !== "signed-in" || !profile) return null;
  const customerEmail = profile.email;

  async function readOne(notification: CustomerNotification) {
    if (notification.readAt || busy) return;
    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item));
    try { await markNotificationRead(customerEmail, notification.id); } catch { void refresh(); }
  }

  async function readAll() {
    if (busy || unreadCount === 0) return;
    setBusy(true);
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
    try { await markAllNotificationsRead(customerEmail); } catch { void refresh(); }
    finally { setBusy(false); }
  }

  return (
    <div className="relative shrink-0">
      <button className={`relative grid place-items-center border-2 border-brand-forest/20 bg-brand-white/65 text-brand-forest transition-colors hover:bg-brand-mint hover:text-brand-green-ink focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-4 ${compact ? "h-11 w-11 rounded-wobbly-md" : "h-12 w-12 rounded-full"}`} type="button" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => { setOpen((current) => !current); if (!open) void refresh(); }}>
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 ? <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-brand-forest bg-brand-orange px-1 text-[0.65rem] font-bold leading-none text-brand-white" aria-hidden="true">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
      </button>
      {open ? <div className="absolute right-0 top-[calc(100%+0.7rem)] z-50 grid w-[min(24rem,calc(100vw-1rem))] gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-warm-white p-3 text-left shadow-brand-big" role="dialog" aria-label="Notifications">
        <div className="flex items-center justify-between gap-3 border-b-2 border-dashed border-brand-forest/20 pb-2"><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Your account</p><h2 className="font-primary text-xl font-bold text-brand-green-ink">Notifications</h2></div><div className="flex items-center gap-1"><button className="rounded-full p-2 text-brand-green-ink hover:bg-brand-yellow disabled:opacity-40" type="button" title="Mark all as read" aria-label="Mark all as read" disabled={busy || unreadCount === 0} onClick={() => void readAll()}><CheckCheck className="h-4.5 w-4.5" /></button><button className="rounded-full p-2 text-brand-green-ink hover:bg-brand-yellow" type="button" aria-label="Close notifications" onClick={() => setOpen(false)}><X className="h-4.5 w-4.5" /></button></div></div>
        {error ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 p-3 text-xs font-semibold text-brand-black" role="alert">{error}</p> : null}
        <div className="grid max-h-[min(30rem,65vh)] gap-2 overflow-y-auto">
          {notifications.length === 0 && !error ? <p className="p-5 text-center text-sm text-brand-black/60">You’re all caught up.</p> : null}
          {notifications.map((notification) => <div className={`grid gap-1 rounded-wobbly-md border-2 p-3 ${notification.readAt ? "border-brand-forest/10 bg-brand-white" : "border-brand-forest bg-brand-mint"}`} key={notification.id}>
            <div className="flex items-start justify-between gap-2"><p className="text-sm font-bold text-brand-green-ink">{notification.title}</p><span className="shrink-0 text-[0.68rem] text-brand-black/50">{relativeDate(notification.createdAt)}</span></div>
            <p className="text-xs leading-relaxed text-brand-black/70">{notification.message}</p>
            <div className="flex flex-wrap items-center gap-3 pt-1">{notificationHref(notification) ? <button className="text-xs font-bold text-brand-green-ink underline decoration-dashed underline-offset-4" type="button" onClick={() => { void readOne(notification); setOpen(false); const href = notificationHref(notification); if (href) window.location.hash = href; }}>{notificationActionLabel(notification)}</button> : null}{!notification.readAt ? <button className="text-xs font-bold text-brand-black/55 underline decoration-dashed underline-offset-4" type="button" onClick={() => void readOne(notification)}>Mark as read</button> : null}</div>
          </div>)}
        </div>
      </div> : null}
    </div>
  );
}
