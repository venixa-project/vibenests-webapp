import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { EmailLoginForm } from "./EmailLoginForm";
import { MobileOtpForm } from "./MobileOtpForm";
import { useTranslation } from "react-i18next";
import { BrandMark } from "./BrandMark";

type Tab = "email" | "otp";

export function AuthCard() {
  const [tab, setTab] = useState<Tab>("otp");
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.1 }}
className="glass-card relative w-full max-w-md rounded-3xl p-7 sm:p-9"
    >
      <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[var(--gold)]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-[var(--gold)]/10 blur-3xl" />

      <div className="relative">

        <div className="px-4 py-4 mb-5">
          <h2 className="font-display text-3xl sm:text-4xl font-medium text-foreground">
            {t("app.auth.welcomeBack", "Welcome Back!")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("app.auth.loginDesc", "Sign in securely via WhatsApp or Email OTP")}</p>
        </div>

        <div className="my-5 flex items-center gap-3 text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--gold)]/30" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--gold)]/30" />
        </div>

        <div className="px-4 py-4 mb-5">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/[0.04] border border-[var(--gold)]/15 mb-6">
            {(["otp", "email"] as Tab[]).map((tVal) => (
              <button
                key={tVal}
                type="button"
                onClick={() => setTab(tVal)}
                className={`relative rounded-lg py-2.5 text-xs sm:text-sm font-medium transition-all ${
                  tab === tVal
                    ? "bg-gradient-gold text-white shadow-[0_8px_24px_-8px_oklch(0.74_0.13_80/0.5)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tVal === "email" ? t("app.auth.emailOtpLogin", "Email OTP") : t("app.auth.whatsappOtpLogin", "WhatsApp OTP")}
              </button>
            ))}
          </div>

          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            {tab === "email" ? <EmailLoginForm /> : <MobileOtpForm />}
          </motion.div>
        </div>

        <div className="px-4 py-3 text-center">
          <p className="text-sm text-muted-foreground">
            {t("app.auth.noAccount")}{" "}
            <a onClick={() => navigate("/register")} className="text-gold font-medium hover:underline underline-offset-4 cursor-pointer">{t("app.auth.signUp")}</a>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
