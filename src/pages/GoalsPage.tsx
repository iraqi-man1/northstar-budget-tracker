import { ArrowDownToLine, ArrowUpFromLine, CalendarDays, CheckCircle2, Flag, Goal as GoalIcon, MoreHorizontal, Pencil, Plus, SearchX, Sparkles, Trash2 } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { useMemo, useState, type FormEvent } from "react";
import { Button, ColorInput, ConfirmDialog, EmptyState, Field, IconButton, Input, Modal, MoneyInput, PageHeader, SearchInput, Select, SortSelect, Textarea } from "../components/ui";
import { useAction } from "../hooks/useAction";
import { useBudgetData } from "../hooks/useBudgetData";
import { callRpc } from "../lib/api";
import { calculateTotals } from "../lib/finance";
import { formatCurrency, formatDate, percent, todayISO } from "../lib/format";
import type { Goal } from "../types";
import { useLanguage } from "../context/LanguageContext";

interface GoalForm { name: string; target_amount: string; target_date: string; color: string }
interface GoalMoneyForm { goal_id: string; amount: string; date: string; notes: string }
const emptyGoal = (): GoalForm => ({ name: "", target_amount: "", target_date: "", color: "#EE8D5A" });
const emptyMoney = (): GoalMoneyForm => ({ goal_id: "", amount: "", date: todayISO(), notes: "" });

export function GoalsPage() {
  const { data } = useBudgetData();
  const { busy, run } = useAction();
  const { t, number } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("date");
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState<GoalForm>(emptyGoal);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);
  const [moneyAction, setMoneyAction] = useState<"deposit" | "withdraw" | null>(null);
  const [moneyForm, setMoneyForm] = useState<GoalMoneyForm>(emptyMoney);
  const [moneyError, setMoneyError] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const currency = data?.profile.currency || "USD";

  const goals = useMemo(() => {
    if (!data) return [];
    const query = search.toLowerCase().trim();
    return [...data.goals]
      .filter((goal) => !query || goal.name.toLowerCase().includes(query))
      .filter((goal) => statusFilter === "all" || goal.status === statusFilter)
      .sort((a, b) => sort === "progress-desc" ? percent(b.current_amount, b.target_amount) - percent(a.current_amount, a.target_amount) : sort === "amount-desc" ? b.target_amount - a.target_amount : sort === "name" ? a.name.localeCompare(b.name) : (a.target_date || "9999").localeCompare(b.target_date || "9999"));
  }, [data, search, sort, statusFilter]);
  if (!data) return null;
  const budget = data;
  const totals = calculateTotals(budget);
  const completed = budget.goals.filter((goal) => goal.status === "completed").length;

  function openCreate() { setEditing(null); setGoalForm(emptyGoal()); setGoalOpen(true); }
  function openEdit(goal: Goal) { setEditing(goal); setGoalForm({ name: goal.name, target_amount: String(goal.target_amount), target_date: goal.target_date || "", color: goal.color }); setGoalOpen(true); setOpenMenu(null); }
  function openMoney(action: "deposit" | "withdraw", goal?: Goal) { setMoneyAction(action); setMoneyError(""); setMoneyForm({ ...emptyMoney(), goal_id: goal?.id || budget.goals[0]?.id || "" }); setOpenMenu(null); }
  async function submitGoal(event: FormEvent) {
    event.preventDefault();
    const args = { p_name: goalForm.name, p_target_amount: Number(goalForm.target_amount), p_target_date: goalForm.target_date || null, p_color: goalForm.color };
    try {
      if (editing) await run(() => callRpc("update_goal", { p_id: editing.id, ...args }), "Goal updated");
      else await run(() => callRpc("create_goal", args), "Goal created");
      setGoalOpen(false);
    } catch { /* handled */ }
  }
  async function submitMoney(event: FormEvent) {
    event.preventDefault();
    if (!moneyAction) return;
    const amount = Number(moneyForm.amount);
    const goal = budget.goals.find((item) => item.id === moneyForm.goal_id);
    if (moneyAction === "withdraw" && amount > Number(goal?.current_amount || 0)) { setMoneyError(t("Amount cannot exceed {amount}.", { amount: formatCurrency(goal?.current_amount || 0, currency) })); return; }
    setMoneyError("");
    try {
      if (moneyAction === "deposit") await run(() => callRpc("record_goal_deposit", { p_goal_id: moneyForm.goal_id, p_amount: amount, p_date: moneyForm.date, p_notes: moneyForm.notes }), "Goal contribution recorded");
      else await run(() => callRpc("record_goal_withdrawal", { p_goal_id: moneyForm.goal_id, p_amount: amount, p_date: moneyForm.date, p_notes: moneyForm.notes }), "Goal withdrawal recorded");
      setMoneyAction(null);
    } catch { /* handled */ }
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    try { await run(() => callRpc("delete_goal", { p_id: deleteTarget.id }), "Goal deleted"); setDeleteTarget(null); } catch { /* handled */ }
  }

  return (
    <div className="page">
      <PageHeader eyebrow={t("PLAN WITH PURPOSE")} title={t("Financial goals")} description={t("Turn the things you care about into clear, measurable progress.")} actions={<Button icon={Plus} onClick={openCreate}>{t("New goal")}</Button>} />
      <section className="goal-summary"><div className="goal-summary-main"><span>{t("Allocated to goals")}</span><strong>{formatCurrency(totals.goalsAllocated, currency)}</strong><p>{t("Money here is already deducted from available balance.")}</p></div><div><span>{t("Active goals")}</span><strong>{number(data.goals.length - completed)}</strong></div><div><span>{t("Completed")}</span><strong>{number(completed)}</strong></div></section>
      <section className="toolbar"><SearchInput value={search} onChange={setSearch} placeholder={t("Search goals…")} /><div className="toolbar-filters"><Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">{t("All goals")}</option><option value="active">{t("Active")}</option><option value="completed">{t("Completed")}</option></Select><SortSelect value={sort} onChange={setSort}><option value="date">{t("Target date")}</option><option value="progress-desc">{t("Most progress")}</option><option value="amount-desc">{t("Largest target")}</option><option value="name">{t("Name A–Z")}</option></SortSelect></div></section>

      {goals.length ? <section className="goal-grid">{goals.map((goal) => { const progress = percent(goal.current_amount, goal.target_amount); const remaining = Math.max(0, goal.target_amount - goal.current_amount); const days = goal.target_date ? differenceInDays(parseISO(goal.target_date), new Date()) : null; return <article className={`goal-card ${goal.status === "completed" ? "goal-card--completed" : ""}`} key={goal.id}><header><span className="goal-card-icon" style={{ color: goal.color, backgroundColor: `${goal.color}18` }}>{goal.status === "completed" ? <CheckCircle2 /> : <Flag />}</span><div className="account-menu"><IconButton label={t("Goal actions")} onClick={() => setOpenMenu(openMenu === goal.id ? null : goal.id)}><MoreHorizontal /></IconButton>{openMenu === goal.id && <><button className="popover-scrim" onClick={() => setOpenMenu(null)} aria-label={t("Close menu")} /><div className="row-menu"><button onClick={() => openEdit(goal)}><Pencil />{t("Edit goal")}</button><button className="danger" onClick={() => { setDeleteTarget(goal); setOpenMenu(null); }}><Trash2 />{t("Delete")}</button></div></>}</div></header><div className="goal-name"><span>{t(goal.status === "completed" ? "Goal reached" : "In progress")}</span><h2>{goal.name}</h2>{goal.target_date ? <p><CalendarDays />{formatDate(goal.target_date)}{days !== null && days >= 0 ? ` · ${t("{count} days left", { count: number(days) })}` : days !== null ? ` · ${t("Past due")}` : ""}</p> : <p><Sparkles />{t("No deadline—go at your pace")}</p>}</div><div className="progress-block"><div><span>{formatCurrency(goal.current_amount, currency)}</span><strong>{number(Math.round(progress))}%</strong></div><div className="progress-track"><i style={{ width: `${progress}%`, backgroundColor: goal.color }} /></div><p>{goal.status === "completed" ? t("{amount} saved in total", { amount: formatCurrency(goal.current_amount, currency) }) : t("{remaining} left of {target}", { remaining: formatCurrency(remaining, currency), target: formatCurrency(goal.target_amount, currency) })}</p></div><footer><Button variant="secondary" icon={ArrowDownToLine} onClick={() => openMoney("deposit", goal)}>{t("Add money")}</Button><Button variant="ghost" icon={ArrowUpFromLine} disabled={goal.current_amount <= 0} onClick={() => openMoney("withdraw", goal)}>{t("Withdraw")}</Button></footer></article>; })}</section> : <section className="data-panel"><EmptyState icon={search || statusFilter !== "all" ? SearchX : GoalIcon} title={t(search || statusFilter !== "all" ? "No matching goals" : "Give your money a destination")} description={t(search || statusFilter !== "all" ? "Try adjusting your search or status filter." : "Create a goal for a trip, a home, an emergency fund, or the next thing that matters.")} action={!search && statusFilter === "all" ? <Button icon={Plus} onClick={openCreate}>{t("Create a goal")}</Button> : undefined} /></section>}

      <Modal open={goalOpen} onClose={() => setGoalOpen(false)} title={t(editing ? "Edit financial goal" : "New financial goal")} eyebrow={t("GOAL DETAILS")} footer={<><Button variant="secondary" onClick={() => setGoalOpen(false)}>{t("Cancel")}</Button><Button loading={busy} onClick={() => (document.getElementById("goal-form") as HTMLFormElement | null)?.requestSubmit()}>{t(editing ? "Save changes" : "Create goal")}</Button></>}>
        <form id="goal-form" className="form-grid" onSubmit={submitGoal}><Field label={t("Goal name")} className="field--wide"><Input value={goalForm.name} onChange={(event) => setGoalForm({ ...goalForm, name: event.target.value })} placeholder={t("e.g. Japan trip")} maxLength={100} required /></Field><Field label={t("Target amount")}><MoneyInput currency={currency} value={goalForm.target_amount} onChange={(event) => setGoalForm({ ...goalForm, target_amount: event.target.value })} required /></Field><Field label={t("Target date")} hint={t("Optional")}><Input type="date" min={todayISO()} value={goalForm.target_date} onChange={(event) => setGoalForm({ ...goalForm, target_date: event.target.value })} /></Field><div className="field--wide"><ColorInput value={goalForm.color} onChange={(color) => setGoalForm({ ...goalForm, color })} /></div></form>
      </Modal>

      <Modal open={Boolean(moneyAction)} onClose={() => setMoneyAction(null)} title={t(moneyAction === "deposit" ? "Add money to a goal" : "Withdraw from a goal")} eyebrow={t("GOAL ACTIVITY")} footer={<><Button variant="secondary" onClick={() => setMoneyAction(null)}>{t("Cancel")}</Button><Button loading={busy} onClick={() => (document.getElementById("goal-money-form") as HTMLFormElement | null)?.requestSubmit()}>{t(moneyAction === "deposit" ? "Add money" : "Withdraw money")}</Button></>}>
        <form id="goal-money-form" className="form-grid" onSubmit={submitMoney}><Field label={t("Financial goal")} className="field--wide"><Select value={moneyForm.goal_id} onChange={(event) => { setMoneyForm({ ...moneyForm, goal_id: event.target.value }); setMoneyError(""); }} required><option value="" disabled>{t("Select goal")}</option>{data.goals.map((goal) => <option value={goal.id} key={goal.id}>{goal.name} · {t("{amount} saved", { amount: formatCurrency(goal.current_amount, currency) })}</option>)}</Select></Field><Field label={t("Amount")}><MoneyInput currency={currency} value={moneyForm.amount} onChange={(event) => { setMoneyForm({ ...moneyForm, amount: event.target.value }); setMoneyError(""); }} required /></Field><Field label={t("Date")}><Input type="date" value={moneyForm.date} onChange={(event) => setMoneyForm({ ...moneyForm, date: event.target.value })} required /></Field>{moneyError && <p className="form-error field--wide">{moneyError}</p>}<Field label={t("Notes")} className="field--wide"><Textarea rows={3} value={moneyForm.notes} onChange={(event) => setMoneyForm({ ...moneyForm, notes: event.target.value })} placeholder={t("Optional details")} /></Field></form>
      </Modal>
      <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} busy={busy} title={t("Delete financial goal?")} description={deleteTarget?.current_amount ? t("“{name}” still has {amount} allocated. Withdraw that money before deleting the goal.", { name: deleteTarget.name, amount: formatCurrency(deleteTarget.current_amount, currency) }) : t("This removes “{name}”. Past transactions stay in your history.", { name: deleteTarget?.name || t("this goal") })} />
    </div>
  );
}
