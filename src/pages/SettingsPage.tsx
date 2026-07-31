import { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Save, X, Building2, Bell, Palette, Shield, Plug, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { globalSettingsApi, authApi, usersApi } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthContext";

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

function Input({ value, onChange, type = "text", placeholder = "" }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="luxury-input rounded-lg px-3 py-2 text-sm w-full" />;
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="luxury-input rounded-lg px-3 py-2 text-sm w-full bg-transparent cursor-pointer">
      {options.map((o) => <option key={o} value={o} className="bg-[oklch(0.13_0.025_260)]">{o}</option>)}
    </select>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl p-5 border border-[var(--gold)]/10">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.06]">
        <Icon className="h-4 w-4 text-gold" />
        <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div>
        <p className="text-sm text-foreground/80">{label}</p>
        {desc && <p className="text-[11px] text-muted-foreground">{desc}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, saveSession } = useAuth();
  const [saved, setSaved] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || "Admin User");
  const [businessName, setBusinessName] = useState("VibeNests Luxury");
  const [email, setEmail] = useState(user?.email || "admin@vibenests.com");
  const [phone, setPhone] = useState(user?.phone || "+91 98765 43210");
  const [address, setAddress] = useState("Hyderabad, Telangana, India");
  const [currency, setCurrency] = useState("INR (₹)");
  const [timezone, setTimezone] = useState("Asia/Kolkata (IST)");
  const [language, setLanguage] = useState("English");
  const [emailBooking, setEmailBooking] = useState(true);
  const [emailCancellation, setEmailCancellation] = useState(true);
  const [emailPayment, setEmailPayment] = useState(true);
  const [smsBooking, setSmsBooking] = useState(false);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [dailyReport, setDailyReport] = useState(true);
  const [theme, setTheme] = useState("Dark");
  const [accentColor, setAccentColor] = useState("Gold");
  const [compactMode, setCompactMode] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [razorpayKey, setRazorpayKey] = useState("rzp_live_••••••••••••");
  const [razorpayEnabled, setRazorpayEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState("+91 98765 43210");
  const [analyticsId, setAnalyticsId] = useState("G-XXXXXXXXXX");
  const [passwordUpdating, setPasswordUpdating] = useState(false);

  useEffect(() => {
    // Fetch real authenticated user profile
    usersApi.getMe().then((me) => {
      if (me.fullName) setFullName(me.fullName);
      if (me.email) setEmail(me.email);
      if (me.phone) setPhone(me.phone);
    }).catch(console.error);

    globalSettingsApi.getAll().then(data => {
      if (data.businessName !== undefined) setBusinessName(data.businessName);
      if (data.address !== undefined) setAddress(data.address);
      if (data.currency !== undefined) setCurrency(data.currency);
      if (data.timezone !== undefined) setTimezone(data.timezone);
      if (data.language !== undefined) setLanguage(data.language);
      if (data.emailBooking !== undefined) setEmailBooking(data.emailBooking);
      if (data.emailCancellation !== undefined) setEmailCancellation(data.emailCancellation);
      if (data.emailPayment !== undefined) setEmailPayment(data.emailPayment);
      if (data.smsBooking !== undefined) setSmsBooking(data.smsBooking);
      if (data.pushAlerts !== undefined) setPushAlerts(data.pushAlerts);
      if (data.dailyReport !== undefined) setDailyReport(data.dailyReport);
      if (data.theme !== undefined) setTheme(data.theme);
      if (data.accentColor !== undefined) setAccentColor(data.accentColor);
      if (data.compactMode !== undefined) setCompactMode(data.compactMode);
      if (data.animationsEnabled !== undefined) setAnimationsEnabled(data.animationsEnabled);
      if (data.twoFactor !== undefined) setTwoFactor(data.twoFactor);
      if (data.sessionTimeout !== undefined) setSessionTimeout(data.sessionTimeout);
      if (data.loginAlerts !== undefined) setLoginAlerts(data.loginAlerts);
      if (data.razorpayKey !== undefined) setRazorpayKey(data.razorpayKey);
      if (data.razorpayEnabled !== undefined) setRazorpayEnabled(data.razorpayEnabled);
      if (data.whatsappEnabled !== undefined) setWhatsappEnabled(data.whatsappEnabled);
      if (data.whatsappNumber !== undefined) setWhatsappNumber(data.whatsappNumber);
      if (data.analyticsId !== undefined) setAnalyticsId(data.analyticsId);
    }).catch(console.error);
  }, []);

  async function handleSave() {
    try {
      // 1. Update real user profile on backend
      const updatedUser = await usersApi.updateMe({ fullName, email, phone });
      
      // Update session in AuthContext
      const accessToken = localStorage.getItem('accessToken') || '';
      const refreshToken = localStorage.getItem('refreshToken') || '';
      saveSession(accessToken, refreshToken, {
        ...user,
        ...updatedUser,
        fullName: updatedUser.fullName || fullName,
        email: updatedUser.email || email,
        phone: updatedUser.phone || phone,
      });

      // 2. Update global settings
      await globalSettingsApi.updateBulk({
        businessName, email, phone, address, currency, timezone, language,
        emailBooking, emailCancellation, emailPayment, smsBooking, pushAlerts, dailyReport,
        theme, accentColor, compactMode, animationsEnabled,
        twoFactor, loginAlerts, sessionTimeout,
        razorpayKey, razorpayEnabled, whatsappEnabled, whatsappNumber, analyticsId
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      
      // Apply basic appearance settings locally
      if (theme === 'Light') document.documentElement.classList.remove('dark');
      else document.documentElement.classList.add('dark');
    } catch (err: any) {
      alert(err.message || "Failed to save settings");
    }
  }

  async function handleUpdatePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) return alert("Please fill all password fields.");
    if (newPassword !== confirmPassword) return alert("New passwords do not match.");
    setPasswordUpdating(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      alert("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      alert(err.message || "Failed to update password");
    } finally {
      setPasswordUpdating(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <AdminHeader title="Settings" />
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <p className="text-sm text-muted-foreground">{t("app.admin.settingsDesc", "Manage your business profile, preferences, and integrations.")}</p>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-white/10 text-muted-foreground hover:text-foreground transition"><X className="h-4 w-4" /> {t("app.admin.cancelBtn", "Cancel")}</button>
            <button onClick={handleSave} className="flex items-center gap-2 gold-btn px-4 py-2 rounded-lg text-sm font-semibold"><Save className="h-4 w-4" /> {saved ? t("app.admin.saved", "Saved!") : t("app.admin.saveChanges", "Save Changes")}</button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Card title={t("app.admin.businessProfile", "Business Profile")} icon={Building2}>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/20 flex items-center justify-center shrink-0">
                  <Building2 className="h-7 w-7 text-gold" />
                </div>
                <div>
                  <p className="text-sm text-foreground/80 mb-1">{t("app.admin.businessLogo", "Business Logo")}</p>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border border-white/10 text-muted-foreground hover:text-foreground transition"><Upload className="h-3.5 w-3.5" /> {t("app.admin.uploadLogo", "Upload Logo")}</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Admin Name"><Input value={fullName} onChange={setFullName} placeholder="Admin Full Name" /></Field>
                <Field label={t("app.admin.businessName", "Business Name")}><Input value={businessName} onChange={setBusinessName} placeholder="Your business name" /></Field>
                <Field label={t("app.admin.contactEmail", "Contact Email")}><Input value={email} onChange={setEmail} type="email" placeholder="admin@example.com" /></Field>
                <Field label={t("app.admin.phoneNumber", "Phone Number")}><Input value={phone} onChange={setPhone} placeholder="+91 XXXXX XXXXX" /></Field>
                <Field label={t("app.admin.currency", "Currency")}><Select value={currency} onChange={setCurrency} options={["INR (₹)", "USD ($)", "EUR (€)", "GBP (£)"]} /></Field>
                <Field label={t("app.admin.timezone", "Timezone")}><Select value={timezone} onChange={setTimezone} options={["Asia/Kolkata (IST)", "UTC", "America/New_York", "Europe/London"]} /></Field>
                <Field label={t("app.admin.language", "Language")}><Select value={language} onChange={setLanguage} options={["English", "Hindi", "Telugu", "Tamil"]} /></Field>
              </div>
              <Field label={t("app.admin.businessAddress", "Business Address")}>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className="luxury-input rounded-lg px-3 py-2 text-sm w-full resize-none" />
              </Field>
            </div>
          </Card>

          {/* <Card title={t("app.admin.notifications", "Notifications")} icon={Bell}>
            <div className="space-y-1 divide-y divide-white/[0.04]">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide pb-2">{t("app.admin.emailAlerts", "Email Alerts")}</p>
              <ToggleRow label={t("app.admin.newBookingNotif", "New Booking")} desc={t("app.admin.newBookingDesc", "Notify on every new booking")} checked={emailBooking} onChange={setEmailBooking} />
              <ToggleRow label={t("app.admin.cancellationNotif", "Cancellation")} checked={emailCancellation} onChange={setEmailCancellation} />
              <ToggleRow label={t("app.admin.paymentReceived", "Payment Received")} checked={emailPayment} onChange={setEmailPayment} />
              <div className="pt-3"><p className="text-[11px] text-muted-foreground uppercase tracking-wide pb-2">{t("app.admin.smsAndPush", "SMS & Push")}</p></div>
              <ToggleRow label={t("app.admin.smsOnBooking", "SMS on Booking")} checked={smsBooking} onChange={setSmsBooking} />
              <ToggleRow label={t("app.admin.pushNotifications", "Push Notifications")} checked={pushAlerts} onChange={setPushAlerts} />
              <ToggleRow label={t("app.admin.dailySummary", "Daily Summary Report")} checked={dailyReport} onChange={setDailyReport} />
            </div>
          </Card> */}

          {/* <Card title={t("app.admin.appearance", "Appearance")} icon={Palette}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("app.admin.theme", "Theme")}><Select value={theme} onChange={setTheme} options={["Dark", "Light", "System"]} /></Field>
                <Field label={t("app.admin.accentColor", "Accent Color")}><Select value={accentColor} onChange={setAccentColor} options={["Gold", "Blue", "Purple", "Emerald"]} /></Field>
              </div>
              <ToggleRow label={t("app.admin.compactMode", "Compact Mode")} desc={t("app.admin.compactModeDesc", "Reduce spacing for denser layout")} checked={compactMode} onChange={setCompactMode} />
              <ToggleRow label={t("app.admin.enableAnimations", "Enable Animations")} desc={t("app.admin.enableAnimationsDesc", "Smooth transitions and effects")} checked={animationsEnabled} onChange={setAnimationsEnabled} />
            </div>
          </Card> */}

          <Card title={t("app.admin.security", "Security")} icon={Shield}>
            <div className="space-y-3">
              <ToggleRow label={t("app.admin.twoFactor", "Two-Factor Authentication")} desc={t("app.admin.twoFactorDesc", "Add an extra layer of security")} checked={twoFactor} onChange={setTwoFactor} />
              <ToggleRow label={t("app.admin.loginAlerts", "Login Alerts")} desc={t("app.admin.loginAlertsDesc", "Email on new device login")} checked={loginAlerts} onChange={setLoginAlerts} />
              <Field label={t("app.admin.sessionTimeout", "Session Timeout (Minutes)")}><Select value={sessionTimeout} onChange={setSessionTimeout} options={["15", "30", "60", "120", "Never"]} /></Field>
              <div className="pt-2 border-t border-white/[0.06]">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-3">{t("app.admin.changePassword", "Change Password")}</p>
                <div className="space-y-2">
                  <Field label={t("app.admin.currentPassword", "Current Password")}><Input value={currentPassword} onChange={setCurrentPassword} type="password" placeholder="••••••••" /></Field>
                  <Field label={t("app.admin.newPassword", "New Password")}><Input value={newPassword} onChange={setNewPassword} type="password" placeholder="••••••••" /></Field>
                  <Field label={t("app.admin.confirmNewPassword", "Confirm New Password")}><Input value={confirmPassword} onChange={setConfirmPassword} type="password" placeholder="••••••••" /></Field>
                </div>
                <button disabled={passwordUpdating} onClick={handleUpdatePassword} className="mt-3 px-4 py-2 rounded-lg text-sm border border-[var(--gold)]/30 text-gold hover:bg-[var(--gold)]/10 transition disabled:opacity-50">
                  {passwordUpdating ? "Updating..." : t("app.admin.updatePassword", "Update Password")}
                </button>
              </div>
            </div>
          </Card>

          <Card title={t("app.admin.integrations", "Integrations")} icon={Plug}>
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Razorpay</p>
                  <Toggle checked={razorpayEnabled} onChange={setRazorpayEnabled} />
                </div>
                <Field label={t("app.admin.apiKey", "API Key")}><Input value={razorpayKey} onChange={setRazorpayKey} placeholder="rzp_live_••••••••" /></Field>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{t("app.admin.whatsappNotifications", "WhatsApp Notifications")}</p>
                  <Toggle checked={whatsappEnabled} onChange={setWhatsappEnabled} />
                </div>
                <Field label={t("app.admin.whatsappNumber", "WhatsApp Number")}><Input value={whatsappNumber} onChange={setWhatsappNumber} placeholder="+91 XXXXX XXXXX" /></Field>
              </div>
              {/* <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2"> */}
                {/* <p className="text-sm font-medium text-foreground">{t("app.admin.googleAnalytics", "Google Analytics")}</p> */}
                {/* <Field label={t("app.admin.measurementId", "Measurement ID")}><Input value={analyticsId} onChange={setAnalyticsId} placeholder="G-XXXXXXXXXX" /></Field> */}
              {/* </div> */}
            </div>
          </Card>
        </div>

        <div className="flex justify-end gap-3 pb-4">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm border border-white/10 text-muted-foreground hover:text-foreground transition"><X className="h-4 w-4" /> {t("app.admin.cancelBtn", "Cancel")}</button>
          <button onClick={handleSave} className="flex items-center gap-2 gold-btn px-5 py-2.5 rounded-lg text-sm font-semibold"><Save className="h-4 w-4" /> {saved ? t("app.admin.saved", "Saved!") : t("app.admin.saveChanges", "Save Changes")}</button>
        </div>
      </div>
    </div>
  );
}
