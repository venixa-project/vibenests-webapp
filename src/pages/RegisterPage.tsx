import { useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  User, Mail, Phone, MapPin,
  ShieldCheck, Star, Headphones, ChevronDown, Check,
  AlertCircle, ArrowLeft, Calendar, Heart,
} from "lucide-react";
import { BrandMark } from "@/components/auth/BrandMark";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { authApi } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthContext";
import loginbg from "@/assets/loginbg.png";

/* ── Cities ─────────────────────────────────────────── */
const CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
  "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Goa",
  "Udaipur", "Surat", "Chandigarh", "Kochi", "Indore",
];

/* ── Country Codes ─────────────────────────────────── */
const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳", label: "India (+91)" },
  { code: "+1", flag: "🇺🇸", label: "USA (+1)" },
  { code: "+44", flag: "🇬🇧", label: "UK (+44)" },
  { code: "+61", flag: "🇦🇺", label: "Australia (+61)" },
  { code: "+971", flag: "🇦🇪", label: "UAE (+971)" },
  { code: "+65", flag: "🇸🇬", label: "Singapore (+65)" },
];

/* ── Trust badges ───────────────────────────────────── */
const TRUST_BADGES = [
  { icon: ShieldCheck, key: "securePrivate", label: "Secure & Private", href: "/privacy-policy" },
  { icon: Star, key: "exclusiveAccess", label: "Exclusive Access", href: "/privacy-policy" },
  { icon: Headphones, key: "support247", label: "24/7 Support", href: "/contact" },
];

/* ── Validation helpers ─────────────────────────────── */
function validateName(v: string) {
  if (!v.trim()) return "Full name is required";
  if (!/^[a-zA-Z\s.'-]{2,50}$/.test(v.trim())) {
    return "Full name should contain letters only (min 2 characters)";
  }
  return "";
}

function validateEmail(v: string) {
  if (!v.trim()) return "Email address is required";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "Please enter a valid email address";
}

function validatePhone(v: string, code: string) {
  const cleaned = v.replace(/\D/g, "");
  if (!cleaned) return "Phone number is required";
  if (code === "+91") {
    return /^[6-9]\d{9}$/.test(cleaned) ? "" : "Enter a valid 10-digit Indian mobile number starting with 6-9";
  }
  return /^\d{7,15}$/.test(cleaned) ? "" : "Enter a valid mobile phone number (7 to 15 digits)";
}

/* ── Field wrapper ──────────────────────────────────── */
function Field({
  label, icon: Icon, error, children,
}: {
  label: string;
  icon: React.ElementType;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 whitespace-nowrap">
        <Icon className="h-3 w-3 text-gold/70" />
        {label}
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-1 text-[11px] text-rose-400"
          >
            <AlertCircle className="h-3 w-3 shrink-0" />{error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────── */
export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { saveSession } = useAuth();

  const [searchParams] = useSearchParams();
  const refCodeFromUrl = searchParams.get("ref") || "";

  const [countryCode, setCountryCode] = useState("+91");
  const [form, setForm] = useState({
    name: "", email: "", phone: "", city: "", dateOfBirth: "", marriageDate: "", referralCode: refCodeFromUrl,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [success, setSuccess] = useState(false);

  function set(key: string, val: string) {
    setForm((p) => ({ ...p, [key]: val }));
    if (submitted) validate({ ...form, [key]: val }, countryCode);
  }

  function validate(f = form, code = countryCode) {
    const e: Record<string, string> = {};

    const nm = validateName(f.name);
    if (nm) e.name = nm;

    const em = validateEmail(f.email);
    if (em) e.email = em;

    const ph = validatePhone(f.phone, code);
    if (ph) e.phone = ph;

    if (!f.dateOfBirth) {
      e.dateOfBirth = "Date of birth is required";
    } else {
      const dob = new Date(f.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      if (age < 18) {
        e.dateOfBirth = "You must be at least 18 years old to register";
      }
    }

    if (f.marriageDate) {
      const md = new Date(f.marriageDate);
      if (md > new Date()) {
        e.marriageDate = "Marriage date cannot be in the future";
      }
    }

    if (!f.city) e.city = "Please select your city";
    if (!agreed) e.terms = "You must accept the terms to continue";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setErrorMsg("");
    if (!validate()) return;

    try {
      setLoading(true);
      const fullPhone = `${countryCode}${form.phone.replace(/\D/g, "")}`;
      const res = await authApi.register({
        fullName: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: fullPhone,
        dateOfBirth: form.dateOfBirth,
        marriageDate: form.marriageDate || null,
        city: form.city,
        referralCode: form.referralCode || undefined,
      });

      if (res?.accessToken && res?.user) {
        saveSession(res.accessToken, res.refreshToken || "", res.user as any);
      }

      const locState = location.state as any;
      const fromBooking = locState?.fromBooking;
      const suiteId = locState?.suiteId;

      if (fromBooking && suiteId) {
        navigate("/user/suite-booking", { state: { suiteId } });
      } else if (fromBooking) {
        navigate("/user/suite-booking");
      } else {
        navigate("/user/dashboard");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="h-screen w-full grid lg:grid-cols-12 relative overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: `url(${loginbg})` }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/65 pointer-events-none" />

      {/* Top-right language switcher */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>

      {/* ── Left hero panel (5 cols on lg) ── */}
      <div className="hidden lg:flex lg:col-span-5 flex-col justify-between relative z-10 p-8 xl:p-12 h-full">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <BrandMark />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }}
          className="space-y-4 my-auto"
        >
          <h1 className="font-display text-4xl xl:text-5xl font-medium text-foreground leading-[1.15]">
            {t("app.auth.beginJourneyPrefix", "Begin Your")}{" "}
            <span className="text-gradient-gold italic">{t("app.auth.beginJourneySuffix", "Luxury Journey")}</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            {t("app.auth.registerHeroDesc", "Join thousands of guests who celebrate life's most precious moments in our handpicked private suites.")}
          </p>

          {/* Feature list */}
          <div className="space-y-2.5 pt-2">
            {[
              { key: "featPremiumSuites", def: "Exclusive access to premium suites" },
              { key: "featPackages", def: "Personalised celebration packages" },
              { key: "featConcierge", def: "Priority 24/7 concierge support" },
              { key: "featLoyalty", def: "Members-only offers & loyalty rewards" }
            ].map((item, i) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="flex items-center gap-2.5"
              >
                <span className="h-5 w-5 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-gold" />
                </span>
                <span className="text-xs sm:text-sm text-foreground/80 font-medium">{t("app.auth." + item.key, item.def)}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="grid grid-cols-3 gap-2.5 pt-4"
        >
          {TRUST_BADGES.map(({ icon: Icon, key, label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card rounded-xl px-3 py-2.5 flex items-center gap-2 hover:border-gold/40 hover:bg-gold/5 transition-colors"
            >
              <div className="h-7 w-7 rounded-lg bg-gold/10 border border-gold/25 flex items-center justify-center shrink-0">
                <Icon className="h-3.5 w-3.5 text-gold" />
              </div>
              <span className="text-[11px] font-medium text-foreground/80 leading-tight">{t("app.auth." + key, label)}</span>
            </a>
          ))}
        </motion.div>
      </div>

      {/* ── Right form panel (7 cols on lg) ── */}
      <div className="lg:col-span-7 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative z-10 h-full overflow-y-auto lg:overflow-hidden">
        <AnimatePresence mode="wait">
          {success ? (
            /* Success state */
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl"
            >
              <div className="h-14 w-14 rounded-full bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center mx-auto">
                <Check className="h-7 w-7 text-emerald-400" />
              </div>
              <h2 className="font-display text-2xl sm:text-3xl text-foreground">{t("app.auth.successTitle", "Account Created!")}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t("app.auth.successDesc", "Welcome to VibeNests, {{name}}. Your luxury journey begins now.", { name: form.name })}
              </p>
              <button
                onClick={() => navigate("/login")}
                className="gold-btn w-full rounded-xl py-3 text-sm font-semibold"
              >
                {t("app.auth.continueLogin", "Continue to Login")}
              </button>
            </motion.div>
          ) : (
            /* Registration form - 2 Columns */
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="glass-card relative w-full max-w-2xl rounded-3xl p-5 sm:p-7 shadow-2xl my-auto"
            >
              {/* Glow blobs */}
              <div className="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gold/15 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-gold/10 blur-3xl" />

              <div className="relative space-y-4">
                {/* Logo on mobile */}
                <div className="flex lg:hidden justify-center pb-1">
                  <BrandMark />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between pb-1 border-b border-white/10">
                  <div>
                    <h2 className="font-display text-2xl sm:text-3xl font-medium text-foreground">
                      {t("app.auth.registerTitlePrefix", "Create")} <span className="text-gradient-gold italic">{t("app.auth.registerTitleSuffix", "Account")}</span>
                    </h2>
                    <p className="text-xs text-muted-foreground">{t("app.auth.registerDesc", "Join VibeNests and start your celebration journey")}</p>
                  </div>
                  <button
                    onClick={() => navigate("/login")}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> {t("app.auth.back", "Back")}
                  </button>
                </div>

                {errorMsg && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-3.5 py-2 rounded-xl">
                    ✕ {errorMsg}
                  </div>
                )}

                {/* Form - 2 Column Grid */}
                <form onSubmit={handleSubmit} noValidate className="space-y-3.5" autoComplete="off">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* LEFT COLUMN */}
                    <div className="space-y-3">
                      {/* Full Name */}
                      <Field label={t("app.auth.fullName", "Full Name")} icon={User} error={errors.name}>
                        <input
                          type="text"
                          placeholder={t("app.auth.fullNamePlaceholder", "Enter your full name")}
                          value={form.name}
                          onChange={(e) => set("name", e.target.value.replace(/[^a-zA-Z\s.'-]/g, ""))}
                          className={`luxury-input w-full rounded-xl px-3.5 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/50 ${errors.name ? "border-rose-500/50" : ""}`}
                          autoComplete="name"
                        />
                      </Field>

                      {/* Email */}
                      <Field label={t("app.auth.emailLabel", "Email Address")} icon={Mail} error={errors.email}>
                        <input
                          type="email"
                          placeholder={t("app.auth.emailPlaceholder", "Enter your email address")}
                          value={form.email}
                          onChange={(e) => set("email", e.target.value)}
                          className={`luxury-input w-full rounded-xl px-3.5 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/50 ${errors.email ? "border-rose-500/50" : ""}`}
                          autoComplete="email"
                        />
                      </Field>

                      {/* Phone */}
                      <Field label={t("app.auth.phoneNumber", "Phone Number")} icon={Phone} error={errors.phone}>
                        <div className="flex gap-2">
                          <select
                            value={countryCode}
                            onChange={(e) => {
                              setCountryCode(e.target.value);
                              if (submitted) validate(form, e.target.value);
                            }}
                            className="luxury-input rounded-xl px-2 py-2 text-xs sm:text-sm text-white bg-[oklch(0.18_0.035_260)] shrink-0 font-medium cursor-pointer"
                          >
                            {COUNTRY_CODES.map((c) => (
                              <option key={c.code} value={c.code} className="bg-[oklch(0.18_0.035_260)] text-white">
                                {c.flag} {c.code}
                              </option>
                            ))}
                          </select>
                          <input
                            type="tel"
                            maxLength={countryCode === "+91" ? 10 : 15}
                            placeholder={countryCode === "+91" ? "10-digit mobile" : "Mobile number"}
                            value={form.phone}
                            onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, countryCode === "+91" ? 10 : 15))}
                            className={`luxury-input flex-1 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/50 ${errors.phone ? "border-rose-500/50" : ""}`}
                            autoComplete="tel"
                          />
                        </div>
                      </Field>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-3">
                      {/* DOB */}
                      <Field label={t("app.auth.dateOfBirth", "Date of Birth")} icon={Calendar} error={errors.dateOfBirth}>
                        <input
                          type="date"
                          value={form.dateOfBirth}
                          max={new Date().toISOString().split("T")[0]}
                          onChange={(e) => set("dateOfBirth", e.target.value)}
                          className={`luxury-input w-full rounded-xl px-3 py-2 text-xs sm:text-sm text-foreground ${errors.dateOfBirth ? "border-rose-500/50" : ""
                            }`}
                          style={{ colorScheme: "dark" }}
                        />
                      </Field>

                      {/* Marriage Date */}
                      <Field label={t("app.auth.marriageDate", "Marriage Date (Optional)")} icon={Heart} error={errors.marriageDate}>
                        <input
                          type="date"
                          value={form.marriageDate}
                          max={new Date().toISOString().split("T")[0]}
                          onChange={(e) => set("marriageDate", e.target.value)}
                          className={`luxury-input w-full rounded-xl px-3 py-2 text-xs sm:text-sm text-foreground ${errors.marriageDate ? "border-rose-500/50" : ""
                            }`}
                          style={{ colorScheme: "dark" }}
                        />
                      </Field>

                      {/* City Dropdown & Referral Code */}
                      <div className="grid grid-cols-2 gap-2">
                        <Field label={t("app.auth.city", "City")} icon={MapPin} error={errors.city}>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setCityOpen((o) => !o)}
                              className={`luxury-input w-full rounded-xl px-3 py-2 text-xs sm:text-sm text-left flex items-center justify-between ${errors.city ? "border-rose-500/50" : ""} ${form.city ? "text-foreground" : "text-muted-foreground/50"}`}
                            >
                              <span className="truncate">{form.city || "City"}</span>
                              <ChevronDown className={`h-3.5 w-3.5 text-gold/60 shrink-0 transition-transform duration-200 ${cityOpen ? "rotate-180" : ""}`} />
                            </button>
                            <AnimatePresence>
                              {cityOpen && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setCityOpen(false)} />
                                  <motion.ul
                                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute z-20 mt-1 w-full glass-card rounded-xl border border-gold/20 py-1 max-h-36 overflow-y-auto scrollbar-none shadow-xl"
                                  >
                                    {CITIES.map((city) => (
                                      <li key={city}>
                                        <button
                                          type="button"
                                          onClick={() => { set("city", city); setCityOpen(false); }}
                                          className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-gold/10 hover:text-gold ${form.city === city ? "text-gold bg-gold/8" : "text-muted-foreground"}`}
                                        >
                                          {city}
                                        </button>
                                      </li>
                                    ))}
                                  </motion.ul>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                        </Field>

                        <Field label={t("app.auth.referralCode", "Referral")} icon={Star} error={errors.referralCode}>
                          <input
                            type="text"
                            placeholder="Optional"
                            value={form.referralCode}
                            onChange={(e) => set("referralCode", e.target.value.toUpperCase())}
                            disabled={!!refCodeFromUrl}
                            className={`luxury-input w-full rounded-xl px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/50 ${refCodeFromUrl ? "opacity-60 bg-white/[0.02] border-gold/30 text-gold font-semibold cursor-not-allowed select-none" : ""
                              }`}
                          />
                        </Field>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Submit (Bottom Full Width) */}
                  <div className="space-y-2 pt-1 border-t border-white/10">
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !agreed;
                          setAgreed(nextVal);
                          if (submitted) {
                            setErrors((p) => ({ ...p, terms: nextVal ? "" : "You must accept the terms to continue" }));
                          }
                        }}
                        className={`h-4 w-4 rounded border shrink-0 flex items-center justify-center transition-all ${agreed ? "bg-gold border-gold" : "border-white/25 bg-white/5 group-hover:border-gold/50"}`}
                      >
                        {agreed && <Check className="h-2.5 w-2.5 text-[oklch(0.12_0.02_260)]" />}
                      </button>
                      <span className="text-[11px] text-muted-foreground leading-tight">
                        {t("app.auth.agreePrefix", "I agree to the")}{" "}
                        <a href="/terms-of-use" target="_blank" className="text-gold hover:underline underline-offset-2">{t("app.auth.termsOfService", "Terms of Service")}</a>
                        {" "}{t("app.auth.and", "and")}{" "}
                        <a href="/privacy-policy" target="_blank" className="text-gold hover:underline underline-offset-2">{t("app.auth.privacyPolicy", "Privacy Policy")}</a>
                      </span>
                    </label>
                    <AnimatePresence>
                      {errors.terms && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                          className="flex items-center gap-1 text-[11px] text-rose-400 pl-6"
                        >
                          <AlertCircle className="h-3 w-3 shrink-0" />{errors.terms}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={loading}
                      className="gold-btn w-full rounded-xl py-2.5 text-xs sm:text-sm font-semibold tracking-wide disabled:opacity-50"
                    >
                      {loading ? t("app.auth.creatingAccount", "Creating Account...") : t("app.auth.createAccount", "Create My Account")}
                    </button>
                  </div>
                </form>

                {/* Login link */}
                <p className="text-center text-xs text-muted-foreground pt-0.5">
                  {t("app.auth.haveAccount", "Already have an account?")}{" "}
                  <button onClick={() => navigate("/login")} className="text-gold font-medium hover:underline underline-offset-4">
                    {t("app.auth.signInLink", "Sign In")}
                  </button>
                </p>

                {/* Mobile trust badges */}
                <div className="flex gap-2 lg:hidden pt-1">
                  {TRUST_BADGES.map(({ icon: Icon, key, label, href }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 flex-1 hover:border-gold/40 transition-colors"
                    >
                      <Icon className="h-3 w-3 text-gold shrink-0" />
                      <span className="text-[10px] text-muted-foreground leading-tight">{t("app.auth." + key, label)}</span>
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

