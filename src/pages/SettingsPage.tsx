import { Check, Download, LogOut, Monitor, Moon, Pencil, Plus, ShieldCheck, Sun, Trash2, UserRound } from "lucide-react";
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

interface CategoryForm { name: string; icon: string; color: string }
const emptyCategory = (): CategoryForm => ({ name: "", icon: "receipt", color: "#6F7DFF" });

export function SettingsPage() {
  const { data } = useBudgetData();
  const { user, signOut } = useAuth();
  const { setPreference } = useTheme();
  const { busy, run } = useAction();
  const [name, setName] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemePreference | null>(null);
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

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    try { await run(() => updateProfile(userId, { full_name: currentName, currency: currentCurrency, theme: currentTheme }), "Settings saved"); setPreference(currentTheme); } catch { /* handled */ }
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
      <PageHeader eyebrow="YOUR WORKSPACE" title="Settings" description="Personalize Northstar and manage how your financial data is organized." />
      <form className="settings-grid" onSubmit={saveProfile}>
        <section className="settings-section settings-profile"><header><span><UserRound /></span><div><h2>Profile</h2><p>Your account identity and display preferences.</p></div></header><div className="profile-settings-row"><div className="settings-avatar">{avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" /> : initials(currentName)}</div><div><strong>{currentName}</strong><span>{user.email}</span><small>Email and password are securely managed by Supabase Auth</small></div></div><div className="form-grid"><Field label="Display name" className="field--wide"><Input value={currentName} onChange={(event) => setName(event.target.value)} maxLength={120} required /></Field><Field label="Currency" className="field--wide"><Select value={currentCurrency} onChange={(event) => setCurrency(event.target.value)}>{currencies.map((item) => <option value={item.code} key={item.code}>{item.code} — {item.name}</option>)}</Select></Field></div></section>

        <section className="settings-section settings-appearance"><header><span><Sun /></span><div><h2>Appearance</h2><p>Choose how Northstar looks on this account.</p></div></header><div className="theme-options">{([{ value: "light", label: "Light", icon: Sun }, { value: "dark", label: "Dark", icon: Moon }, { value: "system", label: "System", icon: Monitor }] as const).map(({ value, label, icon: Icon }) => <button type="button" key={value} className={currentTheme === value ? "active" : ""} onClick={() => { setTheme(value); setPreference(value); }}><span><Icon /></span><strong>{label}</strong>{currentTheme === value && <Check />}</button>)}</div></section>

        <div className="settings-save"><p>Changes sync to every device signed into your account.</p><Button type="submit" loading={busy}>Save settings</Button></div>
      </form>

      <section className="settings-section category-settings"><header><span><span className="category-shapes">●</span></span><div><h2>Expense categories</h2><p>Create a spending system that matches your life.</p></div><Button variant="secondary" icon={Plus} onClick={() => openCategory()}>New category</Button></header><div className="category-settings-grid">{data.categories.map((category) => { const Icon = categoryIcon(category.icon); const count = data.expenses.filter((expense) => expense.category_id === category.id).length; return <article key={category.id}><span style={{ backgroundColor: `${category.color}18`, color: category.color }}><Icon /></span><div><strong>{category.name}</strong><small>{count} {count === 1 ? "expense" : "expenses"}</small></div><IconButton label={`Edit ${category.name}`} onClick={() => openCategory(category)}><Pencil /></IconButton><IconButton label={`Delete ${category.name}`} onClick={() => setCategoryDelete(category)}><Trash2 /></IconButton></article>; })}</div></section>

      <section className="settings-section data-settings"><header><span><ShieldCheck /></span><div><h2>Data & security</h2><p>Your records are protected by Supabase Auth and per-user Row Level Security.</p></div></header><div className="data-setting-row"><div><strong>Export a complete backup</strong><p>Download your profile and all financial records as a portable JSON file.</p></div><Button variant="secondary" icon={Download} onClick={exportBackup}>Download backup</Button></div><div className="data-setting-row"><div><strong>Sign out of this browser</strong><p>Your cloud data remains safe and available when you sign in again.</p></div><Button variant="danger" icon={LogOut} onClick={() => signOut()}>Sign out</Button></div></section>

      <Modal open={categoryOpen} onClose={() => setCategoryOpen(false)} title={categoryEdit ? "Edit expense category" : "New expense category"} eyebrow="CATEGORY DETAILS" footer={<><Button variant="secondary" onClick={() => setCategoryOpen(false)}>Cancel</Button><Button loading={busy} onClick={() => (document.getElementById("category-form") as HTMLFormElement | null)?.requestSubmit()}>{categoryEdit ? "Save changes" : "Create category"}</Button></>}>
        <form id="category-form" className="form-grid" onSubmit={saveCategory}><Field label="Category name" className="field--wide"><Input value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} maxLength={60} required placeholder="e.g. Pets" /></Field><Field label="Icon" className="field--wide"><Select value={categoryForm.icon} onChange={(event) => setCategoryForm({ ...categoryForm, icon: event.target.value })}>{categoryIconOptions.map((icon) => <option value={icon} key={icon}>{icon.replaceAll("-", " ")}</option>)}</Select></Field><div className="field--wide"><ColorInput value={categoryForm.color} onChange={(color) => setCategoryForm({ ...categoryForm, color })} /></div></form>
      </Modal>
      <ConfirmDialog open={Boolean(categoryDelete)} onClose={() => setCategoryDelete(null)} onConfirm={confirmCategoryDelete} busy={busy} title="Delete expense category?" description={`Existing expenses in “${categoryDelete?.name || "this category"}” will remain in your history and become uncategorized.`} />
    </div>
  );
}
