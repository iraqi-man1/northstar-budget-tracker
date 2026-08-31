import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Languages,
  LockKeyhole,
  Mail,
  MailCheck,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Brand } from "../components/Brand";
import { Button, Field, Input } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../lib/format";
import { isSupabaseConfigured } from "../lib/supabase";
import { useLanguage } from "../context/LanguageContext";

type AuthMode = "login" | "signup" | "forgot";

function friendlyAuthError(error: unknown) {
  const message = getErrorMessage(error);
  if (/invalid login credentials/i.test(message)) return "That email or password is incorrect.";
  if (/email not confirmed/i.test(message)) return "Confirm your email address before signing in.";
  if (/user already registered/i.test(message)) return "An account already exists for that email. Try signing in instead.";
  if (/password.*characters/i.test(message)) return "Use a password with at least 8 characters.";
  if (/rate limit/i.test(message)) return "Too many attempts. Please wait a moment and try again.";
  return message;
}

export function AuthPage() {
  const { user, signIn, signUp, sendPasswordReset } = useAuth();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(searchParams.get("error") || "");
  const [notice, setNotice] = useState("");
  const { language, setLanguage, t } = useLanguage();

  if (user) return <Navigate to="/dashboard" replace />;

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setNotice("");
    setPassword("");
    setConfirmPassword("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return setError(t("Enter your personal email address."));
    if (mode === "signup" && name.trim().length < 2) return setError(t("Enter your full name."));
    if (mode !== "forgot" && password.length < 8) return setError(t("Use a password with at least 8 characters."));
    if (mode === "signup" && password !== confirmPassword) return setError(t("The passwords do not match."));

    setBusy(true);
    try {
      if (mode === "login") {
        await signIn(normalizedEmail, password);
      } else if (mode === "signup") {
        const result = await signUp(name, normalizedEmail, password, language);
        if (result.requiresEmailConfirmation) {
          setNotice(t("We sent a confirmation link to {email}. Open it to activate your account.", { email: normalizedEmail }));
          setPassword("");
          setConfirmPassword("");
        }
      } else {
        await sendPasswordReset(normalizedEmail);
        setNotice(t("If an account exists for {email}, a secure password-reset link is on its way.", { email: normalizedEmail }));
      }
    } catch (authError) {
      setError(t(friendlyAuthError(authError)));
    } finally {
      setBusy(false);
    }
  }

  const heading = t(mode === "signup" ? "Create your private workspace." : mode === "forgot" ? "Reset your password." : "Welcome back.");
  const description = mode === "signup"
    ? t("Start tracking your money with an account protected by Supabase Auth.")
    : mode === "forgot"
      ? t("Enter your email and we’ll send a secure reset link.")
      : t("Sign in to continue to your financial workspace.");

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="auth-story-inner">
          <Brand />
          <div className="auth-copy"><span className="auth-kicker"><Sparkles />{t("Money, without the fog")}</span><h1>{language === "ar" ? <>اعرف أين تذهب أموالك <em>فعلاً</em>.</> : <>See where your money <em>really</em> goes.</>}</h1><p>{t("One calm, private workspace for income, spending, savings, and the goals that matter.")}</p></div>
          <div className="auth-preview" aria-hidden="true">
            <div className="preview-orbit preview-orbit--one" /><div className="preview-orbit preview-orbit--two" />
            <div className="preview-card preview-card--balance"><span>{t("Available balance")}</span><strong>$7,420<small>.80</small></strong><div><span>+12.4%</span> {t("this month")}</div></div>
            <div className="preview-card preview-card--goal"><span><span className="preview-icon"><WalletCards /></span>{t("Japan trip")}</span><strong>68%</strong><div><i style={{ width: "68%" }} /></div></div>
            <div className="preview-card preview-card--secure"><ShieldCheck /><span><strong>{t("Yours alone")}</strong>{t("Protected row by row")}</span></div>
          </div>
          <div className="auth-trust"><span><Check />{t("Encrypted authentication")}</span><span><Check />{t("Private by default")}</span><span><Check />{t("Cloud sync")}</span></div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-form">
          <span className="auth-mobile-brand"><Brand /></span>
          <button type="button" className="language-toggle" onClick={() => setLanguage(language === "ar" ? "en" : "ar")}><Languages />{language === "ar" ? "English" : "العربية"}</button>
          {mode !== "forgot" && <div className="auth-mode-tabs" role="tablist" aria-label={t("Account access")}>
            <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => changeMode("login")}>{t("Log in")}</button>
            <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""} onClick={() => changeMode("signup")}>{t("Sign up")}</button>
          </div>}

          <div className="auth-heading"><span>{t(mode === "signup" ? "NEW TO NORTHSTAR" : mode === "forgot" ? "ACCOUNT RECOVERY" : "SECURE SIGN IN")}</span><h2>{heading}</h2><p>{description}</p></div>

          {!isSupabaseConfigured ? <div className="config-notice"><LockKeyhole /><div><strong>{t("Connect Supabase to continue")}</strong><p>{t("Add the project URL and publishable key to .env.local, then restart the development server.")}</p></div></div> : <form className="auth-fields" onSubmit={submit} noValidate>
            {mode === "signup" && <Field label={t("Full name")}><span className="auth-input-wrap"><UserRound /><Input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder={t("Your full name")} maxLength={120} required /></span></Field>}
            <Field label={t("Email address")}><span className="auth-input-wrap"><Mail /><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" inputMode="email" placeholder="you@example.com" maxLength={254} required /></span></Field>
            {mode !== "forgot" && <Field label={t("Password")}><span className="auth-input-wrap auth-password-wrap"><KeyRound /><Input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder={t(mode === "signup" ? "At least 8 characters" : "Enter your password")} minLength={8} required /><button type="button" aria-label={t(showPassword ? "Hide password" : "Show password")} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff /> : <Eye />}</button></span></Field>}
            {mode === "signup" && <Field label={t("Confirm password")}><span className="auth-input-wrap"><KeyRound /><Input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" placeholder={t("Repeat your password")} minLength={8} required /></span></Field>}

            {mode === "login" && <button type="button" className="auth-link auth-forgot" onClick={() => changeMode("forgot")}>{t("Forgot password?")}</button>}
            {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
            {notice && <div className="auth-message auth-message--success" role="status"><MailCheck />{notice}</div>}
            <Button className="auth-submit" type="submit" icon={mode === "forgot" ? Mail : ArrowRight} loading={busy}>{t(mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Log in")}</Button>
            {mode === "forgot" && <button type="button" className="auth-link auth-back" onClick={() => changeMode("login")}><ArrowLeft />{t("Back to login")}</button>}
          </form>}

          <div className="auth-divider"><span>{t("Protected by Supabase Auth")}</span></div>
          <div className="auth-security"><LockKeyhole /><p><strong>{t("Your data stays yours.")}</strong> {t("Passwords are securely managed by Supabase; Row Level Security keeps every financial record private to your account.")}</p></div>
          <p className="auth-legal">{t("By continuing, you agree to use Northstar for personal financial organization. Northstar does not provide financial advice.")}</p>
        </div>
      </section>
    </main>
  );
}
