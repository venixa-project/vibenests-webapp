import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Eye, ArrowLeft, CheckCircle2, XCircle, CalendarDays, Wallet, User, Phone, Mail, Ticket, Copy, Link } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { bookingsApi, suitesApi, refundsApi } from "@/lib/api";
import { toast } from "sonner";
// import { bookingsApi, refundsApi } from "@/lib/api";


const statusStyle: Record<string, string> = {
  Confirmed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  Completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

function formatDateTime(value: any) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-IN");
}

function formatRecordValue(value: any) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return formatDateTime(value);
  return String(value);
}

function getBookingRecordFields(booking: any) {
  return [
    ["ID", booking?.id],
    ["Order ID", booking?.orderId],
    ["User ID", booking?.userId],
    ["Booked By", booking?.bookedBy],
    ["Suite ID", booking?.suiteId],
    ["Suite Name", booking?.suiteName],
    ["Event Type", booking?.eventType],
    ["Add-ons", Array.isArray(booking?.addOns) ? booking.addOns.join(", ") : booking?.addOns],
    ["Date", booking?.date],
    ["Time Slot", booking?.timeSlot],
    ["End Time", booking?.endTimeSlot],
    ["Guest First Name", booking?.guestFirstName],
    ["Guest Last Name", booking?.guestLastName],
    ["Guest Email", booking?.guestEmail],
    ["Guest Phone", booking?.guestPhone],
    ["Persons", booking?.persons],
    ["Base Price", booking?.basePrice],
    ["Add-ons Total", booking?.addonsTotal],
    ["Savings", booking?.savings],
    ["Service Fee", booking?.serviceFee],
    ["Taxes", booking?.taxes],
    ["Total Amount", booking?.totalAmount],
    ["Payment Mode", booking?.paymentMode],
    ["Advance Amount", booking?.advanceAmount],
    ["Status", booking?.status],
    ["Payment Status", booking?.paymentStatus],
    ["Full Payment Received", booking?.fullPaymentReceived],
    ["Coupon Code", booking?.couponCode],
    ["Reschedule Count", booking?.rescheduleCount],
    ["Created At", booking?.createdAt],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");
}


export default function BookingDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const bookingId = useMemo(() => (id ? Number(String(id).replace(/^#VN/, "")) : NaN), [id]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState<any>(null);
  const [resolvedGuest, setResolvedGuest] = useState<{ fullName?: string; email?: string; phone?: string } | null>(null);
  const [resolvedAddOns, setResolvedAddOns] = useState<Array<{ name: string; price?: number; quantity?: number }> | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);




  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        setLoading(true);
        setError("");

        // backend: GET /bookings/:id
        const res = await bookingsApi.getById(id);
        setBooking(res);

        // Resolve guest details:
        // - If admin-created booking has guestFirstName/guestLastName/email/phone, use them.
        // - Otherwise, fall back to linked user data (booking.user).
        const fullNameFromGuest = [res?.guestFirstName, res?.guestLastName].filter(Boolean).join(" ");
        const guestHasAny = Boolean(
          res?.guestFirstName || res?.guestLastName || res?.guestEmail || res?.guestPhone
        );

        const resolvedGuestObj = {
          fullName: guestHasAny ? fullNameFromGuest : res?.user?.fullName,
          email: guestHasAny ? res?.guestEmail : res?.user?.email,
          phone: guestHasAny ? res?.guestPhone : res?.user?.phone,
        };
        setResolvedGuest(resolvedGuestObj);

        // Resolve add-ons (name + quantity if backend provides it)
        // Current backend Booking entity stores `addOns` as string[] of IDs.
        // If backend also returns `addOnsDetails` (name/quantity), prefer it.
        const addOnsDetails = Array.isArray(res?.addOnsDetails) ? res.addOnsDetails : null;
        if (addOnsDetails) {
          setResolvedAddOns(addOnsDetails);
        } else {
          // Backend should provide addOnsDetails (name + price + quantity).
          // If not available, fall back to displaying IDs as names with unknown pricing.
          const ids = Array.isArray(res?.addOns) ? res.addOns : [];
          setResolvedAddOns(ids.map((x: any) => ({ name: String(x), quantity: 1 })));
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load booking details");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);


  function formatMoney(v: any) {
    const n = typeof v === "number" ? v : parseFloat(String(v || 0));
    if (Number.isNaN(n)) return "₹0";
    return `₹${n.toLocaleString("en-IN")}`;
  }

  async function copyPaymentLink(link: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        window.prompt("Copy payment link", link);
      }
      setCopiedLink(link);
      toast.success("Payment link copied to clipboard!");
      window.setTimeout(() => setCopiedLink(null), 1600);
    } catch {
      window.prompt("Copy payment link", link);
    }
  }

  const status = booking?.status
    ? String(booking.status).charAt(0).toUpperCase() + String(booking.status).slice(1)
    : "";

  const normalizedBookingStatus = booking?.status ? String(booking.status).toLowerCase() : "";


  const advancePaid = booking?.paymentMode === "pay_at_venue" ? Number(booking?.advanceAmount ?? 0) : 0;
  const payments = Array.isArray(booking?.payments) ? booking.payments : [];
  const successfulPaymentsTotal = payments
    .filter((payment: any) => payment.status === "success")
    .reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
  const totalPaid = successfulPaymentsTotal > 0
    ? successfulPaymentsTotal
    : booking?.fullPaymentReceived
      ? Number(booking?.totalAmount ?? 0)
      : booking?.paymentMode === "pay_at_venue"
        ? Number(booking?.advanceAmount ?? 0)
        : booking?.paymentMode === "pay_now"
          ? Number(booking?.totalAmount ?? 0)
          : 0;
  const pendingAmount = Math.max(Number(booking?.totalAmount ?? 0) - totalPaid, 0);
  const isBookedByAdmin = booking?.bookedBy === "admin";
  const adminPaymentLink = booking?.adminPaymentLink || (isBookedByAdmin ? payments.find((payment: any) => payment.paymentLink)?.paymentLink || null : null);

  return (
    <div className="flex-1 overflow-y-auto">
      <AdminHeader title="Booking Details" />

      <div className="p-4 sm:p-6 space-y-4">
        <button
          onClick={() => navigate("/bookings")}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition border border-white/10 hover:border-[var(--gold)]/30 px-3 py-2 rounded-lg"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Bookings
        </button>

        {loading && (
          <div className="glass-card rounded-2xl p-6 text-sm text-muted-foreground flex items-center gap-2">
            <Eye className="h-4 w-4" /> Loading...
          </div>
        )}

        {!loading && error && (
          <div className="glass-card rounded-2xl p-6 text-sm text-destructive border border-destructive/30 bg-destructive/10">
            {error}
          </div>
        )}

        {!loading && !error && booking && (
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-gold" />
                  <h2 className="font-display text-lg">Booking {booking.orderId ? `#${booking.orderId}` : (booking.id ? `#${booking.id}` : bookingId ? `#${bookingId}` : "")}</h2>
                </div>
                <p className="text-xs text-muted-foreground mt-1">View all details for this booking</p>
              </div>

              <div className="flex items-center gap-2">
                {status && (
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${statusStyle[status] || "bg-white/5 border-white/10 text-muted-foreground"}`}>
                    {status}
                  </span>
                )}
                {booking.paymentStatus && (
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${booking.paymentStatus === "success" || booking.paymentStatus === "paid"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}
                  >
                    {String(booking.paymentStatus).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {normalizedBookingStatus === 'cancelled' && booking.cancellationReason && !booking.refundRequest && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm space-y-3 text-rose-200">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  ⚠️ Cancellation Details
                </h4>
                <p className="text-xs">
                  <span className="font-medium text-white">Cancellation Reason:</span> <span className="italic">"{booking.cancellationReason}"</span>
                </p>
              </div>
            )}

            {booking.refundRequest && (
              <div className={`rounded-xl border p-4 text-sm space-y-3 ${booking.refundRequest.status === 'pending'
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                  : booking.refundRequest.status === 'approved' || booking.refundRequest.status === 'processed'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                }`}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    ⚠️ Cancellation & Refund Request ({booking.refundRequest.status.toUpperCase()})
                  </h4>
                  {booking.refundRequest.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        disabled={actionLoading}
                        onClick={async () => {
                          if (!window.confirm("Approve cancellation and refund?")) return;
                          try {
                            setActionLoading(true);
                            await refundsApi.process(booking.refundRequest.id, 'approve');
                            toast.success("Cancellation and refund approved!");
                            const resp = await bookingsApi.getById(booking.id);
                            setBooking(resp);
                          } catch (e: any) {
                            toast.error(e.message || "Failed to approve");
                          } finally {
                            setActionLoading(false);
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Approve Refund
                      </button>
                      <button
                        disabled={actionLoading}
                        onClick={async () => {
                          const reason = window.prompt("Reason for rejection:");
                          if (reason === null) return;
                          if (!reason.trim()) {
                            toast.error("Rejection reason is required.");
                            return;
                          }
                          try {
                            setActionLoading(true);
                            await refundsApi.process(booking.refundRequest.id, 'reject', reason);
                            toast.success("Cancellation request rejected.");
                            const resp = await bookingsApi.getById(booking.id);
                            setBooking(resp);
                          } catch (e: any) {
                            toast.error(e.message || "Failed to reject");
                          } finally {
                            setActionLoading(false);
                          }
                        }}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Reject Request
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  <p><span className="font-medium text-white">Guest Reason for Cancellation:</span> <span className="italic">"{booking.refundRequest.cancellationReason || "No reason provided"}"</span></p>
                  <p><span className="font-medium text-white">Estimated Refundable Amount:</span> ₹{Number(booking.refundRequest.refundableAmount).toLocaleString("en-IN")}</p>
                  <p><span className="font-medium text-white">Policy Applied:</span> {booking.refundRequest.calculationBreakdown?.policyName || "Standard"}</p>
                  {booking.refundRequest.status === 'rejected' && booking.refundRequest.rejectionReason && (
                    <p><span className="font-medium text-rose-300">Rejection Reason:</span> {booking.refundRequest.rejectionReason}</p>
                  )}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Date</span>
                  <span className="text-foreground">{booking.date || ""}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground flex items-center gap-2"><Ticket className="h-4 w-4" /> Time</span>
                  <span className="text-foreground">{booking.timeSlot || ""}{booking.endTimeSlot ? ` – ${booking.endTimeSlot}` : ""}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground flex items-center gap-2"><Ticket className="h-4 w-4" /> Occasion</span>
                  <span className="text-foreground">{booking.eventType || ""}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground flex items-center gap-2"><User className="h-4 w-4" /> Suite</span>
                  <span className="text-foreground">{booking.suite?.name || booking.suiteName || booking.suiteId || ""}</span>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground flex items-center gap-2"><Wallet className="h-4 w-4" /> Total Amount</span>
                  <span className="text-foreground font-medium">{formatMoney(booking.totalAmount)}</span>
                </div>

                <div className="pt-2 border-t border-white/10 space-y-2">

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Advance Paid</span>
                    <span className="text-foreground">{formatMoney(advancePaid)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Pending Amount</span>
                    <span className="text-foreground">{formatMoney(pendingAmount)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Base Price</span>
                  <span className="text-foreground">{formatMoney(booking.basePrice)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Add-ons Total</span>
                  <span className="text-foreground">{formatMoney(booking.addonsTotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Total Paid</span>
                  <span className="text-foreground">{formatMoney(totalPaid)}</span>
                </div>
                {/* <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Service Fee</span>
                  <span className="text-foreground">{formatMoney(booking.serviceFee)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Taxes</span>
                  <span className="text-foreground">{formatMoney(booking.taxes)}</span>
                </div> */}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Guest Details</p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground flex items-center gap-2"><User className="h-4 w-4" /> Name</span>
                  <span className="text-foreground">{resolvedGuest?.fullName || ""}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground flex items-center gap-2"><Mail className="h-4 w-4" /> Email</span>
                  <span className="text-foreground">{resolvedGuest?.email || ""}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4" /> Phone</span>
                  <span className="text-foreground">{resolvedGuest?.phone || ""}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Persons</span>
                  <span className="text-foreground">{booking.persons ?? ""}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Booked By</span>
                  <span className="text-foreground capitalize">{booking.bookedBy || "guest"}</span>
                </div>
              </div>

            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Add-ons</p>
              <div className="text-foreground">
                {Array.isArray(resolvedAddOns) && resolvedAddOns.length > 0
                  ? resolvedAddOns
                    .map((a) => {
                      const qty = typeof a.quantity === "number" ? a.quantity : 1;
                      const hasPrice = typeof a.price === "number";
                      return hasPrice
                        ? `${a.name} (₹${(a.price as number).toLocaleString("en-IN")}) x${qty}`
                        : `${a.name} x${qty}`;

                    })
                    .join(", ")
                  : Array.isArray(booking.addOnsNames) && booking.addOnsNames.length > 0
                    ? booking.addOnsNames.join(", ")
                    : "No add-ons"}

              </div>
            </div>

          

            {isBookedByAdmin && (
              <div className="rounded-xl border border-[var(--gold)]/20 bg-[var(--gold)]/5 p-4 text-sm space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Admin Payment Link</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {adminPaymentLink ? "Share this link with the guest to complete payment." : "No payment link found for this booking."}
                    </p>
                  </div>
                  {adminPaymentLink && (
                    <button
                      type="button"
                      onClick={() => copyPaymentLink(adminPaymentLink)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--gold)]/30 bg-[var(--gold)]/10 text-gold hover:bg-[var(--gold)]/15 transition"
                    >
                      <Copy className="h-3.5 w-3.5" /> {copiedLink === adminPaymentLink ? "Copied" : "Copy Link"}
                    </button>
                  )}
                </div>
                {adminPaymentLink && (
                  <div className="space-y-2">
                    <a
                      href={adminPaymentLink}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-xs text-gold underline underline-offset-2 break-all"
                    >
                      {adminPaymentLink}
                    </a>
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                      <Link className="h-3.5 w-3.5" /> Payment link is ready to share
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Payment Records</p>
              {payments.length === 0 ? (
                <p className="text-muted-foreground">No payment records found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[11px] text-muted-foreground uppercase tracking-wide border-b border-white/[0.06]">
                        <th className="pb-2 pr-3">ID</th>
                        <th className="pb-2 pr-3">Amount</th>
                        <th className="pb-2 pr-3">Method</th>
                        <th className="pb-2 pr-3">Provider</th>
                        <th className="pb-2 pr-3">Status</th>
                        <th className="pb-2 pr-3">Order ID</th>
                        <th className="pb-2 pr-3">Payment ID</th>
                        <th className="pb-2 pr-3">Payment Link</th>
                        <th className="pb-2">Created At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {payments.map((payment: any) => (
                        <tr key={payment.id} className="align-top">
                          <td className="py-3 pr-3 text-gold">{payment.id}</td>
                          <td className="py-3 pr-3">{formatMoney(payment.amount)}</td>
                          <td className="py-3 pr-3">{payment.method}</td>
                          <td className="py-3 pr-3">{payment.provider}</td>
                          <td className="py-3 pr-3 capitalize">{payment.status}</td>
                          <td className="py-3 pr-3 font-mono text-[10px]">{payment.providerOrderId || "—"}</td>
                          <td className="py-3 pr-3 font-mono text-[10px]">{payment.providerPaymentId || "—"}</td>
                          <td className="py-3 pr-3 min-w-48">
                            {payment.paymentLink ? (
                              <div className="space-y-1.5">
                                <button
                                  type="button"
                                  onClick={() => copyPaymentLink(payment.paymentLink)}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold border border-[var(--gold)]/30 bg-[var(--gold)]/10 text-gold hover:bg-[var(--gold)]/15 transition"
                                >
                                  <Copy className="h-3 w-3" /> {copiedLink === payment.paymentLink ? "Copied" : "Copy"}
                                </button>
                                <a
                                  href={payment.paymentLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block text-[10px] text-gold underline underline-offset-2 break-all"
                                >
                                  {payment.paymentLink}
                                </a>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3 text-muted-foreground whitespace-nowrap">{formatDateTime(payment.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>


            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>

              <div className="flex flex-wrap items-center gap-3">
                {normalizedBookingStatus === "confirmed" ? (
                  <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 className="h-4 w-4" /> Confirmed</div>
                ) : normalizedBookingStatus === "completed" ? (
                  <div className="flex items-center gap-2 text-blue-400"><CheckCircle2 className="h-4 w-4" /> Completed</div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-400"><XCircle className="h-4 w-4" /> {status || booking.status || ""}</div>
                )}
              </div>

              {/* Admin actions based on booking status */}
              {normalizedBookingStatus === "pending" && (
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    disabled={actionLoading}
                    onClick={async () => {
                      const reason = window.prompt("Enter cancellation reason:");
                      if (reason === null) return;
                      if (!reason.trim()) {
                        toast.error("Cancellation reason is required.");
                        return;
                      }

                      try {
                        setActionLoading(true);
                        setActionError("");
                        const resp = await bookingsApi.cancel(booking.id, { reason });
                        setBooking(resp);
                        toast.success("Booking cancelled successfully.");
                      } catch (e: any) {
                        setActionError(e?.message || "Failed to cancel booking");
                        toast.error(e?.message || "Failed to cancel booking");
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-white/10 text-muted-foreground hover:text-foreground transition disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" /> Cancel
                  </button>


                  <button
                    disabled={actionLoading}
                    onClick={async () => {
                      try {
                        setActionLoading(true);
                        setActionError("");
                        const resp = await bookingsApi.updateStatus(booking.id, "confirmed");
                        setBooking(resp);
                        toast.success("Booking confirmed successfully.");
                      } catch (e: any) {
                        setActionError(e?.message || "Failed to confirm booking");
                        toast.error(e?.message || "Failed to confirm booking");
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    className="flex items-center gap-2 gold-btn px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Confirm
                  </button>
                </div>
              )}

              {normalizedBookingStatus === "confirmed" && (
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    disabled={actionLoading}
                    onClick={async () => {
                      const reason = window.prompt("Enter cancellation reason:");
                      if (reason === null) return;
                      if (!reason.trim()) {
                        toast.error("Cancellation reason is required.");
                        return;
                      }

                      try {
                        setActionLoading(true);
                        setActionError("");
                        const resp = await bookingsApi.cancel(booking.id, { reason });
                        setBooking(resp);
                        toast.success("Booking cancelled successfully.");
                      } catch (e: any) {
                        setActionError(e?.message || "Failed to cancel booking");
                        toast.error(e?.message || "Failed to cancel booking");
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-white/10 text-muted-foreground hover:text-foreground transition disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" /> Cancel
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={async () => {
                      try {
                        setActionLoading(true);
                        setActionError("");

                        // confirmed -> check-out (completed in backend)
                        const resp = await bookingsApi.updateStatus(booking.id, "completed");
                        setBooking(resp);
                        toast.success("Booking checked-out successfully.");
                      } catch (e: any) {
                        setActionError(e?.message || "Failed to check-out booking");
                        toast.error(e?.message || "Failed to check-out booking");
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    className="flex items-center gap-2 gold-btn px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Check-out
                  </button>


                </div>
              )}

              {normalizedBookingStatus === "check-in" && (
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    disabled={actionLoading}
                    onClick={async () => {
                      const reason = window.prompt("Enter cancellation reason:");
                      if (reason === null) return;
                      if (!reason.trim()) {
                        toast.error("Cancellation reason is required.");
                        return;
                      }

                      try {
                        setActionLoading(true);
                        setActionError("");
                        const resp = await bookingsApi.cancel(booking.id, { reason });
                        setBooking(resp);
                        toast.success("Booking cancelled successfully.");
                      } catch (e: any) {
                        setActionError(e?.message || "Failed to cancel booking");
                        toast.error(e?.message || "Failed to cancel booking");
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-white/10 text-muted-foreground hover:text-foreground transition disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" /> Cancel
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={async () => {
                      try {
                        setActionLoading(true);
                        setActionError("");

                        await bookingsApi.updateStatus(booking.id, "completed");
                        const resp = await bookingsApi.getById(booking.id);
                        setBooking(resp);
                        toast.success("Booking checked-out successfully.");
                      } catch (e: any) {
                        setActionError(e?.message || "Failed to check-out booking");
                        toast.error(e?.message || "Failed to check-out booking");
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    className="flex items-center gap-2 gold-btn px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Check-out
                  </button>
                </div>
              )}

              {actionError && (
                <div className="text-sm text-destructive pt-2">{actionError}</div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

