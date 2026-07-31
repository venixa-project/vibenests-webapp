import { useState, useEffect, useRef } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Save, Building2, Upload, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { globalSettingsApi, usersApi } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthContext";
import { updateGlobalLogo } from "@/components/shared/CompanyLogo";
import { toast } from "sonner";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5"><label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</label>{children}</div>;
}

function Input({ value, onChange, type = "text", placeholder = "" }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="luxury-input rounded-xl px-4 py-2.5 text-sm w-full" />;
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="luxury-input rounded-xl px-4 py-2.5 text-sm w-full bg-transparent cursor-pointer">
      {options.map((o) => <option key={o} value={o} className="bg-[oklch(0.13_0.025_260)]">{o}</option>)}
    </select>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl p-6 sm:p-8 border border-[var(--gold)]/15 shadow-xl">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/[0.08]">
        <div className="h-9 w-9 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center">
          <Icon className="h-5 w-5 text-gold" />
        </div>
        <h3 className="font-display text-lg font-semibold text-foreground tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, saveSession } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saved, setSaved] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [fullName, setFullName] = useState(user?.fullName || "Admin User");
  const [businessName, setBusinessName] = useState("VibeNests Luxury");
  const [email, setEmail] = useState(user?.email || "admin@vibenests.com");
  const [phone, setPhone] = useState(user?.phone || "+91 98765 43210");
  const [address, setAddress] = useState("Hyderabad, Telangana, India");
  const [currency, setCurrency] = useState("INR (₹)");
  const [timezone, setTimezone] = useState("Asia/Kolkata (IST)");
  const [language, setLanguage] = useState("English");

  useEffect(() => {
    // Fetch real authenticated user profile
    usersApi.getMe().then((me) => {
      if (me.fullName) setFullName(me.fullName);
      if (me.email) setEmail(me.email);
      if (me.phone) setPhone(me.phone);
    }).catch(console.error);

    globalSettingsApi.getAll().then(data => {
      if (data.logoUrl !== undefined) setLogoUrl(data.logoUrl);
      if (data.businessName !== undefined) setBusinessName(data.businessName);
      if (data.address !== undefined) setAddress(data.address);
      if (data.currency !== undefined) setCurrency(data.currency);
      if (data.timezone !== undefined) setTimezone(data.timezone);
      if (data.language !== undefined) setLanguage(data.language);
    }).catch(console.error);
  }, []);

  function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be smaller than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setLogoUrl(reader.result.toString());
          toast.success("Logo uploaded. Click 'Save Changes' to update.");
        }
      };
      reader.readAsDataURL(file);
    }
  }

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

      // 2. Update global settings including business profile and logo
      await globalSettingsApi.updateBulk({
        businessName, logoUrl, email, phone, address, currency, timezone, language
      });
      updateGlobalLogo(logoUrl);

      toast.success("Business Profile saved successfully!");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      toast.error(err.message || "Failed to save business profile");
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <AdminHeader title="Business Profile" />
      <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Business Profile & Details</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Manage your organization details, business logo, and regional configurations.</p>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 gold-btn px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-gold/20 hover:scale-[1.02] transition"
          >
            <Save className="h-4 w-4" />
            {saved ? t("app.admin.saved", "Saved!") : t("app.admin.saveChanges", "Save Changes")}
          </button>
        </div>

        <Card title="Organization & Contact Information" icon={Building2}>
          <div className="space-y-6">
            {/* Logo Upload Section */}
            <div className="flex items-center gap-5 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="relative h-20 w-20 rounded-2xl bg-[var(--gold)]/10 border border-[var(--gold)]/30 flex items-center justify-center shrink-0 overflow-hidden shadow-inner p-1.5">
                <img src={logoUrl || "/image.png"} alt="Business Logo" className="h-full w-full object-contain rounded-xl" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">{t("app.admin.businessLogo", "Business Logo")}</p>
                <p className="text-xs text-muted-foreground">Upload a transparent PNG or high-res JPG logo (max 5MB).</p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium border border-gold/30 text-gold hover:bg-gold/10 transition cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {logoUrl ? "Change Logo" : t("app.admin.uploadLogo", "Upload Logo")}
                  </button>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl("")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/20 text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Admin Name">
                <Input value={fullName} onChange={setFullName} placeholder="Admin Full Name" />
              </Field>
              <Field label={t("app.admin.businessName", "Business Name")}>
                <Input value={businessName} onChange={setBusinessName} placeholder="Your business name" />
              </Field>
              <Field label={t("app.admin.contactEmail", "Contact Email")}>
                <Input value={email} onChange={setEmail} type="email" placeholder="admin@example.com" />
              </Field>
              <Field label={t("app.admin.phoneNumber", "Phone Number")}>
                <Input value={phone} onChange={setPhone} placeholder="+91 XXXXX XXXXX" />
              </Field>
              <Field label={t("app.admin.currency", "Currency")}>
                <Select value={currency} onChange={setCurrency} options={["INR (₹)", "USD ($)", "EUR (€)", "GBP (£)"]} />
              </Field>
              <Field label={t("app.admin.timezone", "Timezone")}>
                <Select value={timezone} onChange={setTimezone} options={["Asia/Kolkata (IST)", "UTC", "America/New_York", "Europe/London"]} />
              </Field>
              <Field label={t("app.admin.language", "Language")}>
                <Select value={language} onChange={setLanguage} options={["English", "Hindi", "Telugu", "Tamil"]} />
              </Field>
            </div>

            <Field label={t("app.admin.businessAddress", "Business Address")}>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className="luxury-input rounded-xl px-4 py-3 text-sm w-full resize-none"
                placeholder="Enter complete business address..."
              />
            </Field>
          </div>
        </Card>

      </div>
    </div>
  );
}
