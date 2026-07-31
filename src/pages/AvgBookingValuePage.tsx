import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, TrendingUp, TrendingDown, IndianRupee, BarChart2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useTranslation } from "react-i18next";
import { useAppData, parseAmount } from "@/components/admin/AppDataContext";
import { exportToCSV } from "@/lib/csvExport";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

export default function AvgBookingValuePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { bookings } = useAppData();
  const [sortBy, setSortBy] = useState<"amount" | "addons">("amount");

  const confirmedBookings = bookings.filter((b) => b.status === "Confirmed");

  // Overall statistics
  const overallAvg = confirmedBookings.length
    ? Math.round(confirmedBookings.reduce((sum, b) => sum + parseAmount(b.amount), 0) / confirmedBookings.length)
    : 0;

  const totalAddon = confirmedBookings.reduce((sum, b) => sum + (b.addonsTotal || 0), 0);
  const avgAddon = confirmedBookings.length ? Math.round(totalAddon / confirmedBookings.length) : 0;

  // Monthly average trend
  const monthlyAvg = MONTHS.map((month, index) => {
    const monthBookings = confirmedBookings.filter((b) => getMonthIndex(b.date) === index);
    const total = monthBookings.reduce((sum, b) => sum + parseAmount(b.amount), 0);
    const avg = monthBookings.length ? Math.round(total / monthBookings.length) : 0;
    return { month, avg, bookings: monthBookings.length };
  });

  const highestMonth = monthlyAvg.reduce((a, b) => (b.avg > a.avg ? b : a), { month: "—", avg: 0 });
  const lowestMonth = monthlyAvg.reduce((a, b) => (b.avg > 0 && (a.avg === 0 || b.avg < a.avg) ? b : a), { month: "—", avg: 0 });
  const growth = monthlyAvg[0].avg ? Math.round(((monthlyAvg[11].avg - monthlyAvg[0].avg) / monthlyAvg[0].avg) * 100) : 0;

  // Suite averages
  const suiteMap: Record<string, { total: number; count: number }> = {};
  confirmedBookings.forEach((b) => {
    const key = b.suite.replace(" Suite", "");
    if (!suiteMap[key]) suiteMap[key] = { total: 0, count: 0 };
    suiteMap[key].total += parseAmount(b.amount);
    suiteMap[key].count += 1;
  });
  const SUITE_COLORS = [
    "oklch(0.78 0.13 80)",
    "oklch(0.70 0.11 80)",
    "oklch(0.62 0.13 75)",
    "oklch(0.55 0.10 75)",
    "oklch(0.48 0.08 75)"
  ];
  const suiteAvg = Object.entries(suiteMap).map(([suite, data], idx) => ({
    suite,
    avg: Math.round(data.total / data.count),
    color: SUITE_COLORS[idx % SUITE_COLORS.length]
  }));

  // Occasion averages
  const occasionMap: Record<string, { total: number; count: number }> = {};
  confirmedBookings.forEach((b) => {
    const key = b.occasion || "Other";
    if (!occasionMap[key]) occasionMap[key] = { total: 0, count: 0 };
    occasionMap[key].total += parseAmount(b.amount);
    occasionMap[key].count += 1;
  });
  const OCCASION_COLORS = [
    "oklch(0.78 0.13 80)",
    "oklch(0.70 0.11 80)",
    "oklch(0.62 0.12 75)",
    "oklch(0.55 0.09 75)",
    "oklch(0.48 0.08 75)"
  ];
  const occasionAvg = Object.entries(occasionMap).map(([occasion, data], idx) => ({
    occasion,
    avg: Math.round(data.total / data.count),
    color: OCCASION_COLORS[idx % OCCASION_COLORS.length]
  }));

  // Value Ranges
  const ranges = [
    { range: "< ₹3k", min: 0, max: 2999 },
    { range: "₹3k–5k", min: 3000, max: 4999 },
    { range: "₹5k–7k", min: 5000, max: 6999 },
    { range: "₹7k–10k", min: 7000, max: 9999 },
    { range: "> ₹10k", min: 10000, max: Infinity }
  ];
  const valueRanges = ranges.map((r) => {
    const count = confirmedBookings.filter((b) => {
      const amt = parseAmount(b.amount);
      return amt >= r.min && amt <= r.max;
    }).length;
    return { range: r.range, count };
  });

  // Recent Bookings List
  const recentBookingsList = confirmedBookings.map((b) => ({
    id: b.id,
    guest: b.guest,
    suite: b.suite,
    occasion: b.occasion,
    date: b.date,
    amount: parseAmount(b.amount),
    addons: b.addonsTotal || 0
  }));

  const sorted = [...recentBookingsList].sort((a, b) => b[sortBy] - a[sortBy]);

  return (
    <div className="flex-1 overflow-y-auto">
      <AdminHeader title="Avg. Booking Value" />
      <div className="p-4 sm:p-6 space-y-6">

        {/* Back + Export */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition">
            <ArrowLeft className="h-4 w-4" /> {t("app.admin.backToDashboard", "Back to Dashboard")}
          </button>
          <button 
            onClick={() => exportToCSV(sorted, "AvgBookingValue_Report.csv")} 
            className="flex items-center gap-2 text-xs font-semibold gold-btn px-4 py-2 rounded-xl shadow-md shadow-gold/15 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
          >
            <Download className="h-4 w-4" /> {t("app.admin.exportReport", "Export Report")}
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: t("app.admin.avgBookingValueLabel", "Avg. Booking Value"), value: `₹${overallAvg.toLocaleString("en-IN")}`, sub: `+${growth}% YoY growth`, up: true, icon: IndianRupee, accent: "border-[var(--gold)]/30" },
            { label: t("app.admin.highestMonth", "Highest Month"), value: `₹${highestMonth.avg.toLocaleString("en-IN")}`, sub: highestMonth.month + " 2025", up: true, icon: TrendingUp, accent: "border-emerald-500/30" },
            { label: t("app.admin.lowestMonth", "Lowest Month"), value: `₹${lowestMonth.avg.toLocaleString("en-IN")}`, sub: lowestMonth.month + " 2025", up: false, icon: TrendingDown, accent: "border-amber-500/30" },
            { label: t("app.admin.avgAddonValue", "Avg. Add-on Value"), value: `₹${avgAddon.toLocaleString("en-IN")}`, sub: "Per booking avg", up: true, icon: BarChart2, accent: "border-[var(--gold)]/20" },
          ].map((c) => (
            <div key={c.label} className={`glass-card rounded-2xl p-5 border ${c.accent} flex items-start justify-between gap-4`}>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</p>
                <p className="font-display text-3xl font-semibold text-foreground mt-1">{c.value}</p>
                <p className={`text-xs mt-2 ${c.up ? "text-emerald-400" : "text-amber-400"}`}>{c.sub}</p>
              </div>
              <div className="h-11 w-11 shrink-0 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/20 flex items-center justify-center">
                <c.icon className="h-5 w-5 text-gold" />
              </div>
            </div>
          ))}
        </div>

        {/* Monthly Avg Trend + Value Range */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 glass-card rounded-2xl p-5">
            <h3 className="font-display text-lg font-medium mb-4">{t("app.admin.monthlyAvgTrend", "Monthly Avg. Booking Value Trend")}</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyAvg}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                <XAxis dataKey="month" tick={{ fill: "oklch(0.72 0.02 90)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "oklch(0.72 0.02 90)", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.13 0.025 260)", border: "1px solid oklch(0.78 0.13 80 / 0.2)", borderRadius: "8px" }}
                  formatter={(v: number, name: string) => [name === "avg" ? `₹${v.toLocaleString("en-IN")}` : v, name === "avg" ? "Avg Value" : "Bookings"]}
                />
                <Line type="monotone" dataKey="avg" stroke="oklch(0.78 0.13 80)" strokeWidth={2.5} dot={{ fill: "oklch(0.78 0.13 80)", r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="bookings" stroke="oklch(0.55 0.18 230)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 justify-end">
              {[{ color: "oklch(0.78 0.13 80)", label: "Avg Value" }, { color: "oklch(0.55 0.18 230)", label: "Bookings" }].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2 w-4 rounded-full" style={{ background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-display text-lg font-medium mb-4">{t("app.admin.valueRangeDist", "Value Range Distribution")}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={valueRanges} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="count" nameKey="range">
                  {valueRanges.map((_, i) => (
                    <Cell key={i} fill={`oklch(${0.78 - i * 0.07} ${0.13 - i * 0.01} 80)`} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "oklch(0.13 0.025 260)", border: "1px solid oklch(0.78 0.13 80 / 0.2)", borderRadius: "8px" }}
                  formatter={(v: number, _: string, p) => [v + " bookings", p.payload.range]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-1">
              {valueRanges.map((r, i) => (
                <div key={r.range} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: `oklch(${0.78 - i * 0.07} ${0.13 - i * 0.01} 80)` }} />
                    <span className="text-muted-foreground">{r.range}</span>
                  </div>
                  <span className="text-foreground font-medium">{r.count} bookings</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Suite Avg + Occasion Avg */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-display text-lg font-medium mb-4">{t("app.admin.avgValueBySuite", "Avg. Value by Suite")}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={suiteAvg} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "oklch(0.72 0.02 90)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                <YAxis type="category" dataKey="suite" tick={{ fill: "oklch(0.72 0.02 90)", fontSize: 11 }} axisLine={false} tickLine={false} width={115} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.13 0.025 260)", border: "1px solid oklch(0.78 0.13 80 / 0.2)", borderRadius: "8px" }}
                  formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Avg Value"]}
                />
                <Bar dataKey="avg" radius={[0, 6, 6, 0]}>
                  {suiteAvg.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-display text-lg font-medium mb-4">{t("app.admin.avgValueByOccasion", "Avg. Value by Occasion")}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={occasionAvg} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "oklch(0.72 0.02 90)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                <YAxis type="category" dataKey="occasion" tick={{ fill: "oklch(0.72 0.02 90)", fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.13 0.025 260)", border: "1px solid oklch(0.78 0.13 80 / 0.2)", borderRadius: "8px" }}
                  formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Avg Value"]}
                />
                <Bar dataKey="avg" radius={[0, 6, 6, 0]}>
                  {occasionAvg.map((o, i) => <Cell key={i} fill={o.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Booking Value Breakdown Table */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-medium">{t("app.admin.bookingValueBreakdown", "Booking Value Breakdown")}</h3>
            <div className="flex gap-1 p-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              {(["amount", "addons"] as const).map((s) => (
                <button key={s} onClick={() => setSortBy(s)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition ${sortBy === s ? "bg-[var(--gold)]/20 text-gold border border-[var(--gold)]/30" : "text-muted-foreground hover:text-foreground"}`}>
                  {s === "amount" ? t("app.admin.byTotal", "By Total") : t("app.admin.byAddons", "By Add-ons")}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide border-b border-white/[0.06]">
                  <th className="pb-3 pr-4">{t("app.admin.bookingIdCol", "Booking ID")}</th>
                  <th className="pb-3 pr-4">{t("app.admin.guestCol", "Guest")}</th>
                  <th className="pb-3 pr-4">{t("app.admin.suiteCol", "Suite")}</th>
                  <th className="pb-3 pr-4">{t("app.admin.occasionCol", "Occasion")}</th>
                  <th className="pb-3 pr-4">{t("app.admin.dateCol", "Date")}</th>
                  <th className="pb-3 pr-4">{t("app.admin.baseAddons", "Base + Add-ons")}</th>
                  <th className="pb-3">{t("app.admin.totalCol", "Total")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {sorted.map((b) => (
                  <tr key={b.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 pr-4 text-gold font-medium">{b.id}</td>
                    <td className="py-3 pr-4 text-foreground">{b.guest}</td>
                    <td className="py-3 pr-4 text-muted-foreground text-xs">{b.suite}</td>
                    <td className="py-3 pr-4 text-muted-foreground text-xs">{b.occasion}</td>
                    <td className="py-3 pr-4 text-muted-foreground text-xs">{b.date}</td>
                    <td className="py-3 pr-4 text-xs">
                      <span className="text-muted-foreground">₹{(b.amount - b.addons).toLocaleString("en-IN")}</span>
                      <span className="text-muted-foreground mx-1">+</span>
                      <span className="text-[var(--gold-soft)]">₹{b.addons.toLocaleString("en-IN")}</span>
                    </td>
                    <td className="py-3 text-foreground font-semibold">₹{b.amount.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
