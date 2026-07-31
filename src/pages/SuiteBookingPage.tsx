import { useMemo, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock, CreditCard,
  Gift, MessageSquare, Star, Sparkles, Users, User, Plus, Minus,
  LayoutDashboard, BedDouble, History, Wallet, Tag, UserCircle,
  HelpCircle, LogOut, Package, Bell, ChevronDown, Award,
} from "lucide-react";
import { useSuitesContext, type Suite } from "@/components/admin/SuitesContext";
import { useAuth } from "@/components/auth/AuthContext";
import { suitesApi, addonsApi, bookingsApi, paymentsApi, couponsApi, membershipsApi, offerConfigsApi, offersApi } from "@/lib/api";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { useTranslation } from "react-i18next";



type ApiAddOn = {
  id: number;
  name: string;
  description: string;
  price: number;
};

// NOTE: Some builds previously had stale references to ADDONS.
// Keep this constant empty to avoid runtime ReferenceError if any old UI path references it.
const ADDONS: ApiAddOn[] = [];



/* ── Dashboard nav items (mirrors UserDashboardPage) ── */
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/user/dashboard" },
  { id: "suites", label: "Browse Suites", icon: BedDouble, path: "/user/dashboard" },
  { id: "my-bookings", label: "My Bookings", icon: CalendarDays, path: "/user/dashboard" },
  { id: "upcoming", label: "Upcoming Bookings", icon: Clock, path: "/user/dashboard" },
  { id: "past", label: "Past Bookings", icon: History, path: "/user/dashboard" },
  { id: "wallet", label: "Payments", icon: Wallet, path: "/user/dashboard" },
  { id: "memberships", label: "Celebration Packages", icon: Award, path: "/user/dashboard" },
  { id: "offers", label: "Special Offers", icon: Tag, path: "/user/dashboard" },
  { id: "profile", label: "Profile Settings", icon: UserCircle, path: "/user/dashboard" },
  { id: "help", label: "Help & Support", icon: HelpCircle, path: "/user/dashboard" },
  { id: "write-review", label: "Write a Review", icon: Star, path: "/user/write-review" },
];

/* ── Booking data ── */
const OCCASIONS = [
  { id: "birthday", label: "Birthday", description: "Elevate every milestone with regal decor and premium service.", icon: Gift, highlight: "bg-amber-500/10 text-amber-300" },
  { id: "anniversary", label: "Anniversary", description: "Curated romance with intimate touches and champagne delights.", icon: Sparkles, highlight: "bg-rose-500/10 text-rose-300" },
  { id: "proposal", label: "Proposal", description: "A private setting designed for unforgettable moments.", icon: Star, highlight: "bg-cyan-500/10 text-cyan-300" },
  { id: "baby-shower", label: "Baby Shower", description: "Gentle luxury with pastel styling and thoughtful details.", icon: User, highlight: "bg-violet-500/10 text-violet-300" },
  { id: "corporate", label: "Corporate Events", description: "Executive event spaces with premium AV and hospitality.", icon: Users, highlight: "bg-sky-500/10 text-sky-300" },
  { id: "other", label: "Other Celebrations", description: "Bespoke styling for any exclusive experience.", icon: MessageSquare, highlight: "bg-lime-500/10 text-lime-300" },
];

const TIME_SLOTS: string[] = []; // replaced by suite-specific generated slots

// Generate time slots from suite settings with custom gap between slots
export function generateSlots(startTime: string, endTime: string, durationMins: number, gapMins: number = 30): string[] {
  const slots: string[] = [];
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let cur = sh * 60 + sm;
  let end = eh * 60 + em;
  if (end < cur) {
    end += 24 * 60;
  }
  const step = durationMins + gapMins;
  while (cur + durationMins <= end) {
    const hh = Math.floor(cur / 60) % 24;
    const mm = cur % 60;
    const period = hh >= 12 ? "PM" : "AM";
    const dh = hh > 12 ? hh - 12 : hh === 0 ? 12 : hh;
    slots.push(`${String(dh).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${period}`);
    cur += step;
  }
  return slots;
}

function getEndTime(start: string, durationMins: number): string {
  const [time, period] = start.split(" ");
  const [h, m] = time.split(":").map(Number);
  let totalMin = ((period === "PM" && h !== 12 ? h + 12 : period === "AM" && h === 12 ? 0 : h) * 60) + m + durationMins;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  const endPeriod = endH >= 12 ? "PM" : "AM";
  const displayH = endH > 12 ? endH - 12 : endH === 0 ? 12 : endH;
  return `${String(displayH).padStart(2, "0")}:${String(endM).padStart(2, "0")} ${endPeriod}`;
}






const STEPS = [
  "Select Occasion", "Choose Date & Time",
  "Add-ons & Customizations", "Booking Summary", "Payment",
];



export default function SuiteBookingPage() {

  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const isGuestUser = !user || !user.fullName || user.fullName === 'New Guest' || user.fullName === 'Guest' || !user.email || user.email.endsWith('@phone.local');
  const displayName = isGuestUser ? "Guest" : (user?.fullName || "Guest");
  const displayLetter = (displayName || "G").charAt(0).toUpperCase();
  const { suites, loading: suitesLoading } = useSuitesContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);


  const stepKeys = useMemo(() => [
    "app.userDashboard.selectOccasion",
    "app.userDashboard.chooseDateTime",
    "app.userDashboard.addonsCustomizations",
    "app.userDashboard.bookingSummary",
    "app.userDashboard.payment",
  ], []);

  const localizedOccasions = useMemo(() => OCCASIONS.map(o => {
    const keyPart = o.id.replace("-", "_");
    const labelKey = keyPart === "baby_shower" ? "baby_shower" : keyPart === "corporate" ? "corporate_events" : keyPart === "other" ? "other_celebrations" : keyPart;
    return {
      ...o,
      label: t("app.userDashboard.occasion_" + labelKey, o.label),
      description: t("app.userDashboard.occasion_" + keyPart + "_desc", o.description),
    };
  }), [t]);



  // NOTE: location.state does NOT persist on hard refresh.
  // Keep this page functional even when booking was not navigated to with state.
  const passedPackage = useMemo(() => (location.state as any)?.package ?? null, [location.state]);


  // Hard-refresh robustness:
  // `location.state` does not persist, so if `passedPackage` is missing
  // we derive a best-effort default from `location.state.suiteId` (if present)
  // or start with a safe empty state.
  const passedSuiteId = useMemo(() => {
    const state = location.state as any;
    const suiteId = state?.suiteId;
    return suiteId != null ? String(suiteId) : null;
  }, [location.state]);

  const [step, setStep] = useState(passedPackage ? 4 : 0);
  const [selectedOccasion, setSelectedOccasion] = useState(passedPackage ? `package:${passedPackage.id}` : "");
  const [customOccasion, setCustomOccasion] = useState("");
  const [bookingDate, setBookingDate] = useState(passedPackage ? new Date().toISOString().split('T')[0] : "");
  const [startTimes, setStartTimes] = useState<string[]>(passedPackage ? ["09:00 AM"] : []);
  const [selectedSuite, setSelectedSuite] = useState(passedPackage ? "0" : (passedSuiteId ?? ""));
  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);


  // Block slots whose time window has already ended for the selected date.
  // Uses slot END time (so a currently-running slot stays selectable).
  const isPastSlot = (slotStart: string, selectedDate: string, durationMins: number) => {
    if (!slotStart || !selectedDate) return false;

    const now = new Date();
    const sel = new Date(selectedDate);
    if (isNaN(sel.getTime())) return false;

    // Only care about “today” (local timezone).
    if (now.toDateString() !== sel.toDateString()) return false;

    // Convert slot start like "09:00 AM" to a Date, then add duration to get end.
    const parts = slotStart.trim().split(/\s+/);
    if (parts.length < 2) return false;
    const timePart = parts[0];
    const periodRaw = parts[1];

    const [hStr, mStr] = timePart.split(":");
    const startH12 = Number(hStr);
    const startM = Number(mStr);
    const period = String(periodRaw).toUpperCase();
    if (!Number.isFinite(startH12) || !Number.isFinite(startM)) return false;

    let startHours24 = startH12 % 12;
    if (period === "PM") startHours24 += 12;

    const slotEnd = new Date(sel);
    slotEnd.setHours(startHours24, startM, 0, 0);
    slotEnd.setMinutes(slotEnd.getMinutes() + durationMins);

    // Expired if current time is strictly greater than end.
    return now.getTime() > slotEnd.getTime();
  };

  useEffect(() => {
    if (selectedSuite && selectedSuite !== "0" && bookingDate) {
      suitesApi.getBlockedSlots(selectedSuite, bookingDate)
        .then((slots) => {
          setBlockedSlots(Array.isArray(slots) ? slots : []);
        })
        .catch(() => {
          setBlockedSlots([]);
        });
    } else {
      setBlockedSlots([]);
    }
  }, [selectedSuite, bookingDate]);

  // clear selection if it becomes unavailable (booked or expired)
  // (slot duration is derived from suite, so this effect should run after suite is computed)
  // clear selection if it becomes unavailable (booked)
  // NOTE: we intentionally don't auto-clear for expired time here, because suite-derived slot duration
  // is computed later in the component (avoids TS “used before declaration” issues).
  useEffect(() => {
    if (startTimes.length === 0) return;
    const valid = startTimes.filter(st => !blockedSlots.includes(st));
    if (valid.length !== startTimes.length) setStartTimes(valid);
  }, [blockedSlots, startTimes]);

  const [addonQty, setAddonQty] = useState<Record<string, number>>({});
  const [persons, setPersons] = useState(1);
  const [specialRequests, setSpecialRequests] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pay-now" | "pay-venue" | "package-credit">("pay-now");
  const [showValidation, setShowValidation] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string>("");
  const [couponCode, setCouponCode] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);
  const [liveCoupons, setLiveCoupons] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [myMembership, setMyMembership] = useState<any>(null);
  const [offerConfig, setOfferConfig] = useState<Record<string, string> | null>(null);

  // Fetch real coupons from the public /coupons/active endpoint
  useEffect(() => {
    couponsApi.getActive().then((list) => {
      setLiveCoupons(Array.isArray(list) ? list : []);
    }).catch(() => setLiveCoupons([]));
  }, []);

  // Fetch active membership
  useEffect(() => {
    membershipsApi.getMyActive().then((membership) => {
      if (membership && membership.status === 'active') {
        setMyMembership(membership);
      } else {
        setMyMembership(null);
      }
    }).catch(() => setMyMembership(null));
  }, []);

  // Fetch active offer configurations
  useEffect(() => {
    offerConfigsApi.getMap().then((config) => {
      setOfferConfig(config);
    }).catch(() => setOfferConfig(null));
  }, []);

  const [activeOffers, setActiveOffers] = useState<any[]>([]);

  // Fetch active offers list
  useEffect(() => {
    offersApi.getActive().then((list) => {
      setActiveOffers(Array.isArray(list) ? list : []);
    }).catch(() => setActiveOffers([]));
  }, []);

  async function applyCoupon(codeToUse?: string) {
    const code = (typeof codeToUse === "string" ? codeToUse : couponInput).trim().toUpperCase();
    if (!code) return;
    setCouponApplying(true);
    setCouponError("");
    try {
      // Use the already-fetched active coupons list; refresh if empty
      let list = liveCoupons;
      if (list.length === 0) {
        const fresh = await couponsApi.getActive();
        list = Array.isArray(fresh) ? fresh : [];
        setLiveCoupons(list);
      }
      const match = list.find(
        (c: any) => (c.code ?? "").toUpperCase() === code && c.status === 'active'
      );
      if (match) {
        // Validate expiry if present
        const expires = match.expiresAt ? new Date(match.expiresAt) : null;
        if (expires && !isNaN(expires.getTime()) && expires < new Date()) {
          setCouponCode("");
          setCouponDiscount(0);
          setCouponError(t("app.userDashboard.couponInvalid", "Invalid or expired coupon code."));
        } else {
          // discountValue is percentage for 'percentage' type, fixed amount for 'fixed'
          // For summary display we store the percentage (or 0 for fixed to show ₹ savings)
          const isPercent = match.discountType === 'percentage';
          const pct = isPercent ? Number(match.discountValue ?? 0) : 0;
          const fixedAmt = !isPercent ? Number(match.discountValue ?? 0) : 0;
          setCouponInput(code);
          setCouponCode(code);
          setCouponDiscount(pct || 0);
          // For fixed discounts store a negative to subtract directly
          if (fixedAmt > 0) setCouponDiscount(-(fixedAmt));
          setCouponError("");
        }
      } else {
        setCouponCode("");
        setCouponDiscount(0);
        setCouponError(t("app.userDashboard.couponInvalid", "Invalid or expired coupon code."));
      }
    } catch {
      setCouponError(t("app.userDashboard.couponInvalid", "Invalid or expired coupon code."));
    } finally {
      setCouponApplying(false);
    }
  }

  function removeCoupon() {
    setCouponCode("");
    setCouponInput("");
    setCouponDiscount(0);
    setCouponError("");
  }

  const suite = useMemo(() => {
    if (selectedSuite === "0" && passedPackage) {
      return {
        id: "0",
        name: passedPackage.name,
        price: passedPackage.price ? `₹${Number(passedPackage.price).toLocaleString("en-IN")}` : "₹0",
        minCapacity: 1,
        capacity: parseInt(String(passedPackage.capacity)) || 2,
        ratePerExtraPerson: 0,
        baseDiscount: 0,
        slotStartTime: "09:00",
        slotEndTime: "21:00",
        slotDurationMins: 150,
        gapBetweenSlotsMins: 30,
        occasions: passedPackage.occasion || "",
        status: "Active" as const,
        images: passedPackage.image ? [passedPackage.image] : [],
        description: passedPackage.description || "",
        amenities: passedPackage.amenities || [],
      } as Suite;
    }
    return suites.find((s) => s.id === selectedSuite);
  }, [selectedSuite, suites, passedPackage]);

  const slotDuration = suite?.slotDurationMins ?? 150;
  const slotGap = suite?.gapBetweenSlotsMins ?? 30;
  const timeSlots = suite
    ? generateSlots(suite.slotStartTime, suite.slotEndTime, slotDuration, slotGap)
    : [];

  const suiteMinCap = suite?.minCapacity ?? 1;

  const suiteMaxCap = suite?.capacity ?? 99;
  const suiteBasePrice = suite ? parseFloat(String(suite.price).replace(/[₹,]/g, "")) : 0;
  const rateExtra = suite?.ratePerExtraPerson ?? 0;
  const extraPersons = Math.max(0, persons - suiteMinCap);
  const personsTotal = extraPersons * rateExtra;
  const [addons, setAddons] = useState<ApiAddOn[]>([]);
  const [addonsLoading, setAddonsLoading] = useState(false);


  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setAddonsLoading(true);
        const data = await addonsApi.getAll();
        if (cancelled) return;
        const list = (data || []) as ApiAddOn[];
        setAddons(list);
        setAddonQty((prev) => {
          const next: Record<string, number> = { ...prev };
          // init missing addons to 0, remove qty for addons not in list
          const allowed = new Set(list.map((x) => String(x.id)));
          Object.keys(next).forEach((k) => {
            if (!allowed.has(k)) delete next[k];
          });
          list.forEach((a) => {
            const k = String(a.id);
            if (typeof next[k] !== "number") next[k] = 0;
          });
          return next;
        });
      } catch {
        if (cancelled) return;
        setAddons([]);
      } finally {
        if (!cancelled) setAddonsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const numSlots = Math.max(1, startTimes.length);
  const addonsTotal = (addons.reduce((sum: number, a) => sum + Number(a.price) * (addonQty[String(a.id)] || 0), 0) + personsTotal) * numSlots;
  const basePrice = (passedPackage ? Number(passedPackage.price) : suiteBasePrice) * (passedPackage ? 1 : numSlots);

  // Pre-select suite passed from Book Now
  useEffect(() => {
    // location.state is not persistent on refresh; guard usage.
    const passedId = (location.state as any)?.suiteId;
    if (passedId && suites.length > 0) {
      const found = suites.find((s) => s.id === String(passedId));
      if (found) {
        setSelectedSuite(String(passedId));
        setPersons(found.minCapacity);
      }
    }
    // Intentionally depend only on `suites` to avoid re-running when `location.state` is reset on refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suites]);
  const subtotal = basePrice + addonsTotal;

  const filteredCoupons = useMemo(() => {
    return liveCoupons.filter((c: any) =>
      (c.code ?? "").toUpperCase().includes(couponInput.toUpperCase())
    );
  }, [liveCoupons, couponInput]);
  // Requested: remove serviceFee & taxes from UI. Total is suite + persons + add-ons - discount.
  // couponDiscount > 0 means percentage off; couponDiscount < 0 means fixed ₹ amount off
  const couponSavings = couponDiscount > 0
    ? Math.round(subtotal * couponDiscount / 100)
    : couponDiscount < 0
      ? Math.min(Math.abs(couponDiscount), subtotal)
      : 0;

  const membershipDiscount = 0;
  const membershipSavings = 0;

  const bestOffer = useMemo(() => {
    if (activeOffers.length === 0) return null;

    // Globally disabled check via settings
    if (offerConfig && offerConfig.enableOffers !== 'true') return null;

    // Convert selection ID to category label matching admin options
    const categoryLabelMap: Record<string, string> = {
      "birthday": "Birthday",
      "anniversary": "Anniversary",
      "proposal": "Proposal",
      "baby-shower": "Baby Shower",
      "corporate": "Corporate Events",
      "other": "Other Celebrations"
    };

    const targetLabel = categoryLabelMap[selectedOccasion] || "";
    if (!targetLabel) return null;

    let highestSavings = 0;
    let selectedOffer = null;

    for (const offer of activeOffers) {
      // Parse description which stores applicable categories (occasions)
      const configuredCats = offer.description || "";
      const catsList = configuredCats.split(",").map((c: any) => c.trim().toLowerCase());
      const isMatched = catsList.includes("all") || catsList.includes(targetLabel.toLowerCase());

      if (isMatched) {
        const discVal = Number(offer.discountValue || 0);
        if (discVal <= 0) continue;

        let savings = 0;
        if (offer.discountType === "percentage") {
          savings = Math.round(subtotal * discVal / 100);
        } else if (offer.discountType === "flat") {
          savings = Math.min(discVal, subtotal);
        }

        if (savings > highestSavings) {
          highestSavings = savings;
          selectedOffer = {
            ...offer,
            computedSavings: savings
          };
        }
      }
    }

    return selectedOffer;
  }, [activeOffers, offerConfig, selectedOccasion, subtotal]);

  const offerSavings = bestOffer ? bestOffer.computedSavings : 0;

  const isEligibleForPackageCredit = useMemo(() => {
    if (!myMembership || myMembership.status !== 'active') return false;
    const remaining = Number(myMembership.maxFreeBookings ?? 0) - Number(myMembership.bookingsUsed ?? 0);
    if (remaining <= 0) return false;
    if (!suite || suite.id === "0") return false;
    const suitesList = myMembership.eligibleSuites || [];
    return suitesList.length === 0 || suitesList.includes(String(suite.id));
  }, [myMembership, suite]);

  const isPackageCreditSelected = paymentMethod === "package-credit";
  const grandTotal = isPackageCreditSelected ? 0 : Math.max(0, subtotal - couponSavings - membershipSavings - offerSavings);

  // Requested: dynamic payable amount (full vs 20% advance).
  const advanceAmount = Math.round(grandTotal * 0.2);
  const payableNow = grandTotal;
  const payableAtVenue = advanceAmount;


  const isStepValid = useMemo(() => {
    if (step === 0) return selectedOccasion === "other" ? !!customOccasion.trim() : !!selectedOccasion;
    if (step === 1) return !!bookingDate && startTimes.length > 0;
    if (step === 4) return !!paymentMethod;
    return true;
  }, [step, selectedOccasion, customOccasion, bookingDate, startTimes, selectedSuite, paymentMethod]);

  function handleNext() {
    if (!isStepValid) { setShowValidation(true); return; }
    setShowValidation(false);
    if (isGuestUser) {
      navigate("/register", { state: { fromBooking: true, suiteId: suite?.id } });
      return;
    }
    step < STEPS.length - 1 ? setStep((v) => v + 1) : setConfirmed(true);
  }
  function handleBack() {
    setShowValidation(false);
    if (passedPackage) {
      navigate("/user/dashboard");
      return;
    }
    if (step > 0) setStep((v) => v - 1);
  }



  function updateQty(id: string, delta: number) {
    setAddonQty((p) => ({ ...p, [id]: Math.max(0, (p[id] ?? 0) + delta) }));
  }

  /* ── Shared sidebar JSX ── */
  const Sidebar = (
    <aside className="flex flex-col h-full w-64 bg-[oklch(0.11_0.025_260)] border-r border-gold/10">
      {/* Brand */}
      <div className="flex items-center gap-2 px-3 h-[88px] border-b border-gold/10 shrink-0">
        <div className="h-[72px] w-[72px] rounded-lg shrink-0">
          <img src="/image.png" alt="VibeNests" className="h-full w-full object-contain" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-xl font-semibold tracking-wide text-gradient-gold">VIBENESTS</p>
          <p className="text-[9px] tracking-widest text-muted-foreground uppercase">Private Luxury Suites</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto scrollbar-none">
        {NAV_ITEMS.map(({ id, label, icon: Icon, path }) => {
          const active = id === "suites";
          return (
            <button
              key={id}
              onClick={() => { navigate(path); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${active
                ? "bg-gold/15 border border-gold/25 text-gold font-medium"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? "text-gold" : ""}`} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5 pt-2 border-t border-gold/10">
        <button onClick={() => navigate("/login")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all">
          <LogOut className="h-4 w-4 shrink-0" /> {t("app.userDashboard.logout", "Logout")}
        </button>
      </div>
    </aside>
  );

  if (suitesLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[oklch(0.08_0.015_260)]">
        <div className="glass-card rounded-3xl border border-gold/20 p-8 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">{t("app.userDashboard.loadingSuites", "Loading suites...")}</p>
          <div className="mt-4 h-2 w-56 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-gold/70 animate-[bb_sweep_1s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  /* ── Confirmed screen ── */
  if (confirmed) {
    return (
      <div className="h-screen flex overflow-hidden bg-[oklch(0.08_0.015_260)]">
        <div className="hidden lg:flex shrink-0">{Sidebar}</div>
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="glass-card rounded-3xl border border-gold/20 p-10 text-center max-w-md w-full space-y-5">
            <div className="h-16 w-16 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center mx-auto">
              <Sparkles className="h-7 w-7 text-gold" />
            </div>
            <h2 className="font-display text-3xl text-foreground">
              {passedPackage ? "Package Activated!" : "Booking Confirmed!"}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {passedPackage
                ? `Your VibeNests ${passedPackage.name} Package has been successfully activated. You can now use your booking credits to reserve suites.`
                : "Your luxury suite has been reserved. A confirmation will be sent to you shortly."}
            </p>
            <div className="glass rounded-2xl p-4 text-left space-y-2 border border-white/10">
              {passedPackage ? (
                <>
                  <p className="text-xs text-muted-foreground">VibeNests Celebration Package</p>
                  <p className="text-sm text-foreground font-medium">{passedPackage.name} Package</p>
                  <p className="text-xs text-muted-foreground">Validity: {passedPackage.validityDays} Days · {passedPackage.maxFreeBookings ?? 10} Free Bookings</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    {selectedOccasion === "other"
                      ? (customOccasion || "Other Celebration")
                      : (OCCASIONS.find(o => o.id === selectedOccasion)?.label || "No Occasion")}
                  </p>
                  <p className="text-sm text-foreground font-medium">{suite?.name}</p>
                  <p className="text-xs text-muted-foreground">{bookingDate} · {startTimes.length > 0 ? startTimes.join(', ') : ""}</p>
                </>
              )}
              <p className="text-gold font-semibold">₹{grandTotal.toLocaleString("en-IN")}</p>
            </div>
            <button onClick={() => navigate("/user/dashboard")} className="gold-btn w-full rounded-2xl py-3 text-sm font-semibold">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[oklch(0.08_0.015_260)]">

      {/* ── Desktop sidebar ── */}
      <div className="hidden lg:flex shrink-0">{Sidebar}</div>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed top-0 left-0 h-full z-40 lg:hidden">{Sidebar}</div>
        </>
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* Top header */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-5 h-[88px] border-b border-white/5 glass backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="flex lg:hidden flex-col justify-center items-center gap-[5px] p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <span className="block w-5 h-0.5 bg-muted-foreground" />
              <span className="block w-5 h-0.5 bg-muted-foreground" />
              <span className="block w-5 h-0.5 bg-muted-foreground" />
            </button>
            <button
              onClick={() => navigate("/user/dashboard")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Dashboard
            </button>
            <span className="text-white/20">/</span>
            <span className="text-sm text-foreground font-medium">{t("app.userDashboard.suiteBooking", "Suite Booking")}</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-gold/20 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5 text-gold" /> {t("app.userDashboard.secureBooking", "Secure booking")}
            </span>
            <button className="relative h-9 w-9 rounded-xl glass flex items-center justify-center text-muted-foreground hover:text-gold transition-colors">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-gold" />
            </button>
            <div className="relative">
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className="h-9 w-9 rounded-xl bg-gradient-gold flex items-center justify-center font-bold text-[oklch(0.12_0.02_260)] text-sm hover:opacity-80 transition-opacity"
              >
                {displayLetter}
              </button>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-11 z-50 w-44 glass-card rounded-xl border border-white/10 py-1 shadow-xl">
                    <button
                      onClick={() => { navigate("/login"); setProfileOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4 shrink-0" /> Logout
                    </button>
                    <button
                      onClick={() => setProfileOpen(false)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                    >
                      <ChevronDown className="h-4 w-4 shrink-0" /> Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-5 space-y-5">

            {/* Page title */}
            <div className="glass-card rounded-2xl border border-gold/15 px-6 py-5">
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">{t("app.userDashboard.premiumExperience", "Premium experience")}</p>
              <h2 className="font-display text-2xl lg:text-3xl text-foreground font-semibold mt-1">
                {passedPackage ? `${passedPackage.name} Package Purchase` : (suite ? suite.name : t("app.userDashboard.bookLuxurySuiteSteps", "Book a luxury suite in six effortless steps"))}
              </h2>
              {passedPackage ? (
                <p className="text-xs text-muted-foreground mt-1">Activate your VibeNests {passedPackage.name} Package. Enjoy prepaid free suite bookings and premium benefits.</p>
              ) : suite && (
                <p className="text-xs text-muted-foreground mt-1">{t("app.userDashboard.guestsBaseRate", "{{minCap}}–{{maxCap}} guests · {{price}} base rate", { minCap: suiteMinCap, maxCap: suiteMaxCap, price: suite.price })}</p>
              )}
            </div>

            {/* 2-col grid: step sidebar | form */}
            <div className="grid gap-5 lg:grid-cols-[200px_1fr]">

              {/* ── Left step sidebar ── */}
              <aside className="hidden lg:block">
                <div className="glass-card sticky top-5 rounded-2xl border border-gold/15 p-4 space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-semibold px-2 mb-3">{t("app.userDashboard.yourJourney", "Your Journey")}</p>
                  {STEPS.map((label, index) => {
                    const done = index < step;
                    const active = index === step;
                    const translatedLabel = t(stepKeys[index], label);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => !active && index < step && !passedPackage && setStep(index)}
                        disabled={index > step || !!passedPackage}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-all ${active ? "bg-gold/15 border border-gold/30 text-gold font-semibold"
                          : done ? "bg-white/5 border border-white/8 text-foreground/70 hover:bg-gold/8 hover:text-gold"
                            : "text-muted-foreground/40 cursor-not-allowed"
                          }`}
                      >
                        <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold shrink-0 ${done ? "border-gold bg-gold text-[oklch(0.12_0.02_260)]"
                          : active ? "border-gold bg-gold/15 text-gold"
                            : "border-white/15 bg-white/5 text-muted-foreground/40"
                          }`}>
                          {done ? "✓" : index + 1}
                        </span>
                        <span className="text-left leading-tight">{translatedLabel}</span>
                      </button>
                    );
                  })}

                  {/* Progress */}
                  <div className="mt-4 px-2 space-y-1.5">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{t("app.userDashboard.progress", "Progress")}</span>
                      <span>{Math.round((step / (STEPS.length - 1)) * 100)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-gold/80 to-gold transition-all duration-500"
                        style={{ width: `${Math.round((step / (STEPS.length - 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </aside>

              {/* ── Main form ── */}
              <div className="space-y-4">
                {/* Mobile step pills */}
                <div className="flex lg:hidden items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                  {STEPS.map((label, index) => {
                    const translatedLabel = t(stepKeys[index], label);
                    return (
                      <div key={label} className="flex items-center shrink-0">
                        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium border transition-all ${index === step ? "border-gold bg-gold/15 text-gold"
                          : index < step ? "border-gold/30 bg-gold/8 text-gold/70"
                            : "border-white/10 bg-white/5 text-muted-foreground"
                          }`}>
                          <span className={`h-4 w-4 rounded-full border flex items-center justify-center text-[9px] font-bold shrink-0 ${index < step ? "border-gold bg-gold text-[oklch(0.12_0.02_260)]" : "border-current"
                            }`}>{index < step ? "✓" : index + 1}</span>
                          {index === step && <span>{translatedLabel}</span>}
                        </div>
                        {index < STEPS.length - 1 && (
                          <div className={`w-3 h-px mx-0.5 shrink-0 ${index < step ? "bg-gold/50" : "bg-white/10"}`} />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="glass-card rounded-2xl border border-gold/15 p-5 space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("app.userDashboard.stepText", "Step {{step}}", { step: step + 1 })}</p>
                      <h3 className="font-display text-xl text-foreground font-semibold mt-1">{t(stepKeys[step], STEPS[step])}</h3>
                    </div>
                    <div className="rounded-xl bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.25em] text-muted-foreground border border-white/10">
                      {step + 1} / {STEPS.length}
                    </div>
                  </div>

                  {/* Step 0 */}
                  {step === 0 && (
                    <div className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        {localizedOccasions.map((o) => {
                          const Icon = o.icon;
                          const active = o.id === selectedOccasion;
                          return (
                            <button key={o.id} type="button" onClick={() => setSelectedOccasion(o.id)}
                              className={`flex flex-col gap-3 rounded-2xl border p-4 text-left transition-all ${active ? "border-gold bg-gold/10 shadow-[0_16px_40px_rgba(255,190,90,0.1)]"
                                : "border-white/10 bg-white/5 hover:border-gold/20 hover:bg-white/10"
                                }`}>
                              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${o.highlight}`}>
                                <Icon className="h-5 w-5" />
                              </span>
                              <div>
                                <h4 className="font-display text-base text-foreground">{o.label}</h4>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{o.description}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {selectedOccasion === "other" && (
                        <div className="space-y-2 mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
                          <label className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-semibold block">
                            Specify Celebration / Occasion
                          </label>
                          <input
                            type="text"
                            required
                            value={customOccasion}
                            onChange={(e) => setCustomOccasion(e.target.value)}
                            placeholder="e.g. Graduation Party, Farewell, Custom Celebration..."
                            className="luxury-input w-full rounded-2xl px-4 py-3 text-sm bg-black/40"
                          />
                          {showValidation && !customOccasion.trim() && (
                            <p className="text-xs text-rose-400 mt-1 font-medium">Please specify the occasion to proceed.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 1 */}
                  {step === 1 && (
                    <div className="space-y-6">
                      {/* Date */}
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{t("app.userDashboard.selectDate", "Select Date")}</label>
                        <input
                          type="date"
                          value={bookingDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setBookingDate(e.target.value)}
                          className="luxury-input w-full rounded-2xl px-4 py-3 text-sm bg-black/40"
                          style={{ colorScheme: "dark" }}
                        />
                      </div>

                      {/* Time slot boxes */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{t("app.userDashboard.selectTimeSlot", "Select Time Slot")}</p>
                          {/* <span className="px-2 py-0.5 rounded-full bg-gold/10 border border-gold/25 text-[10px] text-gold font-semibold">{slotDuration} min per slot · {slotGap} min gap</span> */}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {timeSlots.length === 0 ? (
                            <div className="col-span-2 py-8 text-center text-xs text-muted-foreground border border-dashed border-white/10 rounded-2xl">
                              No slots defined for this suite.
                            </div>
                          ) : (
                            timeSlots.map((slot) => {
                              const isBooked = blockedSlots.includes(slot);
                              const isPast = bookingDate ? isPastSlot(slot, bookingDate, slotDuration) : false;
                              const isBlocked = isBooked || isPast;
                              const end = getEndTime(slot, slotDuration);
                              const active = startTimes.includes(slot);
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  disabled={isBlocked}
                                  onClick={() => {
                                    if (active) {
                                      setStartTimes(prev => prev.filter(s => s !== slot));
                                    } else {
                                      setStartTimes(prev => [...prev, slot]);
                                    }
                                  }}
                                  className={`flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border text-sm font-medium transition-all ${isBlocked
                                    ? "border-white/5 bg-white/[0.01] text-muted-foreground/45 opacity-45 cursor-not-allowed"
                                    : active
                                      ? "border-gold bg-gold/15 text-gold shadow-[0_0_16px_rgba(212,160,60,0.2)]"
                                      : "border-white/10 bg-white/5 text-muted-foreground hover:border-gold/40 hover:text-foreground hover:bg-white/10"
                                    }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <Clock className={`h-4 w-4 shrink-0 ${active ? "text-gold" : isBlocked ? "text-muted-foreground/35" : "text-gold/40"}`} />
                                    <span>{slot} – {end}</span>
                                  </div>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${isBlocked
                                    ? "border-rose-500/20 bg-rose-500/10 text-rose-400 font-semibold"
                                    : active
                                      ? "border-gold/40 bg-gold/10 text-gold"
                                      : "border-white/10 bg-white/5 text-muted-foreground"
                                    }`}>
                                    {isBlocked ? "Already Booked" : `${slotDuration} min`}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Selected slot badge */}
                      {startTimes.length > 0 && (
                        <div className="flex flex-col gap-2 px-4 py-3 rounded-2xl border border-gold/25 bg-gold/8">
                          <div className="flex items-center gap-2.5">
                            <Clock className="h-4 w-4 text-gold shrink-0" />
                            <p className="text-sm text-foreground">
                              {t("app.userDashboard.selectedSlot", "Selected slots:")}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {startTimes.map(st => (
                              <span key={st} className="text-xs bg-gold/15 text-gold border border-gold/30 px-2 py-1 rounded-full">
                                {st} – {getEndTime(st, slotDuration)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2 */}
                  {step === 2 && (
                    <div className="space-y-5">
                      {suite && (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-gold/25 bg-gold/8">
                          <BedDouble className="h-4 w-4 text-gold shrink-0" />
                          <p className="text-sm text-foreground">
                            <span className="text-gold font-semibold">{suite.name}</span>
                            <span className="text-muted-foreground ml-2 text-xs">· {suiteMinCap}–{suiteMaxCap} {t("app.userDashboard.guests", "guests")} · {suite.price} {t("app.userDashboard.priceBase", "base")}</span>
                          </p>
                        </div>
                      )}
                      <div className="glass-card rounded-2xl border border-white/10 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h4 className="font-display text-base text-foreground">{t("app.userDashboard.numberOfPersons", "Number of People")}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {suite
                                ? rateExtra > 0
                                  ? t("app.userDashboard.personsLimitDesc", "Min {{min}} · Max {{max}} · ₹{{rate}}/extra people above min", { min: suiteMinCap, max: suiteMaxCap, rate: rateExtra })
                                  : t("app.userDashboard.personsLimitDescNoExtra", "Min {{min}} · Max {{max}}", { min: suiteMinCap, max: suiteMaxCap })
                                : t("app.userDashboard.selectSuiteFirst", "Select a suite first")}
                            </p>
                          </div>
                          <p className="font-semibold text-gold shrink-0">₹{personsTotal.toLocaleString("en-IN")}</p>
                        </div>
                        <div className="mt-3 flex items-center gap-3">

                          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5">
                            <button type="button" onClick={() => setPersons((p) => Math.max(suiteMinCap, p - 1))} className="h-7 w-7 rounded-full border border-white/10 text-muted-foreground hover:text-foreground flex items-center justify-center transition">
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-[28px] text-center font-semibold text-foreground text-sm">{persons}</span>
                            <button type="button" onClick={() => setPersons((p) => Math.min(suiteMaxCap, p + 1))} className="h-7 w-7 rounded-full border border-white/10 text-muted-foreground hover:text-foreground flex items-center justify-center transition">
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="text-xs text-muted-foreground">{t("app.userDashboard.guestsLimitText", "{{count}} / {{max}} guests", { count: persons, max: suiteMaxCap })}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {addons.map((addon) => (
                          <div key={addon.id} className="glass-card rounded-2xl border border-white/10 p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <h4 className="font-display text-base text-foreground">{addon.name}</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">{addon.description}</p>
                              </div>
                              <p className="font-semibold text-gold shrink-0">₹{addon.price.toLocaleString("en-IN")}</p>
                            </div>
                            <div className="mt-3 flex items-center gap-3">
                              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5">
                                <button type="button" onClick={() => updateQty(String(addon.id), -1)} className="h-7 w-7 rounded-full border border-white/10 text-muted-foreground hover:text-foreground flex items-center justify-center transition">
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="min-w-[28px] text-center font-semibold text-foreground text-sm">{addonQty[String(addon.id)]}</span>
                                <button type="button" onClick={() => updateQty(String(addon.id), 1)} className="h-7 w-7 rounded-full border border-white/10 text-muted-foreground hover:text-foreground flex items-center justify-center transition">

                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground font-semibold">
                          <MessageSquare className="h-4 w-4 text-gold" /> {t("app.userDashboard.specialRequests", "Special Requests")}
                        </div>
                        <textarea value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} rows={4}
                          placeholder={t("app.userDashboard.specialRequestsPlaceholder", "Add any special instructions...")}
                          className="luxury-input w-full rounded-2xl px-4 py-3 text-sm bg-black/40 resize-none" />
                      </div>
                    </div>
                  )}

                  {/* Step 3 */}
                  {step === 3 && (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="glass-card rounded-2xl border border-white/10 p-4">
                          <h4 className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{t("app.userDashboard.yourCelebration", "Your Celebration")}</h4>
                          <p className="mt-3 text-base text-foreground font-semibold">
                            {selectedOccasion === "other"
                              ? (customOccasion || "Other Celebration")
                              : (localizedOccasions.find((o) => o.id === selectedOccasion)?.label ?? t("app.userDashboard.noOccasion", "No occasion"))}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{bookingDate ? new Date(bookingDate).toLocaleDateString() : t("app.userDashboard.noDate", "No date")}</p>
                          <p className="text-xs text-muted-foreground">{startTimes.length > 0 ? startTimes.map(st => `${st} – ${getEndTime(st, slotDuration)}`).join(', ') : t("app.userDashboard.noTime", "No time")}</p>
                        </div>
                        <div className="glass-card rounded-2xl border border-white/10 p-4">
                          <h4 className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{passedPackage ? "Package" : t("app.userDashboard.suite", "Suite")}</h4>
                          {suite ? (
                            <div className="mt-3 space-y-1">
                              <p className="text-base text-foreground font-semibold">{suite.name}</p>
                              <p className="text-xs text-muted-foreground">{t("app.userDashboard.capacityGuests", "Capacity: {{min}}–{{max}} guests", { min: suiteMinCap, max: suiteMaxCap })}</p>
                              <p className="text-xs text-gold">
                                {passedPackage ? `₹${passedPackage.price.toLocaleString("en-IN")}` : suite.price}
                              </p>
                            </div>
                          ) : <p className="text-xs text-muted-foreground mt-3">{t("app.userDashboard.noSuiteSelected", "No suite selected.")}</p>}
                        </div>
                      </div>
                      <div className="glass-card rounded-2xl border border-white/10 p-4">
                        <h4 className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">{t("app.userDashboard.addons", "Add-ons")}</h4>
                        <div className="flex justify-between text-sm py-1">
                          <span className="text-muted-foreground">
                            {extraPersons > 0
                              ? t("app.userDashboard.personsExtraRate", "{{count}} people ({{extra}} extra × ₹{{rate}})", { count: persons, extra: extraPersons, rate: rateExtra })
                              : t("app.userDashboard.guestsCount", "{{count}} guests", { count: persons })}
                          </span>
                          <span className="text-gold">₹{personsTotal.toLocaleString("en-IN")}</span>
                        </div>
                        {addons.filter((a) => (addonQty[String(a.id)] ?? 0) > 0).map((a) => (
                          <div key={a.id} className="flex justify-between text-sm py-1">
                            <span className="text-muted-foreground">{a.name} × {addonQty[a.id]}</span>
                            <span className="text-gold">₹{(a.price * addonQty[a.id]).toLocaleString("en-IN")}</span>
                          </div>
                        ))}
                      </div>
                      {specialRequests && (
                        <div className="glass-card rounded-2xl border border-white/10 p-4">
                          <h4 className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2">{t("app.userDashboard.specialRequests", "Special Requests")}</h4>
                          <p className="text-xs text-muted-foreground">{specialRequests}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 4 */}
                  {step === 4 && (
                    <div className="space-y-4">
                      <div className="glass-card rounded-2xl border border-white/10 p-4 space-y-4">
                        <h4 className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Full Payment Breakdown</h4>

                        {/* ── Coupon section ── */}
                        {!passedPackage && (
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground font-semibold">
                              <Tag className="h-3.5 w-3.5 text-gold" />
                              {t("app.userDashboard.applyCoupon", "Apply a Coupon")}
                            </label>
                            {couponCode ? (
                              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10">
                                <div className="flex items-center gap-2">
                                  <Tag className="h-4 w-4 text-emerald-400 shrink-0" />
                                  <span className="text-sm font-semibold text-emerald-400">{couponCode}</span>
                                  <span className="text-xs text-emerald-400/80">
                                    {couponDiscount > 0 ? `${couponDiscount}% ` : `₹${Math.abs(couponDiscount)} `}{t("app.userDashboard.discount", "off")}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={removeCoupon}
                                  className="text-xs text-rose-400 hover:text-rose-300 transition-colors border border-rose-400/30 px-2.5 py-1 rounded-full"
                                >
                                  {t("app.userDashboard.remove", "Remove")}
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-3 relative">
                                <div className="flex gap-2">
                                  <div className="relative flex-1">
                                    <input
                                      type="text"
                                      value={couponInput}
                                      onChange={(e) => {
                                        setCouponInput(e.target.value.toUpperCase());
                                        setCouponError("");
                                        setShowSuggestions(true);
                                      }}
                                      onFocus={() => setShowSuggestions(true)}
                                      onBlur={() => {
                                        // Slight delay to allow clicked item in dropdown to register its event
                                        setTimeout(() => setShowSuggestions(false), 200);
                                      }}
                                      onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                                      placeholder={t("app.userDashboard.couponPlaceholder", "Enter coupon code...")}
                                      className="luxury-input w-full rounded-2xl px-4 py-2.5 text-sm bg-black/40 tracking-widest font-mono"
                                    />
                                    {couponInput && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCouponInput("");
                                          setCouponError("");
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => applyCoupon()}
                                    disabled={!couponInput.trim() || couponApplying}
                                    className="gold-btn rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50 shrink-0"
                                  >
                                    {couponApplying ? "..." : t("app.userDashboard.apply", "Apply")}
                                  </button>
                                </div>

                                {showSuggestions && filteredCoupons.length > 0 && (
                                  <div className="absolute left-0 right-0 mt-1.5 z-50 rounded-2xl border border-gold/25 bg-[oklch(0.12_0.02_260)] shadow-2xl p-3 max-h-60 overflow-y-auto space-y-1.5 backdrop-blur-xl">
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1 mb-1">
                                      Suggested Coupons
                                    </p>
                                    {filteredCoupons.map((c) => {
                                      const discountText = c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${Number(c.discountValue).toLocaleString("en-IN")} OFF`;
                                      const expires = c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '';
                                      const isApplicable = !c.minBookingAmount || subtotal >= Number(c.minBookingAmount);

                                      return (
                                        <div
                                          key={c.id}
                                          onMouseDown={(e) => {
                                            e.preventDefault(); // Prevents loss of focus and allows selection
                                            if (isApplicable) {
                                              applyCoupon(c.code);
                                              setShowSuggestions(false);
                                            }
                                          }}
                                          className={`flex items-center justify-between gap-3 text-left border rounded-xl px-3 py-2 text-xs transition select-none
                                            ${isApplicable
                                              ? "bg-gold/5 border-gold/20 hover:border-gold/50 hover:bg-gold/10 cursor-pointer"
                                              : "bg-white/5 border-white/5 opacity-55 cursor-not-allowed"
                                            }`}
                                        >
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-mono font-bold text-gold tracking-wider">{c.code}</span>
                                              <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                                {discountText}
                                              </span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                              {c.description || `${discountText} coupon`}
                                            </p>
                                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-muted-foreground mt-1">
                                              {c.minBookingAmount && (
                                                <span>Min spend: ₹{Number(c.minBookingAmount).toLocaleString("en-IN")}</span>
                                              )}
                                              {expires && (
                                                <span>Expires: {expires}</span>
                                              )}
                                            </div>
                                          </div>
                                          {isApplicable ? (
                                            <span className="text-[10px] font-semibold text-gold border border-gold/30 rounded-lg px-2.5 py-1 hover:bg-gold hover:text-[oklch(0.12_0.02_260)] transition shrink-0">
                                              Apply
                                            </span>
                                          ) : (
                                            <span className="text-[9px] font-medium text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-lg px-2 py-1 shrink-0">
                                              Min ₹{Number(c.minBookingAmount).toLocaleString("en-IN")}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                            {couponError && (
                              <p className="text-xs text-rose-400 flex items-center gap-1">
                                <span>✕</span> {couponError}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <tbody>

                              <tr>
                                <td className="py-2 text-muted-foreground">{passedPackage ? "Package" : "Suite"}</td>
                                <td className="py-2 text-right text-foreground">₹{basePrice.toLocaleString("en-IN")}</td>
                              </tr>
                              {!passedPackage && (
                                <>
                                  <tr>
                                    <td className="py-2 text-muted-foreground">People</td>
                                    <td className="py-2 text-right text-foreground">₹{(personsTotal).toLocaleString("en-IN")}</td>
                                  </tr>
                                  <tr>
                                    <td className="py-2 text-muted-foreground">Add-ons</td>
                                    <td className="py-2 text-right text-foreground">₹{(addonsTotal - personsTotal).toLocaleString("en-IN")}</td>
                                  </tr>
                                </>
                              )}
                              {couponSavings > 0 && (
                                <tr>
                                  <td className="py-2 text-emerald-400 flex items-center gap-1.5">
                                    <Tag className="h-3.5 w-3.5" />
                                    {couponCode} ({couponDiscount > 0 ? `${couponDiscount}% off` : `₹${Math.abs(couponDiscount)} off`})
                                  </td>
                                  <td className="py-2 text-right text-emerald-400">− ₹{couponSavings.toLocaleString("en-IN")}</td>
                                </tr>
                              )}
                              {offerSavings > 0 && bestOffer && (
                                <tr>
                                  <td className="py-2 text-emerald-400 flex items-center gap-1.5">
                                    <Tag className="h-3.5 w-3.5" />
                                    {bestOffer.title} ({bestOffer.discountType === "percentage" ? `${bestOffer.discountValue}% off` : `₹${bestOffer.discountValue} off`})
                                  </td>
                                  <td className="py-2 text-right text-emerald-400">− ₹{offerSavings.toLocaleString("en-IN")}</td>
                                </tr>
                              )}
                              {membershipSavings > 0 && (
                                <tr>
                                  <td className="py-2 text-emerald-400 flex items-center gap-1.5">
                                    <Award className="h-3.5 w-3.5" />
                                    {myMembership.planName} Membership ({membershipDiscount}% off)
                                  </td>
                                  <td className="py-2 text-right text-emerald-400">− ₹{membershipSavings.toLocaleString("en-IN")}</td>
                                </tr>
                              )}
                              <tr className="border-t border-white/10">
                                <td className="py-3 font-semibold">Total</td>
                                <td className="py-3 text-right font-display text-lg text-gold">₹{grandTotal.toLocaleString("en-IN")}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className={`grid gap-3 ${passedPackage ? "grid-cols-1" : (isEligibleForPackageCredit ? "md:grid-cols-3" : "md:grid-cols-2")}`}>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod("pay-now")}
                            className={`rounded-2xl border p-4 text-left transition ${paymentMethod === "pay-now" ? "border-gold bg-gold/10" : "border-white/10 bg-black/40 hover:border-gold/20"}`}
                          >
                            <p className="font-display text-base text-foreground flex items-center justify-between gap-3">
                              <span>Pay Now</span>
                              <span className="text-gold text-sm font-semibold">₹{payableNow.toLocaleString("en-IN")}</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">Pay full amount now</p>
                          </button>

                          {!passedPackage && (
                            <button
                              type="button"
                              onClick={() => setPaymentMethod("pay-venue")}
                              className={`rounded-2xl border p-4 text-left transition ${paymentMethod === "pay-venue" ? "border-gold bg-gold/10" : "border-white/10 bg-black/40 hover:border-gold/20"}`}
                            >
                              <p className="font-display text-base text-foreground flex items-center justify-between gap-3">
                                <span>Pay at Venue</span>
                                <span className="text-gold text-sm font-semibold">₹{payableAtVenue.toLocaleString("en-IN")}</span>
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">Pay 20% advance now, balance at venue</p>
                            </button>
                          )}

                          {!passedPackage && isEligibleForPackageCredit && (
                            <button
                              type="button"
                              onClick={() => setPaymentMethod("package-credit")}
                              className={`rounded-2xl border p-4 text-left transition ${paymentMethod === "package-credit" ? "border-gold bg-gold/10" : "border-white/10 bg-black/40 hover:border-gold/20"}`}
                            >
                              <p className="font-display text-base text-foreground flex items-center justify-between gap-3">
                                <span className="flex items-center gap-1">
                                  <Award className="h-4 w-4 text-gold" />
                                  <span>Package Credit</span>
                                </span>
                                <span className="text-emerald-400 text-sm font-semibold">Free</span>
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {Number(myMembership.maxFreeBookings) - Number(myMembership.bookingsUsed)} remaining
                              </p>
                            </button>
                          )}
                        </div>



                        {payError && <p className="text-sm text-rose-400">{payError}</p>}

                        <div className="rounded-2xl bg-gradient-to-r from-gold/15 to-gold/5 p-4 border border-gold/15">
                          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                            {paymentMethod === "package-credit" ? "Credits Used" : "You Pay"}
                          </p>
                          <p className="mt-1 text-base text-foreground font-semibold">
                            {paymentMethod === "package-credit" ? "1 Booking Credit" : `₹${(paymentMethod === "pay-now" ? payableNow : payableAtVenue).toLocaleString("en-IN")}`}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!suite || !selectedOccasion || !bookingDate || startTimes.length === 0) return;
                            try {
                              setPayError("");

                              const authUserRaw = localStorage.getItem("authUser");
                              const authUser = authUserRaw ? JSON.parse(authUserRaw) : null;
                              const isGuestUser = !authUser || !authUser.id || authUser.fullName === "New Guest" || authUser.fullName === "Guest" || !authUser.email || authUser.email?.endsWith("@phone.local");
                              if (isGuestUser) {
                                navigate("/register", { state: { fromBooking: true, suiteId: suite?.id } });
                                return;
                              }

                              setPaying(true);
                              const bookingPayload: any = {
                                userId: Number(authUser?.id),

                                suiteId: Number(suite.id),
                                suiteName: suite.name,
                                eventType: selectedOccasion === "other" ? customOccasion : selectedOccasion,
                                addOns: Object.keys(addonQty).filter((k) => (addonQty[k] ?? 0) > 0),
                                date: bookingDate,
                                timeSlots: startTimes,
                                persons,
                                basePrice,
                                addonsTotal,
                                savings: couponSavings + membershipSavings + offerSavings,
                                totalAmount: grandTotal,
                                paymentMode: passedPackage ? "package_purchase" : (paymentMethod === "package-credit" ? "package_credit" : (paymentMethod === "pay-now" ? "pay_now" : "pay_at_venue")),
                                advanceAmount: paymentMethod === "package-credit" ? 0 : (paymentMethod === "pay-now" ? payableNow : payableAtVenue),
                                couponCode: couponCode || undefined,
                              };

                              const bookingRes = await bookingsApi.create(bookingPayload);
                              const createdBookingId = bookingRes?.id ?? bookingRes?.bookingId;
                              if (!createdBookingId) throw new Error("Booking creation failed: missing booking id");
                              setBookingId(Number(createdBookingId));

                              if (paymentMethod === "package-credit") {
                                setConfirmed(true);
                                setPaying(false);
                              } else if (paymentMethod === "pay-now") {
                                const createOrderRes = await paymentsApi.createOrder(Number(createdBookingId), payableNow, "razorpay");

                                if ((createOrderRes as any)?.devMode) {
                                  await paymentsApi.verifyPayment(
                                    createOrderRes.paymentId,
                                    createOrderRes.orderId,
                                    `pay_dev_${Date.now()}`,
                                    `sig_dev_${Date.now()}`
                                  );
                                  setConfirmed(true);
                                  setPaying(false);
                                  return;
                                }

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
                                        setConfirmed(true);
                                      } else {
                                        throw new Error("Payment verification failed");
                                      }
                                    } catch (e: any) {
                                      setPayError(e?.message || "Payment verification failed");
                                    } finally {
                                      setPaying(false);
                                    }
                                  },
                                  prefill: {
                                    name: "Guest",
                                    email: "",
                                    contact: "",
                                  },
                                  theme: { color: "#b8972a" },
                                  modal: {
                                    ondismiss: async function () {
                                      try {
                                        await bookingsApi.cancel(Number(createdBookingId), { reason: "Payment aborted by user" });
                                      } catch (e) {
                                        console.error("Failed to cancel aborted booking", e);
                                      }
                                      setPaying(false);
                                      setPayError("Payment was cancelled. The slot has been freed.");
                                    }
                                  }
                                };

                                const rzp = new w.Razorpay(razorpayOptions);
                                rzp.open();
                              } else {
                                // Pay at venue: still take 20% advance via Razorpay,
                                // and keep booking in `pending` after advance succeeds.

                                const createOrderRes = await paymentsApi.createOrder(Number(createdBookingId), payableAtVenue, "razorpay");

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

                                      // Backend will mark paymentStatus=success and booking.status remains pending
                                      // for pay_at_venue (advance only).
                                      const resp = await paymentsApi.verifyPayment(
                                        createOrderRes.paymentId,
                                        razorpayOrderId,
                                        paymentIdFromRazorpay,
                                        signature,
                                      );

                                      if (resp?.success) {
                                        // Show pending confirmation screen
                                        setConfirmed(true);
                                      } else {
                                        throw new Error("Payment verification failed");
                                      }
                                    } catch (e: any) {
                                      setPayError(e?.message || "Payment verification failed");
                                    } finally {
                                      setPaying(false);
                                    }
                                  },
                                  prefill: {
                                    name: "Guest",
                                    email: "",
                                    contact: "",
                                  },
                                  theme: { color: "#b8972a" },
                                };

                                const rzp = new w.Razorpay(razorpayOptions);
                                rzp.open();
                              }
                            } catch (e: any) {
                              setPayError(e?.message || "Unable to proceed with payment");
                              setPaying(false);
                            }
                          }}
                          disabled={paying}
                          className="gold-btn w-full rounded-2xl py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          {paying ? "Processing..." : "Proceed to Pay"}
                        </button>
                      </div>
                    </div>
                  )}


                  {showValidation && !isStepValid && (
                    <p className="text-sm text-rose-400">{t("app.userDashboard.validationError", "Please complete the required selection before continuing.")}</p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={handleBack} disabled={step === 0}
                      className="flex-1 rounded-2xl border border-white/10 px-5 py-3 text-sm text-muted-foreground hover:text-foreground transition disabled:opacity-40">
                      <ChevronLeft className="inline-block h-4 w-4 mr-1" /> Back
                    </button>
                    {step !== 4 && (
                      <button
                        type="button"
                        onClick={handleNext}
                        className="flex-1 gold-btn rounded-2xl px-5 py-3 text-sm font-semibold flex items-center justify-center gap-2"
                      >
                        Continue
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}

                  </div>
                </div>
              </div>


            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
