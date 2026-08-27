import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, MoreHorizontal, Pencil, PiggyBank, Plus, SearchX, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { accountIcon } from "../components/icons";
import { Button, ColorInput, ConfirmDialog, EmptyState, Field, IconButton, Input, Modal, MoneyInput, PageHeader, SearchInput, Select, SortSelect, Textarea } from "../components/ui";
import { useAction } from "../hooks/useAction";
import { useBudgetData } from "../hooks/useBudgetData";
import { callRpc } from "../lib/api";
import { calculateTotals } from "../lib/finance";
import { formatCurrency, humanize, todayISO } from "../lib/format";
import type { SavingsAccount } from "../types";

type MoneyAction = "deposit" | "withdraw" | "transfer";
interface AccountForm { name: string; account_type: SavingsAccount["account_type"]; institution: string; color: string }
interface ActionForm { from: string; to: string; amount: string; date: string; notes: string }
const emptyAccount = (): AccountForm => ({ name: "", account_type: "savings", institution: "", color: "#14A6A6" });
const emptyAction = (): ActionForm => ({ from: "", to: "", amount: "", date: todayISO(), notes: "" });

export function SavingsPage() {
  const { data } = useBudgetData();
  const { busy, run } = useAction();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState("created");
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountForm, setAccountForm] = useState<AccountForm>(emptyAccount);
  const [editing, setEditing] = useState<SavingsAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavingsAccount | null>(null);
  const [moneyAction, setMoneyAction] = useState<MoneyAction | null>(null);
  const [actionForm, setActionForm] = useState<ActionForm>(emptyAction);
  const [actionError, setActionError] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const currency = data?.profile.currency || "USD";

  const accounts = useMemo(() => {
    if (!data) return [];
    const query = search.toLowerCase().trim();
    return [...data.savingsAccounts]
      .filter((account) => !query || account.name.toLowerCase().includes(query) || account.institution?.toLowerCase().includes(query))
      .filter((account) => typeFilter === "all" || account.account_type === typeFilter)
      .sort((a, b) => sort === "balance-desc" ? b.balance - a.balance : sort === "balance-asc" ? a.balance - b.balance : sort === "name" ? a.name.localeCompare(b.name) : a.created_at.localeCompare(b.created_at));
  }, [data, search, sort, typeFilter]);
  if (!data) return null;
  const budget = data;
  const totals = calculateTotals(budget);

  function openCreate() { setEditing(null); setAccountForm(emptyAccount()); setAccountOpen(true); }
  function openEdit(account: SavingsAccount) { setEditing(account); setAccountForm({ name: account.name, account_type: account.account_type, institution: account.institution || "", color: account.color }); setAccountOpen(true); setOpenMenu(null); }
  function openAction(action: MoneyAction, account?: SavingsAccount) {
    setMoneyAction(action);
    setActionError("");
    setActionForm({ ...emptyAction(), from: account?.id || budget.savingsAccounts[0]?.id || "", to: action === "transfer" ? budget.savingsAccounts.find((item) => item.id !== (account?.id || budget.savingsAccounts[0]?.id))?.id || "" : "" });
    setOpenMenu(null);
  }
  async function submitAccount(event: FormEvent) {
    event.preventDefault();
    const args = { p_name: accountForm.name, p_account_type: accountForm.account_type, p_institution: accountForm.institution, p_color: accountForm.color };
    try {
      if (editing) await run(() => callRpc("update_savings_account", { p_id: editing.id, ...args }), "Savings account updated");
      else await run(() => callRpc("create_savings_account", args), "Savings account created");
      setAccountOpen(false);
    } catch { /* handled */ }
  }
  async function submitAction(event: FormEvent) {
    event.preventDefault();
    if (!moneyAction) return;
    const amount = Number(actionForm.amount);
    const source = budget.savingsAccounts.find((account) => account.id === actionForm.from);
    if ((moneyAction === "withdraw" || moneyAction === "transfer") && amount > Number(source?.balance || 0)) {
      setActionError(`Amount cannot exceed ${formatCurrency(source?.balance || 0, currency)}.`);
      return;
    }
    if (moneyAction === "transfer" && actionForm.from === actionForm.to) { setActionError("Choose two different accounts."); return; }
    setActionError("");
    try {
      if (moneyAction === "deposit") await run(() => callRpc("record_savings_deposit", { p_account_id: actionForm.from, p_amount: amount, p_date: actionForm.date, p_notes: actionForm.notes }), "Savings deposit recorded");
      if (moneyAction === "withdraw") await run(() => callRpc("record_savings_withdrawal", { p_account_id: actionForm.from, p_amount: amount, p_date: actionForm.date, p_notes: actionForm.notes }), "Savings withdrawal recorded");
      if (moneyAction === "transfer") await run(() => callRpc("record_savings_transfer", { p_from_account_id: actionForm.from, p_to_account_id: actionForm.to, p_amount: amount, p_date: actionForm.date, p_notes: actionForm.notes }), "Savings transferred");
      setMoneyAction(null);
    } catch { /* handled */ }
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    try { await run(() => callRpc("delete_savings_account", { p_id: deleteTarget.id }), "Savings account deleted"); setDeleteTarget(null); } catch { /* handled */ }
  }

  return (
    <div className="page">
      <PageHeader eyebrow="SET MONEY ASIDE" title="Savings" description="Create dedicated accounts, move money safely, and see exactly what you’ve allocated." actions={<><Button variant="secondary" icon={ArrowLeftRight} disabled={data.savingsAccounts.length < 2} onClick={() => openAction("transfer")}>Transfer</Button><Button icon={Plus} onClick={openCreate}>New account</Button></>} />
      <section className="savings-hero"><div><span>Total in savings accounts</span><strong>{formatCurrency(totals.savingsAllocated, currency)}</strong><p><ShieldCheck />Transfers never change this total or your available balance.</p></div><div className="savings-hero-actions"><Button variant="secondary" icon={ArrowDownToLine} disabled={!data.savingsAccounts.length} onClick={() => openAction("deposit")}>Deposit</Button><Button variant="secondary" icon={ArrowUpFromLine} disabled={!data.savingsAccounts.length} onClick={() => openAction("withdraw")}>Withdraw</Button></div></section>
      <section className="toolbar"><SearchInput value={search} onChange={setSearch} placeholder="Search savings accounts…" /><div className="toolbar-filters"><Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">All account types</option><option value="savings">Savings</option><option value="money_market">Money market</option><option value="investment">Investment</option><option value="cash">Cash</option></Select><SortSelect value={sort} onChange={setSort}><option value="created">Date created</option><option value="balance-desc">Highest balance</option><option value="balance-asc">Lowest balance</option><option value="name">Name A–Z</option></SortSelect></div></section>

      {accounts.length ? <section className="account-grid">{accounts.map((account) => { const Icon = accountIcon(account.account_type); return <article className="account-card" key={account.id}><div className="account-card-accent" style={{ backgroundColor: account.color }} /><header><span className="account-card-icon" style={{ color: account.color, backgroundColor: `${account.color}18` }}><Icon /></span><div className="account-menu"><IconButton label="Account actions" onClick={() => setOpenMenu(openMenu === account.id ? null : account.id)}><MoreHorizontal /></IconButton>{openMenu === account.id && <><button className="popover-scrim" onClick={() => setOpenMenu(null)} aria-label="Close menu" /><div className="row-menu"><button onClick={() => openEdit(account)}><Pencil />Edit details</button><button className="danger" onClick={() => { setDeleteTarget(account); setOpenMenu(null); }}><Trash2 />Delete</button></div></>}</div></header><div className="account-card-name"><span>{humanize(account.account_type)}</span><h2>{account.name}</h2><p>{account.institution || "Personal account"}</p></div><div className="account-balance"><span>Current balance</span><strong>{formatCurrency(account.balance, currency)}</strong></div><footer><button onClick={() => openAction("deposit", account)}><ArrowDownToLine />Deposit</button><button onClick={() => openAction("withdraw", account)} disabled={account.balance <= 0}><ArrowUpFromLine />Withdraw</button><button onClick={() => openAction("transfer", account)} disabled={data.savingsAccounts.length < 2}><ArrowLeftRight />Transfer</button></footer></article>; })}</section> : <section className="data-panel"><EmptyState icon={search || typeFilter !== "all" ? SearchX : PiggyBank} title={search || typeFilter !== "all" ? "No matching accounts" : "Build your savings system"} description={search || typeFilter !== "all" ? "Try changing your search or account-type filter." : "Create separate accounts for an emergency fund, investments, or anything you want to protect."} action={!search && typeFilter === "all" ? <Button icon={Plus} onClick={openCreate}>Create account</Button> : undefined} /></section>}

      <Modal open={accountOpen} onClose={() => setAccountOpen(false)} title={editing ? "Edit savings account" : "New savings account"} eyebrow="ACCOUNT DETAILS" footer={<><Button variant="secondary" onClick={() => setAccountOpen(false)}>Cancel</Button><Button loading={busy} onClick={() => (document.getElementById("account-form") as HTMLFormElement | null)?.requestSubmit()}>{editing ? "Save changes" : "Create account"}</Button></>}>
        <form id="account-form" className="form-grid" onSubmit={submitAccount}><Field label="Account name" className="field--wide"><Input value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} placeholder="e.g. Emergency fund" maxLength={80} required /></Field><Field label="Account type"><Select value={accountForm.account_type} onChange={(event) => setAccountForm({ ...accountForm, account_type: event.target.value as SavingsAccount["account_type"] })}><option value="savings">Savings</option><option value="money_market">Money market</option><option value="investment">Investment</option><option value="cash">Cash</option></Select></Field><Field label="Institution"><Input value={accountForm.institution} onChange={(event) => setAccountForm({ ...accountForm, institution: event.target.value })} placeholder="Optional" maxLength={100} /></Field><div className="field--wide"><ColorInput value={accountForm.color} onChange={(color) => setAccountForm({ ...accountForm, color })} /></div></form>
      </Modal>

      <Modal open={Boolean(moneyAction)} onClose={() => setMoneyAction(null)} title={moneyAction === "deposit" ? "Deposit to savings" : moneyAction === "withdraw" ? "Withdraw from savings" : "Transfer between accounts"} eyebrow="MONEY MOVEMENT" footer={<><Button variant="secondary" onClick={() => setMoneyAction(null)}>Cancel</Button><Button loading={busy} onClick={() => (document.getElementById("savings-action-form") as HTMLFormElement | null)?.requestSubmit()}>{moneyAction === "deposit" ? "Record deposit" : moneyAction === "withdraw" ? "Record withdrawal" : "Transfer money"}</Button></>}>
        <form id="savings-action-form" className="form-grid" onSubmit={submitAction}><Field label={moneyAction === "transfer" ? "From account" : "Savings account"} className={moneyAction === "transfer" ? "" : "field--wide"}><Select value={actionForm.from} onChange={(event) => { setActionForm({ ...actionForm, from: event.target.value }); setActionError(""); }} required><option value="" disabled>Select account</option>{data.savingsAccounts.map((account) => <option value={account.id} key={account.id}>{account.name} · {formatCurrency(account.balance, currency)}</option>)}</Select></Field>{moneyAction === "transfer" && <Field label="To account"><Select value={actionForm.to} onChange={(event) => setActionForm({ ...actionForm, to: event.target.value })} required><option value="" disabled>Select destination</option>{data.savingsAccounts.filter((account) => account.id !== actionForm.from).map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</Select></Field>}<Field label="Amount"><MoneyInput currency={currency} value={actionForm.amount} onChange={(event) => { setActionForm({ ...actionForm, amount: event.target.value }); setActionError(""); }} required /></Field><Field label="Date"><Input type="date" value={actionForm.date} onChange={(event) => setActionForm({ ...actionForm, date: event.target.value })} required /></Field>{actionError && <p className="form-error field--wide">{actionError}</p>}<Field label="Notes" className="field--wide"><Textarea rows={3} value={actionForm.notes} onChange={(event) => setActionForm({ ...actionForm, notes: event.target.value })} placeholder="Optional details" /></Field>{moneyAction === "transfer" && <p className="form-note field--wide"><ArrowLeftRight />One transfer transaction moves the money. It does not change total savings or available balance.</p>}</form>
      </Modal>

      <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} busy={busy} title="Delete savings account?" description={deleteTarget?.balance ? `“${deleteTarget.name}” still has ${formatCurrency(deleteTarget.balance, currency)}. Withdraw or transfer the full balance before deleting it.` : `This removes “${deleteTarget?.name || "this account"}”. Past transactions stay in your history.`} />
    </div>
  );
}
