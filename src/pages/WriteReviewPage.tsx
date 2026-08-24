import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, ChevronRight, CheckCircle2, CalendarDays, Clock,
  Users, MapPin, MessageSquare, Sparkles, ThumbsUp,
  LayoutDashboard, BedDouble, Wallet, Tag, UserCircle,
  HelpCircle, LogOut, Package, History, Bell, AlertCircle
} from "lucide-react";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { useAuth } from "@/components/auth/AuthContext";
import { useTranslation } from "react-i18next";
import { reviewsApi, bookingsApi } from "@/lib/api";

/* ─── Types ──────────────────────────────────────────── */
type CategoryKey = "ambience" | "cleanliness" | "service" | "decoration" | "value";

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "ambience", label: "Ambience" },
  { key: "cleanliness", label: "Cleanliness" },
  { key: "service", label: "Service" },
  { key: "decoration", label: "Decoration" },
  { key: "value", label: "Value for Money" },
];

const OVERALL_LABELS: Record<number, string> = {
  1: "Poor", 2: "Average", 3: "Good", 4: "Very Good", 5: "Excellent",
};
const OVERALL_COLORS: Record<number, string> = {
  1: "text-rose-400", 2: "text-amber-400", 3: "text-yellow-400",
  4: "text-emerald-400", 5: "text-gold",
};

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "suites", label: "Browse Suites", icon: BedDouble },
  { id: "my-bookings", label: "My Bookings", icon: CalendarDays },
  { id: "upcoming", label: "Upcoming Bookings", icon: Clock },
  { id: "past", label: "Past Bookings", icon: History },
  { id: "wallet", label: "Payments", icon: Wallet },
  { id: "packages", label: "Celebration Packages", icon: Package },
  { id: "offers", label: "Special Offers", icon: Tag },
  { id: "profile", label: "Profile Settings", icon: UserCircle },
  { id: "help", label: "Help & Support", icon: HelpCircle },
  { id: "write-review", label: "Write a Review", icon: Star },
];

/* ─── Star Rating ────────────────────────────────────── */
function StarRating({ value, onChange, size = "md" }: {
  value: number; onChange: (v: number) => void; size?: "sm" | "md" | "lg";
}) {
  const [hovered, setHovered] = useState(0);
  const sz = size === "lg" ? "h-8 w-8" : size === "sm" ? "h-4 w-4" : "h-6 w-6";
  const active = hovered || value;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110 active:scale-95">
          <Star className={`${sz} transition-colors duration-150 ${star <= active ? "fill-gold text-gold" : "fill-transparent text-white/20"}`} />
        </button>
      ))}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────── */
export default function WriteReviewPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const displayName = user?.fullName || t("app.userDashboard.welcome_back_name", "Guest");
  const displayLetter = displayName ? displayName.charAt(0).toUpperCase() : "U";
  const displayEmail = user?.email || "";

  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);

  const completedBookings = bookings.filter((b) => b.status === "completed" && !b.hasReview);
  const isGeneralReview = completedBookings.length === 0;
  const selectedBooking = bookings.find((b) => b.id === selectedBookingId);
  const showForm = !loadingBookings && (selectedBookingId !== null || isGeneralReview);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ratings, setRatings] = useState<Record<CategoryKey, number>>({
    ambience: 0, cleanliness: 0, service: 0, decoration: 0, value: 0,
  });
  const [overall, setOverall] = useState(0);
  const [review, setReview] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showError, setShowError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const MAX_CHARS = 1000;

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    setLoadingBookings(true);
    try {
      const data = await bookingsApi.getAll();
      setBookings(data);
    } catch (err: any) {
      console.error("Failed to load bookings", err);
    } finally {
      setLoadingBookings(false);
    }
  }

  async function handleSubmit() {
    if (!isGeneralReview && !selectedBookingId) {
      setSubmitError("Please select a booking to review.");
      return;
    }
    if (!overall) { setShowError(true); return; }
    setShowError(false);
    setSubmitting(true);
    setSubmitError(null);
    try {
      await reviewsApi.create({
        overall,
        ambience: ratings.ambience,
        cleanliness: ratings.cleanliness,
        service: ratings.service,
        decoration: ratings.decoration,
        value: ratings.value,
        comment: review,
        bookingId: selectedBookingId || undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNav(id: string) {
    setSidebarOpen(false);
    if (id === "write-review") return;
    navigate("/user/dashboard");
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--background)]">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 h-[88px] border-b border-white/5 glass backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen((o) => !o)}
            className="flex lg:hidden flex-col justify-center items-center gap-[5px] p-2 rounded-lg hover:bg-white/5 transition-colors group"
            aria-label="Toggle menu">
            <span className={`block h-0.5 bg-muted-foreground group-hover:bg-gold transition-all duration-300 ${sidebarOpen ? "w-5 translate-y-[7px] rotate-45" : "w-5"}`} />
            <span className={`block h-0.5 bg-muted-foreground group-hover:bg-gold transition-all duration-300 ${sidebarOpen ? "w-0 opacity-0" : "w-5"}`} />
            <span className={`block h-0.5 bg-muted-foreground group-hover:bg-gold transition-all duration-300 ${sidebarOpen ? "w-5 -translate-y-[7px] -rotate-45" : "w-5"}`} />
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
          <button className="relative h-9 w-9 rounded-xl glass flex items-center justify-center text-muted-foreground hover:text-gold transition-colors">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-gold" />
          </button>
          <div className="h-9 w-9 rounded-xl bg-gradient-gold flex items-center justify-center font-bold text-[oklch(0.12_0.02_260)] text-sm">{displayLetter}</div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 relative min-h-0">

        {/* Mobile overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
          )}
        </AnimatePresence>

        {/* ── Sidebar ── */}
        <aside className={`absolute lg:relative top-0 left-0 h-full w-64 z-40 flex flex-col shrink-0 glass-card border-r border-white/5 rounded-none transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
            <div className="flex items-center gap-3 p-2 rounded-xl glass flex-1 min-w-0 border border-white/5">
              <div className="h-9 w-9 rounded-full bg-gradient-gold flex items-center justify-center font-bold text-[oklch(0.12_0.02_260)] text-sm shrink-0">{displayLetter}</div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                {displayEmail && <p className="text-[10px] text-muted-foreground truncate">{displayEmail}</p>}
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)}
              className="flex lg:hidden flex-col justify-center items-center gap-[5px] p-2 rounded-lg hover:bg-white/5 transition-colors group ml-2 shrink-0">
              <span className="block w-5 h-0.5 bg-muted-foreground group-hover:bg-gold transition-colors" />
              <span className="block w-5 h-0.5 bg-muted-foreground group-hover:bg-gold transition-colors" />
              <span className="block w-5 h-0.5 bg-muted-foreground group-hover:bg-gold transition-colors" />
            </button>
          </div>


          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-none">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const active = id === "write-review";
              const translatedLabel =
                id === "dashboard" ? t("app.userDashboard.dashboard", "Dashboard") :
                  id === "suites" ? t("app.userDashboard.browseSuites", "Browse Suites") :
                    id === "my-bookings" ? t("app.userDashboard.myBookings", "My Bookings") :
                      id === "upcoming" ? t("app.userDashboard.upcomingBookings", "Upcoming Bookings") :
                        id === "past" ? t("app.userDashboard.pastBookings", "Past Bookings") :
                          id === "wallet" ? t("app.userDashboard.walletPayments", "Payments") :
                            id === "packages" ? t("app.userDashboard.celebrationPackages", "Celebration Packages") :
                              id === "offers" ? t("app.userDashboard.specialOffersReferrals", "Special Offers") :
                                id === "profile" ? t("app.userDashboard.profileSettings", "Profile Settings") :
                                  id === "help" ? t("app.userDashboard.helpSupport", "Help & Support") :
                                    id === "write-review" ? t("app.userDashboard.writeReview", "Write a Review") :
                                      label;
              return (
                <button key={id} onClick={() => handleNav(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 border rounded-xl text-sm transition-all ${active ? "bg-gold/15 border-gold/25 text-gold font-medium" : "border-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}>
                  <Icon className={`h-4 w-4 shrink-0 ${active ? "text-gold" : ""}`} />
                  {translatedLabel}
                </button>
              );
            })}
          </nav>

          <div className="px-3 pb-6 pt-2 border-t border-white/5">
            <button onClick={() => navigate("/login")}
              className="w-full flex items-center gap-3 px-3 py-2.5 border border-transparent rounded-xl text-sm text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all">
              <LogOut className="h-4 w-4 shrink-0" />
              {t("app.userDashboard.logout", "Logout")}
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-y-auto min-h-0">
          {submitted ? (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center min-h-full text-center gap-6 px-4 py-16">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 14, stiffness: 200, delay: 0.1 }}
                className="h-20 w-20 rounded-full bg-gold/15 border-2 border-gold/40 flex items-center justify-center">
                <ThumbsUp className="h-9 w-9 text-gold" />
              </motion.div>
              <div className="space-y-2">
                <h2 className="font-display text-3xl text-foreground">{t("app.userDashboard.thankYou", "Thank You!")}</h2>
                <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                  {t("app.userDashboard.reviewSubmittedDesc", "Your review has been submitted. It helps us craft better experiences for every guest.")}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => navigate("/user/dashboard")}
                  className="glass rounded-xl px-6 py-2.5 text-sm text-muted-foreground border border-white/10 hover:text-foreground hover:border-white/20 transition-all">
                  {t("app.userDashboard.backToDashboard", "Back to Dashboard")}
                </button>
                <button onClick={() => {
                  setSubmitted(false);
                  setSelectedBookingId(null);
                  setOverall(0);
                  setRatings({ ambience: 0, cleanliness: 0, service: 0, decoration: 0, value: 0 });
                  setReview("");
                  fetchBookings();
                }}
                  className="gold-btn rounded-xl px-6 py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
                  {t("app.userDashboard.reviewAnotherStay", "Review Another Stay")} <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

              {/* Breadcrumb */}
              <motion.nav initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-xs text-muted-foreground">
                <button onClick={() => navigate("/user/dashboard")} className="hover:text-gold transition-colors">{t("app.userDashboard.home", "Home")}</button>
                <ChevronRight className="h-3 w-3" />
                <button onClick={() => navigate("/user/dashboard")} className="hover:text-gold transition-colors">{t("app.userDashboard.myBookings", "My Bookings")}</button>
                <ChevronRight className="h-3 w-3" />
                <span className="text-gold font-medium">{t("app.userDashboard.writeReview", "Write a Review")}</span>
              </motion.nav>

              {/* Header Banner */}
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="relative rounded-3xl overflow-hidden min-h-[160px] flex items-center"
                style={{ background: "linear-gradient(135deg, oklch(0.12 0.04 30), oklch(0.10 0.03 265))" }}>
                <div className="relative z-10 p-8 space-y-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border border-gold/40 text-gold bg-gold/10">
                    {t("app.userDashboard.shareExperience", "Share Your Experience")}
                  </span>
                  <h1 className="font-display text-3xl font-semibold text-foreground mt-2">
                    {t("app.userDashboard.writeReview", "Write a Review").split(" ").slice(0, 2).join(" ")} <span className="text-gradient-gold italic">{t("app.userDashboard.writeReview", "Write a Review").split(" ").slice(2).join(" ")}</span>
                  </h1>
                  <p className="text-sm text-muted-foreground max-w-md">
                    {t("app.userDashboard.writeReviewDesc", "Your honest feedback helps us deliver exceptional luxury experiences for every guest.")}
                  </p>
                </div>
                <div className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 items-center justify-center h-24 w-24 rounded-full bg-gold/10 border border-gold/20">
                  <Star className="h-10 w-10 text-gold/60 fill-gold/20" />
                </div>
                {[
                  { sz: "h-4 w-4", pos: "top-5 right-44", d: 0.2 },
                  { sz: "h-3 w-3", pos: "bottom-5 right-36", d: 0.35 },
                  { sz: "h-5 w-5", pos: "top-6 right-64", d: 0.5 },
                ].map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: s.d, type: "spring" }}
                    className={`absolute ${s.pos} hidden md:block`}>
                    <Star className={`${s.sz} fill-gold/30 text-gold/30`} />
                  </motion.div>
                ))}
              </motion.div>

              {/* Two-column layout */}
              <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
                <div className="space-y-5">

                  {/* Completed Bookings Selection Section */}
                  {(loadingBookings || completedBookings.length > 0) && (
                    <div className="glass-card rounded-2xl p-6 space-y-4">
                      <h3 className="font-display text-xl text-foreground flex items-center gap-2">
                        <History className="h-5 w-5 text-gold" />
                        {t("app.userDashboard.yourCompletedBookings", "Your Completed Bookings")}
                      </h3>
                      {loadingBookings ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            className="h-4 w-4 border-2 border-gold border-t-transparent rounded-full"
                          />
                          {t("app.userDashboard.loadingBookings", "Loading bookings...")}
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                          {completedBookings.map((b) => (
                            <div
                              key={b.id}
                              className={`glass-card rounded-xl p-4 flex flex-col justify-between border transition-all ${selectedBookingId === b.id ? "border-gold bg-gold/5" : "border-white/5 hover:border-white/10"
                                }`}
                            >
                              <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="text-[10px] font-mono text-muted-foreground">#{b.orderId || b.id}</p>
                                    <h4 className="font-display text-base font-semibold text-foreground mt-0.5">
                                      {b.suiteName || "Luxury Suite"}
                                    </h4>
                                  </div>
                                </div>
                                <div className="space-y-1 text-xs text-muted-foreground">
                                  <p className="flex items-center gap-1.5">
                                    <CalendarDays className="h-3.5 w-3.5 text-gold/60" /> {b.date}
                                  </p>
                                  <p className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-gold/60" /> {b.timeSlot}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-4">
                                <button
                                  onClick={() => setSelectedBookingId(b.id)}
                                  className={`w-full text-center py-2 text-xs font-semibold rounded-lg transition-all ${selectedBookingId === b.id
                                    ? "bg-gold text-[oklch(0.12_0.02_260)]"
                                    : "bg-gold/10 hover:bg-gold/15 text-gold border border-gold/20"
                                    }`}
                                >
                                  {selectedBookingId === b.id
                                    ? t("app.userDashboard.selectedForReview", "Selected")
                                    : t("app.userDashboard.writeReviewBtn", "Write Review")}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Review Form - Visible when a booking is selected OR for general reviews */}
                  <AnimatePresence>
                    {showForm ? (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 15 }}
                        className="space-y-5"
                      >
                        {/* Selected Booking Summary */}
                        {selectedBooking && (
                          <div className="glass-card rounded-2xl p-5 border border-gold/20 bg-gold/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                              <p className="text-[10px] text-gold uppercase tracking-wider font-semibold">
                                {t("app.userDashboard.nowReviewing", "You are reviewing")}
                              </p>
                              <h3 className="font-display text-lg text-foreground font-semibold mt-0.5">
                                {selectedBooking.suiteName}
                              </h3>
                              <p className="text-xs text-muted-foreground mt-1">
                                Stayed on {selectedBooking.date} at {selectedBooking.timeSlot}
                              </p>
                            </div>
                            <button
                              onClick={() => setSelectedBookingId(null)}
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-3 rounded-lg border border-white/10 hover:bg-white/5"
                            >
                              {t("app.userDashboard.changeBooking", "Change Booking")}
                            </button>
                          </div>
                        )}

                        {/* Category Ratings */}
                        <div className="glass-card rounded-2xl p-6 space-y-4">
                          <div>
                            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-0.5">
                              {t("app.userDashboard.rateYourStay", "Rate Your Stay")}
                            </p>
                            <h3 className="font-display text-xl text-foreground">
                              {t("app.userDashboard.categoryRatings", "Category Ratings")}
                            </h3>
                          </div>
                          <div className="space-y-1">
                            {CATEGORIES.map(({ key, label }, i) => {
                              const transKey = key === "value" ? "valueForMoney" : key;
                              const translatedLabel = t("app.userDashboard." + transKey, label);
                              return (
                                <motion.div
                                  key={key}
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.1 + i * 0.05 }}
                                  className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
                                >
                                  <span className="text-sm text-foreground font-medium w-36 shrink-0">{translatedLabel}</span>
                                  <div className="flex items-center gap-4">
                                    <StarRating
                                      value={ratings[key]}
                                      onChange={(v) => setRatings((prev) => ({ ...prev, [key]: v }))}
                                      size="sm"
                                    />
                                    <span
                                      className={`text-xs w-16 text-right transition-colors ${ratings[key] ? "text-gold" : "text-muted-foreground"
                                        }`}
                                    >
                                      {ratings[key] ? t("app.userDashboard.overallLabels_" + ratings[key], OVERALL_LABELS[ratings[key]]) : "—"}
                                    </span>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Overall Experience */}
                        <div className={`glass-card rounded-2xl p-6 space-y-4 ${showError && !overall ? "border-rose-500/40" : ""}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-0.5">
                                {t("app.userDashboard.required", "Required")}
                              </p>
                              <h3 className="font-display text-xl text-foreground">
                                {t("app.userDashboard.overallExperience", "Overall Experience")}
                              </h3>
                            </div>
                            <AnimatePresence mode="wait">
                              {overall > 0 && (
                                <motion.span
                                  key={overall}
                                  initial={{ opacity: 0, scale: 0.8, y: -4 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  className={`px-3 py-1 rounded-full border border-white/10 bg-white/5 text-sm font-semibold ${OVERALL_COLORS[overall]}`}
                                >
                                  {t("app.userDashboard.overallLabels_" + overall, OVERALL_LABELS[overall])}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </div>
                          <StarRating value={overall} onChange={(v) => { setOverall(v); setShowError(false); }} size="lg" />
                          {showError && !overall && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-xs text-rose-400 flex items-center gap-1.5 font-medium"
                            >
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              {t("app.userDashboard.ratingRequiredError", "Please rate your overall experience before submitting.")}
                            </motion.p>
                          )}
                        </div>

                        {/* Review Text */}
                        <div className="glass-card rounded-2xl p-6 space-y-4">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-gold" />
                            <h3 className="font-display text-xl text-foreground">
                              {t("app.userDashboard.yourReview", "Your Review")}
                            </h3>
                          </div>
                          <textarea
                            value={review}
                            onChange={(e) => setReview(e.target.value.slice(0, MAX_CHARS))}
                            rows={5}
                            placeholder={t(
                              "app.userDashboard.reviewPlaceholder",
                              "Share details about your experience — the ambience, service, what stood out, and anything that could be improved..."
                            )}
                            className="luxury-input w-full rounded-xl px-4 py-4 text-sm text-foreground bg-black/40 resize-none leading-relaxed"
                          />
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] text-muted-foreground">
                              {t("app.userDashboard.charsLimit", "Be specific and honest — your feedback matters.")}
                            </p>
                            <span
                              className={`text-[11px] font-mono ${review.length >= MAX_CHARS
                                ? "text-rose-400"
                                : review.length > 800
                                  ? "text-amber-400"
                                  : "text-muted-foreground"
                                }`}
                            >
                              {review.length} / {MAX_CHARS}
                            </span>
                          </div>
                        </div>

                        {/* Submit/Cancel Buttons */}
                        <div className="flex flex-col gap-3 pb-8">
                          {submitError && (
                            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 font-medium">
                              <AlertCircle className="h-4 w-4 shrink-0" />
                              {submitError}
                            </p>
                          )}
                          <div className="flex gap-3">
                            <button
                              onClick={() => {
                                if (isGeneralReview) {
                                  navigate("/user/dashboard");
                                } else {
                                  setSelectedBookingId(null);
                                }
                              }}
                              disabled={submitting}
                              className="flex-1 glass rounded-xl py-3 text-sm text-muted-foreground border border-white/10 hover:text-foreground hover:border-white/20 transition-all disabled:opacity-50"
                            >
                              {t("app.userDashboard.cancel", "Cancel")}
                            </button>
                            <button
                              onClick={handleSubmit}
                              disabled={submitting}
                              className="flex-1 gold-btn rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {submitting ? (
                                "Submitting..."
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4" /> {t("app.userDashboard.submitReview", "Submit Review")}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground text-sm border border-dashed border-white/10">
                        {t(
                          "app.userDashboard.selectBookingPrompt",
                          "Please select a completed stay from the list above to begin writing your review."
                        )}
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Sidebar info card */}
                <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                  className="glass-card rounded-2xl p-6 space-y-5 sticky top-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                      <MessageSquare className="h-5 w-5 text-gold" />
                    </div>
                    <div>
                      <h4 className="font-display text-base text-foreground">{t("app.userDashboard.whyReviewMatters", "Why Your Review Matters")}</h4>
                      <p className="text-[11px] text-muted-foreground">{t("app.userDashboard.helpServeBetter", "Help us serve better")}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { icon: Star, text: t("app.userDashboard.choosePerfectSuite", "Helps future guests choose the perfect suite") },
                      { icon: Sparkles, text: t("app.userDashboard.motivateTeam", "Motivates our team to maintain luxury standards") },
                      { icon: ThumbsUp, text: t("app.userDashboard.shapeImprovements", "Your insights directly shape service improvements") },
                      { icon: CheckCircle2, text: t("app.userDashboard.verifiedReviews", "Verified reviews build trust in our community") },
                    ].map(({ icon: Icon, text }, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.07 }}
                        className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-lg bg-gold/8 border border-gold/15 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="h-3.5 w-3.5 text-gold/80" />
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
                      </motion.div>
                    ))}
                  </div>
                  <div className="border-t border-white/5 pt-4">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {t("app.userDashboard.moderatedQuality", "Reviews are moderated for quality. Only your first name is shown publicly.")}
                    </p>
                  </div>
                  {overall > 0 && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl bg-gold/8 border border-gold/20 p-4 space-y-2">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("app.userDashboard.ratingPreview", "Rating Preview")}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`h-4 w-4 ${s <= overall ? "fill-gold text-gold" : "fill-transparent text-white/15"}`} />
                          ))}
                        </div>
                        <span className={`text-sm font-semibold ${OVERALL_COLORS[overall]}`}>{t("app.userDashboard.overallLabels_" + overall, OVERALL_LABELS[overall])}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{review || t("app.userDashboard.noWrittenReview", "No written review yet...")}</p>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
