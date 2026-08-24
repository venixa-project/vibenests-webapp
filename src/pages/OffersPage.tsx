import { useState, useEffect, useMemo } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  Save, X, Plus, Tag, Settings2, Trash2, Ticket,
  Sparkles, Search, Users, User, CheckCircle2,
  Clock, BedDouble, ChevronDown, ChevronUp, Check, Infinity as InfinityIcon,
  AlertCircle
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  offersApi, couponsApi, offerConfigsApi, bookingRulesApi,
  liveCelebrationSettingsApi, addonsApi, suitesApi, usersApi
} from "@/lib/api";
import { toast } from "sonner";

const mapApiCoupon = (c: any) => ({
  id: c.id,
  code: c.code,
  type: c.discountType === 'percentage' ? 'Percentage' : 'Flat Amount',
  value: String(c.discountValue),
  maxDiscount: c.maxDiscountAmount ? String(c.maxDiscountAmount) : '',
  minOrder: String(c.minBookingAmount ?? '0'),
  maxUses: String(c.usageLimit ?? '0'),
  used: c.usedCount ?? 0,
  expiry: c.expiresAt ? c.expiresAt.split('T')[0] : '',
  status: c.status === 'active' ? 'Active' : c.status === 'inactive' ? 'Inactive' : 'Expired',
});

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{label}</label>
      {children}
      {error && (
        <p className="mt-0.5 text-[11px] text-rose-400 flex items-center gap-1 font-medium animate-in fade-in duration-150">
          <AlertCircle className="h-3 w-3 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

function Input({ value, onChange, type = "text", placeholder = "", min, max, hasError = false }: { value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string; min?: number; max?: number; hasError?: boolean }) {
  return (
    <input
      type={type}
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`luxury-input rounded-lg px-3 py-2 text-sm w-full ${hasError ? "border-rose-500 bg-rose-500/5 focus:border-rose-400" : ""}`}
      style={type === "date" ? { colorScheme: "dark" } : undefined}
    />
  );
}

function Select({ value, onChange, options, hasError = false }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[] | string[]; hasError?: boolean }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`luxury-input rounded-lg px-3 py-2 text-sm w-full bg-transparent cursor-pointer ${hasError ? "border-rose-500 bg-rose-500/5 focus:border-rose-400" : ""}`}
    >
      {options.map((opt) => {
        const val = typeof opt === "string" ? opt : opt.value;
        const lbl = typeof opt === "string" ? opt : opt.label;
        return <option key={val} value={val} className="bg-[oklch(0.13_0.025_260)] text-foreground">{lbl}</option>;
      })}
    </select>
  );
}

function Card({ title, subtitle, children, icon: Icon }: { title: string; subtitle?: string; children: React.ReactNode; icon?: any }) {
  return (
    <div className="glass-card rounded-2xl p-5 border border-[var(--gold)]/10 shadow-lg relative">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-[var(--gold)]/10 border border-[var(--gold)]/20 flex items-center justify-center text-gold">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
            {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function OffersPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"config" | "coupon">("config");
  const [loading, setLoading] = useState(true);

  // ── Coupons State ────────────────────────────────────────────────────────────
  const [coupons, setCoupons] = useState<any[]>([]);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    type: "Percentage",
    value: "",
    maxDiscount: "",
    minOrder: "",
    maxUses: "",
    expiry: "",
    status: "Active",
  });
  const [couponSaved, setCouponSaved] = useState(false);
  const [couponErrors, setCouponErrors] = useState<Record<string, string>>({});

  const clearCouponError = (field: string) => {
    setCouponErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // ── Special Offers State ─────────────────────────────────────────────────────
  const [offers, setOffers] = useState<any[]>([]);
  const [suites, setSuites] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [creatingOffer, setCreatingOffer] = useState(false);
  const [expandedOfferId, setExpandedOfferId] = useState<number | null>(null);
  const [offerErrors, setOfferErrors] = useState<Record<string, string>>({});

  const clearOfferError = (field: string) => {
    setOfferErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const [newOffer, setNewOffer] = useState({
    name: "",
    suiteId: "",
    discountPercent: "",
    status: "Active",
  });

  // ── Load Initial Data ────────────────────────────────────────────────────────
  async function loadData() {
    try {
      setLoading(true);
      const [cList, oList, sList, uList] = await Promise.all([
        couponsApi.getAll(),
        offersApi.getAll(),
        suitesApi.getAll().catch(() => []),
        usersApi.getAll().catch(() => []),
      ]);
      setCoupons((cList?.data || cList || []).map(mapApiCoupon));
      setOffers(oList?.data || oList || []);
      setSuites(Array.isArray(sList) ? sList : []);
      setUsers(Array.isArray(uList) ? uList : []);
    } catch (err: any) {
      console.error("Failed to load offers/coupons page data:", err);
      toast.error(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // ── Coupon Handlers ──────────────────────────────────────────────────────────
  async function handleDeleteCoupon(id: number) {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    try {
      await couponsApi.remove(id);
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      toast.success("Coupon deleted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete coupon");
    }
  }

  async function handleAddCoupon() {
    const errors: Record<string, string> = {};
    if (!newCoupon.code.trim()) {
      errors.code = "Coupon code is required.";
    }
    const val = Number(newCoupon.value);
    if (!newCoupon.value.trim() || isNaN(val) || val <= 0) {
      errors.value = newCoupon.type === "Percentage"
        ? "Please enter a valid discount % (1-100)."
        : "Please enter a valid flat amount in ₹.";
    } else if (newCoupon.type === "Percentage" && val > 100) {
      errors.value = "Percentage discount cannot exceed 100%.";
    }

    if (newCoupon.expiry) {
      const d = new Date(newCoupon.expiry);
      if (isNaN(d.getTime())) {
        errors.expiry = "Invalid expiry date.";
      }
    }

    setCouponErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error("Please fix highlighted coupon fields.");
      return;
    }

    try {
      let expiresAt: string | undefined = undefined;
      if (newCoupon.expiry) {
        const d = new Date(newCoupon.expiry);
        expiresAt = d.toISOString();
      }
      const payload = {
        code: newCoupon.code.trim().toUpperCase(),
        discountType: newCoupon.type === "Percentage" ? "percentage" : "flat",
        discountValue: val,
        maxDiscountAmount: newCoupon.maxDiscount ? Number(newCoupon.maxDiscount) : undefined,
        minBookingAmount: newCoupon.minOrder ? Number(newCoupon.minOrder) : undefined,
        usageLimit: newCoupon.maxUses ? Number(newCoupon.maxUses) : undefined,
        expiresAt,
        status: newCoupon.status === "Active" ? "active" : newCoupon.status === "Inactive" ? "inactive" : "expired",
      };
      await couponsApi.create(payload);
      const list = await couponsApi.getAll();
      setCoupons((list?.data || list || []).map(mapApiCoupon));
      setNewCoupon({
        code: "",
        type: "Percentage",
        value: "",
        maxDiscount: "",
        minOrder: "",
        maxUses: "",
        expiry: "",
        status: "Active",
      });
      setCouponErrors({});
      toast.success("Coupon added successfully!");
      setCouponSaved(true);
      setTimeout(() => setCouponSaved(false), 3000);
      setTab("coupon");
    } catch (err: any) {
      toast.error(err.message || "Failed to add coupon");
    }
  }

  // ── Special Offer Handlers ───────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return users;
    return users.filter((u) => {
      const name = (u.fullName || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const phone = (u.phone || "").toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [users, userSearch]);

  function toggleUserSelection(userId: number) {
    clearOfferError("users");
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  function handleSelectAllUsers() {
    clearOfferError("users");
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map((u) => u.id));
    }
  }

  async function handleCreateSpecialOffer() {
    const errors: Record<string, string> = {};
    if (!newOffer.name.trim()) {
      errors.name = "Special offer title is required.";
    }
    const pct = Number(newOffer.discountPercent);
    if (!newOffer.discountPercent || isNaN(pct) || pct <= 0 || pct > 100) {
      errors.discountPercent = "Please enter a valid discount % between 1 and 100.";
    }
    if (selectedUserIds.length === 0) {
      errors.users = "Please select at least one customer to assign this offer.";
    }

    setOfferErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error("Please fix highlighted offer fields.");
      return;
    }

    try {
      setCreatingOffer(true);
      const selectedSuite = suites.find((s) => String(s.id) === String(newOffer.suiteId));

      const payload = {
        title: newOffer.name.trim(),
        discountType: "percentage" as const,
        discountValue: pct,
        applicableTo: "suite" as const,
        suiteId: newOffer.suiteId ? Number(newOffer.suiteId) : undefined,
        suiteName: selectedSuite?.name || undefined,
        assignedUserIds: selectedUserIds,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 100 * 365 * 86400000).toISOString(), // valid until redeemed
        status: newOffer.status === "Active" ? "active" : "inactive",
      };

      await offersApi.create(payload);
      const list = await offersApi.getAll();
      setOffers(list?.data || list || []);
      setNewOffer({
        name: "",
        suiteId: "",
        discountPercent: "",
        status: "Active",
      });
      setOfferErrors({});
      setSelectedUserIds([]);
      setUserSearch("");
      toast.success(`Special offer created & assigned to ${payload.assignedUserIds.length} users!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create special offer");
    } finally {
      setCreatingOffer(false);
    }
  }

  async function handleDeleteOffer(id: number) {
    if (!window.confirm("Are you sure you want to delete this special offer? All active user assignments will be removed.")) return;
    try {
      await offersApi.remove(id);
      setOffers((prev) => prev.filter((o) => o.id !== id));
      toast.success("Special offer deleted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete offer");
    }
  }

  const tabBtn = (active: boolean) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${active
      ? "bg-[var(--gold)] text-black font-semibold shadow-md"
      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
    }`;

  return (
    <div className="flex-1 overflow-y-auto bg-[oklch(0.09_0.02_260)] text-foreground">
      <AdminHeader title={t("app.admin.offersAndCouponConfigurations", "Offers & Coupon Configurations")} />

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-[var(--gold)]/10 animate-ping" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--gold)] border-r-[var(--gold)]/40 animate-spin" />
            <div className="absolute inset-3 rounded-full bg-white/[0.03] border border-[var(--gold)]/20 flex items-center justify-center">
              <Settings2 className="h-5 w-5 text-gold animate-pulse" />
            </div>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-gold/70 animate-pulse">
            {t("app.admin.loadingConfigs", "Loading Configurations...")}
          </p>
        </div>
      ) : (
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
          {/* Navigation Tabs */}
          <div className="flex gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-[var(--gold)]/15 w-fit">
            <button onClick={() => setTab("config")} className={tabBtn(tab === "config")}>
              <Sparkles className="h-4 w-4" /> {t("app.admin.specialOffers", "Special Offers")}
            </button>
            <button onClick={() => setTab("coupon")} className={tabBtn(tab === "coupon")}>
              <Ticket className="h-4 w-4" /> {t("app.admin.addCoupon", "Add Coupon")}
            </button>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              COUPONS TAB
          ══════════════════════════════════════════════════════════════════════ */}
          {tab === "coupon" && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <Card title={t("app.admin.createNewCoupon", "Create New Coupon")} icon={Ticket}>
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={`${t("app.admin.couponCode", "Coupon Code")} *`} error={couponErrors.code}>
                      <input
                        type="text"
                        value={newCoupon.code}
                        onChange={(e) => {
                          setNewCoupon((f) => ({ ...f, code: e.target.value.toUpperCase() }));
                          clearCouponError("code");
                        }}
                        placeholder="e.g. VIBE20"
                        className={`luxury-input rounded-lg px-3 py-2 text-sm w-full font-mono tracking-widest uppercase ${
                          couponErrors.code ? "border-rose-500 bg-rose-500/5 focus:border-rose-400" : ""
                        }`}
                      />
                    </Field>
                    <Field label={t("app.admin.discountType", "Discount Type")}>
                      <Select
                        value={newCoupon.type}
                        onChange={(v) =>
                          setNewCoupon((f) => ({
                            ...f,
                            type: v,
                            value: v === "Percentage" && Number(f.value) > 100 ? "100" : f.value,
                          }))
                        }
                        options={["Percentage", "Flat Amount"]}
                      />
                    </Field>
                    <Field
                      label={`${
                        newCoupon.type === "Percentage"
                          ? t("app.admin.discountPercentLabel", "Discount Value (%)")
                          : t("app.admin.discountAmountLabel", "Discount Value (₹)")
                      } *`}
                      error={couponErrors.value}
                    >
                      <div className="relative">
                        <input
                          type="number"
                          min={1}
                          max={newCoupon.type === "Percentage" ? 100 : undefined}
                          value={newCoupon.value}
                          onChange={(e) => {
                            clearCouponError("value");
                            const val = e.target.value;
                            if (newCoupon.type === "Percentage" && Number(val) > 100) {
                              setNewCoupon((f) => ({ ...f, value: "100" }));
                            } else {
                              setNewCoupon((f) => ({ ...f, value: val }));
                            }
                          }}
                          placeholder={newCoupon.type === "Percentage" ? "e.g. 15 (1 - 100%)" : "e.g. 500"}
                          className={`luxury-input rounded-lg pl-3 pr-10 py-2 text-sm w-full font-medium ${
                            couponErrors.value ? "border-rose-500 bg-rose-500/5 focus:border-rose-400" : ""
                          }`}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gold pointer-events-none">
                          {newCoupon.type === "Percentage" ? "%" : "₹"}
                        </div>
                      </div>
                    </Field>

                    {newCoupon.type === "Percentage" && (
                      <Field label={t("app.admin.maxDiscountCap", "Max Discount Cap (₹)")}>
                        <Input
                          value={newCoupon.maxDiscount}
                          onChange={(v) => setNewCoupon((f) => ({ ...f, maxDiscount: v }))}
                          type="number"
                          placeholder="e.g. 1000 (Optional)"
                        />
                      </Field>
                    )}

                    <Field label={t("app.admin.minOrderAmount", "Min Order Amount (₹)")}>
                      <Input
                        value={newCoupon.minOrder}
                        onChange={(v) => setNewCoupon((f) => ({ ...f, minOrder: v }))}
                        type="number"
                        placeholder="e.g. 1000"
                      />
                    </Field>

                    <Field label={t("app.admin.maxUses", "Max Uses")}>
                      <Input
                        value={newCoupon.maxUses}
                        onChange={(v) => setNewCoupon((f) => ({ ...f, maxUses: v }))}
                        type="number"
                        placeholder="e.g. 100"
                      />
                    </Field>
                    <Field label={t("app.admin.expiryDate", "Expiry Date")} error={couponErrors.expiry}>
                      <Input
                        value={newCoupon.expiry}
                        onChange={(e) => {
                          setNewCoupon((f) => ({ ...f, expiry: e }));
                          clearCouponError("expiry");
                        }}
                        type="date"
                        hasError={!!couponErrors.expiry}
                      />
                    </Field>
                  </div>
                  <Field label={t("app.admin.couponStatus", "Status")}>
                    <Select
                      value={newCoupon.status}
                      onChange={(v) => setNewCoupon((f) => ({ ...f, status: v }))}
                      options={["Active", "Inactive"]}
                    />
                  </Field>
                  <button
                    onClick={handleAddCoupon}
                    className="gold-btn w-full rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 mt-2 shadow-md cursor-pointer"
                  >
                    <Ticket className="h-4 w-4" />
                    {couponSaved ? t("app.admin.couponAddedMsg", "Coupon Added!") : t("app.admin.addCouponBtn", "Add Coupon")}
                  </button>
                </div>
              </Card>

              <Card
                title={t("app.admin.allCouponsTitle", "All Coupons")}
                subtitle={`${coupons.length} coupons configured`}
                icon={Tag}
              >
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {coupons.length === 0 && (
                    <div className="text-center py-10">
                      <Ticket className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">{t("app.admin.noCouponsYet", "No coupons created yet.")}</p>
                    </div>
                  )}
                  {coupons.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 bg-white/[0.03] border border-white/5 rounded-xl px-3.5 py-3 hover:border-[var(--gold)]/30 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[var(--gold)]/10 border border-[var(--gold)]/20 flex items-center justify-center shrink-0">
                          <Ticket className="h-4 w-4 text-gold" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-mono font-bold text-gold tracking-wider">{c.code}</p>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-gold/10 text-gold border border-gold/30 font-semibold">
                              {c.type === "Percentage" ? `${c.value}% OFF` : `₹${Number(c.value).toLocaleString("en-IN")} OFF`}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {c.type}
                            {c.type === "Percentage" && c.maxDiscount ? ` (Cap: ₹${c.maxDiscount})` : ""} · Min ₹{c.minOrder} · {c.used}/{c.maxUses && c.maxUses !== "0" ? c.maxUses : "∞"} used
                          </p>
                          {c.expiry && <p className="text-[10px] text-muted-foreground/70">Expires: {c.expiry}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${c.status === "Active"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-white/5 text-muted-foreground border-white/10"
                            }`}
                        >
                          {c.status}
                        </span>
                        <button
                          onClick={() => handleDeleteCoupon(c.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              SPECIAL OFFERS TAB
          ══════════════════════════════════════════════════════════════════════ */}
          {tab === "config" && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* ── Left Column: Create Special Offer Form (5 cols) ── */}
              <div className="xl:col-span-5 space-y-5">
                <Card title="Create Special Offer" subtitle="Target suite & assign users" icon={Sparkles}>
                  <div className="space-y-4">
                    {/* Offer Name */}
                    <Field label="Special Offer Title *" error={offerErrors.name}>
                      <Input
                        value={newOffer.name}
                        onChange={(v) => {
                          setNewOffer((f) => ({ ...f, name: v }));
                          clearOfferError("name");
                        }}
                        hasError={!!offerErrors.name}
                        placeholder="e.g. VIP Suite Special Discount"
                      />
                    </Field>

                    {/* Same Row: Suite Selection & Users Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Select Specific Suite */}
                      <Field label="Target Suite">
                        <select
                          value={newOffer.suiteId}
                          onChange={(e) => setNewOffer((f) => ({ ...f, suiteId: e.target.value }))}
                          className="luxury-input rounded-lg px-3 py-2 text-sm w-full bg-transparent cursor-pointer"
                        >
                          <option value="" className="bg-[oklch(0.13_0.025_260)] text-foreground">
                            ✨ All Suites / Any
                          </option>
                          {suites.map((s) => (
                            <option key={s.id} value={s.id} className="bg-[oklch(0.13_0.025_260)] text-foreground">
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </Field>

                      {/* Select Users Trigger (Opens Popup) */}
                      <Field label="Assign Users *" error={offerErrors.users}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserModal(true);
                            clearOfferError("users");
                          }}
                          className={`luxury-input rounded-lg px-3 py-2 text-sm w-full bg-transparent text-left flex items-center justify-between hover:border-[var(--gold)]/50 transition cursor-pointer ${
                            offerErrors.users ? "border-rose-500 bg-rose-500/5" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Users className="h-4 w-4 text-gold shrink-0" />
                            <span className="truncate text-xs">
                              {selectedUserIds.length === 0
                                ? "Choose Users..."
                                : selectedUserIds.length === users.length
                                  ? "All Users"
                                  : `${selectedUserIds.length} Selected`}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-gold bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20 shrink-0">
                            {selectedUserIds.length > 0 ? `${selectedUserIds.length}` : "Select"}
                          </span>
                        </button>
                      </Field>
                    </div>

                    {/* Discount Percentage & Offer Status (Active / Inactive only) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Discount Percentage (%) *" error={offerErrors.discountPercent}>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={newOffer.discountPercent}
                          onChange={(v) => {
                            setNewOffer((f) => ({ ...f, discountPercent: v }));
                            clearOfferError("discountPercent");
                          }}
                          hasError={!!offerErrors.discountPercent}
                          placeholder="e.g. 20"
                        />
                      </Field>
                      <Field label="Offer Status">
                        <Select
                          value={newOffer.status}
                          onChange={(v) => setNewOffer((f) => ({ ...f, status: v }))}
                          options={["Active", "Inactive"]}
                        />
                      </Field>
                    </div>

                    {/* Selected Users Pill Summary */}
                    {selectedUserIds.length > 0 && (
                      <div className="bg-white/[0.02] border border-white/10 rounded-xl p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-gold" />
                          <span className="text-xs text-foreground font-medium">
                            {selectedUserIds.length} {selectedUserIds.length === 1 ? "user" : "users"} assigned
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowUserModal(true)}
                          className="text-xs text-gold hover:underline cursor-pointer font-medium"
                        >
                          Modify
                        </button>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      onClick={handleCreateSpecialOffer}
                      disabled={creatingOffer}
                      className="gold-btn w-full rounded-lg py-3 text-sm font-semibold flex items-center justify-center gap-2 mt-2 shadow-lg disabled:opacity-50"
                    >
                      <Sparkles className="h-4 w-4" />
                      {creatingOffer ? "Creating Special Offer..." : "Create Special Offer"}
                    </button>
                  </div>
                </Card>
              </div>

              {/* ── Right Column: All Special Offers & Assigned Users (7 cols) ── */}
              <div className="xl:col-span-7 space-y-5">
                <Card
                  title="All Special Offers"
                  subtitle={`${offers.length} special offers created`}
                  icon={Tag}
                >
                  <div className="space-y-3.5 max-h-[720px] overflow-y-auto pr-1">
                    {offers.length === 0 && (
                      <div className="text-center py-14">
                        <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No special offers created yet.</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Create targeted discounts on suites for specific users using the form.
                        </p>
                      </div>
                    )}

                    {offers.map((o) => {
                      const isExpanded = expandedOfferId === o.id;
                      const assignments = Array.isArray(o.assignments) ? o.assignments : [];
                      const redeemedCount = assignments.filter((a: any) => a.status === "redeemed").length;
                      const assignedCount = assignments.filter((a: any) => a.status === "assigned").length;

                      return (
                        <div
                          key={o.id}
                          className="bg-white/[0.03] border border-white/10 rounded-2xl p-4.5 hover:border-[var(--gold)]/30 transition shadow-sm space-y-3"
                        >
                          {/* Top header row */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-display text-base font-semibold text-foreground truncate">{o.title}</h4>
                                <span className="px-2.5 py-0.5 rounded-full border border-gold/40 text-gold bg-gold/10 text-xs font-bold tracking-wider">
                                  {o.discountValue}% OFF
                                </span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${o.status === "active"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : "bg-white/5 text-muted-foreground border-white/10"
                                    }`}
                                >
                                  {o.status === "active" ? "ACTIVE" : "INACTIVE"}
                                </span>
                              </div>

                              {/* Targeted Suite badge */}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
                                <BedDouble className="h-3.5 w-3.5 text-gold shrink-0" />
                                <span>
                                  Target Suite:{" "}
                                  <strong className="text-foreground font-semibold">
                                    {o.suiteName || (o.suiteId ? `Suite #${o.suiteId}` : "All Suites")}
                                  </strong>
                                </span>
                              </div>

                              {/* Validity indicator */}
                              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/90 pt-0.5">
                                <InfinityIcon className="h-3.5 w-3.5" />
                                <span>Valid until redeemed</span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteOffer(o.id)}
                              title="Delete Special Offer"
                              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition shrink-0 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Assigned Users Section */}
                          <div className="pt-2 border-t border-white/[0.06]">
                            <button
                              type="button"
                              onClick={() => setExpandedOfferId(isExpanded ? null : o.id)}
                              className="flex items-center justify-between w-full text-xs font-semibold text-foreground/80 hover:text-foreground py-1 cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <Users className="h-3.5 w-3.5 text-gold" />
                                <span>Assigned Users ({assignments.length})</span>
                                {redeemedCount > 0 && (
                                  <span className="text-[10px] font-normal text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                    {redeemedCount} Redeemed
                                  </span>
                                )}
                                {assignedCount > 0 && (
                                  <span className="text-[10px] font-normal text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                    {assignedCount} Active
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-gold text-[11px]">
                                <span>{isExpanded ? "Hide List" : "View Assigned Users"}</span>
                                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              </div>
                            </button>

                            {/* Expanded Assigned Users List */}
                            {isExpanded && (
                              <div className="mt-2.5 space-y-1.5 max-h-48 overflow-y-auto bg-black/20 rounded-xl p-2 border border-white/5">
                                {assignments.length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-2">
                                    No individual users assigned.
                                  </p>
                                ) : (
                                  assignments.map((as: any) => {
                                    const u = as.user;
                                    const isRedeemed = as.status === "redeemed";
                                    return (
                                      <div
                                        key={as.id}
                                        className="flex items-center justify-between gap-2 bg-white/[0.02] border border-white/[0.04] rounded-lg px-2.5 py-1.5 text-xs"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div className="w-5 h-5 rounded-full bg-gold/10 text-gold flex items-center justify-center text-[10px] font-bold shrink-0">
                                            {(u?.fullName || u?.email || "U").charAt(0).toUpperCase()}
                                          </div>
                                          <div className="min-w-0">
                                            <p className="font-medium text-foreground truncate">{u?.fullName || "Guest User"}</p>
                                            <p className="text-[10px] text-muted-foreground truncate">{u?.email || `User #${as.userId}`}</p>
                                          </div>
                                        </div>
                                        <div className="shrink-0">
                                          {isRedeemed ? (
                                            <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                                              <CheckCircle2 className="h-3 w-3" /> Booked {as.bookingId ? `#${as.bookingId}` : ""}
                                            </span>
                                          ) : (
                                            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                              <Clock className="h-3 w-3" /> Assigned
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              USER SELECTION POPUP MODAL
          ══════════════════════════════════════════════════════════════════════ */}
          {showUserModal && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="glass-card border border-gold/30 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh] w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-semibold text-foreground">Select Target Users</h3>
                      <p className="text-[11px] text-muted-foreground">Assign this special offer to specific users</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Modal Search & Quick Actions */}
                <div className="py-3 space-y-2.5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search users by name, email, or phone..."
                      className="luxury-input rounded-xl pl-9 pr-3 py-2 text-sm w-full bg-white/[0.02]"
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-muted-foreground">
                      Showing <strong className="text-foreground">{filteredUsers.length}</strong> of {users.length} users
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllUsers}
                        className="text-gold hover:underline font-medium cursor-pointer"
                      >
                        {selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0
                          ? "Deselect All"
                          : `Select All (${filteredUsers.length})`}
                      </button>
                      {selectedUserIds.length > 0 && (
                        <>
                          <span className="text-white/20">|</span>
                          <button
                            type="button"
                            onClick={() => setSelectedUserIds([])}
                            className="text-muted-foreground hover:text-rose-400 cursor-pointer"
                          >
                            Clear
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal User List */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 divide-y divide-white/[0.04] min-h-[220px]">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-10">
                      <User className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No users found matching "{userSearch}"</p>
                    </div>
                  ) : (
                    filteredUsers.map((u) => {
                      const isChecked = selectedUserIds.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleUserSelection(u.id)}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              toggleUserSelection(u.id);
                            }
                          }}
                          className={`flex items-center justify-between gap-3 p-2.5 rounded-xl cursor-pointer select-none transition ${isChecked ? "bg-[var(--gold)]/10 border border-[var(--gold)]/30" : "hover:bg-white/5 border border-transparent"
                            }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 pointer-events-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="h-4 w-4 rounded border-white/20 bg-transparent text-gold accent-[var(--gold)] cursor-pointer shrink-0"
                            />
                            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-xs font-bold text-gold shrink-0">
                              {(u.fullName || u.email || "U").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{u.fullName || "Unnamed User"}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                            </div>
                          </div>
                          {u.phone && (
                            <span className="text-[10px] font-mono text-muted-foreground/80 shrink-0 bg-white/5 px-2 py-0.5 rounded-md pointer-events-none">
                              {u.phone}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Modal Footer */}
                <div className="pt-4 mt-3 border-t border-white/10 flex items-center justify-between gap-3">
                  <span className="text-xs text-gold font-semibold">
                    {selectedUserIds.length} {selectedUserIds.length === 1 ? "user" : "users"} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowUserModal(false)}
                      className="px-4 py-2 rounded-xl text-xs border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUserModal(false)}
                      className="gold-btn px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Check className="h-3.5 w-3.5" /> Confirm Selection
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
