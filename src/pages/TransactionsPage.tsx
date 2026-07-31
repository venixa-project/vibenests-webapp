import { useState, useEffect } from "react";
import { Download, Search, CreditCard, Wallet, Banknote, RefreshCw } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { paymentsApi } from "@/lib/api";
import { useTranslation } from "react-i18next";

const STATUS_STYLE: Record<string, string> = {
  success:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending:  "bg-amber-500/10  text-amber-400  border-amber-500/20",
  failed:   "bg-red-500/10    text-red-400    border-red-500/20",
  refunded: "bg-sky-500/10    text-sky-400    border-sky-500/20",
};

function MethodIcon({ method }: { method: string }) {
  const m = (method || "").toLowerCase();
  if (m.includes("upi"))  return <Wallet    className="h-3.5 w-3.5 shrink-0" />;
  if (m.includes("card")) return <CreditCard className="h-3.5 w-3.5 shrink-0" />;
  return <Banknote className="h-3.5 w-3.5 shrink-0" />;
}

export default function TransactionsPage() {
  const { t } = useTranslation();
  const [payments, setPayments]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("All");
  const [methodFilter, setMethod] = useState("All");
  const [fromDate, setFromDate]   = useState("");
  const [toDate, setToDate]       = useState("");

  function load() {
    setLoading(true);
    setError("");
    paymentsApi.getAll()
      .then(setPayments)
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const statuses = ["All", "success", "pending", "failed", "refunded"];
  const methods  = ["All", ...Array.from(new Set(payments.map((p) => p.method || "Other").filter(Boolean)))];

  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      String(p.id).includes(q) ||
      (p.booking?.id && String(p.booking.id).includes(q)) ||
      ((p.razorpayOrderId || p.providerOrderId || "").toLowerCase().includes(q)) ||
      ((p.razorpayPaymentId || p.providerPaymentId || "").toLowerCase().includes(q));
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    const matchMethod = methodFilter === "All" || (p.method || "Other") === methodFilter;

    let matchDate = true;
    if (p.createdAt) {
      const pDate = new Date(p.createdAt);
      if (fromDate) {
        const fDate = new Date(fromDate);
        fDate.setHours(0, 0, 0, 0);
        if (pDate < fDate) matchDate = false;
      }
      if (toDate) {
        const tDate = new Date(toDate);
        tDate.setHours(23, 59, 59, 999);
        if (pDate > tDate) matchDate = false;
      }
    } else if (fromDate || toDate) {
      matchDate = false;
    }

    return matchSearch && matchStatus && matchMethod && matchDate;
  });

  const totalAmount  = filtered.filter(p => p.status === "success").reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalPending = filtered.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalRefunds = filtered.filter(p => p.status === "refunded").reduce((s, p) => s + Number(p.amount || 0), 0);

  function exportCSV() {
    const header = "ID,Booking ID,Amount,Method,Status,Razorpay Order,Razorpay Payment,Date\n";
    const rows = filtered.map(p =>
      [p.id, p.booking?.orderId ? `#${p.booking.orderId}` : (p.booking?.id ? `#VN${p.booking.id}` : ""), p.amount, p.method, p.status, p.razorpayOrderId || p.providerOrderId || "", p.razorpayPaymentId || p.providerPaymentId || "", p.createdAt ?? ""].join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "transactions.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <AdminHeader title="Transactions" />
      <div className="p-4 sm:p-6 space-y-5">

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: t("app.admin.settledFilter", "Settled"), value: `₹${totalAmount.toLocaleString("en-IN")}`,  color: "border-emerald-500/30 text-emerald-400", count: filtered.filter(p=>p.status==="success").length },
            { label: t("app.admin.pendingFilter", "Pending"), value: `₹${totalPending.toLocaleString("en-IN")}`, color: "border-amber-500/30 text-amber-400",   count: filtered.filter(p=>p.status==="pending").length },
            { label: t("app.admin.refunds", "Refunded"),      value: `₹${totalRefunds.toLocaleString("en-IN")}`, color: "border-sky-500/30 text-sky-400",        count: filtered.filter(p=>p.status==="refunded").length },
          ].map((c) => (
            <div key={c.label} className={`glass-card rounded-2xl p-5 border ${c.color} flex items-center justify-between`}>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</p>
                <p className="font-display text-2xl font-semibold text-foreground mt-1">{c.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.count} transactions</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder={t("app.admin.search", "Search by ID, order or payment ref...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="luxury-input w-full rounded-lg pl-9 pr-4 py-2 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="luxury-input rounded-lg px-2 py-1.5 text-xs bg-transparent text-foreground cursor-pointer"
              style={{ colorScheme: "dark" }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="luxury-input rounded-lg px-2 py-1.5 text-xs bg-transparent text-foreground cursor-pointer"
              style={{ colorScheme: "dark" }}
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatus(e.target.value)}
            className="luxury-input rounded-lg px-3 py-2 text-xs text-foreground bg-transparent cursor-pointer">
            {statuses.map((s) => (
              <option key={s} value={s} className="bg-[oklch(0.13_0.025_260)]">
                {s === "All" ? t("app.admin.allStatuses", "All Statuses") : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <select value={methodFilter} onChange={(e) => setMethod(e.target.value)}
            className="luxury-input rounded-lg px-3 py-2 text-xs text-foreground bg-transparent cursor-pointer">
            {methods.map((m) => (
              <option key={m} value={m} className="bg-[oklch(0.13_0.025_260)]">
                {m === "All" ? "All Methods" : m}
              </option>
            ))}
          </select>
          <button onClick={() => { setSearch(""); setStatus("All"); setMethod("All"); setFromDate(""); setToDate(""); }}
            className="text-xs text-muted-foreground hover:text-gold transition px-3 py-2 rounded-lg border border-white/10 hover:border-gold/30">
            {t("app.admin.clear", "Clear")}
          </button>
          <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-white/10 text-muted-foreground hover:text-gold hover:border-gold/30 transition">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button 
            onClick={exportCSV} 
            className="flex items-center gap-2 text-xs font-semibold gold-btn px-4 py-2 rounded-xl shadow-md shadow-gold/15 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer ml-auto"
          >
            <Download className="h-4 w-4" /> {t("app.admin.export", "Export")}
          </button>
        </div>

        {/* Table */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-medium text-foreground">
              {t("app.admin.recentTransactionsTitle", "All Transactions")}
            </h3>
            <span className="text-xs text-muted-foreground">{filtered.length} of {payments.length}</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">{t("app.admin.loadingSuites", "Loading...")}</div>
          ) : error ? (
            <div className="py-10 text-center text-sm text-red-400">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide border-b border-white/[0.06]">
                    <th className="pb-3 pr-4">{t("app.admin.txnIdCol", "Txn ID")}</th>
                    <th className="pb-3 pr-4">Booking ID</th>
                    <th className="pb-3 pr-4">{t("app.admin.amount", "Amount")}</th>
                    <th className="pb-3 pr-4">{t("app.admin.methodCol", "Method")}</th>
                    <th className="pb-3 pr-4">Razorpay Order</th>
                    <th className="pb-3 pr-4">Razorpay Payment</th>
                    <th className="pb-3 pr-4">{t("app.admin.date", "Date")}</th>
                    <th className="pb-3">{t("app.admin.status", "Status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No transactions found</td></tr>
                  ) : filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 pr-4 text-gold font-medium font-mono">#{p.id}</td>
                      <td className="py-3 pr-4 text-muted-foreground text-xs">
                        {p.booking?.orderId ? `#${p.booking.orderId}` : (p.booking?.id ? `#VN${p.booking.id}` : "—")}
                      </td>
                      <td className="py-3 pr-4 text-foreground font-semibold">₹{Number(p.amount || 0).toLocaleString("en-IN")}</td>
                      <td className="py-3 pr-4">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MethodIcon method={p.method} /> {p.method || "—"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground font-mono truncate max-w-[120px]">{p.razorpayOrderId || p.providerOrderId || "—"}</td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground font-mono truncate max-w-[120px]">{p.razorpayPaymentId || p.providerPaymentId || "—"}</td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                        {p.createdAt ? new Date(p.createdAt).toLocaleString("en-IN") : "—"}
                      </td>
                      <td className="py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border capitalize ${STATUS_STYLE[p.status] || "bg-white/5 text-muted-foreground border-white/10"}`}>
                          {p.status || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
