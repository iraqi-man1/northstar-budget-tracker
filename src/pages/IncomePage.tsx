import { CalendarDays, MoreHorizontal, Pencil, Plus, SearchX, Trash2, TrendingUp, WalletCards } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Button, ColorInput, ConfirmDialog, EmptyState, Field, IconButton, Input, Modal, MoneyInput, PageHeader, SearchInput, Select, SortSelect, Textarea } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useAction } from "../hooks/useAction";
import { useBudgetData } from "../hooks/useBudgetData";
import { callRpc, createIncomeSource, deleteIncomeSource, updateIncomeSource } from "../lib/api";
import { formatCurrency, formatDate, todayISO } from "../lib/format";
import type { IncomeEntry, IncomeSource } from "../types";

interface IncomeForm { source_id: string; amount: string; received_on: string; description: string; notes: string }
const emptyForm = (): IncomeForm => ({ source_id: "", amount: "", received_on: todayISO(), description: "", notes: "" });

export function IncomePage() {
  const { data } = useBudgetData();
  const { user } = useAuth();
  const { busy, run } = useAction();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [sort, setSort] = useState("date-desc");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeEntry | null>(null);
  const [form, setForm] = useState<IncomeForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<IncomeEntry | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [sourceEdit, setSourceEdit] = useState<IncomeSource | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [sourceColor, setSourceColor] = useState("#2DAA79");
  const [sourceDelete, setSourceDelete] = useState<IncomeSource | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const currency = data?.profile.currency || "USD";

  const rows = useMemo(() => {
    if (!data) return [];
    const query = search.toLowerCase().trim();
    return [...data.income]
      .filter((item) => !query || item.description.toLowerCase().includes(query) || item.notes?.toLowerCase().includes(query))
      .filter((item) => sourceFilter === "all" || item.source_id === sourceFilter)
      .filter((item) => monthFilter === "all" || item.received_on.startsWith(monthFilter))
      .sort((a, b) => {
        if (sort === "amount-desc") return b.amount - a.amount;
        if (sort === "amount-asc") return a.amount - b.amount;
        if (sort === "name") return a.description.localeCompare(b.description);
        return sort === "date-asc" ? a.received_on.localeCompare(b.received_on) : b.received_on.localeCompare(a.received_on);
      });
  }, [data, monthFilter, search, sort, sourceFilter]);

  const months = useMemo(() => [...new Set(data?.income.map((item) => item.received_on.slice(0, 7)) || [])].sort().reverse(), [data]);
  const total = rows.reduce((sum, item) => sum + Number(item.amount), 0);
  if (!data || !user) return null;
  const userId = user.id;

  function openCreate() { setEditing(null); setForm(emptyForm()); setFormOpen(true); }
  function openEdit(item: IncomeEntry) { setEditing(item); setForm({ source_id: item.source_id || "", amount: String(item.amount), received_on: item.received_on, description: item.description, notes: item.notes || "" }); setFormOpen(true); setOpenMenu(null); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const args = { p_source_id: form.source_id || null, p_amount: Number(form.amount), p_received_on: form.received_on, p_description: form.description, p_notes: form.notes };
    try {
      if (editing) await run(() => callRpc("update_income_entry", { p_id: editing.id, ...args }), "Income entry updated");
      else await run(() => callRpc("create_income_entry", args), "Income added");
      setFormOpen(false);
    } catch { /* toast is handled by useAction */ }
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    try { await run(() => callRpc("delete_income_entry", { p_id: deleteTarget.id }), "Income entry deleted"); setDeleteTarget(null); } catch { /* keep dialog open */ }
  }
  function editSource(source?: IncomeSource) { setSourceEdit(source || null); setSourceName(source?.name || ""); setSourceColor(source?.color || "#2DAA79"); }
  async function saveSource(event: FormEvent) {
    event.preventDefault();
    try {
      if (sourceEdit) await run(() => updateIncomeSource(sourceEdit.id, { name: sourceName, color: sourceColor, is_active: sourceEdit.is_active }), "Income source updated");
      else await run(() => createIncomeSource(userId, { name: sourceName, color: sourceColor, is_active: true }), "Income source created");
      editSource();
    } catch { /* handled */ }
  }
  async function confirmSourceDelete() {
    if (!sourceDelete) return;
    try { await run(() => deleteIncomeSource(sourceDelete.id), "Income source deleted"); setSourceDelete(null); } catch { /* handled */ }
  }

  return (
    <div className="page">
      <PageHeader eyebrow="MONEY IN" title="Salary & income" description="Track every source of income and keep a clean history of what you earn." actions={<><Button variant="secondary" icon={WalletCards} onClick={() => { setSourcesOpen(true); editSource(); }}>Manage sources</Button><Button icon={Plus} onClick={openCreate}>Add income</Button></>} />

      <section className="summary-strip"><div><span>Showing</span><strong>{rows.length} {rows.length === 1 ? "entry" : "entries"}</strong></div><div><span>Filtered total</span><strong>{formatCurrency(total, currency)}</strong></div><div><span>Income sources</span><strong>{data.incomeSources.length}</strong></div></section>
      <section className="toolbar"><SearchInput value={search} onChange={setSearch} placeholder="Search income…" /><div className="toolbar-filters"><Select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}><option value="all">All sources</option>{data.incomeSources.map((source) => <option value={source.id} key={source.id}>{source.name}</option>)}</Select><Select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}><option value="all">All months</option>{months.map((month) => <option key={month} value={month}>{new Date(`${month}-02`).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</option>)}</Select><SortSelect value={sort} onChange={setSort}><option value="date-desc">Newest first</option><option value="date-asc">Oldest first</option><option value="amount-desc">Highest amount</option><option value="amount-asc">Lowest amount</option><option value="name">Name A–Z</option></SortSelect></div></section>

      <section className="data-panel">
        {rows.length ? <div className="responsive-table"><table><thead><tr><th>Income</th><th>Source</th><th>Date received</th><th className="numeric">Amount</th><th aria-label="Actions" /></tr></thead><tbody>{rows.map((item) => { const source = data.incomeSources.find((entry) => entry.id === item.source_id); return <tr key={item.id}><td data-label="Income"><div className="cell-primary"><span className="row-icon" style={{ backgroundColor: `${source?.color || "#7A8582"}18`, color: source?.color || "#7A8582" }}><TrendingUp /></span><span><strong>{item.description}</strong><small>{item.notes || "No notes"}</small></span></div></td><td data-label="Source"><span className="tag"><i style={{ backgroundColor: source?.color || "#7A8582" }} />{source?.name || "Deleted source"}</span></td><td data-label="Date"><span className="date-cell"><CalendarDays />{formatDate(item.received_on)}</span></td><td data-label="Amount" className="numeric amount-positive">+{formatCurrency(item.amount, currency)}</td><td className="actions-cell"><IconButton label="Income actions" onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)}><MoreHorizontal /></IconButton>{openMenu === item.id && <><button className="popover-scrim" onClick={() => setOpenMenu(null)} aria-label="Close menu" /><div className="row-menu"><button onClick={() => openEdit(item)}><Pencil />Edit</button><button className="danger" onClick={() => { setDeleteTarget(item); setOpenMenu(null); }}><Trash2 />Delete</button></div></>}</td></tr>; })}</tbody></table></div> : <EmptyState icon={search || sourceFilter !== "all" || monthFilter !== "all" ? SearchX : TrendingUp} title={search || sourceFilter !== "all" || monthFilter !== "all" ? "No matching income" : "Add your first income"} description={search || sourceFilter !== "all" || monthFilter !== "all" ? "Try adjusting your search or filters." : "Salary, freelance work, gifts—keep every source in one clear view."} action={!search && sourceFilter === "all" && monthFilter === "all" ? <Button icon={Plus} onClick={openCreate}>Add income</Button> : undefined} />}
      </section>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit income" : "Add income"} eyebrow="INCOME ENTRY" footer={<><Button variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button><Button loading={busy} onClick={() => (document.getElementById("income-form") as HTMLFormElement | null)?.requestSubmit()}>{editing ? "Save changes" : "Add income"}</Button></>}>
        <form id="income-form" className="form-grid" onSubmit={submit}><Field label="Income source"><Select value={form.source_id} onChange={(event) => setForm({ ...form, source_id: event.target.value })} required><option value="" disabled>Select a source</option>{data.incomeSources.filter((source) => source.is_active || source.id === form.source_id).map((source) => <option value={source.id} key={source.id}>{source.name}</option>)}</Select></Field><Field label="Amount"><MoneyInput currency={currency} value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></Field><Field label="Description" className="field--wide"><Input value={form.description} maxLength={160} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="e.g. August salary" required /></Field><Field label="Date received"><Input type="date" value={form.received_on} onChange={(event) => setForm({ ...form, received_on: event.target.value })} required /></Field><Field label="Notes" className="field--wide"><Textarea value={form.notes} maxLength={1000} rows={3} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Optional details" /></Field></form>
      </Modal>
      <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} busy={busy} title="Delete income entry?" description={`This will permanently remove “${deleteTarget?.description || "this entry"}” and its matching transaction. Your totals will update immediately.`} />

      <Modal open={sourcesOpen} onClose={() => setSourcesOpen(false)} title="Income sources" eyebrow="ORGANIZE INCOME" size="large">
        <div className="manager-layout"><div className="manager-list"><h3>Your sources</h3>{data.incomeSources.map((source) => <div className="manager-row" key={source.id}><span className="manager-color" style={{ backgroundColor: source.color }} /><div><strong>{source.name}</strong><small>{data.income.filter((item) => item.source_id === source.id).length} entries</small></div><div><IconButton label={`Edit ${source.name}`} onClick={() => editSource(source)}><Pencil /></IconButton><IconButton label={`Delete ${source.name}`} onClick={() => setSourceDelete(source)}><Trash2 /></IconButton></div></div>)}</div><form className="manager-form" onSubmit={saveSource}><span className="eyebrow">{sourceEdit ? "EDIT SOURCE" : "NEW SOURCE"}</span><h3>{sourceEdit ? sourceEdit.name : "Create a source"}</h3><Field label="Source name"><Input value={sourceName} onChange={(event) => setSourceName(event.target.value)} maxLength={80} required placeholder="e.g. Consulting" /></Field><ColorInput value={sourceColor} onChange={setSourceColor} /><div className="modal-actions"><Button type="button" variant="secondary" onClick={() => editSource()}>{sourceEdit ? "Cancel" : "Clear"}</Button><Button type="submit" loading={busy}>{sourceEdit ? "Save source" : "Create source"}</Button></div></form></div>
      </Modal>
      <ConfirmDialog open={Boolean(sourceDelete)} onClose={() => setSourceDelete(null)} onConfirm={confirmSourceDelete} busy={busy} title="Delete income source?" description={`Existing entries for “${sourceDelete?.name || "this source"}” will remain in your history and become uncategorized.`} />
    </div>
  );
}
