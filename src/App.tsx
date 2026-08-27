import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { Brand } from "./components/Brand";
import { useAuth } from "./context/AuthContext";

const AuthPage = lazy(() => import("./pages/AuthPage").then((module) => ({ default: module.AuthPage })));
const AuthCallback = lazy(() => import("./pages/AuthCallback").then((module) => ({ default: module.AuthCallback })));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage").then((module) => ({ default: module.ResetPasswordPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage").then((module) => ({ default: module.ExpensesPage })));
const GoalsPage = lazy(() => import("./pages/GoalsPage").then((module) => ({ default: module.GoalsPage })));
const IncomePage = lazy(() => import("./pages/IncomePage").then((module) => ({ default: module.IncomePage })));
const SavingsPage = lazy(() => import("./pages/SavingsPage").then((module) => ({ default: module.SavingsPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const TransactionsPage = lazy(() => import("./pages/TransactionsPage").then((module) => ({ default: module.TransactionsPage })));

function LoadingScreen() {
  return <main className="callback-page"><Brand /><span className="callback-spinner" /><h1>Restoring your workspace…</h1><p>Your secure session is being refreshed.</p></main>;
}

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  return <AppLayout><Outlet /></AppLayout>;
}

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/reset" element={<ResetPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/income" element={<IncomePage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/savings" element={<SavingsPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
