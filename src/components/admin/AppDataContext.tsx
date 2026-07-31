import { createContext, useContext, useState, useMemo, useEffect } from "react";
import { bookingsApi, usersApi } from "@/lib/api";

export type Booking = {
  rawId?: string;
  orderId?: string;
  id: string; guest: string; email: string; phone: string; suite: string;
  occasion: string; date: string; time: string; endTime: string;
  guests: number; amount: string; status: "Confirmed" | "Pending" | "Cancelled" | "Completed";
  basePrice?: number;
  addonsTotal?: number;
  totalAmount?: number;
  fullPaymentReceived?: boolean;
  paymentMode?: string;
  rescheduleCount?: number;
};

export type UserType = {
  id: string; name: string; email: string; phone: string;
  role: "Guest" | "Admin"; status: "Active" | "Blocked"; joined: string; bookings: number;
  membership?: "Silver" | "Gold" | null;
};

// helper: parse "₹8,500" or number → number
export function parseAmount(val: string | number): number {
  if (typeof val === "number") return val;
  return parseInt(String(val).replace(/[₹,]/g, ""), 10) || 0;
}

function mapApiBooking(b: any): Booking {
  const guestName = b.guestFirstName
    ? `${b.guestFirstName} ${b.guestLastName ?? ''}`.trim()
    : (b.user?.fullName ?? 'Guest');
  return {
    id: b.orderId ? `#${b.orderId}` : `#VN${b.id}`,
    rawId: String(b.id),
    orderId: b.orderId,
    guest: guestName,
    email: b.guestEmail ?? b.user?.email ?? '',
    phone: b.guestPhone ?? b.user?.phone ?? '',
    suite: b.suite?.name ?? `Suite ${b.suiteId}`,
    occasion: b.eventType ?? '',
    date: b.date ?? '',
    time: b.timeSlot ?? '',
    endTime: b.endTimeSlot ?? '',
    guests: 0,
    amount: b.totalAmount && Number(b.totalAmount) > 0
      ? `₹${Number(b.totalAmount).toLocaleString("en-IN")}`
      : (b.payment?.amount ? `₹${Number(b.payment.amount).toLocaleString("en-IN")}` : '₹0'),
    status: (b.status?.charAt(0).toUpperCase() + b.status?.slice(1)) as Booking['status'],
    basePrice: Number(b.basePrice || 0),
    addonsTotal: Number(b.addonsTotal || 0),
    totalAmount: Number(b.totalAmount || 0),
    fullPaymentReceived: !!b.fullPaymentReceived,
    paymentMode: b.paymentMode || '',
    rescheduleCount: b.rescheduleCount || 0,
  };
}

function mapApiUser(u: any): UserType {
  return {
    id: String(u.id),
    name: u.fullName ?? "",
    email: u.email ?? "",
    phone: u.phone ?? "",
    role: u.role === "admin" || u.role === "superadmin" ? "Admin" : "Guest",
    status: u.isActive ? "Active" : "Blocked",
    joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "",
    bookings: u.bookingCount ?? 0,
    membership: u.membership || null,
  };
}

type Stats = {
  totalRevenue: number;
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  completedBookings: number;
  totalCustomers: number;
  activeCustomers: number;
  blockedCustomers: number;
  avgBookingValue: number;
};

type AppDataContextType = {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  addBooking: (b: any) => void;
  users: UserType[];
  setUsers: React.Dispatch<React.SetStateAction<UserType[]>>;
  stats: Stats;
  loading: boolean;
  refresh: () => void;
  dateRange: { from: Date; to: Date };
  setDateRange: React.Dispatch<React.SetStateAction<{ from: Date; to: Date }>>;
  filteredBookings: Booking[];
  filteredStats: Stats;
};

const AppDataContext = createContext<AppDataContextType | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => ({
    from: new Date(today.getFullYear(), today.getMonth(), 1),
    to: today
  }));

  const refresh = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setBookings([]);
      setUsers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      bookingsApi.getAll()
        .then((list) => setBookings(Array.isArray(list) ? list.map(mapApiBooking) : []))
        .catch(() => setBookings([])),
      usersApi.getAll()
        .then((list) => setUsers(Array.isArray(list) ? list.map(mapApiUser) : []))
        .catch(() => setUsers([])),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  const stats = useMemo<Stats>(() => {
    const confirmed = bookings.filter((b) => b.status === "Confirmed");
    const totalRevenue = confirmed.reduce((s, b) => s + parseAmount(b.amount), 0);
    return {
      totalRevenue,
      totalBookings: bookings.length,
      confirmedBookings: confirmed.length,
      pendingBookings: bookings.filter((b) => b.status === "Pending").length,
      cancelledBookings: bookings.filter((b) => b.status === "Cancelled").length,
      completedBookings: bookings.filter((b) => b.status === "Completed").length,
      totalCustomers: users.length,
      activeCustomers: users.filter((u) => u.status === "Active").length,
      blockedCustomers: users.filter((u) => u.status === "Blocked").length,
      avgBookingValue: confirmed.length ? Math.round(totalRevenue / confirmed.length) : 0,
    };
  }, [bookings, users]);

  const filteredBookings = useMemo<Booking[]>(() => {
    const from = new Date(dateRange.from); from.setHours(0,0,0,0);
    const to = new Date(dateRange.to); to.setHours(23,59,59,999);
    return bookings.filter((b) => {
      if (!b.date) return false;
      const d = new Date(b.date);
      return !isNaN(d.getTime()) && d >= from && d <= to;
    });
  }, [bookings, dateRange]);

  const filteredStats = useMemo<Stats>(() => {
    const confirmed = filteredBookings.filter((b) => b.status === "Confirmed");
    const totalRevenue = confirmed.reduce((s, b) => s + parseAmount(b.amount), 0);
    return {
      totalRevenue,
      totalBookings: filteredBookings.length,
      confirmedBookings: confirmed.length,
      pendingBookings: filteredBookings.filter((b) => b.status === "Pending").length,
      cancelledBookings: filteredBookings.filter((b) => b.status === "Cancelled").length,
      completedBookings: filteredBookings.filter((b) => b.status === "Completed").length,
      totalCustomers: users.length,
      activeCustomers: users.filter((u) => u.status === "Active").length,
      blockedCustomers: users.filter((u) => u.status === "Blocked").length,
      avgBookingValue: confirmed.length ? Math.round(totalRevenue / confirmed.length) : 0,
    };
  }, [filteredBookings, users]);

  const addBooking = (b: any) => setBookings((prev) => [mapApiBooking(b), ...prev]);

  return (
    <AppDataContext.Provider value={{
      bookings, setBookings, addBooking, users, setUsers, stats, loading, refresh,
      dateRange, setDateRange, filteredBookings, filteredStats
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
