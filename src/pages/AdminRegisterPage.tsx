import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Eye, EyeOff, User, Mail, Phone, Lock, ShieldCheck,
  KeyRound, ChevronDown, Check, AlertCircle, AtSign,
  Crown, UserCog, Users, ShieldAlert, Fingerprint, BadgeCheck,
} from "lucide-react";
import { BrandMark } from "@/components/auth/BrandMark";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import loginbg from "@/assets/loginbg.png";

/* ── Types ──────────────────────────────────────────── */
type Role = "Super Admin" | "Manager" | "Staff" | "";

const ROLES: { value: Role; key: string; label: string; descKey: string; desc: string; icon: React.ElementType }[] = [
  { value: "Super Admin", key: "roleSuperAdmin", label: "Super Admin", descKey: "superAdminDesc", desc: "Full system access & control", icon: Crown   },
  { value: "Manager",     key: "roleManager",    label: "Manager",     descKey: "managerDesc",    desc: "Manage bookings & staff",      icon: UserCog },
  { value: "Staff",       key: "roleStaff",      label: "Staff",       descKey: "staffDesc",      desc: "Limited operational access",   icon: Users   },
];

const BADGES = [
  { icon: ShieldCheck, key: "badgeEncrypted", label: "256-bit Encrypted" },
  { icon: Fingerprint, key: "badgeControlled", label: "Access Controlled"  },
  { icon: BadgeCheck,  key: "badgeLogged", label: "Audit Logged"        },
];

/* ── Validation ─────────────────────────────────────── */
function validateEmail(v: string, t: any) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : t("app.validation.validEmail", "Enter a valid email address");
}
function validatePhone(v: string, t: any) {
  return /^[6-9]\d{9}$/.test(v.replace(/\s/g, "")) ? "" : t("app.validation.validPhone", "Enter a valid 10-digit mobile number");
}
function validatePassword(v: string, t: any) {
  if (v.length < 8)              return t("app.validation.passwordMin", "Minimum 8 characters required");
  if (!/[A-Z]/.test(v))          return t("app.validation.passwordUpper", "Include at least one uppercase letter");
  if (!/\d/.test(v))             return t("app.validation.passwordNumber", "Include at least one number");
  if (!/[^A-Za-z0-9]/.test(v))  return t("app.validation.passwordSymbol", "Include at least one special character");
  return "";
}

/* ── Password strength ──────────────────────────────── */
function pwStrength(v: string) {
  let s = 0;
  if (v.length >= 8) s++;
  if (/[A-Z]/.test(v)) s++;
  if (/\d/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  const map = [
    { label: "Weak",   key: "weak",   color: "bg-rose-500",    text: "text-rose-400"    },
    { label: "Weak",   key: "weak",   color: "bg-rose-500",    text: "text-rose-400"    },
    { label: "Fair",   key: "fair",   color: "bg-amber-400",   text: "text-amber-400"   },
    { label: "Good",   key: "good",   color: "bg-sky-400",     text: "text-sky-400"     },
    { label: "Strong", key: "strong", color: "bg-emerald-400", text: "text-emerald-400" },
  ];
  return { score: s, ...map[s] };
}

/* ── Field wrapper ──────────────────────────────────── */
function Field({ label, icon: Icon, error, children }: {
  label: string; icon: React.ElementType; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-gold/70" />{label}
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-1 text-[11px] text-rose-400 leading-none"
          >
            <AlertCircle className="h-3 w-3 shrink-0" />{error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main component ─────────────────────────────────── */
export default function AdminRegisterPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [form, setForm] = useState({
    name: "", email: "", phone: "", username: "",
    password: "", confirm: "", accessCode: "", role: "" as Role,
  });
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [showPass,  setShowPass]  = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [showCode,  setShowCode]  = useState(false);
  const [roleOpen,  setRoleOpen]  = useState(false);
  const [agreed,    setAgreed]    = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [success,   setSuccess]   = useState(false);

  const strength     = pwStrength(form.password);
  const selectedRole = ROLES.find((r) => r.value === form.role);

  function set(key: string, val: string) {
    setForm((p) => ({ ...p, [key]: val }));
    if (submitted) validate({ ...form, [key]: val });
  }

  function validate(f = form) {
    const e: Record<string, string> = {};
    if (!f.name.trim())                         e.name       = t("app.validation.nameRequired", "Full name is required");
    const em = validateEmail(f.email, t);          if (em) e.email = em;
    const ph = validatePhone(f.phone, t);          if (ph) e.phone = ph;
    if (!f.username.trim())                     e.username   = t("app.validation.usernameRequired", "Username is required");
    else if (f.username.includes(" "))          e.username   = t("app.validation.usernameSpaces", "No spaces allowed");
    const pw = validatePassword(f.password, t);    if (pw) e.password = pw;
    if (f.confirm !== f.password)               e.confirm    = t("app.validation.passwordMismatch", "Passwords do not match");
    if (!f.accessCode.trim())                   e.accessCode = t("app.validation.accessCodeRequired", "Access code is required");
    if (!f.role)                                e.role       = t("app.validation.roleRequired", "Please select a role");
    if (!agreed)                                e.terms      = t("app.validation.termsRequired", "You must accept the terms");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (validate()) setSuccess(true);
  }

  return (
    <div
      className="min-h-screen flex bg-cover bg-center"
      style={{
        backgroundImage: `url(${loginbg})`,
        backgroundColor: "oklch(0.08 0.015 260)",
      }}
    >
      {/* Dark overlay */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: "rgba(4,6,20,0.82)" }} />

      {/* Top-right language switcher */}
      <div className="absolute top-5 right-5 z-20">
        <LanguageSelector />
      </div>

      {/* ── Left hero panel (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[38%] flex-col justify-between relative z-10 p-12 shrink-0">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <BrandMark />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="space-y-5"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gold/30 bg-gold/10">
            <ShieldAlert className="h-3.5 w-3.5 text-gold" />
            <span className="text-[11px] font-bold tracking-widest text-gold uppercase">{t("app.auth.adminPortal", "Admin Portal")}</span>
          </div>

          <h1 className="font-display text-5xl xl:text-6xl font-medium text-foreground leading-[1.1]">
            {t("app.auth.secureAdminPrefix", "Secure Admin")}<br />
            <span className="text-gradient-gold italic">{t("app.auth.secureAdminSuffix", "Registration")}</span>
          </h1>

          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            {t("app.auth.adminRegisterDesc", "Create a secure administrative account for VibeNests operations, bookings, and team members.")}
          </p>

          <div className="space-y-2.5 pt-1">
            {ROLES.map((r, i) => {
              const Icon = r.icon;
              return (
                <motion.div
                  key={r.value}
                  initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.09 }}
                  className="flex items-center gap-3 glass rounded-xl px-4 py-3"
                >
                  <div className="h-8 w-8 rounded-lg bg-gold/10 border border-gold/25 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-gold" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground leading-tight">{t("app.auth." + r.key, r.label)}</p>
                    <p className="text-[11px] text-muted-foreground">{t("app.auth." + r.descKey, r.desc)}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="flex gap-2"
        >
          {BADGES.map(({ icon: Icon, key, label }) => (
            <a
              key={label}
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card rounded-2xl px-3 py-3 flex items-center gap-2 flex-1 hover:border-gold/40 hover:bg-gold/5 transition-colors"
            >
              <div className="h-7 w-7 rounded-lg bg-gold/10 border border-gold/25 flex items-center justify-center shrink-0">
                <Icon className="h-3.5 w-3.5 text-gold" />
              </div>
              <span className="text-[10px] font-medium text-foreground/80 leading-tight">{t("app.auth." + key, label)}</span>
            </a>
          ))}
        </motion.div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-start justify-center relative z-10 overflow-y-auto py-10 px-4">
        <AnimatePresence mode="wait">
          {success ? (
            /* Success */
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-3xl p-10 w-full max-w-md text-center space-y-5 my-auto"
            >
              <div className="h-16 w-16 rounded-full bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center mx-auto">
                <ShieldCheck className="h-8 w-8 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h2 className="font-display text-3xl text-foreground">{t("app.auth.adminSuccessTitle", "Admin Registered!")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("app.auth.adminSuccessDesc", "Welcome, {{name}}. Your account is pending verification.", { name: form.name })}
                </p>
              </div>
              {selectedRole && (
                <div className="glass rounded-xl px-4 py-3 flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                    <selectedRole.icon className="h-4 w-4 text-gold" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("app.auth.assignedRole", "Assigned Role")}</p>
                    <p className="text-sm font-medium text-foreground">{t("app.auth." + selectedRole.key, selectedRole.label)}</p>
                  </div>
                </div>
              )}
              <button onClick={() => navigate("/login")} className="gold-btn w-full rounded-xl py-3 text-sm font-semibold">
                {t("app.auth.goLogin", "Go to Admin Login")}
              </button>
            </motion.div>
          ) : (
            /* Form */
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1 }}
              className="glass-card relative w-full max-w-lg rounded-3xl p-7 sm:p-8"
            >
              {/* Glow blobs */}
              <div className="pointer-events-none absolute -top-20 -right-20 h-52 w-52 rounded-full bg-gold/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-gold/8 blur-3xl" />

              <div className="relative space-y-5">
                {/* Logo on mobile/tablet */}
                <div className="flex lg:hidden justify-center">
                  <BrandMark />
                </div>

                {/* ── Card header ── */}
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center shrink-0">
                      <ShieldAlert className="h-4 w-4 text-gold" />
                    </div>
                    <span className="text-[11px] font-bold tracking-[0.2em] text-gold uppercase">{t("app.auth.adminPortal", "Admin Portal")}</span>
                  </div>
                  <h2 className="font-display text-3xl sm:text-4xl font-medium text-foreground leading-tight">
                    {t("app.auth.adminRegisterTitlePrefix", "Register")} <span className="text-gradient-gold italic">{t("app.auth.adminRegisterTitleSuffix", "Admin")}</span>
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">{t("app.auth.adminRegisterDesc", "Create a secure administrative account for VibeNests")}</p>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-gold/25 to-transparent" />

                {/* ── Form ── */}
                <form onSubmit={handleSubmit} noValidate className="space-y-4">

                  {/* Row: Name + Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={t("app.auth.fullName", "Full Name")} icon={User} error={errors.name}>
                      <input
                        type="text" placeholder={t("app.auth.adminNamePlaceholder", "John Smith")}
                        value={form.name} onChange={(e) => set("name", e.target.value)}
                        className={`luxury-input w-full rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 ${errors.name ? "border-rose-500/50" : ""}`}
                      />
                    </Field>
                    <Field label={t("app.auth.officialEmail", "Official Email")} icon={Mail} error={errors.email}>
                      <input
                        type="email" placeholder={t("app.auth.officialEmailPlaceholder", "admin@vibenests.com")}
                        value={form.email} onChange={(e) => set("email", e.target.value)}
                        className={`luxury-input w-full rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 ${errors.email ? "border-rose-500/50" : ""}`}
                      />
                    </Field>
                  </div>

                  {/* Row: Phone + Username */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={t("app.auth.phoneNumber", "Phone Number")} icon={Phone} error={errors.phone}>
                      <div className="flex gap-2">
                        <span className="luxury-input rounded-xl px-3 py-2.5 text-sm text-muted-foreground shrink-0 flex items-center">+91</span>
                        <input
                          type="tel"
                          maxLength={10}
                          placeholder={t("app.auth.phonePlaceholder", "98765 43210")}
                          value={form.phone}
                          onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                          className={`luxury-input flex-1 min-w-0 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 ${errors.phone ? "border-rose-500/50" : ""}`}
                        />
                      </div>
                    </Field>
                    <Field label={t("app.auth.adminUsername", "Admin Username")} icon={AtSign} error={errors.username}>
                      <input
                        type="text" placeholder={t("app.auth.adminUsernamePlaceholder", "admin_john")}
                        value={form.username}
                        onChange={(e) => set("username", e.target.value.toLowerCase().replace(/\s/g, ""))}
                        className={`luxury-input w-full rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 ${errors.username ? "border-rose-500/50" : ""}`}
                      />
                    </Field>
                  </div>

                  {/* Password */}
                  <Field label={t("app.auth.passwordLabel", "Password")} icon={Lock} error={errors.password}>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        placeholder={t("app.auth.adminPasswordPlaceholder", "Min 8 chars, uppercase, number & symbol")}
                        value={form.password} onChange={(e) => set("password", e.target.value)}
                        className={`luxury-input w-full rounded-xl px-4 py-2.5 pr-11 text-sm text-foreground placeholder:text-muted-foreground/40 ${errors.password ? "border-rose-500/50" : ""}`}
                      />
                      <button type="button" onClick={() => setShowPass((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gold transition-colors">
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {form.password && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((n) => (
                            <div key={n} className={`h-1 flex-1 rounded-full transition-all duration-300 ${n <= strength.score ? strength.color : "bg-white/10"}`} />
                          ))}
                        </div>
                        <p className={`text-[10px] font-medium ${strength.text}`}>{t("app.auth." + strength.key, strength.label)} {t("app.auth.passwordSuffix", "password")}</p>
                      </motion.div>
                    )}
                  </Field>

                  {/* Confirm Password */}
                  <Field label={t("app.auth.confirmPassword", "Confirm Password")} icon={Lock} error={errors.confirm}>
                    <div className="relative">
                      <input
                        type={showConf ? "text" : "password"}
                        placeholder={t("app.auth.confirmPlaceholder", "Re-enter your password")}
                        value={form.confirm} onChange={(e) => set("confirm", e.target.value)}
                        className={`luxury-input w-full rounded-xl px-4 py-2.5 pr-11 text-sm text-foreground placeholder:text-muted-foreground/40 ${errors.confirm ? "border-rose-500/50" : ""}`}
                      />
                      <button type="button" onClick={() => setShowConf((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gold transition-colors">
                        {showConf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>

                  {/* Row: Access Code + Role */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={t("app.auth.accessCode", "Admin Access Code")} icon={KeyRound} error={errors.accessCode}>
                      <div className="relative">
                        <input
                          type={showCode ? "text" : "password"}
                          placeholder={t("app.auth.accessCodePlaceholder", "Secret access code")}
                          value={form.accessCode} onChange={(e) => set("accessCode", e.target.value)}
                          className={`luxury-input w-full rounded-xl px-4 py-2.5 pr-11 text-sm text-foreground placeholder:text-muted-foreground/40 font-mono tracking-widest ${errors.accessCode ? "border-rose-500/50" : ""}`}
                        />
                        <button type="button" onClick={() => setShowCode((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gold transition-colors">
                          {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </Field>

                    <Field label={t("app.auth.role", "Admin Role")} icon={Crown} error={errors.role}>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setRoleOpen((o) => !o)}
                          className={`luxury-input w-full rounded-xl px-4 py-2.5 text-sm text-left flex items-center justify-between gap-2 ${errors.role ? "border-rose-500/50" : ""}`}
                        >
                          {selectedRole ? (
                            <span className="flex items-center gap-2 text-foreground">
                              <selectedRole.icon className="h-3.5 w-3.5 text-gold shrink-0" />
                              {t("app.auth." + selectedRole.key, selectedRole.label)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">{t("app.auth.selectRole", "Select role")}</span>
                          )}
                          <ChevronDown className={`h-4 w-4 text-gold/60 transition-transform duration-200 shrink-0 ${roleOpen ? "rotate-180" : ""}`} />
                        </button>
                        <AnimatePresence>
                          {roleOpen && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setRoleOpen(false)} />
                              <motion.ul
                                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                transition={{ duration: 0.15 }}
                                className="absolute z-20 mt-1.5 w-full glass-card rounded-xl border border-gold/20 py-1 shadow-xl"
                              >
                                {ROLES.map(({ value, key, label, descKey, desc, icon: RIcon }) => (
                                  <li key={value}>
                                    <button
                                      type="button"
                                      onClick={() => { set("role", value); setRoleOpen(false); }}
                                      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors hover:bg-gold/10 ${form.role === value ? "bg-gold/8" : ""}`}
                                    >
                                      <div className="h-7 w-7 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                                        <RIcon className="h-3.5 w-3.5 text-gold" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium ${form.role === value ? "text-gold" : "text-foreground"}`}>{t("app.auth." + key, label)}</p>
                                        <p className="text-[10px] text-muted-foreground">{t("app.auth." + descKey, desc)}</p>
                                      </div>
                                      {form.role === value && <Check className="h-3.5 w-3.5 text-gold shrink-0" />}
                                    </button>
                                  </li>
                                ))}
                              </motion.ul>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </Field>
                  </div>

                  {/* Terms */}
                  <div className="space-y-1">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <button
                        type="button"
                        onClick={() => {
                          setAgreed((v) => !v);
                          if (submitted) setErrors((p) => ({ ...p, terms: agreed ? t("app.validation.termsRequired", "You must accept the terms") : "" }));
                        }}
                        className={`mt-0.5 h-4 w-4 rounded border shrink-0 flex items-center justify-center transition-all ${agreed ? "bg-gold border-gold" : "border-white/25 bg-white/5 group-hover:border-gold/50"}`}
                      >
                        {agreed && <Check className="h-2.5 w-2.5 text-[oklch(0.12_0.02_260)]" />}
                      </button>
                      <span className="text-xs text-muted-foreground leading-relaxed">
                        {t("app.auth.agreePrefix", "I agree to the")}{" "}
                        <a href="/terms-of-use" target="_blank" className="text-gold hover:underline underline-offset-2">{t("app.auth.adminTermsOfService", "Admin Terms of Service")}</a>
                        {" "}{t("app.auth.and", "and")}{" "}
                        <a href="/privacy-policy" target="_blank" className="text-gold hover:underline underline-offset-2">{t("app.auth.privacyPolicy", "Privacy Policy")}</a>.
                        {" "}{t("app.auth.adminTermsSuffix", "This account will be reviewed before activation.")}
                      </span>
                    </label>
                    <AnimatePresence>
                      {errors.terms && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="flex items-center gap-1 text-[11px] text-rose-400 pl-7"
                        >
                          <AlertCircle className="h-3 w-3 shrink-0" />{errors.terms}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    className="gold-btn w-full rounded-xl py-3 text-sm font-semibold tracking-wide flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {t("app.auth.registerBtn", "Register Admin Account")}
                  </button>
                </form>

                {/* Login link */}
                <p className="text-center text-sm text-muted-foreground">
                  {t("app.auth.alreadyAdmin", "Already have an admin account?")}{" "}
                  <button
                    onClick={() => navigate("/login")}
                    className="text-gold font-medium hover:underline underline-offset-4"
                  >
                    {t("app.auth.adminLoginLink", "Admin Login")}
                  </button>
                </p>

                {/* Mobile badges */}
                <div className="flex gap-2 lg:hidden">
                  {BADGES.map(({ icon: Icon, key, label }) => (
                    <a
                      key={label}
                      href="/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass rounded-xl px-3 py-2 flex items-center gap-1.5 flex-1 hover:border-gold/40 transition-colors"
                    >
                      <Icon className="h-3.5 w-3.5 text-gold shrink-0" />
                      <span className="text-[10px] text-muted-foreground leading-tight">{t("app.auth." + key, label)}</span>
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
