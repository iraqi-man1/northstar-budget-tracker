import { CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Brand } from "../components/Brand";
import { Button, Field, Input } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../lib/format";

export function ResetPasswordPage() {
  const { user, loading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (password.length < 8) return setError("Use a password with at least 8 characters.");
    if (password !== confirmation) return setError("The passwords do not match.");
    setBusy(true);
    try {
      await updatePassword(password);
      setComplete(true);
      setPassword("");
      setConfirmation("");
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="callback-page"><Brand /><span className="callback-spinner" /><h1>Verifying your reset link…</h1><p>Checking your secure recovery session.</p></main>;

  return (
    <main className="reset-page">
      <section className="reset-card">
        <Brand />
        <span className={`reset-icon ${complete ? "reset-icon--complete" : ""}`}>{complete ? <CheckCircle2 /> : <LockKeyhole />}</span>
        {complete ? <>
          <h1>Password updated.</h1>
          <p>Your new password is active and your current session remains securely signed in.</p>
          <Button onClick={() => navigate("/dashboard", { replace: true })}>Continue to dashboard</Button>
        </> : !user ? <>
          <h1>This reset link is no longer valid.</h1>
          <p>Reset links expire and can only be used once. Request a fresh link from the login page.</p>
          <Button onClick={() => navigate("/", { replace: true })}>Return to login</Button>
        </> : <>
          <span className="eyebrow">SECURE ACCOUNT RECOVERY</span>
          <h1>Create a new password.</h1>
          <p>Choose a strong password you haven’t used for this account before.</p>
          <form className="auth-fields reset-form" onSubmit={submit}>
            <Field label="New password"><span className="auth-input-wrap auth-password-wrap"><KeyRound /><Input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="At least 8 characters" minLength={8} required /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff /> : <Eye />}</button></span></Field>
            <Field label="Confirm new password"><span className="auth-input-wrap"><KeyRound /><Input type={showPassword ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" placeholder="Repeat your password" minLength={8} required /></span></Field>
            {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
            <Button type="submit" loading={busy}>Update password</Button>
          </form>
        </>}
      </section>
    </main>
  );
}
