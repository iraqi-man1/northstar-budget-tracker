import { CalendarDays, MoreHorizontal, Pencil, Plus, ReceiptText, SearchX, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Button, ConfirmDialog, EmptyState, Field, IconButton, Input, Modal, MoneyInput, PageHeader, SearchInput, Select, SortSelect, Textarea } from "../components/ui";
import { categoryIcon } from "../components/icons";
import { useAction } from "../hooks/useAction";
import { useBudgetData } from "../hooks/useBudgetData";
import { callRpc } from "../lib/api";
import { formatCurrency, formatDate, todayISO } from "../lib/format";
import type { Expense } from "../types";
import { useLanguage } from "../context/LanguageContext";

interface ExpenseForm { category_id: string; amount: string; spent_on: string; merchant: string; notes: string }
const emptyForm = (): ExpenseForm => ({ category_id: "", amount: "", spent_on: todayISO(), merchant: "", notes: "" });

export function ExpensesPage() {
  const { data } = useBudgetData();
  const { busy, run } = useAction();
  const { locale, t, number } = useLanguage();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [sort, setSort] = useState("date-desc");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const currency = data?.profile.currency || "USD";

  const rows = useMemo(() => {
    if (!data) return [];
    const query = search.toLowerCase().trim();
    return [...data.expenses]
      .filter((item) => !query || item.merchant.toLowerCase().includes(query) || item.notes?.toLowerCase().includes(query))
      .filter((item) => categoryFilter === "all" || item.category_id === categoryFilter)
      .filter((item) => monthFilter === "all" || item.spent_on.startsWith(monthFilter))
      .sort((a, b) => {
        if (sort === "amount-desc") return b.amount - a.amount;
        if (sort === "amount-asc") return a.amount - b.amount;
        if (sort === "name") return a.merchant.localeCompare(b.merchant);
        return sort === "date-asc" ? a.spent_on.localeCompare(b.spent_on) : b.spent_on.localeCompare(a.spent_on);
      });
  }, [categoryFilter, data, monthFilter, search, sort]);
  const months = useMemo(() => [...new Set(data?.expenses.map((item) => item.spent_on.slice(0, 7)) || [])].sort().reverse(), [data]);
  const total = rows.reduce((sum, item) => sum + Number(item.amount), 0);
  const largest = rows.reduce((max, item) => Math.max(max, item.amount), 0);
  if (!data) return null;

  function openCreate() { setEditing(null); setForm(emptyForm()); setFormOpen(true); }
  function openEdit(item: Expense) { setEditing(item); setForm({ category_id: item.category_id || "", amount: String(item.amount), spent_on: item.spent_on, merchant: item.merchant, notes: item.notes || "" }); setFormOpen(true); setOpenMenu(null); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const args = { p_category_id: form.category_id || null, p_amount: Number(form.amount), p_spent_on: form.spent_on, p_merchant: form.merchant, p_notes: form.notes };
    try {
      if (editing) await run(() => callRpc("update_expense_entry", { p_id: editing.id, ...args }), "Expense updated");
      else await run(() => callRpc("create_expense_entry", args), "Expense added");
      setFormOpen(false);
    } catch { /* handled */ }
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    try { await run(() => callRpc("delete_expense_entry", { p_id: deleteTarget.id }), "Expense deleted"); setDeleteTarget(null); } catch { /* handled */ }
  }

  return (
    <div className="page">
      <PageHeader eyebrow={t("MONEY OUT")} title={t("Expenses")} description={t("Capture everyday spending, find patterns, and keep every category under control.")} actions={<Button icon={Plus} onClick={openCreate}>{t("Add expense")}</Button>} />
      <section className="summary-strip"><div><span>{t("Showing")}</span><strong>{number(rows.length)} {t(rows.length === 1 ? "expense" : "expenses")}</strong></div><div><span>{t("Filtered spend")}</span><strong>{formatCurrency(total, currency)}</strong></div><div><span>{t("Largest expense")}</span><strong>{formatCurrency(largest, currency)}</strong></div></section>
      <section className="toolbar"><SearchInput value={search} onChange={setSearch} placeholder={t("Search merchant or notes…")} /><div className="toolbar-filters"><Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">{t("All categories")}</option>{data.categories.map((category) => <option value={category.id} key={category.id}>{t(category.name)}</option>)}</Select><Select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}><option value="all">{t("All months")}</option>{months.map((month) => <option key={month} value={month}>{new Date(`${month}-02`).toLocaleDateString(locale, { month: "long", year: "numeric" })}</option>)}</Select><SortSelect value={sort} onChange={setSort}><option value="date-desc">{t("Newest first")}</option><option value="date-asc">{t("Oldest first")}</option><option value="amount-desc">{t("Highest amount")}</option><option value="amount-asc">{t("Lowest amount")}</option><option value="name">{t("Merchant A–Z")}</option></SortSelect></div></section>

      <section className="data-panel">
        {rows.length ? <div className="responsive-table"><table><thead><tr><th>{t("Merchant")}</th><th>{t("Category")}</th><th>{t("Date spent")}</th><th className="numeric">{t("Amount")}</th><th aria-label={t("Actions")} /></tr></thead><tbody>{rows.map((item) => { const category = data.categories.find((entry) => entry.id === item.category_id); const Icon = categoryIcon(category?.icon || "shapes"); return <tr key={item.id}><td data-label={t("Merchant")}><div className="cell-primary"><span className="row-icon" style={{ backgroundColor: `${category?.color || "#7A8582"}18`, color: category?.color || "#7A8582" }}><Icon /></span><span><strong>{item.merchant}</strong><small>{item.notes || t("No notes")}</small></span></div></td><td data-label={t("Category")}><span className="tag"><i style={{ backgroundColor: category?.color || "#7A8582" }} />{category ? t(category.name) : t("Uncategorized")}</span></td><td data-label={t("Date spent")}><span className="date-cell"><CalendarDays />{formatDate(item.spent_on)}</span></td><td data-label={t("Amount")} className="numeric amount-negative">−{formatCurrency(item.amount, currency)}</td><td className="actions-cell"><IconButton label={t("Expense actions")} onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)}><MoreHorizontal /></IconButton>{openMenu === item.id && <><button className="popover-scrim" onClick={() => setOpenMenu(null)} aria-label={t("Close menu")} /><div className="row-menu"><button onClick={() => openEdit(item)}><Pencil />{t("Edit")}</button><button className="danger" onClick={() => { setDeleteTarget(item); setOpenMenu(null); }}><Trash2 />{t("Delete")}</button></div></>}</td></tr>; })}</tbody></table></div> : <EmptyState icon={search || categoryFilter !== "all" || monthFilter !== "all" ? SearchX : ReceiptText} title={t(search || categoryFilter !== "all" || monthFilter !== "all" ? "No matching expenses" : "No expenses recorded")} description={t(search || categoryFilter !== "all" || monthFilter !== "all" ? "Try adjusting your search or filters." : "Add a purchase or bill to start understanding where your money goes.")} action={!search && categoryFilter === "all" && monthFilter === "all" ? <Button icon={Plus} onClick={openCreate}>{t("Add expense")}</Button> : undefined} />}
      </section>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={t(editing ? "Edit expense" : "Add expense")} eyebrow={t("EXPENSE ENTRY")} footer={<><Button variant="secondary" onClick={() => setFormOpen(false)}>{t("Cancel")}</Button><Button loading={busy} onClick={() => (document.getElementById("expense-form") as HTMLFormElement | null)?.requestSubmit()}>{t(editing ? "Save changes" : "Add expense")}</Button></>}>
        <form id="expense-form" className="form-grid" onSubmit={submit}><Field label={t("Category")}><Select value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })} required><option value="" disabled>{t("Select a category")}</option>{data.categories.map((category) => <option value={category.id} key={category.id}>{t(category.name)}</option>)}</Select></Field><Field label={t("Amount")}><MoneyInput currency={currency} value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></Field><Field label={t("Merchant / description")} className="field--wide"><Input value={form.merchant} maxLength={160} onChange={(event) => setForm({ ...form, merchant: event.target.value })} placeholder={t("e.g. Corner Market")} required /></Field><Field label={t("Date spent")}><Input type="date" value={form.spent_on} onChange={(event) => setForm({ ...form, spent_on: event.target.value })} required /></Field><Field label={t("Notes")} className="field--wide"><Textarea value={form.notes} maxLength={1000} rows={3} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder={t("Optional details")} /></Field></form>
      </Modal>
      <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} busy={busy} title={t("Delete expense?")} description={t("This permanently removes “{name}” and its matching transaction. Your balance will update immediately.", { name: deleteTarget?.merchant || t("this expense") })} />
    </div>
  );
}
