import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Brand } from "../components/Brand";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export function AuthCallback() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  useEffect(() => {
    if (loading) return;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const error = hash.get("error_description") || query.get("error_description");
    navigate(user ? "/dashboard" : error ? `/?error=${encodeURIComponent(error)}` : "/", { replace: true });
  }, [loading, navigate, user]);
  return <main className="callback-page"><Brand /><span className="callback-spinner" /><h1>{t("Confirming your account…")}</h1><p>{t("Securely verifying your email and opening your workspace.")}</p></main>;
}
