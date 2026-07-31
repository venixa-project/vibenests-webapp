import { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AlertTriangle, Save, X, Plus, Tag, Settings2, Trash2, Ticket } from "lucide-react";
import { useTranslation } from "react-i18next";
import { offersApi, couponsApi, offerConfigsApi, bookingRulesApi, liveCelebrationSettingsApi, addonsApi } from "@/lib/api";
import { toast } from "sonner";

const mapApiCoupon = (c: any) => ({
  id: c.id,
  code: c.code,
  type: c.discountType === 'percentage' ? 'Percentage' : 'Flat Amount',
  value: String(c.discountValue),
  minOrder: String(c.minBookingAmount ?? '0'),
  maxUses: String(c.usageLimit ?? '0'),
  used: c.usedCount ?? 0,
  expiry: c.expiresAt ? c.expiresAt.split('T')[0] : '',
  status: c.status === 'active' ? 'Active' : c.status === 'inactive' ? 'Inactive' : 'Expired',
});

const mapApiOffer = (o: any) => ({
  id: o.id,
  name: o.title,
  type: o.discountType === 'percentage' ? 'Percentage' : 'Flat Amount',
  value: String(o.discountValue),
  categories: o.description || 'All',
  from: o.startDate ? o.startDate.split('T')[0] : '',
  until: o.endDate ? o.endDate.split('T')[0] : '',
  status: o.status === 'active' ? 'Active' : o.status === 'scheduled' ? 'Scheduled' : 'Inactive',
});

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer ${checked ? "bg-[var(--gold)]" : "bg-white/20"}`}>
      <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1"><label className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</label>{children}</div>;
}
function Input({ value, onChange, type = "text", placeholder = "" }: { value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="luxury-input rounded-lg px-3 py-2 text-sm w-full" style={type === "date" ? { colorScheme: "dark" } : undefined} />;
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} className="luxury-input rounded-lg px-3 py-2 text-sm w-full bg-transparent cursor-pointer">{options.map((o) => <option key={o} value={o} className="bg-[oklch(0.13_0.025_260)]">{o}</option>)}</select>;
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="glass-card rounded-2xl p-5 border border-[var(--gold)]/10"><h3 className="font-display text-base font-semibold text-foreground mb-4 pb-3 border-b border-white/[0.06]">{title}</h3>{children}</div>;
}
function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <div className="flex items-center justify-between py-1"><span className="text-sm text-foreground/80">{label}</span><Toggle checked={checked} onChange={onChange} /></div>;
}


export default function OffersPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"config" | "add" | "coupon">("config");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const [coupons, setCoupons] = useState<any[]>([]);
  const [newCoupon, setNewCoupon] = useState({ code: "", type: "Percentage", value: "", minOrder: "", maxUses: "", expiry: "", status: "Active" });
  const [couponSaved, setCouponSaved] = useState(false);


  async function handleDeleteCoupon(id: number) {
    try {
      await couponsApi.remove(id);
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      toast.success("Coupon deleted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete coupon");
    }
  }

  async function handleAddCoupon() {
    if (!newCoupon.code.trim() || !newCoupon.value.trim()) return;
    try {
      let expiresAt: string | undefined = undefined;
      if (newCoupon.expiry) {
        const d = new Date(newCoupon.expiry);
        if (!isNaN(d.getTime())) {
          expiresAt = d.toISOString();
        } else {
          throw new Error("Invalid expiry date format");
        }
      }
      const payload = {
        code: newCoupon.code,
        discountType: newCoupon.type === 'Percentage' ? 'percentage' : 'flat',
        discountValue: Number(newCoupon.value),
        minBookingAmount: newCoupon.minOrder ? Number(newCoupon.minOrder) : undefined,
        usageLimit: newCoupon.maxUses ? Number(newCoupon.maxUses) : undefined,
        expiresAt,
        status: newCoupon.status === 'Active' ? 'active' : newCoupon.status === 'Inactive' ? 'inactive' : 'expired',
      };
      await couponsApi.create(payload);
      const list = await couponsApi.getAll();
      setCoupons((list?.data || list || []).map(mapApiCoupon));
      setNewCoupon({ code: "", type: "Percentage", value: "", minOrder: "", maxUses: "", expiry: "", status: "Active" });
      toast.success("Coupon added successfully!");
      setCouponSaved(true); setTimeout(() => setCouponSaved(false), 3000);
      // Stay on coupon tab so user sees the added coupon in the list
      setTab("coupon");
    } catch (err: any) {
      toast.error(err.message || "Failed to add coupon");
    }
  }

  const [enableOffers, setEnableOffers] = useState(false);
  const [offerName, setOfferName] = useState("");
  const [offerType, setOfferType] = useState("Percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [categories, setCategories] = useState("");
  const [bookingWindow, setBookingWindow] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [offerStatus, setOfferStatus] = useState("Active");
  const [enableRefunds, setEnableRefunds] = useState(false);
  const [refundPct, setRefundPct] = useState("");
  const [refundWindow, setRefundWindow] = useState("");
  const [minBooking, setMinBooking] = useState("");
  const [maxRefunds, setMaxRefunds] = useState("");
  const [cancelBefore, setCancelBefore] = useState("");
  const [policyRefundPct, setPolicyRefundPct] = useState("");
  const [latePenalty, setLatePenalty] = useState("");
  const [dynamicRecovery, setDynamicRecovery] = useState(false);
  const [autoRebook, setAutoRebook] = useState(false);
  const [refundMethod, setRefundMethod] = useState("");
  const [processingDays, setProcessingDays] = useState("");
  const [addons, setAddons] = useState<any[]>([]);
  const [enableLive, setEnableLive] = useState(false);
  const [enableRecording, setEnableRecording] = useState(false);
  const [duration, setDuration] = useState("");
  const [notifTime, setNotifTime] = useState("");
  const [autoGen, setAutoGen] = useState(false);
  const [allowEdits, setAllowEdits] = useState(false);
  const [maxViewers, setMaxViewers] = useState("");
  const [gst, setGst] = useState("");
  const [platformFee, setPlatformFee] = useState("");
  const [convFee, setConvFee] = useState("");
  const [dynamicPricing, setDynamicPricing] = useState(false);
  const [serviceCharge, setServiceCharge] = useState("");
  const [pricingMultiplier, setPricingMultiplier] = useState("");
  const [minBookingRule, setMinBookingRule] = useState("");
  const [advanceRestriction, setAdvanceRestriction] = useState("");
  const [allowModification, setAllowModification] = useState(false);
  const [allowCancellation, setAllowCancellation] = useState(false);
  const [maxRefundDays, setMaxRefundDays] = useState("");
  const [maxNotifications, setMaxNotifications] = useState("");

  const [offers, setOffers] = useState<any[]>([]);
  const [newOffer, setNewOffer] = useState({ name: "", type: "Percentage", value: "", categories: "", from: "", until: "", status: "Active" });
  const [offerSaved, setOfferSaved] = useState(false);

  async function handleAddOffer() {
    if (!newOffer.name.trim() || !newOffer.value.trim()) return;
    try {
      let startDate = new Date().toISOString();
      if (newOffer.from) {
        const d = new Date(newOffer.from);
        if (!isNaN(d.getTime())) {
          startDate = d.toISOString();
        }
      }
      let endDate = new Date(Date.now() + 30 * 24 * 60 * 60000).toISOString();
      if (newOffer.until) {
        const d = new Date(newOffer.until);
        if (!isNaN(d.getTime())) {
          endDate = d.toISOString();
        }
      }
      // Backend only accepts 'percentage' | 'flat' — map Buy 1 Get 1 to 'flat'
      const discountType: 'percentage' | 'flat' =
        newOffer.type === 'Percentage' ? 'percentage' : 'flat';
      const payload = {
        title: newOffer.name,
        discountType,
        discountValue: Number(newOffer.value),
        description: newOffer.categories,
        startDate,
        endDate,
        status: newOffer.status === 'Active' ? 'active' : newOffer.status === 'Scheduled' ? 'scheduled' : 'inactive',
      };
      await offersApi.create(payload);
      const list = await offersApi.getAll();
      setOffers((list?.data || list || []).map(mapApiOffer));
      setNewOffer({ name: "", type: "Percentage", value: "", categories: "", from: "", until: "", status: "Active" });
      toast.success("Offer created successfully!");
      setOfferSaved(true); setTimeout(() => setOfferSaved(false), 3000);
      // Switch to the 'add' tab so the user sees the offer in the list immediately
      setTab("add");
    } catch (err: any) {
      toast.error(err.message || "Failed to add offer");
    }
  }

  async function handleDeleteOffer(id: number) {
    try {
      await offersApi.remove(id);
      setOffers((prev) => prev.filter((o) => o.id !== id));
      toast.success("Offer deleted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete offer");
    }
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const cList = await couponsApi.getAll();
        setCoupons((cList?.data || cList || []).map(mapApiCoupon));

        const oList = await offersApi.getAll();
        setOffers((oList?.data || oList || []).map(mapApiOffer));

        const offerConfigs = await offerConfigsApi.getMap();
        const bookingRules = await bookingRulesApi.getMap();
        const liveSettings = await liveCelebrationSettingsApi.getMap();

        if (offerConfigs) {
          if (offerConfigs.enableOffers !== undefined) setEnableOffers(offerConfigs.enableOffers === 'true');
          if (offerConfigs.offerName !== undefined) setOfferName(offerConfigs.offerName);
          if (offerConfigs.offerType !== undefined) setOfferType(offerConfigs.offerType);
          if (offerConfigs.discountValue !== undefined) setDiscountValue(offerConfigs.discountValue);
          if (offerConfigs.categories !== undefined) setCategories(offerConfigs.categories);
          if (offerConfigs.bookingWindow !== undefined) setBookingWindow(offerConfigs.bookingWindow);
          if (offerConfigs.validFrom !== undefined) setValidFrom(offerConfigs.validFrom);
          if (offerConfigs.validUntil !== undefined) setValidUntil(offerConfigs.validUntil);
          if (offerConfigs.offerStatus !== undefined) setOfferStatus(offerConfigs.offerStatus);
          if (offerConfigs.enableRefunds !== undefined) setEnableRefunds(offerConfigs.enableRefunds === 'true');
          if (offerConfigs.refundPct !== undefined) setRefundPct(offerConfigs.refundPct);
          if (offerConfigs.refundWindow !== undefined) setRefundWindow(offerConfigs.refundWindow);
          if (offerConfigs.minBooking !== undefined) setMinBooking(offerConfigs.minBooking);
          if (offerConfigs.maxRefunds !== undefined) setMaxRefunds(offerConfigs.maxRefunds);
          if (offerConfigs.cancelBefore !== undefined) setCancelBefore(offerConfigs.cancelBefore);
          if (offerConfigs.policyRefundPct !== undefined) setPolicyRefundPct(offerConfigs.policyRefundPct);
          if (offerConfigs.latePenalty !== undefined) setLatePenalty(offerConfigs.latePenalty);
          if (offerConfigs.dynamicRecovery !== undefined) setDynamicRecovery(offerConfigs.dynamicRecovery === 'true');
          if (offerConfigs.autoRebook !== undefined) setAutoRebook(offerConfigs.autoRebook === 'true');
          if (offerConfigs.refundMethod !== undefined) setRefundMethod(offerConfigs.refundMethod);
          if (offerConfigs.processingDays !== undefined) setProcessingDays(offerConfigs.processingDays);
          let loadedAddons = [];
          if (offerConfigs.addons !== undefined) {
            try {
              loadedAddons = JSON.parse(offerConfigs.addons);
            } catch (e) { }
          } else {
            try {
              const dbAddons = await addonsApi.getAll();
              loadedAddons = dbAddons.map((a: any) => ({
                name: a.name,
                refundable: true,
                hours: "24"
              }));
            } catch (e) {
              console.warn("Failed to load active addons", e);
            }
          }
          setAddons(loadedAddons);

          if (offerConfigs.gst !== undefined) setGst(offerConfigs.gst);
          if (offerConfigs.platformFee !== undefined) setPlatformFee(offerConfigs.platformFee);
          if (offerConfigs.convFee !== undefined) setConvFee(offerConfigs.convFee);
          if (offerConfigs.dynamicPricing !== undefined) setDynamicPricing(offerConfigs.dynamicPricing === 'true');
          if (offerConfigs.serviceCharge !== undefined) setServiceCharge(offerConfigs.serviceCharge);
          if (offerConfigs.pricingMultiplier !== undefined) setPricingMultiplier(offerConfigs.pricingMultiplier);
        } else {
          try {
            const dbAddons = await addonsApi.getAll();
            setAddons(dbAddons.map((a: any) => ({
              name: a.name,
              refundable: true,
              hours: "24"
            })));
          } catch (e) {
            console.warn("Failed to load active addons", e);
          }
        }

        if (bookingRules) {
          if (bookingRules.allowModification !== undefined) setAllowModification(bookingRules.allowModification === 'true');
          if (bookingRules.allowCancellation !== undefined) setAllowCancellation(bookingRules.allowCancellation === 'true');
          if (bookingRules.minBookingRule !== undefined) setMinBookingRule(bookingRules.minBookingRule);
          if (bookingRules.advanceRestriction !== undefined) setAdvanceRestriction(bookingRules.advanceRestriction);
          if (bookingRules.maxRefundDays !== undefined) setMaxRefundDays(bookingRules.maxRefundDays);
          if (bookingRules.maxNotifications !== undefined) setMaxNotifications(bookingRules.maxNotifications);
        }

        if (liveSettings) {
          if (liveSettings.enableLive !== undefined) setEnableLive(liveSettings.enableLive === 'true');
          if (liveSettings.enableRecording !== undefined) setEnableRecording(liveSettings.enableRecording === 'true');
          if (liveSettings.duration !== undefined) setDuration(liveSettings.duration);
          if (liveSettings.notifTime !== undefined) setNotifTime(liveSettings.notifTime);
          if (liveSettings.autoGen !== undefined) setAutoGen(liveSettings.autoGen === 'true');
          if (liveSettings.allowEdits !== undefined) setAllowEdits(liveSettings.allowEdits === 'true');
          if (liveSettings.maxViewers !== undefined) setMaxViewers(liveSettings.maxViewers);
        }

      } catch (err) {
        console.warn("Failed to load configs", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave() {
    try {
      setSaved(false);
      const ocPayloads = [
        { configKey: 'enableOffers', configValue: String(enableOffers), valueType: 'boolean' },
        { configKey: 'offerName', configValue: offerName, valueType: 'string' },
        { configKey: 'offerType', configValue: offerType, valueType: 'string' },
        { configKey: 'discountValue', configValue: discountValue, valueType: 'number' },
        { configKey: 'categories', configValue: categories, valueType: 'string' },
        { configKey: 'bookingWindow', configValue: bookingWindow, valueType: 'number' },
        { configKey: 'validFrom', configValue: validFrom, valueType: 'string' },
        { configKey: 'validUntil', configValue: validUntil, valueType: 'string' },
        { configKey: 'offerStatus', configValue: offerStatus, valueType: 'string' },
        { configKey: 'enableRefunds', configValue: String(enableRefunds), valueType: 'boolean' },
        { configKey: 'refundPct', configValue: refundPct, valueType: 'number' },
        { configKey: 'refundWindow', configValue: refundWindow, valueType: 'number' },
        { configKey: 'minBooking', configValue: minBooking, valueType: 'number' },
        { configKey: 'maxRefunds', configValue: maxRefunds, valueType: 'number' },
        { configKey: 'cancelBefore', configValue: cancelBefore, valueType: 'number' },
        { configKey: 'policyRefundPct', configValue: policyRefundPct, valueType: 'number' },
        { configKey: 'latePenalty', configValue: latePenalty, valueType: 'number' },
        { configKey: 'dynamicRecovery', configValue: String(dynamicRecovery), valueType: 'boolean' },
        { configKey: 'autoRebook', configValue: String(autoRebook), valueType: 'boolean' },
        { configKey: 'refundMethod', configValue: refundMethod, valueType: 'string' },
        { configKey: 'processingDays', configValue: processingDays, valueType: 'number' },
        { configKey: 'addons', configValue: JSON.stringify(addons), valueType: 'json' },
        { configKey: 'gst', configValue: gst, valueType: 'number' },
        { configKey: 'platformFee', configValue: platformFee, valueType: 'number' },
        { configKey: 'convFee', configValue: convFee, valueType: 'number' },
        { configKey: 'dynamicPricing', configValue: String(dynamicPricing), valueType: 'boolean' },
        { configKey: 'serviceCharge', configValue: serviceCharge, valueType: 'number' },
        { configKey: 'pricingMultiplier', configValue: pricingMultiplier, valueType: 'number' },
      ];
      for (const p of ocPayloads) {
        await offerConfigsApi.upsert(p as any);
      }

      const brPayloads = [
        { ruleKey: 'allowModification', ruleValue: String(allowModification), valueType: 'boolean' },
        { ruleKey: 'allowCancellation', ruleValue: String(allowCancellation), valueType: 'boolean' },
        { ruleKey: 'minBookingRule', ruleValue: minBookingRule, valueType: 'number' },
        { ruleKey: 'advanceRestriction', ruleValue: advanceRestriction, valueType: 'number' },
        { ruleKey: 'maxRefundDays', ruleValue: maxRefundDays, valueType: 'number' },
        { ruleKey: 'maxNotifications', ruleValue: maxNotifications, valueType: 'number' },
      ];
      for (const p of brPayloads) {
        await bookingRulesApi.upsert(p as any);
      }

      const lcPayloads = [
        { settingKey: 'enableLive', settingValue: String(enableLive), valueType: 'boolean' },
        { settingKey: 'enableRecording', settingValue: String(enableRecording), valueType: 'boolean' },
        { settingKey: 'duration', settingValue: duration, valueType: 'number' },
        { settingKey: 'notifTime', settingValue: notifTime, valueType: 'number' },
        { settingKey: 'autoGen', settingValue: String(autoGen), valueType: 'boolean' },
        { settingKey: 'allowEdits', settingValue: String(allowEdits), valueType: 'boolean' },
        { settingKey: 'maxViewers', settingValue: maxViewers, valueType: 'number' },
      ];
      for (const p of lcPayloads) {
        await liveCelebrationSettingsApi.upsert(p as any);
      }

      toast.success("Configurations saved successfully!");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      toast.error(err.message || "Failed to save configurations");
    }
  }

  const tabBtn = (active: boolean) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${active ? "bg-gradient-to-r from-[oklch(0.86_0.11_85)] to-[oklch(0.7_0.14_70)] text-[oklch(0.12_0.02_260)] shadow" : "text-muted-foreground hover:text-foreground"}`;

  return (
    <div className="flex-1 overflow-y-auto">
      <AdminHeader title="Offers & Coupon Configurations" />
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative w-16 h-16">
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-full border-2 border-[var(--gold)]/10 animate-ping" />
            {/* Spinner outer ring */}
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--gold)] border-r-[var(--gold)]/40 animate-spin" />
            {/* Inner pulsing settings icon */}
            <div className="absolute inset-3 rounded-full bg-white/[0.03] border border-[var(--gold)]/20 flex items-center justify-center">
              <Settings2 className="h-5 w-5 text-gold animate-pulse" />
            </div>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-gold/70 animate-pulse">
            {t("app.admin.loadingConfigs", "Loading Settings...")}
          </p>
        </div>
      ) : (
        <div className="p-4 sm:p-6 space-y-6">

          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-[var(--gold)]/15 w-fit">
            <button onClick={() => setTab("config")} className={tabBtn(tab === "config")}><Settings2 className="h-4 w-4" /> {t("app.admin.addOffer", "Add Offer")}</button>
            <button onClick={() => setTab("coupon")} className={tabBtn(tab === "coupon")}><Ticket className="h-4 w-4" /> {t("app.admin.addCoupon", "Add Coupon")}</button>
          </div>

          {tab === "coupon" && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <Card title={t("app.admin.createNewCoupon", "Create New Coupon")}>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t("app.admin.couponCode", "Coupon Code")}>
                      <input type="text" value={newCoupon.code} onChange={(e) => setNewCoupon((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. VIBE20" className="luxury-input rounded-lg px-3 py-2 text-sm w-full font-mono tracking-widest" />
                    </Field>
                    <Field label={t("app.admin.discountType", "Discount Type")}><Select value={newCoupon.type} onChange={(v) => setNewCoupon((f) => ({ ...f, type: v }))} options={["Percentage", "Flat Amount"]} /></Field>
                    <Field label={t("app.admin.discountValue", "Discount Value")}><Input value={newCoupon.value} onChange={(v) => setNewCoupon((f) => ({ ...f, value: v }))} type="number" placeholder="e.g. 15" /></Field>
                    <Field label={t("app.admin.minOrderAmount", "Min Order Amount (₹)")}><Input value={newCoupon.minOrder} onChange={(v) => setNewCoupon((f) => ({ ...f, minOrder: v }))} type="number" placeholder="e.g. 1000" /></Field>
                    <Field label={t("app.admin.maxUses", "Max Uses")}><Input value={newCoupon.maxUses} onChange={(v) => setNewCoupon((f) => ({ ...f, maxUses: v }))} type="number" placeholder="e.g. 100" /></Field>
                    <Field label={t("app.admin.expiryDate", "Expiry Date")}><Input value={newCoupon.expiry} onChange={(v) => setNewCoupon((f) => ({ ...f, expiry: v }))} type="date" /></Field>
                  </div>
                  <Field label={t("app.admin.couponStatus", "Status")}><Select value={newCoupon.status} onChange={(v) => setNewCoupon((f) => ({ ...f, status: v }))} options={["Active", "Inactive", "Scheduled"]} /></Field>
                  <button onClick={handleAddCoupon} className="gold-btn w-full rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 mt-1">
                    <Ticket className="h-4 w-4" /> {couponSaved ? t("app.admin.couponAddedMsg", "Coupon Added!") : t("app.admin.addCouponBtn", "Add Coupon")}
                  </button>
                </div>
              </Card>
              <Card title={t("app.admin.allCouponsTitle", "All Coupons")}>
                <div className="space-y-2">
                  {coupons.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">{t("app.admin.noCouponsYet", "No coupons yet")}</p>}
                  {coupons.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 bg-white/[0.03] rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Ticket className="h-4 w-4 text-gold shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-mono font-semibold text-gold tracking-widest">{c.code}</p>
                          <p className="text-[11px] text-muted-foreground">{c.type} · {c.value}{c.type === "Percentage" ? "%" : "₹"} · Min ₹{c.minOrder} · {c.used}/{c.maxUses} used · Exp: {c.expiry}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${c.status === "Active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : c.status === "Scheduled" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-white/5 text-muted-foreground border-white/10"}`}>{c.status}</span>
                        <button onClick={() => handleDeleteCoupon(c.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
          {tab === "config" && (
            <>
              <div className="glass-card rounded-2xl p-4 border border-[var(--gold)]/30 bg-[var(--gold)]/5 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-gold shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gold">{t("app.admin.importantNotice", "Important Notice")}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("app.admin.configNoticeText", "Configuration changes take effect immediately and will impact all active bookings, refund processing, and customer-facing policies. Please review carefully before saving.")}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <Card title={t("app.admin.addOffer", "Add Offer")}>
                  <div className="space-y-3">
                    <ToggleRow label={t("app.admin.enableOffers", "Enable Offers")} checked={enableOffers} onChange={setEnableOffers} />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t("app.admin.offerName", "Offer Name")}>
                        <Input value={newOffer.name} onChange={(v) => setNewOffer((f) => ({ ...f, name: v }))} placeholder="e.g. Diwali Special" />
                      </Field>
                      <Field label={t("app.admin.offerType", "Offer Type")}>
                        <Select value={newOffer.type} onChange={(v) => setNewOffer((f) => ({ ...f, type: v }))} options={["Percentage", "Flat Amount"]} />
                      </Field>
                      <Field label={t("app.admin.discountValue", "Discount Value")}>
                        <Input value={newOffer.value} onChange={(v) => setNewOffer((f) => ({ ...f, value: v }))} type="number" placeholder="e.g. 15" />
                      </Field>
                      <Field label={t("app.admin.validFrom", "Valid From")}>
                        <Input value={newOffer.from} onChange={(v) => setNewOffer((f) => ({ ...f, from: v }))} type="date" />
                      </Field>
                      <Field label={t("app.admin.validUntil", "Valid Until")}>
                        <Input value={newOffer.until} onChange={(v) => setNewOffer((f) => ({ ...f, until: v }))} type="date" />
                      </Field>
                      <Field label={t("app.admin.offerStatus", "Status")}>
                        <Select value={newOffer.status} onChange={(v) => setNewOffer((f) => ({ ...f, status: v }))} options={["Active", "Inactive", "Scheduled"]} />
                      </Field>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground uppercase tracking-wide">
                        {t("app.admin.applicableOccasions", "Applicable Occasions")}
                      </label>
                      <div className="grid grid-cols-2 gap-2.5 mt-1 bg-white/[0.02] border border-white/10 rounded-lg p-3">
                        {["All", "Birthday", "Anniversary", "Proposal", "Baby Shower", "Corporate Events", "Other Celebrations"].map((occ) => {
                          const currentList = newOffer.categories ? newOffer.categories.split(",").map((c) => c.trim()) : [];
                          const isChecked = currentList.includes(occ);
                          return (
                            <label key={occ} className="flex items-center gap-2 cursor-pointer select-none text-xs text-foreground/80 hover:text-foreground">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  let newList;
                                  if (occ === "All") {
                                    newList = e.target.checked ? ["All"] : [];
                                  } else {
                                    const filtered = currentList.filter((x) => x !== "All" && x !== "");
                                    if (e.target.checked) {
                                      newList = [...filtered, occ];
                                    } else {
                                      newList = filtered.filter((x) => x !== occ);
                                    }
                                  }
                                  setNewOffer((f) => ({ ...f, categories: newList.join(", ") }));
                                }}
                                className="h-3.5 w-3.5 rounded border-[var(--gold)]/40 bg-transparent accent-[var(--gold)]"
                              />
                              {occ}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <button onClick={handleAddOffer} className="gold-btn w-full rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 mt-1">
                      <Plus className="h-4 w-4" /> {offerSaved ? t("app.admin.offerAddedMsg", "Offer Added!") : t("app.admin.addOfferBtn", "Add Offer")}
                    </button>
                  </div>
                </Card>

                <Card title={t("app.admin.existingOffers", "Existing Offers")}>
                  <div className="space-y-2">
                    {offers.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">{t("app.admin.noOffersYet", "No offers yet")}</p>}
                    {offers.map((o) => (
                      <div key={o.id} className="flex items-center justify-between gap-3 bg-white/[0.03] rounded-xl px-3 py-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Tag className="h-4 w-4 text-gold shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{o.name}</p>
                            <p className="text-[11px] text-muted-foreground">{o.type} · {o.value}{o.type === "Percentage" ? "%" : "₹"} · {o.from} – {o.until}</p>
                            <p className="text-[10px] text-muted-foreground italic truncate">Occasions: {o.categories}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${o.status === "Active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : o.status === "Scheduled" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-white/5 text-muted-foreground border-white/10"}`}>{o.status}</span>
                          <button onClick={() => handleDeleteOffer(o.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>



              </div>

              <div className="flex justify-end gap-3 pb-4">
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm border border-white/10 text-muted-foreground hover:text-foreground transition">
                  <X className="h-4 w-4" /> {t("app.admin.cancelBtn", "Cancel")}
                </button>
                <button onClick={handleSave} className="flex items-center gap-2 gold-btn px-5 py-2.5 rounded-lg text-sm font-semibold">
                  <Save className="h-4 w-4" /> {saved ? t("app.admin.saved", "Saved!") : t("app.admin.saveChanges", "Save Changes")}
                </button>
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
}
