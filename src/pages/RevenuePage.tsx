import { useState, useEffect } from "react";
import { IndianRupee, TrendingUp, TrendingDown, ArrowLeft, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useAppData, parseAmount } from "@/components/admin/AppDataContext";
import { useTranslation } from "react-i18next";
import { paymentsApi } from "@/lib/api";
import { exportToCSV } from "@/lib/csvExport";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PERIODS = ["Monthly", "Quarterly", "Yearly"];

function getMonthIndex(dateStr: string): number {
  if (!dateStr) return -1;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.getMonth(); // 0-11
  }
  for (let i = 0; i < MONTHS.length; i++) {
    if (dateStr.toLowerCase().includes(MONTHS[i].toLowerCase())) {
      return i;
    }
  }
  return -1;
}

export default function RevenuePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { bookings, stats } = useAppData();
  const [period, setPeriod] = useState("Monthly");
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    paymentsApi.getAll()
      .then(setPayments)
      .catch((err) => console.error("Failed to load payments on revenue page:", err));
  }, []);

  // Monthly revenue derived from real confirmed bookings
  const monthly = MONTHS.map((month, index) => {
    const rev = bookings
      .filter((b) => b.status === "Confirmed" && getMonthIndex(b.date) === index)
      .reduce((s, b) => s + parseAmount(b.amount), 0);
    return { month, revenue: rev, expenses: Math.round(rev * 0.28) };
  });

  // Occasion-based revenue split for pie
  const occasionRevMap: Record<string, number> = {};
  bookings.filter((b) => b.status === "Confirmed").forEach((b) => {
    const k = b.occasion || "Other";
    occasionRevMap[k] = (occasionRevMap[k] || 0) + parseAmount(b.amount);
  });
  const totalOccRev = Object.values(occasionRevMap).reduce((s, v) => s + v, 0) || 1;
  const PIE_COLORS = ["oklch(0.78 0.13 80)","oklch(0.65 0.10 80)","oklch(0.55 0.09 75)","oklch(0.42 0.07 70)","oklch(0.70 0.15 50)"];
  const pieData = Object.entries(occasionRevMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, val], i) => ({ name, value: Math.round((val / totalOccRev) * 100), color: PIE_COLORS[i % PIE_COLORS.length] }));
  const pieDisplay = pieData.length > 0 ? pieData : [
    { name: "Suites", value: 100, color: "oklch(0.78 0.13 80)" },
  ];

  // Get transactions from real payments
  const transactions = payments.map((p) => {
    const guestName = p.booking?.guestFirstName
      ? `${p.booking.guestFirstName} ${p.booking.guestLastName ?? ''}`.trim()
      : (p.booking?.user?.fullName ?? 'Guest');
    return {
      id: `#TXN${p.id}`,
      guest: guestName,
      suite: p.booking?.suiteName || `Suite #${p.booking?.suiteId ?? ''}`,
      date: p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—",
      amount: Number(p.amount || 0),
      method: p.method || "Other",
      status: p.status === "success" ? "Settled" : "Pending",
    };
  });

  // Derive suite revenue from real bookings
  const suiteMap: Record<string, { revenue: number; bookings: number }> = {};
  bookings.filter(b => b.status === "Confirmed").forEach((b) => {
    const key = b.suite.replace(" Suite", "");
    if (!suiteMap[key]) suiteMap[key] = { revenue: 0, bookings: 0 };
    suiteMap[key].revenue += parseAmount(b.amount);
    suiteMap[key].bookings += 1;
  });
  const suiteRevenue = Object.entries(suiteMap).map(([suite, v], i) => ({
    suite, ...v, color: `oklch(${0.78 - i * 0.07} ${0.13 - i * 0.01} 80)`,
  }));

  const totalRevenue = stats.totalRevenue;
  const totalExpenses = Math.round(totalRevenue * 0.28);
  const netProfit = totalRevenue - totalExpenses;

  return (
    <div className="flex-1 overflow-y-auto">
      <AdminHeader title="Revenue" />
      <div className="p-4 sm:p-6 space-y-6">

        {/* Back + actions */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition">
            <ArrowLeft className="h-4 w-4" /> {t("app.admin.backToDashboard", "Back to Dashboard")}
          </button>
          <button 
            onClick={() => exportToCSV(suiteRevenue, "Revenue_Report.csv")} 
            className="flex items-center gap-2 text-xs font-semibold gold-btn px-4 py-2 rounded-xl shadow-md shadow-gold/15 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
          >
            <Download className="h-4 w-4" /> {t("app.admin.exportReport", "Export Report")}
          </button>
        </div>

        {/* Top KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: t("app.admin.totalRevenueCard", "Total Revenue"), value: `₹${(totalRevenue / 100000).toFixed(1)}L`, sub: "+18% vs last year", up: true, icon: IndianRupee, accent: "border-[var(--gold)]/30" },
            { label: t("app.admin.netProfitCard", "Net Profit"),    value: `₹${(netProfit / 100000).toFixed(1)}L`,    sub: "+22% vs last year", up: true, icon: TrendingUp,  accent: "border-emerald-500/30" },
            { label: t("app.admin.totalExpensesCard", "Total Expenses"),value: `₹${(totalExpenses / 1000).toFixed(0)}k`,  sub: "+8% vs last year",  up: false,icon: TrendingDown,accent: "border-destructive/30" },
            { label: t("app.admin.avgMonthlyCard", "Avg Monthly"),   value: `₹${(totalRevenue / 12 / 1000).toFixed(0)}k`, sub: "Per month avg", up: true, icon: IndianRupee, accent: "border-[var(--gold)]/20" },
          ].map((c) => (
            <div key={c.label} className={`glass-card rounded-2xl p-5 border ${c.accent} flex items-start justify-between gap-4`}>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</p>
                <p className="font-display text-3xl font-semibold text-foreground mt-1">{c.value}</p>
                <p className={`text-xs mt-2 ${c.up ? "text-emerald-400" : "text-destructive"}`}>{c.sub}</p>
              </div>
              <div className="h-11 w-11 shrink-0 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/20 flex items-center justify-center">
                <c.icon className="h-5 w-5 text-gold" />
              </div>
            </div>
          ))}
        </div>

        {/* Revenue vs Expenses Chart */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-medium">{t("app.admin.revenueVsExpenses", "Revenue vs Expenses")}</h3>
            <div className="flex gap-1 p-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              {PERIODS.map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition ${period === p ? "bg-[var(--gold)]/20 text-gold border border-[var(--gold)]/30" : "text-muted-foreground hover:text-foreground"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.78 0.13 80)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.78 0.13 80)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.6 0.22 25)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="oklch(0.6 0.22 25)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
              <XAxis dataKey="month" tick={{ fill: "oklch(0.72 0.02 90)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "oklch(0.72 0.02 90)", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip
                contentStyle={{ background: "oklch(0.13 0.025 260)", border: "1px solid oklch(0.78 0.13 80 / 0.2)", borderRadius: "8px" }}
                formatter={(v: number, name: string) => [`₹${v.toLocaleString("en-IN")}`, name === "revenue" ? "Revenue" : "Expenses"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="oklch(0.78 0.13 80)" strokeWidth={2} fill="url(#revGrad)" />
              <Area type="monotone" dataKey="expenses" stroke="oklch(0.6 0.22 25)" strokeWidth={2} fill="url(#expGrad)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-end">
            {[{ color: "oklch(0.78 0.13 80)", label: "Revenue" }, { color: "oklch(0.6 0.22 25)", label: "Expenses" }].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-4 rounded-full" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Suite Revenue + Pie */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 glass-card rounded-2xl p-5">
            <h3 className="font-display text-lg font-medium mb-4">{t("app.admin.revenueBySuite", "Revenue by Suite")}</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={suiteRevenue} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "oklch(0.72 0.02 90)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                <YAxis type="category" dataKey="suite" tick={{ fill: "oklch(0.72 0.02 90)", fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.13 0.025 260)", border: "1px solid oklch(0.78 0.13 80 / 0.2)", borderRadius: "8px" }}
                  formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]}
                />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                  {suiteRevenue.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-display text-lg font-medium mb-4">{t("app.admin.revenueSplit", "Revenue Split")}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((p, i) => <Cell key={i} fill={p.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "oklch(0.13 0.025 260)", border: "1px solid oklch(0.78 0.13 80 / 0.2)", borderRadius: "8px" }}
                  formatter={(v: number) => [`${v}%`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {pieData.map((p) => (
                <div key={p.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-muted-foreground">{p.name}</span>
                  </div>
                  <span className="text-foreground font-medium">{p.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Suite performance table */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-display text-lg font-medium mb-4">{t("app.admin.suitePerformance", "Suite Performance")}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide border-b border-white/[0.06]">
                  <th className="pb-3 pr-4">{t("app.admin.suite", "Suite")}</th>
                  <th className="pb-3 pr-4">{t("app.admin.bookings", "Bookings")}</th>
                  <th className="pb-3 pr-4">{t("app.admin.revenue", "Revenue")}</th>
                  <th className="pb-3 pr-4">{t("app.admin.avgBookingValueLabel", "Avg per Booking")}</th>
                  <th className="pb-3">{t("app.admin.discount", "Share")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {suiteRevenue.map((s) => (
                  <tr key={s.suite} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 pr-4 font-medium text-foreground">{s.suite}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{s.bookings}</td>
                    <td className="py-3 pr-4 text-gold font-medium">₹{s.revenue.toLocaleString("en-IN")}</td>
                    <td className="py-3 pr-4 text-muted-foreground">₹{Math.round(s.revenue / s.bookings).toLocaleString("en-IN")}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded-full bg-white/[0.08] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${totalRevenue ? Math.round((s.revenue / totalRevenue) * 100) : 0}%`, background: s.color }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{totalRevenue ? Math.round((s.revenue / totalRevenue) * 100) : 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transactions — link to real Transactions page */}
        <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-medium text-foreground">{t("app.admin.recentTransactionsTitle", "Recent Transactions")}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t("app.admin.allTransactions", "View all payment transactions")}</p>
          </div>
          <button onClick={() => navigate("/transactions")} className="flex items-center gap-2 text-xs gold-btn px-4 py-2 rounded-lg font-medium">
            {t("app.admin.viewAllTransactions", "View All Transactions →")}
          </button>
        </div>

      </div>
    </div>
  );
}
