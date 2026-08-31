import { Check, Download, Languages, LogOut, Monitor, Moon, Pencil, Plus, ShieldCheck, Sun, Trash2, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { categoryIcon, categoryIconOptions } from "../components/icons";
import { Button, ColorInput, ConfirmDialog, Field, IconButton, Input, Modal, PageHeader, Select } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useAction } from "../hooks/useAction";
import { useBudgetData } from "../hooks/useBudgetData";
import { createCategory, deleteCategory, updateCategory, updateProfile } from "../lib/api";
import { currencies, type ExpenseCategory, type ThemePreference } from "../types";
import { initials } from "../lib/format";
import { useLanguage } from "../context/LanguageContext";
import type { AppLanguage } from "../types";

interface CategoryForm { name: string; icon: string; color: string }
const emptyCategory = (): CategoryForm => ({ name: "", icon: "receipt", color: "#6F7DFF" });

export function SettingsPage() {
  const { data } = useBudgetData();
  const { user, signOut } = useAuth();
  const { setPreference } = useTheme();
  const { language: activeLanguage, setLanguage: setActiveLanguage, t, number } = useLanguage();
  const { busy, run } = useAction();
  const [name, setName] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemePreference | null>(null);
  const [language, setLanguage] = useState<AppLanguage | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategory);
  const [categoryEdit, setCategoryEdit] = useState<ExpenseCategory | null>(null);
  const [categoryDelete, setCategoryDelete] = useState<ExpenseCategory | null>(null);

  if (!data || !user) return null;
  const budget = data;
  const userId = user.id;
  const avatar = budget.profile.avatar_url || user.user_metadata.avatar_url;
  const currentName = name ?? budget.profile.full_name;
  const currentCurrency = currency ?? budget.profile.currency;
  const currentTheme = theme ?? budget.profile.theme;
  const currentLanguage = language ?? budget.profile.language ?? activeLanguage;

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    try { await run(() => updateProfile(userId, { full_name: currentName, currency: currentCurrency, theme: currentTheme, language: currentLanguage }), "Settings saved"); setPreference(currentTheme); setActiveLanguage(currentLanguage); } catch { /* handled */ }
  }
  function openCategory(category?: ExpenseCategory) { setCategoryEdit(category || null); setCategoryForm(category ? { name: category.name, icon: category.icon, color: category.color } : emptyCategory()); setCategoryOpen(true); }
  async function saveCategory(event: FormEvent) {
    event.preventDefault();
    try {
      if (categoryEdit) await run(() => updateCategory(categoryEdit.id, categoryForm), "Category updated");
      else await run(() => createCategory(userId, categoryForm), "Category created");
      setCategoryOpen(false);
    } catch { /* handled */ }
  }
  async function confirmCategoryDelete() {
    if (!categoryDelete) return;
    try { await run(() => deleteCategory(categoryDelete.id), "Category deleted"); setCategoryDelete(null); } catch { /* handled */ }
  }
  function exportBackup() {
    const payload = { exported_at: new Date().toISOString(), profile: budget.profile, income_sources: budget.incomeSources, expense_categories: budget.categories, income: budget.income, expenses: budget.expenses, savings_accounts: budget.savingsAccounts, goals: budget.goals, transactions: budget.transactions };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `northstar-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="page settings-page">
      <PageHeader eyebrow={t("YOUR WORKSPACE")} title={t("Settings")} description={t("Personalize Northstar and manage how your financial data is organized.")} />
      <form className="settings-grid" onSubmit={saveProfile}>
        <section className="settings-section settings-profile"><header><span><UserRound /></span><div><h2>{t("Profile")}</h2><p>{t("Your account identity and display preferences.")}</p></div></header><div className="profile-settings-row"><div className="settings-avatar">{avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" /> : initials(currentName)}</div><div><strong>{currentName}</strong><span>{user.email}</span><small>{t("Email and password are securely managed by Supabase Auth")}</small></div></div><div className="form-grid"><Field label={t("Display name")} className="field--wide"><Input value={currentName} onChange={(event) => setName(event.target.value)} maxLength={120} required /></Field><Field label={t("Currency")} className="field--wide"><Select value={currentCurrency} onChange={(event) => setCurrency(event.target.value)}>{currencies.map((item) => <option value={item.code} key={item.code}>{item.code} — {t(item.name)}</option>)}</Select></Field><Field label={t("Language")} className="field--wide"><Select value={currentLanguage} onChange={(event) => { const next = event.target.value as AppLanguage; setLanguage(next); setActiveLanguage(next); }}><option value="en">English</option><option value="ar">العربية</option></Select></Field></div></section>

        <section className="settings-section settings-appearance"><header><span><Sun /></span><div><h2>{t("Appearance")}</h2><p>{t("Choose how Northstar looks on this account.")}</p></div></header><div className="theme-options">{([{ value: "light", label: "Light", icon: Sun }, { value: "dark", label: "Dark", icon: Moon }, { value: "system", label: "System", icon: Monitor }] as const).map(({ value, label, icon: Icon }) => <button type="button" key={value} className={currentTheme === value ? "active" : ""} onClick={() => { setTheme(value); setPreference(value); }}><span><Icon /></span><strong>{t(label)}</strong>{currentTheme === value && <Check />}</button>)}</div><div className="language-summary"><Languages /><span>{currentLanguage === "ar" ? "العربية · RTL" : "English · LTR"}</span></div></section>

        <div className="settings-save"><p>{t("Changes sync to every device signed into your account.")}</p><Button type="submit" loading={busy}>{t("Save settings")}</Button></div>
      </form>

      <section className="settings-section category-settings"><header><span><span className="category-shapes">●</span></span><div><h2>{t("Expense categories")}</h2><p>{t("Create a spending system that matches your life.")}</p></div><Button variant="secondary" icon={Plus} onClick={() => openCategory()}>{t("New category")}</Button></header><div className="category-settings-grid">{data.categories.map((category) => { const Icon = categoryIcon(category.icon); const count = data.expenses.filter((expense) => expense.category_id === category.id).length; return <article key={category.id}><span style={{ backgroundColor: `${category.color}18`, color: category.color }}><Icon /></span><div><strong>{t(category.name)}</strong><small>{number(count)} {t("Expenses")}</small></div><IconButton label={`${t("Edit")} ${category.name}`} onClick={() => openCategory(category)}><Pencil /></IconButton><IconButton label={`${t("Delete")} ${category.name}`} onClick={() => setCategoryDelete(category)}><Trash2 /></IconButton></article>; })}</div></section>

      <section className="settings-section data-settings"><header><span><ShieldCheck /></span><div><h2>{t("Data & security")}</h2><p>{t("Your records are protected by Supabase Auth and per-user Row Level Security.")}</p></div></header><div className="data-setting-row"><div><strong>{t("Export a complete backup")}</strong><p>{t("Download your profile and all financial records as a portable JSON file.")}</p></div><Button variant="secondary" icon={Download} onClick={exportBackup}>{t("Download backup")}</Button></div><div className="data-setting-row"><div><strong>{t("Sign out of this browser")}</strong><p>{t("Your cloud data remains safe and available when you sign in again.")}</p></div><Button variant="danger" icon={LogOut} onClick={() => signOut()}>{t("Sign out")}</Button></div></section>

      <Modal open={categoryOpen} onClose={() => setCategoryOpen(false)} title={t(categoryEdit ? "Edit expense category" : "New expense category")} eyebrow={t("CATEGORY DETAILS")} footer={<><Button variant="secondary" onClick={() => setCategoryOpen(false)}>{t("Cancel")}</Button><Button loading={busy} onClick={() => (document.getElementById("category-form") as HTMLFormElement | null)?.requestSubmit()}>{t(categoryEdit ? "Save changes" : "Create category")}</Button></>}>
        <form id="category-form" className="form-grid" onSubmit={saveCategory}><Field label={t("Category name")} className="field--wide"><Input value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} maxLength={60} required placeholder={t("e.g. Pets")} /></Field><Field label={t("Icon")} className="field--wide"><Select value={categoryForm.icon} onChange={(event) => setCategoryForm({ ...categoryForm, icon: event.target.value })}>{categoryIconOptions.map((icon) => <option value={icon} key={icon}>{t(icon.replaceAll("-", " "))}</option>)}</Select></Field><div className="field--wide"><ColorInput value={categoryForm.color} onChange={(color) => setCategoryForm({ ...categoryForm, color })} /></div></form>
      </Modal>
      <ConfirmDialog open={Boolean(categoryDelete)} onClose={() => setCategoryDelete(null)} onConfirm={confirmCategoryDelete} busy={busy} title={t("Delete expense category?")} description={activeLanguage === "ar" ? `ستبقى المصروفات الحالية في «${categoryDelete?.name || "هذه الفئة"}» ضمن سجلك وستصبح غير مصنفة.` : `Existing expenses in “${categoryDelete?.name || "this category"}” will remain in your history and become uncategorized.`} />
    </div>
  );
}
