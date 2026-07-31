import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, CheckCircle2, ArrowRight } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuth } from "./AuthContext";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function EmailLoginForm() {
  const navigate = useNavigate();
  const { saveSession } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<"input" | "otp" | "success">("input");
  const [otp, setOtp] = useState<string[]>(Array(4).fill(""));
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successPopup, setSuccessPopup] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((v) => v - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  async function sendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setSuccessPopup(null);
    const targetEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setError(t("app.validation.emailRequired", "Please enter a valid email address."));
      return;
    }
    setLoading(true);
    try {
      await authApi.sendEmailOtp(targetEmail);
      setOtp(Array(4).fill(""));
      setStage("otp");
      setTimer(30);
      const msg = `OTP sent successfully to ${targetEmail}`;
      setSuccessPopup(msg);
      setTimeout(() => setSuccessPopup(null), 3500);
      setTimeout(() => inputsRef.current[0]?.focus(), 50);
    } catch (err: any) {
      const msg = err.message || "Failed to send OTP.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(i: number, v: string) {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = d;
    setOtp(next);
    if (d && i < 3) inputsRef.current[i + 1]?.focus();
  }

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputsRef.current[i - 1]?.focus();
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (otp.join("").length !== 4) {
      setError("Please enter the full 4-digit OTP code.");
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.verifyEmailOtp(email.trim().toLowerCase(), otp.join(""));
      saveSession(data.accessToken, data.refreshToken, data.user as any);
      setStage("success");
      const dest = (data.user as any).role === 'admin' ? '/dashboard' : '/user/dashboard';
      setTimeout(() => navigate(dest), 1200);
    } catch (err: any) {
      setError(err.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  }

  if (stage === "success") {
    return (
      <div className="text-center py-8 space-y-3 animate-in fade-in duration-500">
        <div className="mx-auto h-14 w-14 rounded-full bg-gradient-gold flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-[oklch(0.14_0.03_260)]" />
        </div>
        <h3 className="font-display text-2xl text-gradient-gold">{t("app.auth.verified", "Verified Successfully!")}</h3>
        <p className="text-sm text-muted-foreground">{t("app.auth.welcomeBackRedirect", "Redirecting to your dashboard...")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={stage === "input" ? sendOtp : verify} className="space-y-5">
      {successPopup && (
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3.5 py-2.5 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successPopup}</span>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("app.auth.emailLabel", "Email Address")}</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/70" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={stage !== "input"}
            placeholder={t("forms.emailPlaceholder", "enter your email address")}
            className="luxury-input w-full rounded-lg pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 disabled:opacity-70"
            autoComplete="email"
          />
        </div>
      </div>

      {stage === "otp" && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("app.auth.otpLabel", "ENTER 4-DIGIT OTP")}</label>
            <button
              type="button"
              onClick={() => setStage("input")}
              className="text-xs text-gold hover:underline"
            >
              Change Email
            </button>
          </div>
          <div className="flex justify-between gap-2">
            {otp.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputsRef.current[i] = el; }}
                value={d}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleKey(i, e)}
                inputMode="numeric"
                maxLength={1}
                className="luxury-input h-12 w-full rounded-lg text-center text-lg font-display font-semibold text-foreground"
              />
            ))}
          </div>
          <div className="flex items-center justify-end text-xs">
            {timer > 0 ? (
              <span className="text-muted-foreground">{t("app.auth.resendIn", { timer })}s</span>
            ) : (
              <button type="button" onClick={() => sendOtp()} className="text-gold hover:underline underline-offset-4">
                {t("app.auth.resendOtp", "Resend OTP")}
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="gold-btn group w-full rounded-lg py-3.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-70"
      >
        {loading 
          ? (stage === "input" ? t("app.auth.sending", "Sending...") : t("app.auth.verifying", "Verifying...")) 
          : (stage === "input" ? "Send OTP" : t("app.auth.verifyOtp", "Verify & Sign In"))}
        {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
      </button>

      <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
        {t("app.auth.termsAndPrivacy", "By signing in, you agree to our Terms of Service and Privacy Policy.")}
      </p>
    </form>
  );
}

