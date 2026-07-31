import { useEffect, useRef } from "react";
import { Bell, CalendarDays, IndianRupee, X, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

// ─── Types ────────────────────────────────────────────────────────────────────
export type NotificationType = "booking" | "payment" | "cancellation" | "alert" | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;       // ISO string — replace with Date from API
  read: boolean;
  link?: string;
}

// ─── TODO: Replace with real API call ─────────────────────────────────────────
// async function fetchNotifications(): Promise<Notification[]> {
//   const res = await fetch("/api/admin/notifications");
//   return res.json();
// }
// async function markAllRead(): Promise<void> {
//   await fetch("/api/admin/notifications/read-all", { method: "PATCH" });
// }
// async function markRead(id: string): Promise<void> {
//   await fetch(`/api/admin/notifications/${id}/read`, { method: "PATCH" });
// }

// ─── Mock data (remove when API is ready) ─────────────────────────────────────
const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "1", type: "booking",      title: "New Booking",        message: "Arjun Sharma booked Royal Celebration Suite for 15 Jun.", time: new Date(Date.now() - 5 * 60000).toISOString(),   read: false },
  { id: "2", type: "payment",      title: "Payment Received",   message: "₹8,500 received for booking #VN1042.",                   time: new Date(Date.now() - 18 * 60000).toISOString(),  read: false },
  { id: "3", type: "cancellation", title: "Booking Cancelled",  message: "Sneha Patel cancelled booking #VN1039.",                 time: new Date(Date.now() - 2 * 3600000).toISOString(), read: false },
  { id: "4", type: "alert",        title: "Low Availability",   message: "Midnight Luxe Suite has only 2 slots left this week.",   time: new Date(Date.now() - 5 * 3600000).toISOString(), read: true  },
  { id: "5", type: "booking",      title: "New Booking",        message: "Vikram Nair booked Starlight Romance Suite for 20 Jun.", time: new Date(Date.now() - 8 * 3600000).toISOString(), read: true  },
  { id: "6", type: "system",       title: "System Update",      message: "Platform updated to v2.4.1 successfully.",               time: new Date(Date.now() - 24 * 3600000).toISOString(), read: true  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const iconMap: Record<NotificationType, React.ElementType> = {
  booking:      CalendarDays,
  payment:      IndianRupee,
  cancellation: X,
  alert:        AlertCircle,
  system:       CheckCircle2,
};

const colorMap: Record<NotificationType, string> = {
  booking:      "text-gold bg-[var(--gold)]/10",
  payment:      "text-emerald-400 bg-emerald-400/10",
  cancellation: "text-red-400 bg-red-400/10",
  alert:        "text-amber-400 bg-amber-400/10",
  system:       "text-blue-400 bg-blue-400/10",
};

// ─── Component ────────────────────────────────────────────────────────────────
interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  // TODO: pass notifications from parent state once API is wired
  notifications?: Notification[];
  onMarkAllRead?: () => void;
  onMarkRead?: (id: string) => void;
}

export function NotificationPanel({
  open,
  onClose,
  notifications = MOCK_NOTIFICATIONS,
  onMarkAllRead,
  onMarkRead,
}: NotificationPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const unread = notifications.filter((n) => !n.read).length;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={ref}
        className="absolute right-0 top-full mt-2 w-80 glass-card rounded-2xl border border-[var(--gold)]/15 z-50 overflow-hidden shadow-2xl"
      >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-gold" />
          <span className="text-sm font-semibold text-foreground">{t("app.admin.notifications", "Notifications")}</span>
          {unread > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--gold)]/20 text-gold">
              {unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-[11px] text-muted-foreground hover:text-gold transition"
            >
              {t("app.admin.markAllRead", "Mark all read")}
            </button>
          )}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[420px] overflow-y-auto divide-y divide-white/[0.04]">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
            <Bell className="h-8 w-8 opacity-30" />
            <p className="text-sm">{t("app.admin.noNotifications", "No notifications")}</p>
          </div>
        ) : (
          notifications.map((n) => {
            const Icon = iconMap[n.type];
            return (
              <button
                key={n.id}
                onClick={() => onMarkRead?.(n.id)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition ${!n.read ? "bg-[var(--gold)]/[0.03]" : ""}`}
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${colorMap[n.type]}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium truncate ${n.read ? "text-foreground/70" : "text-foreground"}`}>
                      {n.title}
                    </p>
                    {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-gold shrink-0" />}
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">{n.message}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3 text-muted-foreground/50" />
                    <span className="text-[11px] text-muted-foreground/60">{timeAgo(n.time)}</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-white/[0.06] text-center">
        <button className="text-xs text-gold hover:underline underline-offset-4 transition">
          {t("app.admin.viewAllNotifications", "View all notifications")} →
        </button>
      </div>
    </div>
    </>
  );
}
