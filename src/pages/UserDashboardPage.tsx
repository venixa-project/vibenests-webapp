import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, CalendarDays, Clock, History, Wallet, Award,
  Tag, UserCircle, User, HelpCircle, LogOut, BedDouble,
  MapPin, ChevronRight, Star, CreditCard, Phone, MessageSquare,
  ArrowUpRight, CheckCircle2, XCircle, Hourglass, Bell,
  Users, Wifi, Tv, Wind, Music, Camera, Coffee, Cake, Sparkles,
  Search, TrendingUp, TrendingDown, BarChart3, Eye, RefreshCw, RotateCcw,
  Building2, Smartphone, DollarSign, ArrowDownLeft, ArrowUpLeft,
  Heart, ChevronLeft, Menu,
  X, Download, AlertTriangle, Receipt, Package, Plus, Edit3, Trash2,
} from "lucide-react";
import { useSuitesContext } from "@/components/admin/SuitesContext";
import { toast } from "sonner";
import { bookingsApi, membershipsApi, usersApi, paymentsApi, offersApi, couponsApi, refundsApi, referralsApi, appNotificationsApi } from "@/lib/api";
import { NotificationPanel, type Notification } from "@/components/admin/NotificationPanel";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { useAuth } from "@/components/auth/AuthContext";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { generateBookingInvoicePDF, generateTransactionInvoicePDF } from "@/lib/pdfGenerator";
import { exportToCSV } from "@/lib/csvExport";

function formatDateStr(dateStr: string, lang: string = i18n.language): string {
  if (!dateStr) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  try {
    return new Intl.DateTimeFormat(lang, {
      month: "short",
      day: "2-digit",
      year: "numeric"
    }).format(d);
  } catch (e) {
    return dateStr;
  }
}

function formatTimeStr(timeStr: string, lang: string = i18n.language): string {
  if (!timeStr) return timeStr;
  const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return timeStr;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const isPm = match[3].toUpperCase() === "PM";
  if (isPm && hours < 12) hours += 12;
  if (!isPm && hours === 12) hours = 0;
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  try {
    return new Intl.DateTimeFormat(lang, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(d);
  } catch (e) {
    return timeStr;
  }
}

function translateTimelineEvent(event: string, t: any): string {
  if (event === "Booking confirmed & paid") return t("app.userDashboard.eventConfirmedPaid", "Booking confirmed & paid");
  if (event === "Check-in reminder sent") return t("app.userDashboard.eventCheckInReminder", "Check-in reminder sent");
  if (event === "Check-in") return t("app.userDashboard.checkIn", "Check-in");
  if (event === "Check-out") return t("app.userDashboard.checkOut", "Check-out");
  if (event === "Deposit refunded to wallet") return t("app.userDashboard.eventRefundedToWallet", "Deposit refunded to wallet");
  if (event === "Booking cancelled by guest") return t("app.userDashboard.eventCancelledByGuest", "Booking cancelled by guest");
  if (event === "Cancellation processed") return t("app.userDashboard.eventCancellationProcessed", "Cancellation processed");
  return event;
}

function translateCancellationPolicy(policy: string, lang: string, t: any): string {
  if (policy === "Booking completed – cancellation not applicable.") {
    return t("app.userDashboard.policyCompleted", "Booking completed – cancellation not applicable.");
  }
  if (policy.startsWith("Free cancellation until")) {
    if (policy.includes("Jan 21")) {
      return t("app.userDashboard.policyJan21", "Free cancellation until {{date1}}. 50% refund between {{date1}}–{{date2}}. No refund after {{date2}}.", {
        date1: formatDateStr("Jan 21, 2025", lang),
        date2: formatDateStr("Jan 25, 2025", lang)
      });
    }
    if (policy.includes("Mar 03")) {
      return t("app.userDashboard.policyMar03", "Free cancellation until {{date1}}. 30% refund after that. No refund within 48 hrs.", {
        date1: formatDateStr("Mar 03, 2025", lang)
      });
    }
  }
  if (policy.startsWith("Cancelled 2 days before")) {
    return t("app.userDashboard.policyCancelled2Days", "Cancelled 2 days before check-in. 25% refund applied per policy.");
  }
  return policy;
}

function translateTxnDesc(desc: string, t: any): string {
  if (desc.startsWith("Booking Payment –")) {
    const suiteAndId = desc.replace("Booking Payment –", "").trim();
    const parts = suiteAndId.split(" ");
    const id = parts[parts.length - 1];
    const suiteName = parts.slice(0, parts.length - 1).join(" ");
    return t("app.userDashboard.txnDescBookingPayment", "Booking Payment – {{suite}} {{id}}", { suite: suiteName, id });
  }
  if (desc === "Wallet Top-up via UPI") {
    return t("app.userDashboard.txnDescWalletTopUp", "Wallet Top-up via UPI");
  }
  if (desc.startsWith("Refund – Cancelled Booking")) {
    const id = desc.replace("Refund – Cancelled Booking", "").trim();
    return t("app.userDashboard.txnDescRefund", "Refund – Cancelled Booking {{id}}", { id });
  }
  if (desc.startsWith("Advance Payment –")) {
    const suiteAndId = desc.replace("Advance Payment –", "").trim();
    const parts = suiteAndId.split(" ");
    const id = parts[parts.length - 1];
    const suiteName = parts.slice(0, parts.length - 1).join(" ");
    return t("app.userDashboard.txnDescAdvancePayment", "Advance Payment – {{suite}} {{id}}", { suite: suiteName, id });
  }
  if (desc === "Wallet Withdrawal to Bank") {
    return t("app.userDashboard.txnDescWalletWithdrawal", "Wallet Withdrawal to Bank");
  }
  return desc;
}

function translatePaymentMethod(method: string, t: any): string {
  if (method.includes("Credit Card")) {
    return method.replace("Credit Card", t("app.userDashboard.creditCard", "Credit Card"));
  }
  if (method.includes("Debit Card")) {
    return method.replace("Debit Card", t("app.userDashboard.debitCard", "Debit Card"));
  }
  if (method.includes("Wallet") && !method.includes("UPI")) {
    return method.replace("Wallet", t("app.userDashboard.wallet", "Wallet"));
  }
  if (method.startsWith("Bank –")) {
    return method.replace("Bank –", t("app.userDashboard.bank", "Bank") + " –");
  }
  return method;
}


function generateNotifications(bookingsList: any[], readIds: string[]): Notification[] {
  const list: Notification[] = [];

  bookingsList.forEach((b: any) => {
    const bookingId = b.orderId ? `#${b.orderId}` : `#VN${b.id}`;
    const suiteName = b.suite?.name ?? b.suiteName ?? `Suite #${b.suiteId}`;
    const dateStr = b.date ?? '';
    const status = b.status?.toLowerCase();
    const time = b.updatedAt || b.createdAt || new Date().toISOString();

    if (status === 'confirmed') {
      const id = `booking_${b.id}_confirmed`;
      list.push({
        id,
        type: 'booking',
        title: 'Booking Confirmed',
        message: `Your reservation for ${suiteName} (${bookingId}) on ${dateStr} has been confirmed.`,
        time,
        read: readIds.includes(id),
      });

      const payId = `payment_${b.id}_paid`;
      const amt = Number(b.totalAmount) || 0;
      list.push({
        id: payId,
        type: 'payment',
        title: 'Payment Received',
        message: `Initial payment of ₹${amt.toLocaleString("en-IN")} for booking ${bookingId} was processed.`,
        time,
        read: readIds.includes(payId),
      });
    } else if (status === 'pending') {
      const id = `booking_${b.id}_pending`;
      list.push({
        id,
        type: 'booking',
        title: 'Booking Pending',
        message: `Your reservation for ${suiteName} (${bookingId}) is pending payment/confirmation.`,
        time,
        read: readIds.includes(id),
      });
    } else if (status === 'cancelled' || status === 'refunded') {
      const id = `booking_${b.id}_cancelled`;
      list.push({
        id,
        type: 'cancellation',
        title: 'Booking Cancelled',
        message: `Your reservation for ${suiteName} (${bookingId}) was cancelled.`,
        time,
        read: readIds.includes(id),
      });
    } else if (status === 'completed') {
      const id = `booking_${b.id}_completed`;
      list.push({
        id,
        type: 'system',
        title: 'Booking Completed',
        message: `Thank you for staying at VibeNests! Your stay at ${suiteName} is completed. Click here to leave a review!`,
        time,
        read: readIds.includes(id),
        link: '/user/write-review',
      });
    }

    if (dateStr && (status === 'confirmed' || status === 'pending')) {
      const bDate = new Date(dateStr);
      const today = new Date();
      const diffDays = Math.ceil((bDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      if (diffDays >= 0 && diffDays <= 3) {
        const id = `alert_${b.id}_checkin`;
        list.push({
          id,
          type: 'alert',
          title: 'Check-in Guidelines',
          message: `Your check-in guidelines for ${suiteName} on ${dateStr} are now available.`,
          time,
          read: readIds.includes(id),
        });
      }
    }
  });

  return list.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}

/* ─── Types ─────────────────────────────────────────── */
type NavItem = { id: string; label: string; icon: React.ElementType };
type Booking = {
  id: string; suite: string; location: string; checkIn: string;
  checkOut: string; checkInTime: string; checkOutTime: string;
  nights: number; amount: number;
  status: "confirmed" | "pending" | "completed" | "cancelled" | "refunded";
  image?: string;
  addons?: any[];
  _raw?: any;
  rescheduleCount?: number;
};

type Transaction = {
  id: string; desc: string; amount: number; type: "credit" | "debit";
  date: string; status: "completed" | "pending" | "failed";
  category: "booking" | "refund" | "topup" | "withdrawal";
  method: string; invoice?: string;
  booking?: any;
};
type PaymentMethod = {
  id: string; type: "visa" | "mastercard" | "upi" | "bank";
  label: string; last4?: string; isDefault: boolean;
};

/* ─── Nav ────────────────────────────────────────────── */
const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "suites", label: "Browse Suites", icon: BedDouble },
  { id: "my-bookings", label: "My Bookings", icon: CalendarDays },
  { id: "upcoming", label: "Upcoming Bookings", icon: Clock },
  { id: "past", label: "Past Bookings", icon: History },
  { id: "wallet", label: "Payments", icon: Wallet },
  { id: "refunds", label: "Refunds", icon: RotateCcw },
  // { id: "memberships", label: "Celebration Packages", icon: Award },
  { id: "offers", label: "Special Offers", icon: Tag },
  { id: "profile", label: "Profile Settings", icon: UserCircle },
  { id: "help", label: "Help & Support", icon: HelpCircle },
  { id: "write-review", label: "Write a Review", icon: Star },
];

/* ─── Bookings Data ──────────────────────────────────── */
const UPCOMING_BOOKINGS: Booking[] = [
  { id: "VN-2841", suite: "Royal Penthouse Suite", location: "Mumbai, India", checkIn: "Jan 28, 2025", checkOut: "Feb 01, 2025", checkInTime: "2:00 PM", checkOutTime: "11:00 AM", nights: 4, amount: 128000, status: "confirmed" },
  { id: "VN-2965", suite: "Oceanic Deluxe Suite", location: "Goa, India", checkIn: "Mar 10, 2025", checkOut: "Mar 14, 2025", checkInTime: "1:00 PM", checkOutTime: "10:00 AM", nights: 4, amount: 64000, status: "pending" },
];
const PAST_BOOKINGS: Booking[] = [
  { id: "VN-2210", suite: "Heritage Garden Villa", location: "Jaipur, India", checkIn: "Oct 05, 2024", checkOut: "Oct 09, 2024", checkInTime: "2:00 PM", checkOutTime: "11:00 AM", nights: 4, amount: 96000, status: "completed" },
  { id: "VN-2105", suite: "Sky Loft Suite", location: "Delhi, India", checkIn: "Aug 15, 2024", checkOut: "Aug 17, 2024", checkInTime: "3:00 PM", checkOutTime: "12:00 PM", nights: 2, amount: 42000, status: "completed" },
  { id: "VN-1998", suite: "Lakefront Pool Suite", location: "Udaipur, India", checkIn: "Jun 20, 2024", checkOut: "Jun 23, 2024", checkInTime: "2:00 PM", checkOutTime: "11:00 AM", nights: 3, amount: 75000, status: "cancelled" },
];


const STATS = [
  // { label: "Total Bookings", value: "12",    icon: CalendarDays },
  // { label: "Nights Stayed",  value: "38",    icon: BedDouble },
  // { label: "Total Spent",    value: "₹5.2L", icon: CreditCard },
  // { label: "Loyalty Points", value: "4,820", icon: Star },
];

const QUICK_ACTIONS = [
  { label: "New Booking", icon: BedDouble, desc: "Explore & reserve suites" },
  { label: "Modify Booking", icon: CalendarDays, desc: "Change dates or room type" },
  { label: "Contact", icon: Phone, desc: "24/7 personal assistance" },
  { label: "Raise a Request", icon: MessageSquare, desc: "Report issues or requests" },
];

/* ─── Wallet Data ────────────────────────────────────── */

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: "PM-01", type: "visa", label: "HDFC Credit Card", last4: "4291", isDefault: true },
  { id: "PM-02", type: "mastercard", label: "ICICI Debit Card", last4: "7832", isDefault: false },
  { id: "PM-03", type: "upi", label: "adithya@oksbi", isDefault: false },
  { id: "PM-04", type: "bank", label: "ICICI Bank", last4: "7832", isDefault: false },
];

/* ─── Status Config ──────────────────────────────────── */
const STATUS_CONFIG = {
  confirmed: { label: "Confirmed", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/25", icon: CheckCircle2 },
  pending: { label: "Pending", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/25", icon: Hourglass },
  completed: { label: "Completed", color: "text-sky-400", bg: "bg-sky-400/10 border-sky-400/25", icon: CheckCircle2 },
  checkIn: { label: "Check-in", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/25", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "text-rose-400", bg: "bg-rose-400/10 border-rose-400/25", icon: XCircle },
  refunded: { label: "Refunded", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/25", icon: CheckCircle2 },
};

function fmt(n: number) {
  return n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${(n / 1000).toFixed(0)}K`;
}

/* ─── Booking Extras ─────────────────────────────────── */
// Booking extras were previously hardcoded for demo.
// They are now computed from backend data inside the drawer.

function RequestCancellationModal({ bookingId, onClose, onSuccess }: { bookingId: number; onClose: () => void; onSuccess: () => void }) {
  const { t } = useTranslation();
  const [category, setCategory] = useState("other");
  const [comments, setComments] = useState("");
  const [calculating, setCalculating] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [breakdown, setBreakdown] = useState<any>(null);

  useEffect(() => {
    setCalculating(true);
    refundsApi.calculate(bookingId)
      .then((data) => {
        setBreakdown(data);
      })
      .catch((e) => {
        console.error("Failed to calculate refund:", e);
      })
      .finally(() => {
        setCalculating(false);
      });
  }, [bookingId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      const res = await refundsApi.initiate(bookingId, category, comments);
      if (res.status === "approved" || res.status === "refunded" || res.status === "processing") {
        toast.success("Your refund request has been processed successfully.");
      } else if (res.status === "rejected") {
        toast.error(`Refund Request Auto-Rejected: ${res.refundReason || res.rejectionReason || "Not eligible under current policy."}`);
      } else {
        toast.info(`Refund request submitted successfully! Status: ${res.status}`);
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.message || "Failed to submit refund request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass-card rounded-2xl p-6 w-full max-w-md border border-[var(--gold)]/20 shadow-2xl relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition cursor-pointer">
          <X className="h-5 w-5" />
        </button>
        <h3 className="font-display text-lg text-foreground mb-4">Request Refund & Cancellation</h3>

        {calculating ? (
          <div className="py-6 flex flex-col items-center justify-center text-muted-foreground space-y-2">
            <RefreshCw className="h-6 w-6 animate-spin text-gold" />
            <p className="text-xs">Calculating refund eligibility...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-sm bg-transparent">
            {breakdown ? (
              <div className="space-y-3">
                {/* Eligibility details */}
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Original Paid Amount:</span>
                    <span className="text-foreground">₹{Number(breakdown.originalAmount).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hours Before Event:</span>
                    <span className="text-foreground">{breakdown.hoursBeforeEvent} hrs</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-2">
                    <span className="text-muted-foreground">Policy Tier:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${breakdown.isEligible
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      }`}>
                      {breakdown.tier}
                    </span>
                  </div>
                  {breakdown.isEligible && (
                    <>
                      {breakdown.gatewayChargeAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Gateway Processing Fee (2%):</span>
                          <span className="text-rose-400">-₹{Number(breakdown.gatewayChargeAmount).toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cancellation Deduction:</span>
                        <span className="text-rose-400">
                          -₹{Number(breakdown.originalAmount * (100 - breakdown.percentage) / 100).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between border-t border-white/5 pt-2 text-sm font-semibold text-gold">
                    <span>Estimated Refund Amount:</span>
                    <span>₹{Number(breakdown.estimatedRefundAmount).toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {!breakdown.isEligible && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-0.5">Not Refund Eligible</p>
                      <p className="leading-relaxed">
                        {breakdown.tier === 'Package Booking - Not Eligible for Refund'
                          ? "Package bookings are non-refundable and credits will not be restored upon cancellation."
                          : "This request will be automatically rejected. Events commencing in less than 24 hours do not qualify for refunds under the VibeNests terms."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-400">
                Unable to load refund estimation. Standard refund policies will be evaluated automatically.
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wide block mb-1">Reason Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="luxury-input w-full rounded-xl px-3 py-2 text-sm bg-black/60 border border-white/10 text-foreground focus:border-[var(--gold)]/50 focus:outline-none"
              >
                <option value="service_issue">Service Issue</option>
                <option value="booking_problem">Booking Problem</option>
                <option value="incorrect_charge">Incorrect Charge</option>
                <option value="technical_issue">Technical Issue</option>
                <option value="other">Other / General Cancellation</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wide block mb-1">
                Additional Comments <span className="text-[10px] lowercase text-muted-foreground/60">(optional)</span>
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Provide details about your request (optional)..."
                className="luxury-input w-full rounded-xl px-3 py-2 text-sm h-20 resize-none bg-transparent"
              />
            </div>

            {error && (
              <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 gold-btn py-2.5 rounded-xl text-xs font-semibold hover:opacity-95 transition disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Processing..." : "Confirm & Request Refund"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-muted-foreground hover:text-foreground text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ─── Booking Details Drawer ─────────────────────────── */
function BookingDetailsDrawer({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const s = STATUS_CONFIG[booking.status];
  const SI = s.icon;

  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  const [payingBalance, setPayingBalance] = useState(false);
  const [payingCash, setPayingCash] = useState(false);
  const [payError, setPayError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);

  const rawId = booking._raw?.id ?? Number(String(booking.id).replace(/^(VN-|#VN|VN)/, ""));

  useEffect(() => {
    if (!rawId) return;
    setLoading(true);
    bookingsApi.getById(rawId)
      .then((data) => {
        setDetails(data);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [booking, rawId]);

  const extra = {
    addOns: details?.addOnsDetails || [],
    paymentMethod: details?.paymentMode === 'package_credit' ? 'Package Credit' : (details?.paymentMode === 'pay_at_venue' ? 'Pay at Venue' : 'Pay Now'),
    timeline: [
      { date: booking.checkIn || "", event: "Booking confirmed & paid", done: true },
    ],
    cancellationPolicy: "Booking completed – cancellation not applicable.",
    refundInfo: "Standard refund policy applied.",
  };

  async function handlePayBalanceOnline() {
    if (!rawId || !details) return;
    try {
      setPayingBalance(true);
      setPayError("");
      const balanceAmount = Number(details.totalAmount) - Number(details.advanceAmount);

      const createOrderRes = await paymentsApi.createOrder(Number(rawId), balanceAmount, "razorpay");

      const w = window as any;
      if (!createOrderRes?.keyId || !createOrderRes?.orderId) {
        throw new Error("Unable to create Razorpay order");
      }

      if (!w.Razorpay) throw new Error("Razorpay SDK not loaded");

      const razorpayOptions = {
        key: createOrderRes.keyId,
        amount: createOrderRes.amount,
        currency: "INR",
        name: "VibeNests",
        order_id: createOrderRes.orderId,
        handler: async (response: any) => {
          try {
            const paymentIdFromRazorpay = response?.razorpay_payment_id;
            const signature = response?.razorpay_signature;
            const razorpayOrderId = response?.razorpay_order_id;
            const resp = await paymentsApi.verifyPayment(
              createOrderRes.paymentId,
              razorpayOrderId,
              paymentIdFromRazorpay,
              signature,
            );
            if (resp?.success) {
              const updated = await bookingsApi.getById(rawId);
              setDetails(updated);
              toast.success("Payment successful! The balance amount has been paid.");
            } else {
              throw new Error("Payment verification failed");
            }
          } catch (e: any) {
            setPayError(e?.message || "Payment verification failed");
          } finally {
            setPayingBalance(false);
          }
        },
        prefill: {
          name: "Guest",
          email: details.guestEmail || booking._raw?.guestEmail || "",
          contact: details.guestPhone || booking._raw?.guestPhone || "",
        },
        theme: { color: "#b8972a" },
      };

      const rzp = new w.Razorpay(razorpayOptions);
      rzp.open();
    } catch (e: any) {
      setPayError(e?.message || "Unable to proceed with online payment");
      setPayingBalance(false);
    }
  }

  async function handlePayCash() {
    if (!rawId) return;
    if (!window.confirm("Are you sure you want to select Pay on Cash for the balance amount at the venue?")) return;
    try {
      setPayingCash(true);
      setPayError("");
      const resp = await bookingsApi.payCash(rawId);
      if (resp?.success || resp?.booking) {
        const updated = await bookingsApi.getById(rawId);
        setDetails(updated);
        toast.success("Balance recorded as cash payment. Booking is now confirmed!");
      } else {
        throw new Error("Failed to record cash payment");
      }
    } catch (e: any) {
      setPayError(e?.message || "Failed to record cash payment");
    } finally {
      setPayingCash(false);
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <motion.aside
          initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 240 }}
          className="relative z-10 w-full max-w-lg h-full overflow-y-auto glass-card border-l border-white/10 flex flex-col">
          <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-white/8 bg-[oklch(0.13_0.02_265/0.95)] backdrop-blur-xl">
            <div>
              <p className="text-[10px] font-mono text-muted-foreground tracking-widest">{booking.id}</p>
              <h3 className="font-display text-lg text-foreground leading-tight">{booking.suite}</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${s.bg} ${s.color}`}>
                <SI className="h-3 w-3" />{t("app.userDashboard.status_" + booking.status, s.label)}
              </span>
              <button onClick={onClose} className="h-8 w-8 rounded-xl glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-muted-foreground space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin text-gold" />
              <p className="text-sm">Loading booking details...</p>
            </div>
          ) : (
            <div className="flex-1 p-6 space-y-6">
              <div className="rounded-2xl overflow-hidden">
                {booking.image ? (
                  <img src={booking.image} alt={booking.suite} className="w-full h-44 object-cover" />
                ) : (
                  <div className="w-full h-44 bg-white/[0.03] flex items-center justify-center border-b border-white/5">
                    <BedDouble className="h-12 w-12 text-gold/20" />
                  </div>
                )}

                <div className="glass rounded-b-2xl p-4 grid grid-cols-2 gap-3 border border-white/8 border-t-0">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("app.userDashboard.location", "Location")}</p>
                    <p className="flex items-center gap-1 text-sm text-foreground mt-0.5"><MapPin className="h-3 w-3 text-gold/60" />{booking.location}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("app.userDashboard.duration", "Duration")}</p>
                    <p className="text-sm text-foreground mt-0.5">{booking.nights} {t("app.userDashboard.nights", "Nights")}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("app.userDashboard.checkIn", "Check-in")}</p>
                    <p className="text-sm text-foreground mt-0.5">{formatDateStr(booking.checkIn)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("app.userDashboard.checkOut", "Check-out")}</p>
                    <p className="text-sm text-foreground mt-0.5">{formatDateStr(booking.checkOut)}</p>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gold" />
                  <h4 className="text-sm font-semibold text-foreground">{t("app.userDashboard.selectedAddons", "Selected Add-ons")}</h4>
                </div>
                {extra.addOns.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("app.userDashboard.noAddons", "No add-ons selected.")}</p>
                ) : (
                  <div className="space-y-2">
                    {extra.addOns.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Sparkles className="h-3 w-3 text-gold/60" />{a.name} {a.quantity > 1 ? `x${a.quantity}` : ""}
                        </span>
                        <span className="text-foreground font-medium">₹{(Number(a.price) * Number(a.quantity)).toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass-card rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gold" />
                  <h4 className="text-sm font-semibold text-foreground">{t("app.userDashboard.paymentDetails", "Payment Details")}</h4>
                </div>

                <div className="space-y-2 text-xs border-b border-white/5 pb-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Mode</span>
                    <span className="text-foreground font-medium capitalize">{extra.paymentMethod.replace(/_/g, " ")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base Price</span>
                    <span className="text-foreground">₹{Number(details?.basePrice || 0).toLocaleString("en-IN")}</span>
                  </div>
                  {Number(details?.addonsTotal || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Add-ons Total</span>
                      <span className="text-foreground">₹{Number(details?.addonsTotal || 0).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {Number(details?.savings || 0) > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount / Savings</span>
                      <span>-₹{Number(details?.savings || 0).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {Number(details?.taxes || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxes & Fees</span>
                      <span className="text-foreground">₹{Number(details?.taxes || 0).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-white/5 pt-2 text-sm font-semibold">
                    <span className="text-foreground">Grand Total</span>
                    <span className="text-gold">₹{Number(details?.totalAmount || 0).toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  {details?.paymentMode === 'pay_at_venue' ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Advance Paid (20%)</span>
                        <span className="text-emerald-400 font-medium">₹{Number(details?.advanceAmount || 0).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-foreground font-semibold">Balance Amount (80%)</span>
                        <span className={details?.fullPaymentReceived ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                          ₹{details?.fullPaymentReceived ? "0" : Number(details?.totalAmount - details?.advanceAmount).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-emerald-400 text-sm font-semibold">
                      <span>Amount Paid</span>
                      <span>₹{Number(details?.totalAmount || 0).toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-1">
                    <span className="text-muted-foreground">Payment Status</span>
                    <span className={`font-semibold uppercase ${details?.fullPaymentReceived || details?.paymentMode === 'package_credit' ? "text-emerald-400" : "text-amber-400"}`}>
                      {(details?.fullPaymentReceived || details?.paymentMode === 'package_credit') ? "Fully Paid" : "Advance Paid / Pending Balance"}
                    </span>
                  </div>
                </div>

                {details?.paymentMode === 'pay_at_venue' && !details?.fullPaymentReceived && (
                  <div className="pt-3 border-t border-white/5 space-y-2">
                    {payError && <p className="text-xs text-rose-400">{payError}</p>}
                    <div className="flex gap-2">
                      <button
                        disabled={payingBalance || payingCash}
                        onClick={handlePayBalanceOnline}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gold/30 bg-gold/10 text-gold text-xs font-semibold hover:bg-gold/20 transition disabled:opacity-50"
                      >
                        {payingBalance ? "Processing..." : "Pay Balance Online"}
                      </button>
                      <button
                        disabled={payingBalance || payingCash}
                        onClick={handlePayCash}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition disabled:opacity-50"
                      >
                        {payingCash ? "Processing..." : "Pay on Cash"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="glass-card rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gold" />
                  <h4 className="text-sm font-semibold text-foreground">{t("app.userDashboard.bookingTimeline", "Booking Timeline")}</h4>
                </div>
                <div className="relative pl-5 space-y-4">
                  {extra.timeline.map((tVal, i) => (
                    <div key={i} className="relative flex gap-3">
                      <span className={`absolute -left-5 top-0.5 h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center ${tVal.done ? "border-gold bg-gold/20" : "border-white/20 bg-white/5"}`}>
                        {tVal.done && <span className="h-1.5 w-1.5 rounded-full bg-gold" />}
                      </span>
                      {i < extra.timeline.length - 1 && (
                        <span className="absolute -left-[14.5px] top-4 h-full w-px bg-white/10" />
                      )}
                      <div>
                        <p className={`text-sm ${tVal.done ? "text-foreground" : "text-muted-foreground"}`}>{translateTimelineEvent(tVal.event, t)}</p>
                        <p className="text-[11px] text-muted-foreground">{formatDateStr(tVal.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-gold" />
                  <h4 className="text-sm font-semibold text-foreground">{t("app.userDashboard.invoice", "Invoice")}</h4>
                </div>
                <p className="text-xs text-muted-foreground">{t("app.userDashboard.invoiceDesc", "Invoice #{{id}}-INV · Generated on booking confirmation", { id: booking.id })}</p>
                <button
                  onClick={() => generateBookingInvoicePDF(details || booking, user, details?.addOnsDetails || booking.addons || [])}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gold/30 bg-gold/8 text-gold text-sm hover:bg-gold/15 transition-colors w-full justify-center">
                  <Download className="h-4 w-4" /> {t("app.userDashboard.downloadInvoicePdf", "Download Invoice PDF")}
                </button>
              </div>

              {(
                details?.status === "confirmed" || details?.status === "pending" || booking.status === "confirmed" || booking.status === "pending"
              ) && (
                  <div className="glass-card rounded-2xl p-4 space-y-3 border-gold/20">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-gold" />
                      <h4 className="text-sm font-semibold text-foreground">{t("app.userDashboard.rescheduleBooking", "Reschedule Booking")}</h4>
                    </div>

                    {(() => {
                      const b = details || booking;
                      let isWithin24h = false;
                      if (b?.date && b?.timeSlot) {
                        const parts = b.timeSlot.trim().split(/\s+/);
                        const tParts = parts[0].split(':');
                        let hh = parseInt(tParts[0]);
                        const mm = parseInt(tParts[1]) || 0;
                        const period = parts[1]?.toUpperCase();
                        if (period === 'PM' && hh !== 12) hh += 12;
                        if (period === 'AM' && hh === 12) hh = 0;
                        const dParts = b.date.split('-');
                        if (dParts.length === 3) {
                          const eventDate = new Date(Number(dParts[0]), Number(dParts[1]) - 1, Number(dParts[2]), hh, mm);
                          const hoursBefore = (eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
                          isWithin24h = hoursBefore < 24;
                        }
                      }

                      if (isWithin24h) {
                        return (
                          <div className="text-xs text-rose-400/90 bg-rose-400/10 border border-rose-400/20 p-3 rounded-xl">
                            {t("app.userDashboard.rescheduleWithin24h", "Rescheduling is only allowed up to 24 hours before the scheduled event time.")}
                          </div>
                        );
                      }

                      if ((b.rescheduleCount ?? 0) >= 1) {
                        return (
                          <div className="text-xs text-amber-400/90 bg-amber-400/10 border border-amber-400/20 p-3 rounded-xl">
                            {t("app.userDashboard.alreadyRescheduled", "You have already rescheduled this booking once. Further rescheduling is not permitted.")}
                          </div>
                        );
                      }

                      return (
                        <>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {t("app.userDashboard.rescheduleHint", "Change only the date and time slot. Payment remains the same.")}
                          </p>
                          <button
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gold/30 bg-gold/8 text-gold text-sm hover:bg-gold/15 transition-colors w-full justify-center"
                            onClick={() => {
                              navigate("/user/reschedule/" + rawId, {
                                state: { booking: b }
                              });
                            }}
                          >
                            <CalendarDays className="h-4 w-4" /> {t("app.userDashboard.reschedule", "Reschedule")}
                          </button>
                        </>
                      );
                    })()}

                  </div>
                )}


              <div className="glass-card rounded-2xl p-4 space-y-3 border-rose-500/20">

                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  <h4 className="text-sm font-semibold text-foreground">{t("app.userDashboard.cancellationRefund", "Cancellation & Refund")}</h4>
                </div>
                <div className="space-y-2">
                  <div className="bg-rose-500/8 rounded-xl p-3">
                    <p className="text-xs text-rose-300/90 leading-relaxed">{translateCancellationPolicy(extra.cancellationPolicy, i18n.language, t)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{extra.refundInfo}</p>
                </div>
                {details?.status === 'cancelled' && details?.cancellationReason && !details?.refundRequest && (
                  <div className="mt-3 p-3 rounded-xl border border-rose-500/20 space-y-2 text-xs bg-rose-500/10">
                    <p className="text-rose-300">
                      <span className="font-semibold text-rose-100">Cancellation Reason:</span> {details.cancellationReason}
                    </p>
                  </div>
                )}

                {details?.refundRequest ? (
                  <div className="mt-3 p-3 rounded-xl border border-white/10 space-y-2 text-xs bg-white/[0.02]">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Request Status:</span>
                      <span className={`font-semibold uppercase text-[10px] ${details.refundRequest.status === 'pending'
                        ? "text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full"
                        : details.refundRequest.status === 'approved' || details.refundRequest.status === 'processed'
                          ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full"
                          : "text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full"
                        }`}>
                        {details.refundRequest.status === 'pending' ? 'Cancellation Requested' : details.refundRequest.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground"><span className="text-foreground font-medium">Your Reason:</span> {details.refundRequest.cancellationReason || "No reason provided"}</p>
                    {details.refundRequest.status === 'rejected' && details.refundRequest.rejectionReason && (
                      <p className="text-rose-400/90 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                        <span className="font-semibold text-foreground">Rejection Reason:</span> {details.refundRequest.rejectionReason}
                      </p>
                    )}
                    {(details.refundRequest.status === 'approved' || details.refundRequest.status === 'processed') && (
                      <p className="text-emerald-400/90 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                        Refund of <span className="font-semibold">₹{Number(details.refundRequest.refundableAmount).toLocaleString("en-IN")}</span> processed.
                      </p>
                    )}
                  </div>
                ) : (
                  (booking.status === "confirmed" || booking.status === "pending") && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-500/30 bg-rose-500/8 text-rose-400 text-sm hover:bg-rose-500/15 transition-colors w-full justify-center cursor-pointer"
                    >
                      <XCircle className="h-4 w-4" /> {t("app.userDashboard.requestCancellation", "Request Cancellation")}
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </motion.aside>
      </div>
      {showCancelModal && (
        <RequestCancellationModal
          bookingId={rawId}
          onClose={() => setShowCancelModal(false)}
          onSuccess={async () => {
            const updated = await bookingsApi.getById(rawId);
            setDetails(updated);
          }}
        />
      )}
    </AnimatePresence>
  );
}

/* ─── Booking Card ───────────────────────────────────── */
function BookingCard({ b, onViewDetails }: { b: Booking; onViewDetails: (b: Booking) => void }) {
  const { t } = useTranslation();
  const s = STATUS_CONFIG[b.status];
  const SI = s.icon;
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");

  async function handleJoinNow() {
    // Extract numeric id from "VN-123" or use _raw.id directly
    const rawId = b._raw?.id ?? Number(String(b.id).replace(/^VN-/, ""));
    if (!rawId) { setJoinError("Invalid booking ID"); return; }
    const tab = window.open("", "_blank");
    try {
      setJoinLoading(true);
      setJoinError("");
      const { meeting_link } = await bookingsApi.getMeetingLink(rawId);
      if (tab && !tab.closed) {
        tab.location.href = meeting_link;
      } else {
        const a = document.createElement("a");
        a.href = meeting_link;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (e: any) {
      tab?.close();
      setJoinError(e?.message || "Failed to get meeting link");
    } finally {
      setJoinLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl overflow-hidden flex flex-col sm:flex-row gap-0 hover:border-gold/30 transition-colors">
      {b.image ? (
        <img src={b.image} alt={b.suite} className="w-full sm:w-36 h-40 sm:h-auto object-cover shrink-0" />
      ) : (
        <div className="w-full sm:w-36 h-40 sm:h-auto bg-white/[0.03] flex items-center justify-center shrink-0">
          <BedDouble className="h-12 w-12 text-gold/20" />
        </div>
      )}

      <div className="flex-1 p-5 flex flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground font-mono tracking-wider">{b.id}</p>
            <h4 className="font-display text-lg text-foreground leading-tight mt-0.5">{b.suite}</h4>
            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <MapPin className="h-3 w-3 text-gold/60" />{b.location}
            </p>
          </div>
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${s.bg} ${s.color} shrink-0`}>
            <SI className="h-3 w-3" />{t("app.userDashboard.status_" + b.status, s.label)}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-gold/60" />
              <span>{t("app.userDashboard.checkIn", "Check-in")}: <span className="text-foreground">{formatDateStr(b.checkIn)}</span> · <span className="text-gold">{formatTimeStr(b.checkInTime)}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-muted-foreground/40" />
              <span>{t("app.userDashboard.checkOut", "Check-out")}: <span className="text-foreground">{formatDateStr(b.checkOut)}</span> · <span className="text-muted-foreground">{formatTimeStr(b.checkOutTime)}</span></span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-3">
              <span className="font-display text-xl text-foreground">{fmt(b.amount)}</span>
              <button onClick={() => onViewDetails(b)} className="flex items-center gap-1 text-xs text-gold hover:text-gold/80 transition-colors">
                {t("app.userDashboard.viewDetails", "View Details")} <ChevronRight className="h-3 w-3" />
              </button>
              {b.status === "confirmed" && (
                <button
                  disabled={joinLoading}
                  onClick={handleJoinNow}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/25 text-emerald-400 hover:bg-emerald-400/20 transition-colors disabled:opacity-50"
                >
                  {joinLoading ? t("app.userDashboard.opening", "Opening...") : t("app.userDashboard.joinNow", "Join Now")}
                </button>
              )}
            </div>
            {joinError && <p className="text-[11px] text-destructive">{joinError}</p>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Amenity Icons ──────────────────────────────────── */
const AMENITY_ICONS: Record<string, React.ElementType> = {
  WiFi: Wifi, "Smart TV": Tv, AC: Wind, "Music System": Music,
  Photography: Camera, "Welcome Drinks": Coffee, Cake, Decoration: Sparkles,
};

/* ─── Suite Card ─────────────────────────────────────── */
function SuiteCard({ suite, index, onBookNow }: { suite: ReturnType<typeof useSuitesContext>["suites"][0]; index: number; onBookNow?: () => void }) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07 }}
      className="glass-card rounded-2xl overflow-hidden flex flex-col hover:border-gold/30 transition-colors group">
      {suite.images.length > 0 ? (
        <div className="relative h-44 overflow-hidden">
          <img src={suite.images[0]} alt={suite.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold border ${suite.status === "Active" ? "bg-emerald-400/15 border-emerald-400/30 text-emerald-400" : "bg-amber-400/15 border-amber-400/30 text-amber-400"}`}>{suite.status}</span>
        </div>
      ) : (
        <div className="h-44 bg-white/[0.03] flex items-center justify-center border-b border-white/5 relative">
          <BedDouble className="h-12 w-12 text-gold/20" />
          <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold border ${suite.status === "Active" ? "bg-emerald-400/15 border-emerald-400/30 text-emerald-400" : "bg-amber-400/15 border-amber-400/30 text-amber-400"}`}>{suite.status}</span>
        </div>
      )}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div>
          {/* <p className="text-[10px] font-mono text-muted-foreground tracking-wider">{suite.id}</p> */}
          <h4 className="font-display text-lg text-foreground leading-tight mt-0.5">{suite.name}</h4>
          {suite.occasions && <p className="text-xs text-gold/80 mt-0.5">{suite.occasions}</p>}
        </div>
        {suite.description && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{suite.description}</p>}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/[0.03] rounded-xl px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("app.userDashboard.capacity", "Capacity")}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Users className="h-3 w-3 text-gold/60" />
              <span className="text-sm text-foreground font-medium">{suite.capacity} {t("app.userDashboard.guests", "guests")}</span>
            </div>
          </div>
          <div className="bg-white/[0.03] rounded-xl px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("app.userDashboard.priceNight", "Price / night")}</p>
            <p className="text-sm text-gold font-medium mt-0.5">{suite.price}</p>
          </div>
        </div>
        {suite.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suite.amenities.slice(0, 5).map((a) => {
              const Icon = AMENITY_ICONS[a] ?? Sparkles;
              return (
                <span key={a} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/8 border border-gold/15 text-[10px] text-gold/80">
                  <Icon className="h-2.5 w-2.5" />{a}
                </span>
              );
            })}
            {suite.amenities.length > 5 && (
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-muted-foreground">+{suite.amenities.length - 5}</span>
            )}
          </div>
        )}
        <button onClick={onBookNow} className="mt-auto gold-btn rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-1.5">
          {t("app.userDashboard.bookNow", "Book Now")} <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Transaction Details Modal ──────────────────────── */
function TransactionModal({ txn, onClose }: { txn: Transaction; onClose: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          className="relative z-10 w-full max-w-lg glass-card rounded-2xl p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-mono text-muted-foreground tracking-widest">{txn.id}</p>
              <h3 className="font-display text-xl text-foreground mt-1">{translateTxnDesc(txn.desc, t)}</h3>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-xl glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="glass rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{t("app.userDashboard.amount", "Amount")}</p>
              <p className={`font-display text-2xl ${txn.type === "credit" ? "text-emerald-400" : "text-rose-400"}`}>
                {txn.type === "credit" ? "+" : ""}₹{Math.abs(txn.amount).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="glass rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{t("app.userDashboard.status", "Status")}</p>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${txn.status === "completed" ? "bg-emerald-400/10 text-emerald-400" : txn.status === "pending" ? "bg-amber-400/10 text-amber-400" : "bg-rose-400/10 text-rose-400"}`}>
                {txn.status === "completed" ? <CheckCircle2 className="h-3 w-3" /> : txn.status === "pending" ? <Hourglass className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {t("app.userDashboard.status_" + txn.status, txn.status.charAt(0).toUpperCase() + txn.status.slice(1))}
              </span>
            </div>
          </div>
          <div className="space-y-3 border-t border-white/5 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("app.userDashboard.date", "Date")}</span>
              <span className="text-foreground">{formatDateStr(txn.date)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("app.userDashboard.paymentMethod", "Payment Method")}</span>
              <span className="text-foreground">{translatePaymentMethod(txn.method, t)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("app.userDashboard.category", "Category")}</span>
              <span className="text-foreground capitalize">{txn.category}</span>
            </div>
          </div>
          {txn.invoice && (
            <button onClick={() => generateTransactionInvoicePDF(txn, user)}
              className="w-full gold-btn rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
              <Download className="h-4 w-4" /> {t("app.userDashboard.downloadInvoice", "Download Invoice")}
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/* ─── Section Views ──────────────────────────────────── */
import { Share2, Copy, Gift, Users as UsersIcon, Ticket } from "lucide-react";

function ReferralWidget({ referralStats, refreshReferrals }: { referralStats: any; refreshReferrals?: () => void }) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useTranslation();

  if (!referralStats) {
    return (
      <div className="glass-card rounded-3xl p-6 border border-gold/10 text-center text-muted-foreground text-sm">
        Loading referral details...
      </div>
    );
  }

  if (referralStats.systemEnabled === false) {
    return (
      <div className="glass-card rounded-3xl p-6 border border-white/5 text-center relative overflow-hidden space-y-3">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-rose-500/[0.03] blur-3xl pointer-events-none" />
        <div className="h-10 w-10 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center mx-auto text-rose-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h3 className="font-display text-base text-foreground font-semibold">
          Referral Program Suspended
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          The VibeNests customer referral program is temporarily disabled. Please check back later for updates.
        </p>
      </div>
    );
  }

  const code = referralStats.referralCode;
  const shareLink = `${window.location.origin}/register?ref=${code}`;

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    const shareData = {
      title: "Join VibeNests Luxury!",
      text: `Hey, register on VibeNests using my referral code ${code} and let's get luxury celebration rewards!`,
      url: shareLink,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch (err) {
        console.log(err);
      }
    } else {
      // Fallback: copy link & open whatsapp
      navigator.clipboard.writeText(shareLink);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
        `Hey, register on VibeNests using my referral code ${code} and let's get luxury rewards! Link: ${shareLink}`
      )}`;
      window.open(whatsappUrl, "_blank");
    }
  }

  async function handleRefresh() {
    if (!refreshReferrals) return;
    setRefreshing(true);
    try {
      await refreshReferrals();
    } catch (err) {
      console.error(err);
    } finally {
      // Small timeout to let the user see the premium spin animation
      setTimeout(() => setRefreshing(false), 800);
    }
  }

  return (
    <div className="glass-card rounded-3xl p-6 border border-gold/10 relative overflow-hidden space-y-6">
      {/* Background glow blobs */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-gold/5 blur-3xl pointer-events-none" />

      {/* Header and code block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div className="space-y-1">
          <h3 className="font-display text-lg text-foreground flex items-center gap-2">
            <Gift className="h-5 w-5 text-gold" />
            Invite Friends & Earn Rewards
            {refreshReferrals && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-muted-foreground hover:text-gold hover:border-gold/30 transition-all duration-300 cursor-pointer inline-flex items-center justify-center shadow-sm hover:shadow-gold/10"
                title="Refresh Referral Stats"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-gold" : "hover:rotate-180 transition-transform duration-500"}`} />
              </button>
            )}
          </h3>
          <p className="text-xs text-muted-foreground">
            Share your unique code and get a ₹500 discount coupon when they complete their first booking stay.
          </p>
        </div>

        {/* Code selector */}
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-2xl p-2 shrink-0">
          <div className="px-3 py-1 font-mono text-sm tracking-wider text-gold font-semibold uppercase select-all">
            {code}
          </div>
          <button
            onClick={handleCopy}
            className="p-2 rounded-xl bg-white/[0.05] border border-white/10 text-muted-foreground hover:text-gold hover:border-gold/30 transition-all cursor-pointer"
            title="Copy Referral Code"
          >
            {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            onClick={handleShare}
            className="p-2 rounded-xl bg-white/[0.05] border border-white/10 text-muted-foreground hover:text-gold hover:border-gold/30 transition-all cursor-pointer"
            title="Share Referral Link"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
        {[
          { label: "Total Invites", value: referralStats.totalReferrals, icon: UsersIcon, color: "text-sky-400" },
          { label: "Successful", value: referralStats.successfulReferrals, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Pending", value: referralStats.pendingReferrals, icon: Hourglass, color: "text-amber-400" },
          { label: "Rewards Earned", value: `₹${referralStats.earnedRewards}`, icon: Ticket, color: "text-gold" },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0 ${stat.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-display text-foreground font-semibold">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Earned Coupons table list */}
      {referralStats.rewards && referralStats.rewards.length > 0 && (
        <div className="space-y-2 relative z-10 pt-2 border-t border-white/5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Your Earned Referral Rewards
          </h4>
          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.01]">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-muted-foreground uppercase tracking-wider font-semibold">
                  <th className="px-4 py-2.5">Invited Friend</th>
                  <th className="px-4 py-2.5">Coupon Code</th>
                  <th className="px-4 py-2.5">Value</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {referralStats.rewards.map((rew: any) => (
                  <tr key={rew.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-foreground">{rew.refereeName}</p>
                        <p className="text-[10px] text-muted-foreground">{rew.refereeEmail}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-gold select-all">
                      {rew.couponCode}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      ₹{rew.rewardValue}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-semibold border ${rew.status === 'redeemed'
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : rew.status === 'revoked'
                          ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                          : "bg-gold/10 border-gold/20 text-gold"
                        }`}>
                        {rew.status === 'redeemed' ? 'Redeemed' : rew.status === 'revoked' ? 'Revoked' : 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardView({ onNavigate, referralStats, refreshReferrals }: { onNavigate: (id: string) => void; referralStats: any; refreshReferrals?: () => void }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { suites } = useSuitesContext();

  function handleStartBooking(state?: any) {
    const authUserRaw = localStorage.getItem("authUser");
    const authUser = authUserRaw ? JSON.parse(authUserRaw) : null;
    const isGuest = !authUser || !authUser.id || authUser.fullName === "New Guest" || authUser.fullName === "Guest" || !authUser.email || authUser.email?.endsWith("@phone.local");
    if (isGuest) {
      navigate("/register", { state: { fromBooking: true, suiteId: state?.suiteId } });
      return;
    }
    navigate("/user/suite-booking", { state });
  }
  const activeSuites = suites.filter((s) => s.status === "Active");
  const upcomingSuites = suites.filter((s) => s.status === "Inactive");
  const [dashboardSelected, setDashboardSelected] = useState<Booking | null>(null);
  const [dashboardBookings, setDashboardBookings] = useState<Booking[]>([]);

  useEffect(() => {
    bookingsApi.getAll().then((list) => {
      const mapped: Booking[] = list
        .filter((b: any) => b.status === 'confirmed' || b.status === 'pending')
        .map((b: any) => ({
          id: `VN-${b.id}`,
          suite: b.suiteName || `Suite #${b.suiteId}`,
          location: 'VibeNests, India',
          checkIn: b.date, checkOut: b.date,
          checkInTime: b.timeSlot || '', checkOutTime: b.endTimeSlot || '',
          nights: 1, amount: Number(b.totalAmount) || 0,
          status: b.status as Booking['status'],
          image: b.image || b.suiteImages?.[0],
          _raw: b,
        }));
      setDashboardBookings(mapped);
    }).catch(() => { });
  }, []);

  const statsTranslated = [
    // { label: t("app.userDashboard.totalBookings", "Total Bookings"), value: "12",    icon: CalendarDays },
    // { label: t("app.userDashboard.nightsStayed", "Nights Stayed"),  value: "38",    icon: BedDouble },
    // { label: t("app.userDashboard.totalSpent", "Total Spent"),    value: "₹5.2L", icon: CreditCard },
    // { label: t("app.userDashboard.loyaltyPoints", "Loyalty Points"), value: "4,820", icon: Star },
  ];

  const conciergeCards = [
    { title: t("app.userDashboard.conciergeTitle", "Concierge"), desc: t("app.userDashboard.conciergeDesc", "24/7 dedicated personal assistance for every need"), icon: Phone, accent: "from-sky-500/10" },
    { title: t("app.userDashboard.fineDiningTitle", "Fine Dining"), desc: t("app.userDashboard.fineDiningDesc", "Reserve exclusive in-suite and restaurant dining"), icon: Star, accent: "from-amber-500/10" },
    { title: t("app.userDashboard.spaWellnessTitle", "Spa & Wellness"), desc: t("app.userDashboard.spaWellnessDesc", "Book rejuvenating spa treatments and wellness"), icon: ArrowUpRight, accent: "from-emerald-500/10" },
  ];

  const quickActionsTranslated = [
    { label: t("app.userDashboard.newBooking", "New Booking"), icon: BedDouble, desc: t("app.userDashboard.newBookingDesc", "Explore & reserve suites") },
    // { label: t("app.userDashboard.modifyBooking", "Modify Booking"),    icon: CalendarDays,  desc: t("app.userDashboard.modifyBookingDesc", "Change dates or room type") },
    { label: t("app.userDashboard.contactConcierge", "Contact us"), icon: Phone, desc: t("app.userDashboard.contactConciergeDesc", "24/7 personal assistance") },
    { label: t("app.userDashboard.raiseRequest", "Raise a Request"), icon: MessageSquare, desc: t("app.userDashboard.raiseRequestDesc", "Report issues or requests") },
  ];

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden min-h-[240px] flex items-center"
        style={{ background: "linear-gradient(135deg, oklch(0.12 0.04 270), oklch(0.10 0.03 265))" }}>
        {/* Right side image */}
        <div className="absolute inset-y-0 right-0 w-1/2 hidden md:block">
          <img
            src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=80"
            alt="celebration"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.11_0.04_268)] via-[oklch(0.11_0.04_268/0.6)] to-transparent" />
        </div>
        {/* Mobile full bg */}
        <div className="absolute inset-0 md:hidden">
          <img src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=80" alt="celebration" className="w-full h-full object-cover opacity-20" />
        </div>
        {/* Content */}
        <div className="relative z-10 p-8 space-y-3">
          <h2 className="font-display text-4xl font-medium text-foreground">
            {t("app.userDashboard.makeEvery", "Make Every")}<br /><span className="text-gradient-gold italic">{t("app.userDashboard.momentMemorable", "Moment Memorable")}</span>
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm">{t("app.userDashboard.heroDesc", "Handpicked private suites with premium amenities for your special celebrations.")}</p>
          <button onClick={() => onNavigate("suites")} className="mt-2 gold-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold">
            {t("app.userDashboard.bookYourSuite", "Book Your Suite")} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {/* Loyalty points badge */}
        {/* <div className="absolute right-8 bottom-6 hidden md:block z-10"> */}
        {/* <div className="glass-gold rounded-2xl p-4 text-center min-w-[120px]"> */}
        {/* <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{t("app.userDashboard.loyaltyPoints", "Loyalty Points")}</p> */}
        {/* <p className="font-display text-3xl text-gold">4,820</p> */}
        {/* </div> */}
        {/* </div> */}
      </motion.div>

      {/* Referral Card */}
      <ReferralWidget referralStats={referralStats} refreshReferrals={refreshReferrals} />

      {/* <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsTranslated.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="glass-card rounded-2xl p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-gold" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div> */}

      {/* <div className="grid md:grid-cols-3 gap-4">
        {conciergeCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div key={c.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }}
              className={`glass-card rounded-2xl p-5 bg-gradient-to-br ${c.accent} to-transparent hover:border-gold/30 transition-all cursor-pointer group`}>
              <Icon className="h-5 w-5 text-gold mb-3" />
              <h4 className="font-display text-lg text-foreground">{c.title}</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.desc}</p>
              <div className="mt-4 flex items-center gap-1 text-xs text-gold group-hover:gap-2 transition-all">
                {t("app.userDashboard.explore", "Explore")} <ChevronRight className="h-3 w-3" />
              </div>
            </motion.div>
          );
        })}
      </div> */}

      {dashboardBookings.length > 0 && (
        <div>
          <h3 className="font-display text-xl text-foreground mb-4">{t("app.userDashboard.upcomingStays", "Upcoming Stays")}</h3>
          <div className="space-y-3">
            {dashboardBookings.map((b) => <BookingCard key={b.id} b={b} onViewDetails={setDashboardSelected} />)}
          </div>
        </div>
      )}

      {activeSuites.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl text-foreground">{t("app.userDashboard.availableSuites", "Available Suites")}</h3>
            <span className="px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-[10px] font-bold">
              {t("app.userDashboard.countAvailable", "{{count}} Available", { count: activeSuites.length })}
            </span>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeSuites.map((s, i) => <SuiteCard key={s.id} suite={s} index={i} onBookNow={() => handleStartBooking({ suiteId: s.id })} />)}
          </div>
        </div>
      )}

      {upcomingSuites.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl text-foreground">{t("app.userDashboard.upcomingSuites", "Upcoming Suites")}</h3>
            <span className="px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-[10px] font-bold">{t("app.userDashboard.comingSoon", "Coming Soon")}</span>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {upcomingSuites.map((s, i) => <SuiteCard key={s.id} suite={s} index={i} onBookNow={() => handleStartBooking({ suiteId: s.id })} />)}
          </div>
        </div>
      )}

      {dashboardSelected && <BookingDetailsDrawer booking={dashboardSelected} onClose={() => setDashboardSelected(null)} />}

      <div>
        <h3 className="font-display text-xl text-foreground mb-4">{t("app.userDashboard.quickActions", "Quick Actions")}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActionsTranslated.map((a, i) => {
            const Icon = a.icon;

            let target: "suites" | "help" | null = null;
            if (a.label === t("app.userDashboard.newBooking", "New Booking")) target = "suites";
            if (a.label === t("app.userDashboard.contactConcierge", "Contact us")) target = "help";
            if (a.label === t("app.userDashboard.raiseRequest", "Raise a Request")) target = "help";

            return (
              <motion.button
                key={a.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => target && onNavigate(target)}
                className="glass-card rounded-2xl p-4 text-left hover:border-gold/35 hover:bg-gold/5 transition-all group"
              >
                <div className="h-9 w-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center mb-3">
                  <Icon className="h-4 w-4 text-gold" />
                </div>
                <p className="text-sm font-medium text-foreground">{a.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{a.desc}</p>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SuitesView() {
  const { suites } = useSuitesContext();
  const navigate = useNavigate();
  const { t } = useTranslation();

  function handleStartBooking(state?: any) {
    const authUserRaw = localStorage.getItem("authUser");
    const authUser = authUserRaw ? JSON.parse(authUserRaw) : null;
    const isGuest = !authUser || !authUser.id || authUser.fullName === "New Guest" || authUser.fullName === "Guest" || !authUser.email || authUser.email?.endsWith("@phone.local");
    if (isGuest) {
      navigate("/register", { state: { fromBooking: true } });
      return;
    }
    navigate("/user/suite-booking", { state });
  }

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const filtered = suites.filter((s) => {
    const q = search.toLowerCase();
    return (
      (s.name.toLowerCase().includes(q) || s.occasions.toLowerCase().includes(q)) &&
      (statusFilter === "All" || s.status === statusFilter)
    );
  });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-2xl text-foreground">{t("app.userDashboard.browseSuites", "Browse Suites")}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t("app.userDashboard.browseSuitesDesc", "Explore and book from our luxury suite collection")}</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-xs font-semibold">
          {t("app.userDashboard.countAvailable", "{{count}} Available", { count: suites.filter(s => s.status === "Active").length })}
        </span>
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input type="text" placeholder={t("app.userDashboard.searchPlaceholder", "Search suites or occasions...")} value={search} onChange={(e) => setSearch(e.target.value)}
            className="luxury-input w-full rounded-xl pl-9 pr-4 py-2 text-xs" />
        </div>
        <div className="flex gap-1 glass rounded-xl p-1">
          {["All", "Active", "Inactive"].map((f) => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === f ? "bg-gold/20 text-gold" : "text-muted-foreground hover:text-foreground"}`}>
              {f === "All" ? t("app.userDashboard.filterAll", "All") : f === "Active" ? t("app.userDashboard.filterActive", "Active") : t("app.userDashboard.filterInactive", "Inactive")}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center text-muted-foreground text-sm">{t("app.userDashboard.noSuitesFound", "No suites found.")}</div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s, i) => <SuiteCard key={s.id} suite={s} index={i} onBookNow={() => handleStartBooking({ suiteId: s.id })} />)}
        </div>
      )}
    </div>
  );
}

function BookingListView({ bookings, title, fetchFromApi, statusFilter }: { bookings: Booking[]; title: string; fetchFromApi?: boolean; statusFilter?: 'upcoming' | 'past' }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Booking | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilterLocal, setStatusFilterLocal] = useState("all");
  const [apiBookings, setApiBookings] = useState<Booking[]>([]);
  const [loadingApi, setLoadingApi] = useState(false);

  const fetchBookings = () => {
    if (!fetchFromApi) return;
    bookingsApi.getAll()
      .then((list) => {
        const mapped: Booking[] = list
          .filter((b: any) => {
            if (statusFilter === 'upcoming') return b.status === 'confirmed' || b.status === 'pending';
            if (statusFilter === 'past') return b.status === 'completed' || b.status === 'cancelled' || b.status === 'refunded';
            return true;
          })
          .map((b: any) => ({
            id: `VN-${b.id}`,
            suite: b.suiteName || `Suite #${b.suiteId}`,
            location: "VibeNests, India",
            checkIn: b.date, checkOut: b.date,
            checkInTime: b.timeSlot || "", checkOutTime: b.endTimeSlot || "",
            nights: 1, amount: Number(b.totalAmount) || 0,
            status: b.status as Booking["status"],
            image: b.image || b.suiteImages?.[0],
            _raw: b,
          }));
        setApiBookings(mapped);
      })
      .catch(() => { })
      .finally(() => setLoadingApi(false));
  };

  useEffect(() => {
    if (!fetchFromApi) return;
    setLoadingApi(true);
    fetchBookings();
    const interval = setInterval(fetchBookings, 10000);
    const onFocus = () => fetchBookings();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus); };
  }, [fetchFromApi, statusFilter]);

  const source = fetchFromApi ? apiBookings : bookings;

  function parseDate(str: string) {
    return new Date(str);
  }

  const filtered = source.filter((b) => {
    const checkIn = parseDate(b.checkIn);
    if (fromDate && checkIn < new Date(fromDate)) return false;
    if (toDate && checkIn > new Date(toDate)) return false;
    if (statusFilterLocal !== "all" && b.status !== statusFilterLocal) return false;
    return true;
  });

  const hasFilters = fromDate || toDate || statusFilterLocal !== "all";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-2xl text-foreground">{title}</h3>
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground text-xs">
            {t("app.userDashboard.bookingsCount", "{{count}} bookings", { count: filtered.length })}
          </span>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("app.userDashboard.fromDate", "From")}</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                className="luxury-input rounded-xl px-3 py-1.5 text-xs bg-black/40 text-foreground"
                style={{ colorScheme: "dark" }} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("app.userDashboard.toDate", "To")}</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                className="luxury-input rounded-xl px-3 py-1.5 text-xs bg-black/40 text-foreground"
                style={{ colorScheme: "dark" }} />
            </div>
          </div>
          <div className="flex gap-1 glass rounded-xl p-1">
            {(["all", "confirmed", "pending", "completed", "cancelled"] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilterLocal(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${statusFilterLocal === s ? "bg-gold/20 text-gold" : "text-muted-foreground hover:text-foreground"
                  }`}>
                {s === "all" ? t("app.userDashboard.status_all", "All") : t(`app.userDashboard.status_${s}`, s.charAt(0).toUpperCase() + s.slice(1))}
              </button>
            ))}
          </div>
          {hasFilters && (
            <button onClick={() => { setFromDate(""); setToDate(""); setStatusFilterLocal("all"); }}
              className="text-xs text-rose-400 hover:text-rose-300 transition-colors px-2 py-1.5">
              {t("app.userDashboard.clear", "Clear")}
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0
        ? <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">{loadingApi ? t("app.userDashboard.loadingBookings", "Loading bookings...") : t("app.userDashboard.noBookingsMatch", "No bookings match the selected filters.")}</div>
        : <div className="space-y-3">{filtered.map((b) => <BookingCard key={b.id} b={b} onViewDetails={setSelected} />)}</div>}
      {selected && <BookingDetailsDrawer booking={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function WalletView() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "credit" | "debit">("all");
  const [txnFromDate, setTxnFromDate] = useState("");
  const [txnToDate, setTxnToDate] = useState("");
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>(PAYMENT_METHODS);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    paymentsApi.getMine()
      .then(setPayments)
      .catch((err) => console.error("Failed to load user transactions:", err))
      .finally(() => setLoading(false));
  }, []);

  const transactions: Transaction[] = payments.map((p) => {
    const isRefund = p.status === "refunded";
    const amount = Number(p.amount || 0);
    return {
      id: `TXN-${p.id}`,
      desc: isRefund
        ? t("app.userDashboard.txnDescRefund", "Refund – Cancelled Booking {{id}}", { id: p.bookingId })
        : t("app.userDashboard.txnDescBookingPayment", "Booking Payment – {{suite}} {{id}}", { suite: p.booking?.suiteName || `Suite #${p.booking?.suiteId ?? ''}`, id: p.bookingId }),
      amount: isRefund ? amount : -amount,
      type: isRefund ? "credit" : "debit",
      date: p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "—",
      status: p.status === "success" ? "completed" : p.status === "pending" ? "pending" : "failed",
      category: isRefund ? "refund" : "booking",
      method: p.method || "Other",
      invoice: p.bookingId ? `INV-${p.bookingId}` : undefined,
      booking: p.booking,
    };
  });

  function parseTxnDate(str: string) {
    return new Date(str);
  }

  const filtered = transactions.filter((tVal) => {
    const matchSearch = tVal.desc.toLowerCase().includes(searchTerm.toLowerCase()) || tVal.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === "all" || tVal.type === filterType;
    const d = parseTxnDate(tVal.date);
    const matchFrom = !txnFromDate || d >= new Date(txnFromDate);
    const matchTo = !txnToDate || d <= new Date(txnToDate + "T23:59:59");
    return matchSearch && matchType && matchFrom && matchTo;
  });

  const hasDateFilter = txnFromDate || txnToDate;

  const totalCredit = transactions.filter((tVal) => tVal.type === "credit").reduce((s, tVal) => s + tVal.amount, 0);
  const totalDebit = transactions.filter((tVal) => tVal.type === "debit").reduce((s, tVal) => s + Math.abs(tVal.amount), 0);

  function setDefault(id: string) {
    setMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })));
  }
  function deleteMethod(id: string) {
    setMethods((prev) => prev.filter((m) => m.id !== id));
  }

  const walletActions = [
    { label: t("app.userDashboard.addMoney", "Add Money"), icon: Plus, color: "emerald" },
    { label: t("app.userDashboard.transactions", "Transactions"), icon: Receipt, color: "sky" },
    { label: t("app.userDashboard.importStatement", "Import Statement"), icon: Download, color: "violet" },
    { label: t("app.userDashboard.paymentMethods", "Payment Methods"), icon: CreditCard, color: "amber" },
    { label: t("app.userDashboard.refunds", "Refunds"), icon: RefreshCw, color: "rose" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl text-foreground">{t("app.userDashboard.walletPayments", "Payments")}</h3>
        {/* <span className="px-3 py-1 rounded-full bg-gold/10 border border-gold/25 text-gold text-xs font-semibold">{t("app.userDashboard.premiumMember", "Premium Member")}</span> */}
      </div>

      {/* Balance Cards */}
      {/* <div className="grid md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass-card rounded-2xl p-6 bg-gradient-to-br from-gold/10 to-transparent border-gold/25 md:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{t("app.userDashboard.availableBalance", "Available Balance")}</p>
              <p className="font-display text-5xl text-gold">₹{(12400 + totalCredit - totalDebit).toLocaleString("en-IN")}</p>
              <p className="text-xs text-muted-foreground mt-2">{t("app.userDashboard.walletCreditsRefunds", "Wallet credits & refunds")}</p>
            </div>
            <Wallet className="h-8 w-8 text-gold/40" />
          </div>
          <div className="flex gap-3">
            <button className="flex-1 gold-btn rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" /> {t("app.userDashboard.addMoney", "Add Money")}
            </button>
            <button className="flex-1 glass rounded-xl py-2.5 text-sm font-semibold text-gold border border-gold/30 hover:bg-gold/10 transition-colors flex items-center justify-center gap-2">
              <ArrowUpRight className="h-4 w-4" /> {t("app.userDashboard.withdraw", "Withdraw")}
            </button>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-6">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{t("app.userDashboard.loyaltyPoints", "Loyalty Points")}</p>
          <p className="font-display text-4xl text-foreground">4,820</p>
          <p className="text-xs text-muted-foreground mt-2">{t("app.userDashboard.loyaltyPointsDesc", "Earn 1 pt = ₹10 spent")}</p>
          <button className="mt-4 w-full glass rounded-xl py-2 text-xs font-semibold text-gold border border-gold/20 hover:bg-gold/10 transition-colors">{t("app.userDashboard.redeemPoints", "Redeem Points")}</button>
        </motion.div>
      </div> */}

      {/* Quick Actions */}
      {/* <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {walletActions.map((a, i) => {
          const Icon = a.icon;
          return (
            <motion.button key={a.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + i * 0.05 }}
              className="glass-card rounded-2xl p-4 text-left hover:border-gold/35 hover:bg-gold/5 transition-all group">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center mb-3 bg-${a.color}-400/10 border border-${a.color}-400/20`}>
                <Icon className={`h-4 w-4 text-${a.color}-400`} />
              </div>
              <p className="text-sm font-medium text-foreground">{a.label}</p>
            </motion.button>
          );
        })}
      </div> */}

      {/* Analytics */}
      {/* <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-display text-lg text-foreground">{t("app.userDashboard.paymentAnalytics", "Payment Analytics")}</h4>
          <BarChart3 className="h-5 w-5 text-gold" />
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("app.userDashboard.totalCredits", "Total Credits")}</p>
            </div>
            <p className="font-display text-2xl text-emerald-400">₹{totalCredit.toLocaleString("en-IN")}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-rose-400" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("app.userDashboard.totalDebits", "Total Debits")}</p>
            </div>
            <p className="font-display text-2xl text-rose-400">₹{totalDebit.toLocaleString("en-IN")}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-gold" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("app.userDashboard.netFlow", "Net Flow")}</p>
            </div>
            <p className="font-display text-2xl text-gold">₹{(totalCredit - totalDebit).toLocaleString("en-IN")}</p>
          </div>
        </div>
      </motion.div> */}

      {/* Saved Payment Methods */}
      {/* <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-display text-lg text-foreground">{t("app.userDashboard.savedPaymentMethods", "Saved Payment Methods")}</h4>
          <button className="flex items-center gap-1.5 text-sm text-gold hover:text-gold/80 transition-colors">
            <Plus className="h-4 w-4" /> {t("app.userDashboard.addNew", "Add New")}
          </button>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {methods.map((pm) => {
            const Icon = pm.type === "upi" ? Smartphone : pm.type === "bank" ? Building2 : CreditCard;
            const accent = pm.type === "visa" ? "sky" : pm.type === "mastercard" ? "amber" : pm.type === "upi" ? "emerald" : "purple";
            return (
              <div key={pm.id} className="glass rounded-xl p-4 hover:border-gold/30 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center bg-${accent}-400/10 border border-${accent}-400/20`}>
                      <Icon className={`h-5 w-5 text-${accent}-400`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{pm.label}</p>
                      {pm.last4 && <p className="text-xs text-muted-foreground">•••• {pm.last4}</p>}
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{pm.type}</p>
                    </div>
                  </div>
                  {pm.isDefault && (
                    <span className="px-2 py-0.5 rounded-full bg-gold/10 border border-gold/25 text-gold text-[10px] font-bold">{t("app.userDashboard.default", "DEFAULT")}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 glass rounded-lg py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-gold/20 transition-colors flex items-center justify-center gap-1.5">
                    <Edit3 className="h-3 w-3" /> {t("app.userDashboard.edit", "Edit")}
                  </button>
                  <button onClick={() => deleteMethod(pm.id)}
                    className="flex-1 glass rounded-lg py-1.5 text-xs text-muted-foreground hover:text-rose-400 hover:border-rose-400/20 transition-colors flex items-center justify-center gap-1.5">
                    <Trash2 className="h-3 w-3" /> {t("app.userDashboard.delete", "Delete")}
                  </button>
                  {!pm.isDefault && (
                    <button onClick={() => setDefault(pm.id)}
                      className="flex-1 glass rounded-lg py-1.5 text-xs text-gold hover:bg-gold/10 transition-colors flex items-center justify-center gap-1.5">
                      <Star className="h-3 w-3" /> {t("app.userDashboard.setDefault", "Default")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div> */}

      {/* Recent Transactions */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h4 className="font-display text-lg text-foreground">{t("app.userDashboard.recentTransactions", "Recent Transactions")}</h4>
          <div className="flex flex-wrap gap-2">
            {/* Date filters */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("app.userDashboard.fromDate", "From")}</label>
                <input
                  type="date"
                  value={txnFromDate}
                  onChange={(e) => setTxnFromDate(e.target.value)}
                  className="luxury-input rounded-xl px-3 py-1.5 text-xs bg-black/40 text-foreground"
                  style={{ colorScheme: "dark" }}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("app.userDashboard.toDate", "To")}</label>
                <input
                  type="date"
                  value={txnToDate}
                  onChange={(e) => setTxnToDate(e.target.value)}
                  className="luxury-input rounded-xl px-3 py-1.5 text-xs bg-black/40 text-foreground"
                  style={{ colorScheme: "dark" }}
                />
              </div>
              {hasDateFilter && (
                <button
                  onClick={() => { setTxnFromDate(""); setTxnToDate(""); }}
                  className="self-end text-xs text-rose-400 hover:text-rose-300 transition-colors px-2 py-1.5 border border-rose-400/20 rounded-lg"
                >
                  {t("app.userDashboard.clear", "Clear")}
                </button>
              )}
            </div>
            <button
              onClick={() => exportToCSV(filtered, "My_Transactions.csv")}
              className="flex items-center gap-2 text-xs font-semibold gold-btn px-4 py-2 rounded-xl shadow-md shadow-gold/15 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
            >
              <Download className="h-4 w-4" /> {t("app.userDashboard.downloadStatement", "Download Statement")}
            </button>
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t("app.userDashboard.searchPlaceholderShort", "Search...")}
                className="luxury-input w-full sm:w-48 rounded-xl pl-9 pr-3 py-2 text-xs text-foreground bg-transparent" />
            </div>
            <div className="flex gap-1 glass rounded-xl p-1">
              {(["all", "credit", "debit"] as const).map((f) => (
                <button key={f} onClick={() => setFilterType(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === f ? "bg-gold/20 text-gold" : "text-muted-foreground hover:text-foreground"}`}>
                  {f === "all" ? t("app.userDashboard.filterAll", "All") : f === "credit" ? t("app.userDashboard.filterCredits", "Credits") : t("app.userDashboard.filterDebits", "Debits")}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {filtered.map((tVal, i) => (
            <motion.div key={tVal.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className="glass rounded-xl p-4 hover:border-gold/30 transition-colors cursor-pointer group"
              onClick={() => setSelectedTxn(tVal)}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${tVal.type === "credit" ? "bg-emerald-400/10 border border-emerald-400/25" : "bg-rose-400/10 border border-rose-400/25"}`}>
                    {tVal.type === "credit"
                      ? <ArrowDownLeft className="h-5 w-5 text-emerald-400" />
                      : <ArrowUpLeft className="h-5 w-5 text-rose-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">{translateTxnDesc(tVal.desc, t)}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">{formatDateStr(tVal.date)}</p>
                      <span className="text-muted-foreground">•</span>
                      <p className="text-xs text-muted-foreground font-mono">{tVal.id}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className={`font-display text-lg ${tVal.type === "credit" ? "text-emerald-400" : "text-rose-400"}`}>
                      {tVal.type === "credit" ? "+" : "-"}₹{Math.abs(tVal.amount).toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{tVal.category}</p>
                  </div>
                  <Eye className="h-4 w-4 text-muted-foreground group-hover:text-gold transition-colors" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">{t("app.userDashboard.noTransactionsFound", "No transactions found.")}</div>
        )}
      </motion.div>

      {selectedTxn && <TransactionModal txn={selectedTxn} onClose={() => setSelectedTxn(null)} />}
    </div>
  );
}

/* ─── Refund Requests View ────────────────────────────── */
function RefundRequestsView() {
  const { t } = useTranslation();
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchRefunds = () => {
    setLoading(true);
    setError("");
    refundsApi.getAll()
      .then((res) => {
        setRefunds(res.data || []);
      })
      .catch((err) => {
        console.error("Failed to load refunds:", err);
        setError(err?.message || "Failed to load refund history.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const filtered = refunds.filter((r) => {
    const matchSearch =
      String(r.id).includes(searchTerm) ||
      String(r.bookingId).includes(searchTerm) ||
      (r.referenceId && r.referenceId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.policyTier && r.policyTier.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "under_review":
        return "text-orange-400 bg-orange-500/10 border-orange-500/20";
      case "approved":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "processing":
        return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "refunded":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "rejected":
        return "text-rose-400 bg-rose-500/10 border-rose-500/20";
      default:
        return "text-muted-foreground bg-white/5 border-white/10";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-2xl text-foreground">Refund Requests</h3>
          <p className="text-xs text-muted-foreground mt-1">Monitor and track your automated refund requests</p>
        </div>
        <button
          onClick={fetchRefunds}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gold/30 bg-gold/8 text-gold text-xs hover:bg-gold/15 transition-colors cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5 animate-spin-hover" /> Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ID or booking..."
            className="luxury-input w-full rounded-xl pl-9 pr-3 py-2 text-xs text-foreground bg-transparent focus:border-[var(--gold)]/50 focus:outline-none"
          />
        </div>
        <div className="flex gap-1 glass rounded-xl p-1 w-full sm:w-auto overflow-x-auto scrollbar-none">
          {(["all", "pending", "approved", "processing", "refunded", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors shrink-0 ${statusFilter === s ? "bg-gold/20 text-gold" : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-gold" />
          <p className="text-xs uppercase tracking-widest animate-pulse">Loading refund requests...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          No refund requests found.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => {
            const hasGatewayDeduction = Number(r.gatewayChargeAmount) > 0;
            const originalAmount = Number(r.originalAmount || 0);
            const refundableAmount = Number(r.refundableAmount || 0);
            const refundPercent = r.selectedPercentage ?? 0;
            const deductionAmount = Number(r.deductionAmount || (originalAmount - refundableAmount));

            return (
              <div key={r.id} className="glass-card rounded-2xl p-6 border border-white/5 bg-white/[0.01] space-y-4 hover:border-gold/20 transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h4 className="font-display text-base text-foreground font-semibold">Refund Request #{r.id}</h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(r.status)}`}>
                        {r.status === 'pending' ? 'cancellation requested' : r.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Booking: <span className="text-foreground">#{r.bookingId}</span> · Requested: {formatDateStr(r.createdAt)}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-xs text-muted-foreground">Refund Value</p>
                    <p className="font-display text-xl text-gold font-bold">₹{refundableAmount.toLocaleString("en-IN")}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                  {/* Left Column: Details */}
                  <div className="space-y-2.5 border-b border-white/5 pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-4">
                    <h5 className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Policy & Calculation</h5>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Policy Tier:</span>
                        <span className="text-foreground font-medium">{r.policyTier || "Standard"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Refund Percentage:</span>
                        <span className="text-foreground font-medium">{refundPercent}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Original Paid:</span>
                        <span className="text-foreground font-medium">₹{originalAmount.toLocaleString("en-IN")}</span>
                      </div>
                      {hasGatewayDeduction && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Gateway Charge (2%):</span>
                          <span className="text-rose-400 font-medium">-₹{Number(r.gatewayChargeAmount).toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      {deductionAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cancellation Deduction:</span>
                          <span className="text-rose-400 font-medium">-₹{deductionAmount.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-white/5 pt-1.5 font-bold">
                        <span className="text-gold">Total Refund:</span>
                        <span className="text-gold">₹{refundableAmount.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Request Info */}
                  <div className="space-y-2.5 border-b border-white/5 pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-4">
                    <h5 className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Request Details</h5>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Category:</span>
                        <span className="text-foreground font-medium capitalize">{String(r.refundReason || "other").replace("_", " ")}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground">Comments:</span>
                        <p className="text-foreground leading-relaxed italic bg-white/[0.02] border border-white/5 p-2 rounded-lg min-h-[50px]">
                          {r.customerMessage || "No additional comments provided."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: References & Rejections */}
                  <div className="space-y-2.5">
                    <h5 className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Processing Details</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Auto-Processed:</span>
                        <span className="text-foreground font-medium">{r.autoProcessed ? "Yes (Automated)" : "No (Manual Override)"}</span>
                      </div>
                      {r.referenceId && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-muted-foreground">Reference/Transaction ID:</span>
                          <span className="font-mono text-foreground font-semibold select-all bg-white/[0.03] border border-white/5 px-2 py-0.5 rounded text-[11px] block truncate">
                            {r.referenceId}
                          </span>
                        </div>
                      )}
                      {r.completedAt && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Completed At:</span>
                          <span className="text-foreground font-medium">{formatDateStr(r.completedAt)}</span>
                        </div>
                      )}
                      {r.status === "rejected" && r.rejectionReason && (
                        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-2.5 mt-1 text-rose-400">
                          <p className="font-semibold mb-0.5">Rejection Reason:</p>
                          <p className="leading-relaxed text-[11px]">{r.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="border-t border-white/5 pt-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>Processing Timeline:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-gold" />
                        <span className="text-foreground">Submitted ({formatDateStr(r.createdAt)})</span>
                      </div>
                      <ChevronRight className="h-3 w-3" />
                      {r.status === "rejected" ? (
                        <div className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                          <span className="text-rose-400">Rejected ({formatDateStr(r.rejectedAt || r.updatedAt)})</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1">
                            <span className={`h-2 w-2 rounded-full ${r.approvedAt || r.status !== 'pending' ? "bg-emerald-500" : "bg-white/20"}`} />
                            <span className={r.approvedAt || r.status !== 'pending' ? "text-foreground" : ""}>
                              Approved {r.approvedAt && `(${formatDateStr(r.approvedAt)})`}
                            </span>
                          </div>
                          <ChevronRight className="h-3 w-3" />
                          <div className="flex items-center gap-1">
                            <span className={`h-2 w-2 rounded-full ${['processing', 'refunded'].includes(r.status) ? "bg-emerald-500" : "bg-white/20"}`} />
                            <span className={['processing', 'refunded'].includes(r.status) ? "text-foreground" : ""}>Processing</span>
                          </div>
                          <ChevronRight className="h-3 w-3" />
                          <div className="flex items-center gap-1">
                            <span className={`h-2 w-2 rounded-full ${r.status === "refunded" ? "bg-emerald-500" : "bg-white/20"}`} />
                            <span className={r.status === "refunded" ? "text-foreground" : ""}>
                              Refunded {r.completedAt && `(${formatDateStr(r.completedAt)})`}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Celebration Memberships View ─────────────────────── */
function CelebrationMembershipsView() {
  const { t } = useTranslation();
  const { suites } = useSuitesContext();
  const navigate = useNavigate();

  function handleStartBooking(state?: any) {
    const authUserRaw = localStorage.getItem("authUser");
    const authUser = authUserRaw ? JSON.parse(authUserRaw) : null;
    const isGuest = !authUser || !authUser.id || authUser.fullName === "New Guest" || authUser.fullName === "Guest" || !authUser.email || authUser.email?.endsWith("@phone.local");
    if (isGuest) {
      navigate("/register", { state: { fromBooking: true } });
      return;
    }
    navigate("/user/suite-booking", { state });
  }
  const [plans, setPlans] = useState<any[]>([]);
  const [myActive, setMyActive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const pData = await membershipsApi.getPlans();
      // Display all active membership plans
      setPlans(Array.isArray(pData) ? pData.filter(p => p.status === 'active') : []);
      const activeData = await membershipsApi.getMyActive();
      setMyActive(activeData || null);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load package data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-gold" />
        <p className="mt-3 text-xs text-muted-foreground uppercase tracking-widest animate-pulse">Loading Packages...</p>
      </div>
    );
  }

  // Parse active membership benefits
  const activeBenefits = myActive
    ? (Array.isArray(myActive.plan?.benefits)
      ? myActive.plan.benefits
      : typeof myActive.plan?.benefits === 'string'
        ? myActive.plan.benefits.split(',')
        : (myActive.planName?.toLowerCase().includes('gold') || !myActive.planName?.toLowerCase().includes('silver'))
          ? [
            '15 free bookings on eligible suites',
            '24/7 dedicated support desk',
            '1 complimentary add-on per booking',
            'Free late check-out (up to 2 hours)'
          ]
          : [
            '5 free bookings on eligible suites',
            'Priority customer support',
            'Complimentary soft drinks during stays'
          ])
    : [];

  const isActive = myActive && myActive.status === 'active';
  const isGoldActive = isActive && (myActive.planName?.toLowerCase().includes('gold') || !myActive.planName?.toLowerCase().includes('silver'));
  const isExpired = myActive && myActive.status === 'expired';
  const activeSuiteNames = myActive
    ? (myActive.eligibleSuites || [])
      .map((id: any) => suites.find((s: any) => String(s.id) === String(id))?.name || `Suite #${id}`)
      .join(", ")
    : "";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Success banner */}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-400 hover:text-emerald-300 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Error banner */}
      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl flex justify-between items-center text-xs">
          <span>✕ {errorMsg}</span>
          <button onClick={() => setErrorMsg("")} className="text-rose-400 hover:text-rose-300 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Active Membership Dashboard Block */}
      {myActive ? (
        <div className={`glass-card rounded-3xl border p-6 relative overflow-hidden transition-all duration-300 ${isExpired
          ? "border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent"
          : isGoldActive
            ? "border-gold/30 bg-gradient-to-br from-gold/20 via-gold/5 to-transparent"
            : "border-slate-400/30 bg-gradient-to-br from-slate-400/20 via-slate-400/5 to-transparent"
          }`}>
          <div className={`absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 h-52 w-52 rounded-full blur-3xl pointer-events-none ${isExpired ? "bg-rose-500/5" : (isGoldActive ? "bg-gold/10" : "bg-slate-400/10")
            }`} />
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest border ${isExpired
                  ? "bg-rose-500/25 text-rose-400 border-rose-500/30"
                  : isGoldActive
                    ? "bg-gold/25 text-gold border-gold/30"
                    : "bg-slate-400/25 text-slate-200 border-slate-400/30"
                  }`}>
                  {isExpired ? "⚠ Expired" : `★ ${myActive.planName} Member`}
                </span>
                <h3 className="font-display text-2xl font-bold tracking-wide text-foreground">
                  {isExpired
                    ? `Your VibeNests ${myActive.planName} Membership has Expired`
                    : `You are a VibeNests ${myActive.planName} Member`}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isExpired
                    ? "Your luxury celebration journey has paused. Please renew your package to restore booking credits."
                    : "Book eligible luxury suites for free using your package credits."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs font-mono text-muted-foreground bg-black/30 border border-white/5 p-4 rounded-2xl w-full md:w-auto shrink-0">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Activation Date</p>
                    <p className="text-foreground font-semibold">{new Date(myActive.activationDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Expiry Date</p>
                    <p className={`font-semibold ${isExpired ? "text-rose-400 font-bold" : "text-foreground"}`}>{new Date(myActive.expiryDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Total Bookings Allowed</p>
                    <p className="text-foreground font-semibold font-mono">{myActive.maxFreeBookings ?? 10}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Bookings Used</p>
                    <p className="text-foreground font-semibold font-mono">{myActive.bookingsUsed ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Remaining Bookings</p>
                    <p className={`${isExpired ? "text-rose-400/70" : "text-emerald-400"} font-bold font-mono`}>
                      {Math.max(0, (myActive.maxFreeBookings ?? 10) - (myActive.bookingsUsed ?? 0))}
                    </p>
                  </div>
                </div>
                {isExpired && myActive.plan && (
                  <button
                    onClick={() => navigate("/user/suite-booking", { state: { package: myActive.plan, isMembershipPurchase: true } })}
                    className="gold-btn rounded-2xl px-6 py-3.5 text-xs font-bold uppercase tracking-wider shrink-0"
                  >
                    Renew Now
                  </button>
                )}
              </div>
            </div>

            {/* Eligible Suites */}
            {activeSuiteNames && (
              <div className="border-t border-white/5 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Eligible Suites</p>
                <p className="text-xs text-foreground/80 leading-relaxed font-semibold">{activeSuiteNames}</p>
              </div>
            )}

          </div>
        </div>
      ) : (
        <div className="glass-card rounded-3xl border border-white/5 p-6 bg-gradient-to-br from-white/5 to-transparent">
          <h3 className="font-display text-xl text-foreground font-semibold">Unlock Exclusive Private Luxury Packages</h3>
          <p className="text-xs text-muted-foreground mt-1">Purchase a Membership Package to enjoy prepaid free bookings on eligible suites and priority support.</p>
        </div>
      )}

      {/* Available Plans Grid */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">Available Package Options</p>
        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan) => {
            const isGold = plan.name?.toLowerCase().includes("gold") || !plan.name?.toLowerCase().includes("silver");
            const isCurrent = myActive && myActive.planName === plan.name;
            const benefitsArray = Array.isArray(plan.benefits)
              ? plan.benefits
              : typeof plan.benefits === "string"
                ? (plan.benefits as string).split(",")
                : [];
            const planSuiteNames = (plan.eligibleSuites || [])
              .map((id: any) => suites.find((s: any) => String(s.id) === String(id))?.name || `Suite #${id}`)
              .join(", ");

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl border p-6 flex flex-col justify-between overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-gold/30 ${isGold
                  ? "border-gold/25 bg-gradient-to-b from-gold/10 via-transparent to-transparent shadow-[0_20px_50px_rgba(212,160,60,0.03)]"
                  : "border-slate-500/20 bg-gradient-to-b from-slate-500/10 via-transparent to-transparent"
                  }`}
              >
                <div>
                  {/* Plan Badge */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="font-display text-2xl font-bold tracking-wide text-foreground">
                        {plan.name} Package
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">Validity: {plan.validityDays} Days ({plan.validityType || "yearly"})</p>
                    </div>
                    {isCurrent && (
                      <span className="px-3 py-1 rounded-full bg-gold/20 text-gold border border-gold/30 text-[10px] font-bold uppercase tracking-wider">
                        Active Package
                      </span>
                    )}
                  </div>

                  {/* Pricing / Offer */}
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="font-display text-4xl font-bold text-gold">₹{Number(plan.price).toLocaleString("en-IN")}</span>
                    <span className="text-xs text-muted-foreground">/ {plan.validityDays} Days</span>
                  </div>

                  {/* Highlighted free bookings offer */}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 mb-6 flex items-center justify-between text-xs text-emerald-400">
                    <span className="font-semibold">Free Bookings Limit:</span>
                    <span className="font-display text-lg font-bold">{plan.maxFreeBookings ?? 10} Bookings</span>
                  </div>

                  {/* Eligible suites */}
                  <div className="border-t border-white/5 pt-4 mb-6">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Eligible Suites</p>
                    <p className="text-xs text-foreground/95 font-semibold leading-relaxed">{planSuiteNames || "None"}</p>
                  </div>


                  {/* Terms */}
                  {plan.terms && (
                    <div className="border-t border-white/5 pt-4 mb-6">
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Terms & Conditions</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{plan.terms}</p>
                    </div>
                  )}
                </div>

                {/* Dynamic Subscribe / Renew / Upgrade Actions */}
                {(() => {
                  if (!myActive) {
                    return (
                      <button
                        onClick={() => handleStartBooking({ package: plan, isMembershipPurchase: true })}
                        className="gold-btn w-full rounded-2xl py-3 text-xs font-bold uppercase tracking-wider"
                      >
                        Buy Now
                      </button>
                    );
                  }

                  if (plan.name === myActive.planName) {
                    if (isExpired) {
                      return (
                        <button
                          onClick={() => handleStartBooking({ package: plan, isMembershipPurchase: true })}
                          className="gold-btn w-full rounded-2xl py-3 text-xs font-bold uppercase tracking-wider"
                        >
                          Renew Now
                        </button>
                      );
                    }
                    return (
                      <button
                        disabled
                        className="w-full rounded-2xl py-3 text-xs font-bold uppercase tracking-wider border border-gold/25 text-gold bg-gold/5 cursor-not-allowed"
                      >
                        You are already a {plan.name.toLowerCase()} member
                      </button>
                    );
                  }

                  const currentPrice = Number(myActive.plan?.price || 0);
                  const planPrice = Number(plan.price || 0);
                  if (planPrice > currentPrice) {
                    return (
                      <button
                        onClick={() => handleStartBooking({ package: plan, isMembershipPurchase: true })}
                        className="gold-btn w-full rounded-2xl py-3 text-xs font-extrabold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-gold text-black hover:from-amber-600 hover:to-gold/90 shadow-lg border border-gold"
                      >
                        Upgrade Now
                      </button>
                    );
                  }

                  return (
                    <button
                      disabled
                      className="w-full rounded-2xl py-3 text-xs font-bold uppercase tracking-wider border border-white/10 text-muted-foreground bg-white/5 cursor-not-allowed"
                    >
                      {myActive.planName} Package Active
                    </button>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OffersView() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tab, setTab] = useState<"offers" | "coupons">("offers");
  const [copiedCode, setCopiedCode] = useState("");

  const [coupons, setCoupons] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // Use public /coupons/active endpoint (no auth required)
        const cList = await couponsApi.getActive();
        setCoupons(Array.isArray(cList) ? cList : []);

        // Use public /offers/active endpoint (no auth required)
        const oList = await offersApi.getActive();
        setOffers(Array.isArray(oList) ? oList : []);
      } catch (err) {
        console.warn("Failed to load offers/coupons in user dashboard", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  }

  // Dynamically generated referral details per user
  const referralCode = (user?.fullName ? user.fullName.replace(/\s+/g, "").toUpperCase().slice(0, 5) : "VIBE") + (user?.id || "");
  const friendsCount = String((user?.id || 0) % 4);
  const bookingsCount = String(Math.max(0, ((user?.id || 0) % 4) - 1));
  const rewardsEarned = `₹${(Math.max(0, ((user?.id || 0) % 4) - 1) * 500).toLocaleString("en-IN")}`;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-gold/10 animate-ping" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold animate-spin" />
        </div>
        <p className="mt-3 text-xs text-muted-foreground tracking-widest uppercase animate-pulse">
          {t("app.userDashboard.loadingOffers", "Loading offers...")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl text-foreground">{t("app.userDashboard.specialOffersReferrals", "Special Offers")}</h3>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 glass rounded-xl p-1 w-fit">
        {(["offers", "coupons"] as const).map((tVal) => (
          <button key={tVal} onClick={() => setTab(tVal)}
            className={`px-4 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${tab === tVal ? "bg-gold/20 text-gold" : "text-muted-foreground hover:text-foreground"
              }`}>
            {tVal === "offers" ? t("app.userDashboard.tabOffers", "Offers") : t("app.userDashboard.tabCoupons", "Coupons")}
          </button>
        ))}
      </div>

      {/* Offers Tab */}
      {tab === "offers" && (
        <div className="grid md:grid-cols-2 gap-4">
          {offers.length === 0 && (
            <div className="col-span-2 text-center py-12 glass-card rounded-2xl border border-white/5">
              <p className="text-sm text-muted-foreground">{t("app.userDashboard.noOffersAvailable", "No active offers available at the moment.")}</p>
            </div>
          )}
          {offers.map((o) => {
            const badge = o.discountType === 'percentage' ? `${o.discountValue}% OFF` : `₹${o.discountValue} OFF`;
            const expires = o.endDate ? formatDateStr(o.endDate) : '';
            return (
              <div key={o.id} className="glass-card rounded-2xl p-5 hover:border-gold/30 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h4 className="font-display text-lg text-foreground">{o.title}</h4>
                  <span className="px-2.5 py-1 rounded-full border border-gold/40 text-gold bg-gold/10 text-[10px] font-bold tracking-widest shrink-0">{badge}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{o.description || "Special offer discount package"}</p>
                {expires && <p className="text-[11px] text-muted-foreground mt-3">{t("app.userDashboard.validUntil", "Valid until {{date}}", { date: expires })}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Referrals Tab */}
      {/* {tab === "referrals" && ( */}
      {/* <div className="space-y-5"> */}
      {/* Referral Code Card */}
      {/* <div className="glass-card rounded-2xl p-6 bg-gradient-to-br from-gold/10 to-transparent border-gold/25">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{t("app.userDashboard.yourReferralCode", "Your Referral Code")}</p>
                <p className="font-display text-4xl text-gold tracking-widest">{referralCode}</p>
                <p className="text-xs text-muted-foreground mt-2">{t("app.userDashboard.referralDesc", "Share this code and earn ₹500 for every friend who books")}</p>
              </div>
              <Users className="h-8 w-8 text-gold/40" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => copyCode(referralCode)}
                className="flex-1 gold-btn rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
                {copiedCode === referralCode ? <CheckCircle2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                {copiedCode === referralCode ? t("app.userDashboard.copied", "Copied!") : t("app.userDashboard.copyCode", "Copy Code")}
              </button>
              <button className="flex-1 glass rounded-xl py-2.5 text-sm font-semibold text-gold border border-gold/30 hover:bg-gold/10 transition-colors flex items-center justify-center gap-2">
                <ArrowUpRight className="h-4 w-4" /> {t("app.userDashboard.share", "Share")}
              </button>
            </div>
          </div>

          {/* Stats */}
      {/* <div className="grid grid-cols-3 gap-4">
            {[
              { label: t("app.userDashboard.friendsReferred", "Friends Referred"), value: friendsCount, icon: Users },
              { label: t("app.userDashboard.successfulBookings", "Successful Bookings"), value: bookingsCount, icon: CheckCircle2 },
              { label: t("app.userDashboard.rewardsEarned", "Rewards Earned"), value: rewardsEarned, icon: Star },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="glass-card rounded-2xl p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-gold" />
                  </div>
                  <div>
                    <p className="font-display text-xl text-foreground">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div> */}

      {/* How it works */}
      {/* <div className="glass-card rounded-2xl p-5 space-y-4">
            <h4 className="font-display text-lg text-foreground">{t("app.userDashboard.howItWorks", "How It Works")}</h4>
            <div className="space-y-3">
              {[
                { step: "01", text: t("app.userDashboard.refStep1", "Share your unique referral code with friends") },
                { step: "02", text: t("app.userDashboard.refStep2", "Friend signs up and makes their first booking") },
                { step: "03", text: t("app.userDashboard.refStep3", "You earn ₹500 wallet credit instantly") },
                { step: "04", text: t("app.userDashboard.refStep4", "Your friend gets ₹250 off their first stay") },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-4">
                  <span className="h-8 w-8 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center text-[11px] font-bold text-gold shrink-0">{s.step}</span>
                  <p className="text-sm text-muted-foreground">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )} */}

      {/* Coupons Tab */}
      {tab === "coupons" && (
        <div className="space-y-5">
          {/* Available coupons */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">{t("app.userDashboard.availableCoupons", "Available Coupons")}</p>
            <div className="grid md:grid-cols-2 gap-4">
              {coupons.length === 0 && (
                <div className="col-span-2 text-center py-12 glass-card rounded-2xl border border-white/5">
                  <p className="text-sm text-muted-foreground">{t("app.userDashboard.noCouponsAvailable", "No active coupons available at the moment.")}</p>
                </div>
              )}
              {coupons.map((c) => {
                const discount = c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`;
                const expires = c.expiresAt ? formatDateStr(c.expiresAt) : '';
                const minSpend = c.minBookingAmount ? `₹${Number(c.minBookingAmount).toLocaleString("en-IN")}` : '0';
                return (
                  <div key={c.id} className="glass-card rounded-2xl p-5 hover:border-gold/30 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-bold text-gold tracking-widest">{c.code}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full border border-gold/40 text-gold bg-gold/10 text-[10px] font-bold tracking-widest shrink-0">{discount}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{c.description || `${discount} discount coupon`}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-muted-foreground">{t("app.userDashboard.minSpend", "Min. spend: {{amount}}", { amount: minSpend })}</p>
                        {expires && <p className="text-[10px] text-muted-foreground">{t("app.userDashboard.validUntil", "Valid until {{date}}", { date: expires })}</p>}
                      </div>
                      <button onClick={() => copyCode(c.code)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gold/30 bg-gold/8 text-gold text-xs hover:bg-gold/15 transition-colors">
                        {copiedCode === c.code ? <CheckCircle2 className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                        {copiedCode === c.code ? t("app.userDashboard.copied", "Copied") : t("app.userDashboard.copy", "Copy")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileView({ referralStats, refreshReferrals }: { referralStats: any; refreshReferrals?: () => void }) {
  const { t } = useTranslation();
  const { user, saveSession } = useAuth();

  function toDateInputValue(value: any): string {
    if (!value) return '';
    // If it's already YYYY-MM-DD
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    // If it's ISO/Date-like
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const isEmailPlaceholder = !user?.email || user.email.endsWith('@phone.local');

  const [form, setForm] = useState({
    fullName: user?.fullName === 'New Guest' ? '' : (user?.fullName || ''),
    email: isEmailPlaceholder ? '' : (user?.email || ''),
    phone: user?.phone || '',
    dateOfBirth: toDateInputValue((user as any)?.dateOfBirth) || '',
    marriageDate: toDateInputValue((user as any)?.marriageDate) || '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    usersApi.getMe()
      .then((u: any) => {
        const isPl = !u.email || u.email.endsWith('@phone.local');
        setForm({
          fullName: u.fullName === 'New Guest' ? '' : (u.fullName || ''),
          email: isPl ? '' : (u.email || ''),
          phone: u.phone || '',
          dateOfBirth: toDateInputValue(u.dateOfBirth) || '',
          marriageDate: toDateInputValue(u.marriageDate) || '',
        });
      })
      .catch((err) => {
        console.error(err);
        if (user) {
          const isPl = !user.email || user.email.endsWith('@phone.local');
          setForm({
            fullName: user.fullName === 'New Guest' ? '' : (user.fullName || ''),
            email: isPl ? '' : (user.email || ''),
            phone: user.phone || '',
            dateOfBirth: toDateInputValue((user as any).dateOfBirth) || '',
            marriageDate: toDateInputValue((user as any)?.marriageDate) || '',
          });
        }
      });
  }, []);

  async function handleSave() {
    if (!form.fullName.trim()) {
      toast.error(t("app.validation.nameRequired", "Full name is required"));
      return;
    }
    const emailTrim = form.email.trim();
    if (isEmailPlaceholder) {
      if (!emailTrim) {
        toast.error(t("app.validation.emailRequired", "Email address is required"));
        return;
      }
      if (!/\S+@\S+\.\S+/.test(emailTrim)) {
        toast.error(t("app.validation.emailInvalid", "Please enter a valid email address"));
        return;
      }
    }
    setSaving(true);
    try {
      const payload: any = {
        fullName: form.fullName.trim(),
        marriageDate: form.marriageDate || undefined
      };
      if (isEmailPlaceholder) {
        payload.email = emailTrim;
      }
      const updated = await (usersApi as any).updateMe(payload);


      setForm((f: any) => ({
        ...f,
        fullName: updated.fullName || '',
        email: updated.email || '',
        marriageDate: toDateInputValue(updated?.marriageDate) || '',
      }));

      if (user) {
        const token = localStorage.getItem('accessToken') || '';
        const refresh = localStorage.getItem('refreshToken') || '';
        saveSession(token, refresh, {
          ...user,
          fullName: updated.fullName,
          email: updated.email,
          phone: updated.phone || '',
          dateOfBirth: updated.dateOfBirth || '',
        });
      }

      toast.success("Profile saved successfully!");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="space-y-6 max-w-xl">
      <h3 className="font-display text-2xl text-foreground">{t("app.userDashboard.profileSettings", "Profile Settings")}</h3>
      {loading ? <div className="glass-card rounded-2xl p-6 text-sm text-muted-foreground">Loading...</div> : (
        <div className="glass-card rounded-2xl p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{t("app.auth.fullName", "Full Name")}</label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => setForm((f: any) => ({ ...f, fullName: e.target.value }))}
              className="luxury-input w-full rounded-xl px-4 py-2.5 text-sm text-foreground bg-transparent"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{t("app.auth.emailLabel", "Email Address")}</label>
            {isEmailPlaceholder ? (
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))}
                placeholder="Enter your email address"
                className="luxury-input w-full rounded-xl px-4 py-2.5 text-sm text-foreground bg-transparent"
              />
            ) : (
              <input type="email" value={form.email} disabled className="luxury-input w-full rounded-xl px-4 py-2.5 text-sm text-foreground bg-transparent opacity-60 cursor-not-allowed" />
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{t("app.auth.phoneNumber", "Phone Number")}</label>
            <input type="tel" value={form.phone} disabled className="luxury-input w-full rounded-xl px-4 py-2.5 text-sm text-foreground bg-transparent opacity-60 cursor-not-allowed" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{t("app.userDashboard.dateOfBirth", "Date of Birth")}</label>
            <input type="date" value={form.dateOfBirth} disabled className="luxury-input w-full rounded-xl px-4 py-2.5 text-sm text-foreground bg-transparent opacity-60 cursor-not-allowed" style={{ colorScheme: "dark" }} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{t("app.userDashboard.marriageDate", "Marriage Date")}</label>
            <input type="date" value={form.marriageDate} onChange={(e) => setForm((f: any) => ({ ...f, marriageDate: e.target.value }))} className="luxury-input w-full rounded-xl px-4 py-2.5 text-sm text-foreground bg-transparent" style={{ colorScheme: "dark" }} />
          </div>
          <button onClick={handleSave} disabled={saving} className="gold-btn w-full rounded-xl py-2.5 text-sm font-semibold mt-2 disabled:opacity-60">
            {saving ? "Saving..." : saved ? "Saved!" : t("app.userDashboard.saveChanges", "Save Changes")}
          </button>
        </div>
      )}

      {/* Referral details in profile tab */}
      <div className="pt-4">
        <ReferralWidget referralStats={referralStats} refreshReferrals={refreshReferrals} />
      </div>
    </div>
  );
}

function HelpView() {
  const { t } = useTranslation();
  const topics = [
    t("app.userDashboard.helpTopic1", "Booking queries & confirmations"),
    t("app.userDashboard.helpTopic2", "Celebration package customisation"),
    t("app.userDashboard.helpTopic3", "Payment & refund requests"),
    t("app.userDashboard.helpTopic4", "Live celebration sharing support"),
    t("app.userDashboard.helpTopic5", "Complaints & escalations"),
    t("app.userDashboard.helpTopic6", "Legal & privacy matters"),
  ];

  const contactCards = [
    {
      icon: MessageSquare,
      label: t("app.userDashboard.emailSupport", "Email Support"),
      value: "vibenestsmeetingpoint@gmail.com",
      sub: t("app.userDashboard.emailSupportDesc", "We respond within 1–2 business days"),
      href: "https://mail.google.com/mail/?view=cm&fs=1&to=vibenestsmeetingpoint@gmail.com",
    },
    {
      icon: Phone,
      label: t("app.userDashboard.supportNumber", "Support Number"),
      value: "+91 9000201011",
      sub: t("app.userDashboard.supportNumberDesc", "Call or WhatsApp during support hours"),
      href: "tel:+919000201011",
    },
    {
      icon: Clock,
      label: t("app.userDashboard.supportHours", "Support Hours"),
      value: t("app.userDashboard.supportHoursValue", "9:00 AM – 9:00 PM IST"),
      sub: t("app.userDashboard.supportHoursDesc", "Monday to Sunday, incl. public holidays"),
      href: null,
    },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-2xl text-foreground">{t("app.userDashboard.helpSupport", "Help & Support")}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t("app.userDashboard.helpSupportDesc", "Vibenests Private Luxury Suites — we're here every day")}</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-gold/10 border border-gold/25 text-gold text-[10px] font-bold tracking-widest uppercase">{t("app.userDashboard.supportHoursBadge", "9 AM – 9 PM IST")}</span>
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Left — contact cards */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{t("app.userDashboard.contactUs", "Contact Us")}</p>
          {contactCards.map((c) => {
            const Icon = c.icon;
            const cls = "flex items-center gap-4 glass-card rounded-2xl p-5 transition-colors group";
            const inner = (
              <>
                <div className="h-11 w-11 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{c.label}</p>
                  <p className="text-sm font-medium text-foreground mt-0.5 break-all">{c.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{c.sub}</p>
                </div>
                {c.href && <ArrowUpRight className="h-4 w-4 text-gold/40 shrink-0 group-hover:text-gold transition-colors" />}
              </>
            );
            return c.href ? (
              <a key={c.label} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined} className={`${cls} hover:border-gold/40 hover:bg-gold/5`}>{inner}</a>
            ) : (
              <div key={c.label} className={cls}>{inner}</div>
            );
          })}
        </div>

        {/* Right — topics + legal */}
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{t("app.userDashboard.weCanHelp", "We Can Help With")}</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-4">
              {topics.map((tVal) => (
                <li key={tVal} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold/60 shrink-0" />
                  {tVal}
                </li>
              ))}
            </ul>
          </div>

          {/* Business info */}
          <div className="glass-card rounded-2xl p-5 space-y-1.5">
            <p className="text-sm font-semibold text-foreground">{t("app.userDashboard.businessInfoTitle", "Vibenests Private Luxury Suites")}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("app.userDashboard.businessInfoDesc", "Premium private suite bookings and celebration experiences. Our team is available 7 days a week to assist you.")}
            </p>
          </div>

          {/* Legal links */}
          <div className="glass rounded-2xl px-5 py-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">{t("app.userDashboard.privacyPolicy", "Privacy Policy")}</a>
            <span className="text-white/15">|</span>
            <a href="/terms-of-use" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">{t("app.userDashboard.termsOfUse", "Terms of Use")}</a>
            <span className="text-white/15">|</span>
            <a href="/contact" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">{t("app.userDashboard.fullContactPage", "Full Contact Page")}</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserDashboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [referralStats, setReferralStats] = useState<any>(null);
  const [activeNav, setActiveNav] = useState("dashboard");

  useEffect(() => {
    if (!user?.id) return;
    referralsApi.getStats()
      .then((data) => setReferralStats(data))
      .catch((err) => console.error("Failed to load referral stats:", err));
  }, [user?.id, activeNav]);

  async function refreshReferrals() {
    try {
      const data = await referralsApi.getStats();
      setReferralStats(data);
    } catch (err) {
      console.error(err);
    }
  }
  const isGuestUser = !user || !user.fullName || user.fullName === 'New Guest' || user.fullName === 'Guest' || !user.email || user.email.endsWith('@phone.local');
  const displayName = isGuestUser ? "Guest" : (user?.fullName || "Guest");
  const displayLetter = (displayName || "G").charAt(0).toUpperCase();
  const displayEmail = isGuestUser ? "Guest Visitor" : (user?.email || "");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [reviewPromptBooking, setReviewPromptBooking] = useState<any | null>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    appNotificationsApi.getMine()
      .then((data) => {
        if (Array.isArray(data)) {
          setNotifications(data.map((n: any) => ({
            id: String(n.id),
            type: (n.type as any) || "system",
            title: n.title,
            message: n.message,
            time: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString(),
            read: Boolean(n.isRead),
          })));
        }
      })
      .catch((err) => console.warn("Failed to fetch user notifications:", err));

    bookingsApi.getAll()
      .then((rawList) => {
        const completedBooking = rawList.find((b: any) =>
          b.status === 'completed' &&
          localStorage.getItem(`vibenests_review_prompt_dismissed_${b.id}`) !== 'true'
        );
        if (completedBooking) {
          setReviewPromptBooking(completedBooking);
        }
      })
      .catch((err) => {
        console.error("Failed to generate notifications from bookings", err);
      });
  }, [user?.id, notifOpen]);

  function handleMarkAllRead() {
    appNotificationsApi.markAllRead()
      .then(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      })
      .catch((err) => console.warn("Failed to mark all read:", err));
  }

  function handleMarkRead(id: string) {
    appNotificationsApi.markRead(Number(id))
      .then(() => {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      })
      .catch((err) => console.warn("Failed to mark read:", err));

    const notif = notifications.find((n) => n.id === id);
    if (notif?.link) {
      navigate(notif.link);
      setNotifOpen(false);
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Auto-collapse sidebar on smaller screens, but keep it visible
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function renderContent() {
    switch (activeNav) {
      case "dashboard": return <DashboardView onNavigate={setActiveNav} referralStats={referralStats} refreshReferrals={refreshReferrals} />;
      case "suites": return <SuitesView />;
      case "my-bookings": return <BookingListView bookings={[]} title={t("app.userDashboard.myBookings", "My Bookings")} fetchFromApi />;
      case "upcoming": return <BookingListView bookings={[]} title={t("app.userDashboard.upcomingBookings", "Upcoming Bookings")} fetchFromApi statusFilter="upcoming" />;
      case "past": return <BookingListView bookings={[]} title={t("app.userDashboard.pastBookings", "Past Bookings")} fetchFromApi statusFilter="past" />;
      case "wallet": return <WalletView />;
      case "refunds": return <RefundRequestsView />;
      case "memberships": return <CelebrationMembershipsView />;
      case "offers": return <OffersView />;
      case "profile": return <ProfileView referralStats={referralStats} refreshReferrals={refreshReferrals} />;
      case "help": return <HelpView />;
      default: return <DashboardView onNavigate={setActiveNav} referralStats={referralStats} refreshReferrals={refreshReferrals} />;
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--background)]">
      {/* Top bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 h-[88px] border-b border-white/5 glass backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-4">
          {/* Mobile toggle */}
          <button onClick={() => setSidebarOpen((o) => !o)}
            className="flex lg:hidden flex-col justify-center items-center gap-[5px] p-2 rounded-lg hover:bg-white/5 transition-colors group"
            aria-label="Toggle menu">
            <span className={`block h-0.5 bg-muted-foreground group-hover:bg-gold transition-all duration-300 ${sidebarOpen ? "w-5 translate-y-[7px] rotate-45" : "w-5"}`} />
            <span className={`block h-0.5 bg-muted-foreground group-hover:bg-gold transition-all duration-300 ${sidebarOpen ? "w-0 opacity-0" : "w-5"}`} />
            <span className={`block h-0.5 bg-muted-foreground group-hover:bg-gold transition-all duration-300 ${sidebarOpen ? "w-5 -translate-y-[7px] -rotate-45" : "w-5"}`} />
          </button>
          {/* Desktop toggle */}
          <button onClick={() => setSidebarCollapsed((c) => !c)}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/[0.07] text-muted-foreground hover:text-gold transition cursor-pointer"
            aria-label="Toggle sidebar">
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-[72px] w-[72px] shrink-0 rounded-lg">
              <img src="/image.png" alt="VibeNests" className="h-full w-full object-contain" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-2xl font-semibold tracking-wide text-gradient-gold">VIBENESTS</p>
              <p className="text-[10px] tracking-widest text-muted-foreground uppercase">{t("app.userDashboard.brandSub", "Private Luxury Suites")}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSelector />
          <div className="relative">
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative h-9 w-9 rounded-xl glass flex items-center justify-center text-muted-foreground hover:text-gold transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-gold" />
              )}
            </button>
            <NotificationPanel
              open={notifOpen}
              onClose={() => setNotifOpen(false)}
              notifications={notifications}
              onMarkAllRead={handleMarkAllRead}
              onMarkRead={handleMarkRead}
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className="h-9 w-9 rounded-xl bg-gradient-gold flex items-center justify-center font-bold text-[oklch(0.12_0.02_260)] text-sm hover:opacity-80 transition-opacity">
              {displayLetter}
            </button>
            <AnimatePresence>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-11 z-50 w-52 glass-card rounded-xl border border-white/10 py-1 shadow-xl"
                  >
                    <div className="px-4 py-2 border-b border-white/[0.06]">
                      <p className="text-xs font-medium text-foreground truncate">{displayName}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{displayEmail || user?.phone || ''}</p>
                    </div>
                    <button
                      onClick={() => { setActiveNav("profile"); setProfileOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <User className="h-4 w-4 shrink-0" /> {t("app.admin.profile", "Profile")}
                    </button>
                    <button
                      onClick={() => { navigate("/login"); setProfileOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 shrink-0" /> {t("app.userDashboard.logout", "Logout")}
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 relative min-h-0">
        {/* Mobile overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
          )}
        </AnimatePresence>

        {/* Sidebar — always visible on desktop (collapsible), slide-in on mobile */}
        <aside className={`absolute lg:relative top-0 left-0 h-full z-40 flex flex-col shrink-0 glass-card border-r border-white/5 rounded-none transition-all duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${sidebarCollapsed ? "lg:w-16" : "w-64"}`}>
          <div className="flex items-center justify-between border-b border-white/5 min-h-[64px] px-3 py-4">
            {!sidebarCollapsed ? (
              <div className="flex items-center gap-3 p-2 rounded-xl glass flex-1 min-w-0 border border-white/5">
                <div className="h-9 w-9 rounded-full bg-gradient-gold flex items-center justify-center font-bold text-[oklch(0.12_0.02_260)] text-sm shrink-0">{displayLetter}</div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                  {displayEmail && <p className="text-[10px] text-muted-foreground truncate">{displayEmail}</p>}
                </div>
              </div>
            ) : (
              <div className="h-9 w-9 mx-auto rounded-full bg-gradient-gold flex items-center justify-center font-bold text-[oklch(0.12_0.02_260)] text-sm shrink-0">{displayLetter}</div>
            )}
            <button onClick={() => setSidebarOpen(false)}
              className="flex lg:hidden flex-col justify-center items-center gap-[5px] p-2 rounded-lg hover:bg-white/5 transition-colors group ml-2 shrink-0"
              aria-label="Close menu">
              <span className="block w-5 h-0.5 bg-muted-foreground group-hover:bg-gold transition-colors" />
              <span className="block w-5 h-0.5 bg-muted-foreground group-hover:bg-gold transition-colors" />
              <span className="block w-5 h-0.5 bg-muted-foreground group-hover:bg-gold transition-colors" />
            </button>
          </div>

          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-none">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const active = activeNav === id;
              const translatedLabel =
                id === "dashboard" ? t("app.userDashboard.dashboard", "Dashboard") :
                  id === "suites" ? t("app.userDashboard.browseSuites", "Browse Suites") :
                    id === "my-bookings" ? t("app.userDashboard.myBookings", "My Bookings") :
                      id === "upcoming" ? t("app.userDashboard.upcomingBookings", "Upcoming Bookings") :
                        id === "past" ? t("app.userDashboard.pastBookings", "Past Bookings") :
                          id === "wallet" ? t("app.userDashboard.walletPayments", "Payments") :
                            id === "refunds" ? t("app.userDashboard.refunds", "Refunds") :
                              id === "memberships" ? t("app.userDashboard.celebrationMembership", "Celebration Packages") :
                                id === "offers" ? t("app.userDashboard.specialOffersReferrals", "Special Offers") :
                                  id === "profile" ? t("app.userDashboard.profileSettings", "Profile Settings") :
                                    id === "help" ? t("app.userDashboard.helpSupport", "Help & Support") :
                                      id === "write-review" ? t("app.userDashboard.writeReview", "Write a Review") :
                                        label;

              const isDisabled = false;
              return (
                <button key={id}
                  title={sidebarCollapsed ? translatedLabel : undefined}
                  onClick={() => {
                    if (id === "write-review") { navigate("/user/write-review"); setSidebarOpen(false); return; }
                    setActiveNav(id); setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-2.5 py-2.5 border rounded-xl text-sm transition-all
                    ${sidebarCollapsed ? "justify-center" : ""}
                    ${active ? "bg-gold/15 border-gold/25 text-gold font-medium" : "border-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground"}
                    ${isDisabled ? "opacity-30 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground" : ""}`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? "text-gold" : ""}`} />
                  {!sidebarCollapsed && translatedLabel}
                </button>
              );
            })}
          </nav>

          <div className="px-2 pb-6 pt-2 border-t border-white/5">
            <button onClick={() => navigate("/login")}
              title={sidebarCollapsed ? t("app.userDashboard.logout", "Logout") : undefined}
              className={`w-full flex items-center gap-3 px-2.5 py-2.5 border border-transparent rounded-xl text-sm text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all ${sidebarCollapsed ? "justify-center" : ""}`}>
              <LogOut className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && t("app.userDashboard.logout", "Logout")}
            </button>
          </div>
        </aside>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-h-0">
          <AnimatePresence mode="wait">
            <motion.div key={activeNav} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {reviewPromptBooking && user?.role !== 'admin' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm border border-[var(--gold)]/20 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="h-12 w-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto text-gold">
              <Star className="h-6 w-6 fill-gold text-gold" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-xl text-foreground">Share Your Experience</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We hope you had a luxurious stay at <span className="text-gold font-medium">{reviewPromptBooking.suite?.name || reviewPromptBooking.suiteName || `Suite #${reviewPromptBooking.suiteId}`}</span>.
                Would you take a moment to write a review?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  localStorage.setItem(`vibenests_review_prompt_dismissed_${reviewPromptBooking.id}`, 'true');
                  setReviewPromptBooking(null);
                  navigate("/user/write-review");
                }}
                className="flex-1 gold-btn rounded-xl py-2.5 text-xs font-semibold cursor-pointer"
              >
                Write Review
              </button>
              <button
                onClick={() => {
                  localStorage.setItem(`vibenests_review_prompt_dismissed_${reviewPromptBooking.id}`, 'true');
                  setReviewPromptBooking(null);
                }}
                className="flex-1 rounded-xl py-2.5 text-xs border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 transition-all cursor-pointer"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
