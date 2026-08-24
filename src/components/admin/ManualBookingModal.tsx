import React, { useState, useEffect } from "react";
import {
  X,
  Check,
  Search,
  Calendar,
  Clock,
  Sparkles,
  CreditCard,
  Banknote,
  QrCode,
  Building,
  Plus,
  Minus,
  ClipboardPen,
  AlertCircle,
  Users,
  UserPlus,
  UserCheck,
  ChevronDown,
} from "lucide-react";
import { suitesApi, addonsApi, bookingsApi, couponsApi } from "@/lib/api";
import { useAppData } from "@/components/admin/AppDataContext";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { generateSlots } from "@/pages/BookingsPage";

type ApiSuite = {
  id: number;
  name: string;
  price: number;
  capacity: number;
  themeType: string;
  slotStartTime?: string;
  slotEndTime?: string;
  slotDurationMins?: number;
  gapBetweenSlotsMins?: number;
};

type ApiAddon = {
  id: number;
  name: string;
  price: number;
  category: string;
};

interface ManualBookingModalProps {
  onClose: () => void;
  onCreated: (booking: any) => void;
}

export function ManualBookingModal({ onClose, onCreated }: ManualBookingModalProps) {
  const { t } = useTranslation();
  const { users } = useAppData();

  const [step, setStep] = useState<number>(0);
  const stepLabels = [
    "Customer & Occasion",
    "Suite & Schedule",
    "Add-ons & Extras",
    "Billing & Payment"
  ];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Data lists
  const [suites, setSuites] = useState<ApiSuite[]>([]);
  const [addons, setAddons] = useState<ApiAddon[]>([]);

  // Step 1: Customer info
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [userSearch, setUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [occasion, setOccasion] = useState("Birthday");
  const [customOccasion, setCustomOccasion] = useState("");
  const [persons, setPersons] = useState<number>(2);
  const [staffNotes, setStaffNotes] = useState("");

  // Step 2: Suite & Schedule
  const [selectedSuite, setSelectedSuite] = useState<ApiSuite | null>(null);
  const [showSuiteDropdown, setShowSuiteDropdown] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);

  // Step 3: Add-ons
  const [selectedAddons, setSelectedAddons] = useState<Record<number, number>>({});

  // Step 4: Billing & Payment
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);

  // Payment details
  const [paymentMode, setPaymentMode] = useState<"cash" | "upi" | "card" | "bank_transfer">("cash");
  const [collectionType, setCollectionType] = useState<"full" | "partial">("full");
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [paymentReferenceId, setPaymentReferenceId] = useState("");
  const [sendNotification, setSendNotification] = useState<boolean>(false);

  // Fetch initial data
  useEffect(() => {
    suitesApi.getAll().then((list) => {
      setSuites(list as ApiSuite[]);
      if (list && list.length > 0 && !selectedSuite) {
        setSelectedSuite(list[0] as ApiSuite);
      }
    }).catch(() => { });

    addonsApi.getAll().then((list) => {
      setAddons(list as ApiAddon[]);
    }).catch(() => { });

    // Fetch active coupons
    couponsApi.getActive()
      .then((list) => setAvailableCoupons(Array.isArray(list) ? list : []))
      .catch(() => {
        couponsApi.getAll().then((list) => setAvailableCoupons(Array.isArray(list) ? list : [])).catch(() => setAvailableCoupons([]));
      });
  }, []);

  // Fetch blocked slots when suite or date changes
  useEffect(() => {
    if (selectedSuite && date) {
      suitesApi.getBlockedSlots(selectedSuite.id, date)
        .then((slots) => setBlockedSlots(Array.isArray(slots) ? slots : []))
        .catch(() => setBlockedSlots([]));
    } else {
      setBlockedSlots([]);
    }
  }, [selectedSuite, date]);

  // Autofill user selection
  function handleSelectRegisteredUser(u: any) {
    if (!u) return;
    setSelectedUserId(Number(u.id));
    const rawName = (u.name || u.fullName || "").trim();
    const parts = rawName.split(" ");
    setFirstName(parts[0] || rawName || "");
    setLastName(parts.slice(1).join(" ") || "");
    setPhone(u.phone || "");
    setEmail(u.email || "");
    clearFieldError("customer");
    clearFieldError("firstName");
    clearFieldError("phone");
    clearFieldError("email");
    setShowUserDropdown(false);
    setUserSearch("");
    toast.success(`Autofilled details for: ${rawName}`);
  }

  function handleClearUser() {
    setSelectedUserId(null);
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setUserSearch("");
    setShowUserDropdown(false);
  }

  function handleSwitchCustomerMode(mode: "existing" | "new") {
    setCustomerMode(mode);
    clearFieldError("customer");
    if (mode === "new") {
      handleClearUser();
    }
  }

  // End time calculation
  function computeEndTime(start: string, durationMins: number) {
    const [time, period] = start.split(" ");
    const [h, m] = time.split(":").map(Number);
    const totalMin = ((period === "PM" && h !== 12 ? h + 12 : period === "AM" && h === 12 ? 0 : h) * 60) + m + durationMins;
    const endH = Math.floor(totalMin / 60) % 24;
    const endM = totalMin % 60;
    const endPeriod = endH >= 12 ? "PM" : "AM";
    const displayH = endH > 12 ? endH - 12 : endH === 0 ? 12 : endH;
    return `${String(displayH).padStart(2, "0")}:${String(endM).padStart(2, "0")} ${endPeriod}`;
  }

  function handleSelectSlot(slot: string) {
    if (!selectedSuite) return;
    const duration = selectedSuite.slotDurationMins ?? 150;
    setStartTime(slot);
    setEndTime(computeEndTime(slot, duration));
    clearFieldError("timeSlot");
  }

  // Addon helpers
  function updateAddonQty(addonId: number, delta: number) {
    setSelectedAddons((prev) => {
      const current = prev[addonId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[addonId];
        return copy;
      }
      return { ...prev, [addonId]: next };
    });
  }

  // Pricing calculations
  const suitePrice = selectedSuite ? Number(selectedSuite.price) : 0;
  const addonsTotal = Object.entries(selectedAddons).reduce((sum, [id, qty]) => {
    const addon = addons.find((a) => a.id === Number(id));
    return sum + (addon ? Number(addon.price) * qty : 0);
  }, 0);

  const subtotal = suitePrice + addonsTotal;
  const totalDiscount = couponDiscount;
  const totalAmount = Math.max(0, subtotal - totalDiscount);

  // Update advance amount when total changes and collection is full
  useEffect(() => {
    if (collectionType === "full") {
      setAdvanceAmount(totalAmount);
    } else if (advanceAmount > totalAmount) {
      setAdvanceAmount(totalAmount);
    }
  }, [collectionType, totalAmount]);

  const balanceDue = Math.max(0, totalAmount - advanceAmount);

  // Coupon handling
  async function handleApplyCoupon(codeToApply?: string) {
    const code = (typeof codeToApply === "string" ? codeToApply : couponCode).trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    try {
      const res = await couponsApi.validate({
        code,
        bookingAmount: subtotal,
      });
      if (res?.valid) {
        setAppliedCoupon(res.coupon || { code });
        setCouponDiscount(Number(res.discountAmount || 0));
        setCouponCode(code);
        toast.success(`Coupon "${code}" applied! (Saved ₹${res.discountAmount})`);
      } else {
        toast.error(res?.message || "Invalid coupon code for this booking amount");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponCode("");
    toast.info("Coupon removed");
  }

  // Form Validation
  function validateStep(s: number): boolean {
    const errors: Record<string, string> = {};
    if (s === 0) {
      if (customerMode === "existing" && !selectedUserId) {
        errors.customer = "Please select a registered customer or switch to New User.";
      }
      if (!firstName.trim()) {
        errors.firstName = "First name is required.";
      }
      const cleanPhone = phone.replace(/\D/g, "");
      if (!cleanPhone) {
        errors.phone = "Phone number is required.";
      } else if (cleanPhone.length < 10) {
        errors.phone = "Please enter a valid 10-digit phone number.";
      }
      if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errors.email = "Please enter a valid email address.";
      }
      if (occasion === "Other" && !customOccasion.trim()) {
        errors.customOccasion = "Please specify the custom occasion.";
      }
    } else if (s === 1) {
      if (!date) {
        errors.date = "Please select a booking date.";
      }
      if (!selectedSuite) {
        errors.suite = "Please select a luxury suite.";
      }
      if (!startTime || !endTime) {
        errors.timeSlot = "Please select an available time slot.";
      }
    } else if (s === 3) {
      if (collectionType === "partial" && advanceAmount <= 0) {
        errors.advanceAmount = "Please specify the partial advance amount collected (> ₹0).";
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("Please fix the highlighted fields below to continue.");
      return false;
    }
    setError("");
    return true;
  }

  function handleNext() {
    if (!validateStep(step)) return;
    setFieldErrors({});
    setError("");
    setStep((prev) => Math.min(stepLabels.length - 1, prev + 1));
  }

  async function handleSubmit() {
    if (!validateStep(3)) return;

    setLoading(true);
    setError("");

    try {
      // Flatten addon IDs based on quantity for booking entity
      const flattenedAddonIds: number[] = [];
      Object.entries(selectedAddons).forEach(([id, qty]) => {
        for (let i = 0; i < qty; i++) {
          flattenedAddonIds.push(Number(id));
        }
      });

      const effectiveOccasion = occasion === "Other" ? customOccasion.trim() : occasion;
      const isFull = collectionType === "full";
      const finalPaymentStatus: "success" | "partial" = isFull ? "success" : "partial";

      const payload = {
        suiteId: selectedSuite!.id,
        eventType: effectiveOccasion,
        addOns: flattenedAddonIds,
        date,
        timeSlots: [startTime],
        userId: selectedUserId,
        guestFirstName: firstName.trim(),
        guestLastName: lastName.trim() || undefined,
        guestPhone: phone.trim(),
        guestEmail: email.trim() || undefined,
        persons,
        basePrice: suitePrice,
        addonsTotal,
        discountAmount: totalDiscount,
        totalAmount,
        paymentMode: paymentMode,
        paymentStatus: finalPaymentStatus,
        advanceAmount: isFull ? totalAmount : advanceAmount,
        paymentReferenceId: paymentReferenceId.trim() || undefined,
        staffNotes: staffNotes.trim() || undefined,
        sendNotification,
        couponCode: appliedCoupon?.code || (couponCode ? couponCode.trim().toUpperCase() : undefined),
      };

      const result = await bookingsApi.manualCreate(payload);
      toast.success("In-person manual booking recorded successfully! Revenue & transactions updated.");
      onCreated(result);
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to create manual booking.");
    } finally {
      setLoading(false);
    }
  }

  const occasionsList = [
    "Birthday",
    "Anniversary",
    "Proposal",
    "Candlelight Dinner",
    "Romantic Date",
    "Surprise Party",
    "Bachelor / Bachelorette",
    "Corporate Gathering",
    "Other"
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md px-4 py-6 overflow-y-auto">
      <div className="glass-card rounded-2xl p-5 sm:p-6 w-full max-w-2xl border border-[var(--gold)]/30 max-h-[92vh] flex flex-col shadow-2xl shadow-black/80">

        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/30 text-gold">
              <ClipboardPen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg text-foreground font-semibold">
                  Manual / In-Person Booking Entry
                </h3>

              </div>
              <p className="text-xs text-muted-foreground">
                Record offline or phone bookings with direct payment and revenue sync.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-white/5 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1.5 mb-5 shrink-0">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-1.5 flex-1">
              <div
                className={`flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-semibold shrink-0 border transition-all ${i < step
                  ? "bg-[var(--gold)] border-[var(--gold)] text-black"
                  : i === step
                    ? "border-[var(--gold)] text-gold bg-[var(--gold)]/10"
                    : "border-white/20 text-muted-foreground bg-white/[0.02]"
                  }`}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={`text-[11px] font-medium hidden md:inline truncate ${i === step ? "text-gold" : "text-muted-foreground"
                  }`}
              >
                {label}
              </span>
              {i < stepLabels.length - 1 && (
                <div
                  className={`h-px flex-1 ${i < step ? "bg-[var(--gold)]/50" : "bg-white/10"
                    }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-3.5 py-2.5 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">

          {/* ──────── STEP 0: Customer & Occasion ──────── */}
          {step === 0 && (
            <div className="space-y-4 animate-in fade-in duration-200">

              {/* Toggle Buttons: Existing User vs New User */}
              <div className="p-1 rounded-xl bg-black/40 border border-white/10 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSwitchCustomerMode("existing")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${customerMode === "existing"
                    ? "bg-[var(--gold)] text-black shadow-md font-bold"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                    }`}
                >
                  <Users className="h-4 w-4" /> Existing User
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchCustomerMode("new")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${customerMode === "new"
                    ? "bg-[var(--gold)] text-black shadow-md font-bold"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                    }`}
                >
                  <UserPlus className="h-4 w-4" /> New User
                </button>
              </div>

              {/* Existing User Selection Mode */}
              {customerMode === "existing" && (
                <div className="p-3 rounded-xl border border-[var(--gold)]/25 bg-[var(--gold)]/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gold uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" /> Select Customer
                    </label>
                    {selectedUserId && (
                      <button
                        type="button"
                        onClick={handleClearUser}
                        className="text-[11px] text-muted-foreground hover:text-white underline cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Minimal Custom Dropdown with Scroller */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowUserDropdown((prev) => !prev)}
                      className={`luxury-input w-full rounded-lg px-3 py-2 text-xs flex items-center justify-between text-left cursor-pointer hover:border-[var(--gold)]/50 transition ${fieldErrors.customer ? "border-rose-500 bg-rose-500/10" : ""
                        }`}
                    >
                      <span className={selectedUserId ? "text-foreground font-semibold" : "text-muted-foreground"}>
                        {selectedUserId
                          ? (users.find((u) => Number(u.id) === Number(selectedUserId))?.name || `${firstName} ${lastName}`.trim() || `User #${selectedUserId}`)
                          : `-- Select Customer (${users.length} registered) --`}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${showUserDropdown ? "rotate-180 text-gold" : ""
                          }`}
                      />
                    </button>

                    {fieldErrors.customer && (
                      <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors.customer}
                      </p>
                    )}

                    {showUserDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowUserDropdown(false)}
                        />
                        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-white/15 bg-[oklch(0.12_0.03_260)] backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                          <div className="max-h-40 overflow-y-auto divide-y divide-white/5 py-1">
                            {users.map((u) => {
                              const isSelected = String(selectedUserId) === String(u.id);
                              return (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => {
                                    handleSelectRegisteredUser(u);
                                    setShowUserDropdown(false);
                                  }}
                                  className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition cursor-pointer ${isSelected
                                    ? "bg-[var(--gold)]/15 text-gold font-semibold"
                                    : "text-foreground hover:bg-white/5 hover:text-gold"
                                    }`}
                                >
                                  <div>
                                    <span className="font-semibold text-foreground">{u.name || `User #${u.id}`}</span>
                                    <span className="text-[10px] text-muted-foreground ml-2">({u.phone || u.email || "No details"})</span>
                                  </div>
                                  {isSelected && <Check className="h-3.5 w-3.5 text-gold shrink-0" />}
                                </button>
                              );
                            })}
                            {users.length === 0 && (
                              <div className="p-3 text-center text-xs text-muted-foreground">
                                No registered users found.
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Guest Details Form (Autofilled or Manual Entry) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium flex items-center justify-between">
                    <span>First Name <span className="text-rose-400">*</span></span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      clearFieldError("firstName");
                    }}
                    className={`luxury-input w-full rounded-lg px-3 py-2 text-sm mt-1 ${fieldErrors.firstName ? "border-rose-500 bg-rose-500/5 focus:border-rose-400" : ""
                      }`}
                  />
                  {fieldErrors.firstName && (
                    <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kumar"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="luxury-input w-full rounded-lg px-3 py-2 text-sm mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium flex items-center justify-between">
                    <span>Phone Number <span className="text-rose-400">*</span></span>
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      clearFieldError("phone");
                    }}
                    className={`luxury-input w-full rounded-lg px-3 py-2 text-sm mt-1 ${fieldErrors.phone ? "border-rose-500 bg-rose-500/5 focus:border-rose-400" : ""
                      }`}
                  />
                  {fieldErrors.phone && (
                    <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Email Address <span className="text-muted-foreground text-[10px]">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. rajesh@gmail.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFieldError("email");
                    }}
                    className={`luxury-input w-full rounded-lg px-3 py-2 text-sm mt-1 ${fieldErrors.email ? "border-rose-500 bg-rose-500/5 focus:border-rose-400" : ""
                      }`}
                  />
                  {fieldErrors.email && (
                    <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Occasion and Persons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Occasion / Event Type <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                    className="luxury-input w-full rounded-lg px-3 py-2 text-sm mt-1 bg-[oklch(0.13_0.025_260)] cursor-pointer"
                  >
                    {occasionsList.map((occ) => (
                      <option key={occ} value={occ} className="bg-[oklch(0.13_0.025_260)]">
                        {occ}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Number of Guests
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setPersons((p) => Math.max(1, p - 1))}
                      className="h-9 w-9 rounded-lg border border-white/10 hover:border-gold flex items-center justify-center text-foreground hover:text-gold transition cursor-pointer"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex-1 text-center font-semibold text-sm py-1.5 border border-white/10 rounded-lg bg-white/[0.02]">
                      {persons} {persons === 1 ? "Guest" : "Guests"}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPersons((p) => p + 1)}
                      className="h-9 w-9 rounded-lg border border-white/10 hover:border-gold flex items-center justify-center text-foreground hover:text-gold transition cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {occasion === "Other" && (
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Specify Custom Occasion <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Private Movie Screening, Milestone Promotion..."
                    value={customOccasion}
                    onChange={(e) => {
                      setCustomOccasion(e.target.value);
                      clearFieldError("customOccasion");
                    }}
                    className={`luxury-input w-full rounded-lg px-3 py-2 text-sm mt-1 ${fieldErrors.customOccasion ? "border-rose-500 bg-rose-500/5 focus:border-rose-400" : ""
                      }`}
                  />
                  {fieldErrors.customOccasion && (
                    <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors.customOccasion}
                    </p>
                  )}
                </div>
              )}

              {/* Staff remarks / in-person reference */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  Staff Notes / Walk-in Reference (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Booked at front desk, customer requested warm golden ambient lights..."
                  value={staffNotes}
                  onChange={(e) => setStaffNotes(e.target.value)}
                  className="luxury-input w-full rounded-lg px-3 py-2 text-xs mt-1"
                />
              </div>

            </div>
          )}

          {/* ──────── STEP 1: Suite & Schedule ──────── */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">

              {/* Date Selection */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium flex items-center justify-between">
                  <span>Booking Date <span className="text-rose-400">*</span></span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    clearFieldError("date");
                  }}
                  min={new Date().toISOString().split("T")[0]}
                  className={`luxury-input w-full rounded-lg px-3 py-2 text-sm mt-1 ${fieldErrors.date ? "border-rose-500 bg-rose-500/5 focus:border-rose-400" : ""
                    }`}
                  style={{ colorScheme: "dark" }}
                />
                {fieldErrors.date && (
                  <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                    <AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors.date}
                  </p>
                )}
              </div>

              {/* Suite Selection Dropdown */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium flex items-center justify-between">
                  <span>Select Luxury Suite <span className="text-rose-400">*</span></span>
                </label>

                <div className="relative mt-1">
                  <button
                    type="button"
                    onClick={() => setShowSuiteDropdown((prev) => !prev)}
                    className={`luxury-input w-full rounded-lg px-3 py-2 text-xs flex items-center justify-between text-left cursor-pointer hover:border-[var(--gold)]/50 transition ${fieldErrors.suite ? "border-rose-500 bg-rose-500/5" : ""
                      }`}
                  >
                    <span className={selectedSuite ? "text-foreground font-semibold" : "text-muted-foreground"}>
                      {selectedSuite
                        ? `${selectedSuite.name} (₹${Number(selectedSuite.price).toLocaleString("en-IN")}) · ${selectedSuite.themeType}`
                        : "-- Select Luxury Suite --"}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${showSuiteDropdown ? "rotate-180 text-gold" : ""
                        }`}
                    />
                  </button>

                  {fieldErrors.suite && (
                    <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors.suite}
                    </p>
                  )}

                  {showSuiteDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowSuiteDropdown(false)}
                      />
                      <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-white/15 bg-[oklch(0.12_0.03_260)] backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <div className="max-h-48 overflow-y-auto divide-y divide-white/5 py-1">
                          {suites.map((s) => {
                            const isSelected = selectedSuite?.id === s.id;
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  setSelectedSuite(s);
                                  setStartTime("");
                                  setEndTime("");
                                  clearFieldError("suite");
                                  setShowSuiteDropdown(false);
                                }}
                                className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between transition cursor-pointer ${isSelected
                                  ? "bg-[var(--gold)]/15 text-gold font-semibold"
                                  : "text-foreground hover:bg-white/5 hover:text-gold"
                                  }`}
                              >
                                <div>
                                  <p className="font-semibold text-foreground">{s.name}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {s.themeType} · Up to {s.capacity} guests
                                  </p>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                  <span className="font-bold text-gold">
                                    ₹{Number(s.price).toLocaleString("en-IN")}
                                  </span>
                                  {isSelected && <Check className="h-3.5 w-3.5 text-gold shrink-0" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Time Slots */}
              {selectedSuite && date ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                      Select Available Time Slot <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      Duration: {selectedSuite.slotDurationMins ?? 150} mins
                    </span>
                  </div>

                  {(() => {
                    const slots = generateSlots(
                      selectedSuite.slotStartTime ?? "09:00",
                      selectedSuite.slotEndTime ?? "21:00",
                      selectedSuite.slotDurationMins ?? 150,
                      selectedSuite.gapBetweenSlotsMins ?? 30
                    );

                    if (slots.length === 0) {
                      return (
                        <div className="p-4 rounded-xl border border-white/10 text-center text-xs text-muted-foreground">
                          No slot configurations available for this suite.
                        </div>
                      );
                    }

                    return (
                      <div>
                        <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1 p-1 rounded-xl ${fieldErrors.timeSlot ? "border border-rose-500/60 bg-rose-500/5" : ""
                          }`}>
                          {slots.map((slot) => {
                            const isBlocked = blockedSlots.includes(slot);
                            const isSelected = startTime === slot;
                            const calculatedEnd = computeEndTime(slot, selectedSuite.slotDurationMins ?? 150);

                            return (
                              <button
                                key={slot}
                                type="button"
                                disabled={isBlocked}
                                onClick={() => handleSelectSlot(slot)}
                                className={`p-2.5 rounded-xl border text-left transition relative flex flex-col justify-center cursor-pointer ${isSelected
                                  ? "border-[var(--gold)] bg-[var(--gold)]/20 text-gold shadow-md"
                                  : isBlocked
                                    ? "border-white/5 bg-white/[0.01] opacity-35 cursor-not-allowed line-through text-muted-foreground"
                                    : "border-white/10 hover:border-gold/50 bg-white/[0.03] text-foreground"
                                  }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold">{slot}</span>
                                  {isSelected && <Check className="h-3.5 w-3.5 text-gold" />}
                                </div>
                                <span className="text-[10px] text-muted-foreground mt-0.5">
                                  to {calculatedEnd}
                                </span>
                                {isBlocked && (
                                  <span className="text-[9px] text-rose-400 font-medium">Booked / Blocked</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {fieldErrors.timeSlot && (
                          <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                            <AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors.timeSlot}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {startTime && endTime && (
                    <div className="mt-3 p-2.5 rounded-xl bg-gold/5 border border-gold/20 flex items-center justify-between text-xs text-gold">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> Selected Time:
                      </span>
                      <span className="font-semibold">{startTime} – {endTime}</span>
                    </div>
                  )}
                </div>
              ) : null}

            </div>
          )}

          {/* ──────── STEP 2: Add-ons & Extras ──────── */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Select decoration, photography, cakes, or special add-ons requested by the guest:
                </p>
                <span className="text-xs font-semibold text-gold">
                  {Object.values(selectedAddons).reduce((a, b) => a + b, 0)} Items Added (₹{addonsTotal.toLocaleString("en-IN")})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {addons.map((a) => {
                  const qty = selectedAddons[a.id] || 0;
                  const isSelected = qty > 0;

                  return (
                    <div
                      key={a.id}
                      className={`p-3 rounded-xl border transition flex items-center justify-between ${isSelected
                        ? "border-[var(--gold)] bg-[var(--gold)]/10"
                        : "border-white/10 bg-white/[0.02]"
                        }`}
                    >
                      <div className="flex-1 pr-2">
                        <p className="text-xs font-semibold text-foreground">{a.name}</p>
                        <p className="text-[11px] text-gold font-medium mt-0.5">
                          ₹{Number(a.price).toLocaleString("en-IN")}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {qty > 0 && (
                          <button
                            type="button"
                            onClick={() => updateAddonQty(a.id, -1)}
                            className="h-7 w-7 rounded-lg border border-white/20 hover:border-gold flex items-center justify-center text-foreground hover:text-gold transition cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                        )}

                        {qty > 0 && (
                          <span className="text-xs font-bold w-5 text-center text-gold">
                            {qty}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => updateAddonQty(a.id, 1)}
                          className={`h-7 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${qty > 0
                            ? "border-[var(--gold)] bg-[var(--gold)] text-black"
                            : "border-white/20 hover:border-gold text-foreground hover:text-gold"
                            }`}
                        >
                          <Plus className="h-3 w-3" /> {qty === 0 ? "Add" : ""}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {addons.length === 0 && (
                  <div className="col-span-2 p-6 text-center text-xs text-muted-foreground">
                    No add-ons found in database.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ──────── STEP 3: Billing & Payment ──────── */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">

              {/* Itemized Breakdown Card */}
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2.5">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider border-b border-white/10 pb-2">
                  Order Summary
                </h4>

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{selectedSuite?.name || "Suite"} ({startTime || "Slot"})</span>
                  <span className="text-foreground font-medium">₹{suitePrice.toLocaleString("en-IN")}</span>
                </div>

                {addonsTotal > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Add-ons Total ({Object.values(selectedAddons).reduce((a, b) => a + b, 0)} items)</span>
                    <span className="text-foreground font-medium">+ ₹{addonsTotal.toLocaleString("en-IN")}</span>
                  </div>
                )}

                {/* Coupon Code input & Available Coupons */}
                <div className="pt-2 border-t border-white/5 space-y-2">
                  {!appliedCoupon ? (
                    <>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Coupon code (e.g. VIP20)"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="luxury-input flex-1 rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider"
                        />
                        <button
                          type="button"
                          disabled={couponLoading || !couponCode.trim()}
                          onClick={() => handleApplyCoupon()}
                          className="gold-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer"
                        >
                          {couponLoading ? "Applying..." : "Apply"}
                        </button>
                      </div>

                      {/* Available Coupons list */}
                      {availableCoupons.length > 0 && (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                            Available Coupons:
                          </p>
                          {availableCoupons.map((c: any) => {
                            const discountBadge = c.discountType === "percentage"
                              ? `${c.discountValue}% OFF`
                              : `₹${Number(c.discountValue).toLocaleString("en-IN")} OFF`;
                            const isApplicable = !c.minBookingAmount || subtotal >= Number(c.minBookingAmount);

                            return (
                              <div
                                key={c.id || c.code}
                                onClick={() => isApplicable && handleApplyCoupon(c.code)}
                                className={`flex items-center justify-between gap-2 p-2 rounded-xl border text-xs transition ${isApplicable
                                  ? "bg-white/[0.02] border-white/10 hover:border-gold/50 hover:bg-gold/5 cursor-pointer"
                                  : "bg-white/[0.01] border-white/5 opacity-50 cursor-not-allowed"
                                  }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-gold">{c.code}</span>
                                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                      {discountBadge}
                                    </span>
                                  </div>
                                  {c.description && (
                                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{c.description}</p>
                                  )}
                                  {c.minBookingAmount && (
                                    <p className="text-[9px] text-muted-foreground/80 mt-0.5">
                                      Min spend: ₹{Number(c.minBookingAmount).toLocaleString("en-IN")}
                                    </p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  disabled={!isApplicable || couponLoading}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isApplicable) handleApplyCoupon(c.code);
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold shrink-0 transition ${isApplicable
                                    ? "border border-gold/40 text-gold hover:bg-gold hover:text-black cursor-pointer"
                                    : "border border-white/10 text-muted-foreground opacity-50 cursor-not-allowed"
                                    }`}
                                >
                                  Apply
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-between w-full text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                      <span>Coupon <strong>{appliedCoupon.code}</strong> Applied (-₹{couponDiscount.toLocaleString("en-IN")})</span>
                      <button type="button" onClick={handleRemoveCoupon} className="text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer">
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* Final Net Amount */}
                <div className="pt-3 border-t border-[var(--gold)]/30 flex justify-between items-center">
                  <span className="text-sm font-bold text-foreground">Total Payable Amount:</span>
                  <span className="text-lg font-display font-bold text-gold">
                    ₹{totalAmount.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Payment Collection Details */}
              <div className="p-4 rounded-xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 space-y-3.5">
                <h4 className="text-xs font-semibold text-gold uppercase tracking-wider flex items-center gap-1.5">
                  <Banknote className="h-4 w-4" /> In-Person Payment Collection
                </h4>

                {/* Collection Type Selector */}
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: "full", label: "Full Paid", desc: "100% Received" },
                    { id: "partial", label: "Partial Advance", desc: "Deposit Paid" }
                  ].map((ct) => (
                    <button
                      key={ct.id}
                      type="button"
                      onClick={() => setCollectionType(ct.id as any)}
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${collectionType === ct.id
                        ? "border-[var(--gold)] bg-[var(--gold)]/20 text-gold shadow-sm"
                        : "border-white/10 hover:border-white/20 bg-black/30 text-muted-foreground"
                        }`}
                    >
                      <p className="text-xs font-bold">{ct.label}</p>
                      <p className="text-[10px] opacity-75">{ct.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Payment Mode Received
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
                    {[
                      { id: "cash", label: "Cash", icon: Banknote },
                      { id: "upi", label: "UPI / QR", icon: QrCode },
                      { id: "card", label: "Card / POS", icon: CreditCard },
                      { id: "bank_transfer", label: "Bank Transfer", icon: Building },
                    ].map((pm) => {
                      const Icon = pm.icon;
                      const isSelected = paymentMode === pm.id;
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setPaymentMode(pm.id as any)}
                          className={`p-2.5 rounded-xl border flex items-center gap-2 transition cursor-pointer ${isSelected
                            ? "border-[var(--gold)] bg-[var(--gold)]/20 text-gold font-semibold"
                            : "border-white/10 hover:border-white/30 bg-black/20 text-muted-foreground"
                            }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="text-xs">{pm.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Advance Amount input (if partial) */}
                {collectionType === "partial" && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-xs text-muted-foreground uppercase font-medium">
                        Advance Collected (₹) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={totalAmount}
                        value={advanceAmount || ""}
                        onChange={(e) => {
                          setAdvanceAmount(Number(e.target.value));
                          clearFieldError("advanceAmount");
                        }}
                        placeholder="e.g. 1000"
                        className={`luxury-input w-full rounded-lg px-3 py-2 text-sm mt-1 ${fieldErrors.advanceAmount ? "border-rose-500 bg-rose-500/5 focus:border-rose-400" : ""
                          }`}
                      />
                      {fieldErrors.advanceAmount && (
                        <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                          <AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors.advanceAmount}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground uppercase font-medium">
                        Balance Due at Venue (₹)
                      </label>
                      <div className="text-sm font-bold text-amber-400 py-2 px-3 rounded-lg border border-amber-500/20 bg-amber-500/10 mt-1">
                        ₹{balanceDue.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                )}

                {/* Reference ID / Receipt number */}
                <div>
                  <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Transaction Ref / UTR / Receipt No. (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI Ref: 328192837192 or Cash Receipt #1042"
                    value={paymentReferenceId}
                    onChange={(e) => setPaymentReferenceId(e.target.value)}
                    className="luxury-input w-full rounded-lg px-3 py-2 text-xs mt-1"
                  />
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between shrink-0">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-white/10 hover:border-gold text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              Cancel
            </button>

            {step < stepLabels.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="gold-btn px-5 py-2 rounded-xl text-xs font-semibold shadow-md shadow-gold/10 cursor-pointer"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={handleSubmit}
                className="gold-btn px-6 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-gold/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Recording..." : "Confirm & Save Booking"}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
