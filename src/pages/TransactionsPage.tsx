import { ArrowDownLeft, ArrowUpRight, Download, Plus, SearchX, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, PageHeader, SearchInput, Select, SortSelect } from "../components/ui";
import { TransactionRow } from "../components/TransactionRow";
import { useBudgetData } from "../hooks/useBudgetData";
import { formatCurrency, humanize } from "../lib/format";

function csvEscape(value: unknown) { const text = String(value ?? ""); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }

export function TransactionsPage() {
  const { data } = useBudgetData();
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
      .filter((item) => !query || item.description.toLowerCase().includes(query) || item.notes?.toLowerCase().includes(query) || humanize(item.type).toLowerCase().includes(query))
      .filter((item) => typeFilter === "all" || item.type === typeFilter || (typeFilter === "savings" && item.type.startsWith("savings")) || (typeFilter === "goals" && item.type.startsWith("goal")))
      .filter((item) => monthFilter === "all" || item.transaction_date.startsWith(monthFilter))
      .sort((a, b) => sort === "amount-desc" ? b.amount - a.amount : sort === "amount-asc" ? a.amount - b.amount : sort === "date-asc" ? a.transaction_date.localeCompare(b.transaction_date) || a.created_at.localeCompare(b.created_at) : b.transaction_date.localeCompare(a.transaction_date) || b.created_at.localeCompare(a.created_at));
  }, [data, monthFilter, search, sort, typeFilter]);
  const months = useMemo(() => [...new Set(data?.transactions.map((item) => item.transaction_date.slice(0, 7)) || [])].sort().reverse(), [data]);
  if (!data) return null;
  const inflow = rows.filter((item) => item.type === "income" || item.type.endsWith("withdrawal")).reduce((sum, item) => sum + Number(item.amount), 0);
  const outflow = rows.filter((item) => item.type === "expense" || item.type.endsWith("deposit")).reduce((sum, item) => sum + Number(item.amount), 0);

  function exportCsv() {
    const header = ["Date", "Type", "Description", "Amount", "Notes"];
    const lines = rows.map((item) => [item.transaction_date, item.type, item.description, item.amount, item.notes || ""].map(csvEscape).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `northstar-transactions-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="page transactions-page">
      <PageHeader eyebrow="COMPLETE LEDGER" title="Transactions" description="Every financial event in one audit-friendly timeline—without counting transfers twice." actions={<div className="split-action"><button className="button button--secondary" onClick={exportCsv} disabled={!rows.length}><Download />Export CSV</button><button className="button button--primary" onClick={() => setAddOpen((value) => !value)}><Plus />Add activity</button>{addOpen && <><button className="popover-scrim" aria-label="Close add menu" onClick={() => setAddOpen(false)} /><div className="add-menu"><span>What would you like to record?</span><Link to="/income"><ArrowDownLeft />Income<small>Salary or other earnings</small></Link><Link to="/expenses"><ArrowUpRight />Expense<small>Purchase, bill, or payment</small></Link><Link to="/savings"><WalletCards />Savings activity<small>Deposit, withdraw, or transfer</small></Link><Link to="/goals"><Plus />Goal activity<small>Add or withdraw goal money</small></Link></div></>}</div>} />
      <section className="transaction-summary"><div><span>Transactions shown</span><strong>{rows.length}</strong></div><div className="inflow"><span><ArrowDownLeft />Inflows</span><strong>{formatCurrency(inflow, currency)}</strong></div><div className="outflow"><span><ArrowUpRight />Outflows</span><strong>{formatCurrency(outflow, currency)}</strong></div><p>Transfers between savings accounts are neutral and excluded from both figures.</p></section>
      <section className="toolbar"><SearchInput value={search} onChange={setSearch} placeholder="Search transactions…" /><div className="toolbar-filters"><Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">All transaction types</option><option value="income">Income</option><option value="expense">Expenses</option><option value="savings">All savings activity</option><option value="goals">All goal activity</option><option value="savings_deposit">Savings deposits</option><option value="savings_withdrawal">Savings withdrawals</option><option value="savings_transfer">Savings transfers</option><option value="goal_deposit">Goal deposits</option><option value="goal_withdrawal">Goal withdrawals</option></Select><Select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}><option value="all">All months</option>{months.map((month) => <option key={month} value={month}>{new Date(`${month}-02`).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</option>)}</Select><SortSelect value={sort} onChange={setSort}><option value="date-desc">Newest first</option><option value="date-asc">Oldest first</option><option value="amount-desc">Highest amount</option><option value="amount-asc">Lowest amount</option></SortSelect></div></section>
      <section className="data-panel transaction-history">{rows.length ? <><div className="transaction-date-head"><span>Activity</span><span>Amount</span></div><div className="transaction-list">{rows.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} currency={currency} />)}</div></> : <EmptyState icon={search || typeFilter !== "all" || monthFilter !== "all" ? SearchX : WalletCards} title={search || typeFilter !== "all" || monthFilter !== "all" ? "No matching transactions" : "Your ledger is ready"} description={search || typeFilter !== "all" || monthFilter !== "all" ? "Try adjusting your search or filters." : "Add income, an expense, savings, or a goal contribution and it will appear here automatically."} />}</section>
    </div>
  );
}
