import { useNavigate } from "react-router-dom";
import { IndianRupee, CalendarDays, Users, TrendingUp } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatsCard } from "@/components/admin/StatsCard";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { RevenuePieChart } from "@/components/admin/RevenuePieChart";
import { BookingChart } from "@/components/admin/BookingChart";
import { TopSuites } from "@/components/admin/TopSuites";
import { RecentBookings } from "@/components/admin/RecentBookings";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { useAppData } from "@/components/admin/AppDataContext";
import { useTranslation } from "react-i18next";

function fmtRevenue(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { filteredStats, dateRange, setDateRange } = useAppData();
  const { t } = useTranslation();

  const cards = [
    { title: t("app.admin.totalRevenue", "Total Revenue"), value: fmtRevenue(filteredStats.totalRevenue), change: "+18%", positive: true, icon: IndianRupee, onClick: () => navigate("/revenue") },
    { title: t("app.admin.totalBookings", "Total Bookings"), value: String(filteredStats.totalBookings), change: "+12%", positive: true, icon: CalendarDays, onClick: () => navigate("/bookings") },
    { title: t("app.admin.totalCustomers", "Total Customers"), value: String(filteredStats.totalCustomers), change: "+9%", positive: true, icon: Users, onClick: () => navigate("/customers-overview") },
    { title: t("app.admin.avgBookingValue", "Avg. Booking Value"), value: `₹${filteredStats.avgBookingValue.toLocaleString("en-IN")}`, change: "+5%", positive: true, icon: TrendingUp, onClick: () => navigate("/avg-booking-value") },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <AdminHeader title={t("app.admin.dashboard", "Dashboard")} />
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{t("app.admin.overviewPeriod", "Overview for selected period")}</p>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((s) => <StatsCard key={s.title} {...s} />)}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2"><RevenueChart /></div>
          <RevenuePieChart />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <BookingChart />
          <TopSuites />
        </div>
        <RecentBookings />
      </div>
    </div>
  );
}
