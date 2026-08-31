import { ArrowDownLeft, ArrowUpRight, Download, Plus, SearchX, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, PageHeader, SearchInput, Select, SortSelect } from "../components/ui";
import { TransactionRow } from "../components/TransactionRow";
import { useBudgetData } from "../hooks/useBudgetData";
import { formatCurrency, humanize } from "../lib/format";
import { useLanguage } from "../context/LanguageContext";

function csvEscape(value: unknown) { const text = String(value ?? ""); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }

export function TransactionsPage() {
  const { data } = useBudgetData();
  const { locale, t, number } = useLanguage();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [sort, setSort] = useState("date-desc");
  const [addOpen, setAddOpen] = useState(false);
  const currency = data?.profile.currency || "USD";

  const rows = useMemo(() => {
    if (!data) return [];
    const query = search.toLowerCase().trim();
    return [...data.transactions]
      .filter((item) => !query || item.description.toLowerCase().includes(query) || item.notes?.toLowerCase().includes(query) || t(humanize(item.type)).toLowerCase().includes(query))
      .filter((item) => typeFilter === "all" || item.type === typeFilter || (typeFilter === "savings" && item.type.startsWith("savings")) || (typeFilter === "goals" && item.type.startsWith("goal")))
      .filter((item) => monthFilter === "all" || item.transaction_date.startsWith(monthFilter))
      .sort((a, b) => sort === "amount-desc" ? b.amount - a.amount : sort === "amount-asc" ? a.amount - b.amount : sort === "date-asc" ? a.transaction_date.localeCompare(b.transaction_date) || a.created_at.localeCompare(b.created_at) : b.transaction_date.localeCompare(a.transaction_date) || b.created_at.localeCompare(a.created_at));
  }, [data, monthFilter, search, sort, t, typeFilter]);
  const months = useMemo(() => [...new Set(data?.transactions.map((item) => item.transaction_date.slice(0, 7)) || [])].sort().reverse(), [data]);
  if (!data) return null;
  const inflow = rows.filter((item) => item.type === "income" || item.type.endsWith("withdrawal")).reduce((sum, item) => sum + Number(item.amount), 0);
  const outflow = rows.filter((item) => item.type === "expense" || item.type.endsWith("deposit")).reduce((sum, item) => sum + Number(item.amount), 0);

  function exportCsv() {
    const header = [t("Date"), t("Type"), t("Description"), t("Amount"), t("Notes")];
    const lines = rows.map((item) => [item.transaction_date, t(humanize(item.type)), item.description, item.amount, item.notes || ""].map(csvEscape).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `northstar-transactions-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="page transactions-page">
      <PageHeader eyebrow={t("COMPLETE LEDGER")} title={t("Transactions")} description={t("Every financial event in one audit-friendly timeline—without counting transfers twice.")} actions={<div className="split-action"><button className="button button--secondary" onClick={exportCsv} disabled={!rows.length}><Download />{t("Export CSV")}</button><button className="button button--primary" onClick={() => setAddOpen((value) => !value)}><Plus />{t("Add activity")}</button>{addOpen && <><button className="popover-scrim" aria-label={t("Close add menu")} onClick={() => setAddOpen(false)} /><div className="add-menu"><span>{t("What would you like to record?")}</span><Link to="/income"><ArrowDownLeft />{t("Income")}<small>{t("Salary or other earnings")}</small></Link><Link to="/expenses"><ArrowUpRight />{t("Expense")}<small>{t("Purchase, bill, or payment")}</small></Link><Link to="/savings"><WalletCards />{t("Savings activity")}<small>{t("Deposit, withdraw, or transfer")}</small></Link><Link to="/goals"><Plus />{t("Goal activity")}<small>{t("Add or withdraw goal money")}</small></Link></div></>}</div>} />
      <section className="transaction-summary"><div><span>{t("Transactions shown")}</span><strong>{number(rows.length)}</strong></div><div className="inflow"><span><ArrowDownLeft />{t("Inflows")}</span><strong>{formatCurrency(inflow, currency)}</strong></div><div className="outflow"><span><ArrowUpRight />{t("Outflows")}</span><strong>{formatCurrency(outflow, currency)}</strong></div><p>{t("Transfers between savings accounts are neutral and excluded from both figures.")}</p></section>
      <section className="toolbar"><SearchInput value={search} onChange={setSearch} placeholder={t("Search transactions…")} /><div className="toolbar-filters"><Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">{t("All transaction types")}</option><option value="income">{t("Income")}</option><option value="expense">{t("Expenses")}</option><option value="savings">{t("All savings activity")}</option><option value="goals">{t("All goal activity")}</option><option value="savings_deposit">{t("Savings deposits")}</option><option value="savings_withdrawal">{t("Savings withdrawals")}</option><option value="savings_transfer">{t("Savings transfers")}</option><option value="goal_deposit">{t("Goal deposits")}</option><option value="goal_withdrawal">{t("Goal withdrawals")}</option></Select><Select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}><option value="all">{t("All months")}</option>{months.map((month) => <option key={month} value={month}>{new Date(`${month}-02`).toLocaleDateString(locale, { month: "long", year: "numeric" })}</option>)}</Select><SortSelect value={sort} onChange={setSort}><option value="date-desc">{t("Newest first")}</option><option value="date-asc">{t("Oldest first")}</option><option value="amount-desc">{t("Highest amount")}</option><option value="amount-asc">{t("Lowest amount")}</option></SortSelect></div></section>
      <section className="data-panel transaction-history">{rows.length ? <><div className="transaction-date-head"><span>{t("Activity")}</span><span>{t("Amount")}</span></div><div className="transaction-list">{rows.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} currency={currency} />)}</div></> : <EmptyState icon={search || typeFilter !== "all" || monthFilter !== "all" ? SearchX : WalletCards} title={t(search || typeFilter !== "all" || monthFilter !== "all" ? "No matching transactions" : "Your ledger is ready")} description={t(search || typeFilter !== "all" || monthFilter !== "all" ? "Try adjusting your search or filters." : "Add income, an expense, savings, or a goal contribution and it will appear here automatically.")} />}</section>
    </div>
  );
}
