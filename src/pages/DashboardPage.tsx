import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CircleDollarSign,
  Landmark,
  PiggyBank,
  Plus,
  ReceiptText,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState, PageHeader, StatusPill } from "../components/ui";
import { TransactionRow } from "../components/TransactionRow";
import { useBudgetData } from "../hooks/useBudgetData";
import { calculateTotals, categorySeries, currentMonthSummary, monthlySeries } from "../lib/finance";
import { formatCurrency } from "../lib/format";

function MetricCard({ label, value, note, icon: Icon, tone, featured = false }: { label: string; value: string; note: string; icon: typeof CircleDollarSign; tone: string; featured?: boolean }) {
  return <article className={`metric-card ${featured ? "metric-card--featured" : ""}`}><div className={`metric-icon metric-icon--${tone}`}><Icon /></div><span>{label}</span><strong>{value}</strong><p>{note}</p></article>;
}

export function DashboardPage() {
  const { data } = useBudgetData();
  if (!data) return null;
  const currency = data.profile.currency;
  const totals = calculateTotals(data);
  const monthly = monthlySeries(data);
  const month = currentMonthSummary(data);
  const categories = categorySeries(data.expenses, data);
  const topCategories = categories.slice(0, 5);
  const chartCurrency = (value: number) => formatCurrency(value, currency, true);

  return (
    <div className="page dashboard-page">
      <PageHeader eyebrow="FINANCIAL OVERVIEW" title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${data.profile.full_name.split(" ")[0] || "there"}.`} description="A clear view of everything you’ve earned, spent, and set aside." actions={<Link className="button button--primary" to="/transactions"><Plus />Add money activity</Link>} />

      <section className="metric-grid">
        <MetricCard featured label="Available balance" value={formatCurrency(totals.availableBalance, currency)} note="Income − expenses − savings & goals" icon={WalletCards} tone={totals.availableBalance < 0 ? "red" : "ink"} />
        <MetricCard label="Total income" value={formatCurrency(totals.totalIncome, currency)} note={`${data.income.length} income ${data.income.length === 1 ? "entry" : "entries"}`} icon={CircleDollarSign} tone="green" />
        <MetricCard label="Total expenses" value={formatCurrency(totals.totalExpenses, currency)} note={`${data.expenses.length} recorded ${data.expenses.length === 1 ? "expense" : "expenses"}`} icon={ReceiptText} tone="orange" />
        <MetricCard label="Total savings" value={formatCurrency(totals.totalSavings, currency)} note={`${formatCurrency(totals.goalsAllocated, currency)} is in goals`} icon={PiggyBank} tone="blue" />
        <MetricCard label="Expenses + savings" value={formatCurrency(totals.expensesAndSavings, currency)} note="Total income already committed" icon={Landmark} tone="purple" />
      </section>

      <section className="dashboard-grid dashboard-grid--main">
        <article className="panel cashflow-panel">
          <header className="panel-header"><div><span className="eyebrow">6-MONTH TREND</span><h2>Money flow</h2></div><div className="chart-legend"><span><i className="legend-income" />Income</span><span><i className="legend-expense" />Expenses</span><span><i className="legend-saving" />Savings</span></div></header>
          {monthly.some((item) => item.income || item.expenses || item.savings) ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly} barGap={4}><CartesianGrid strokeDasharray="3 7" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} tickFormatter={(value) => chartCurrency(Number(value))} width={58} /><Tooltip cursor={{ fill: "var(--chart-hover)" }} formatter={(value) => formatCurrency(Number(value), currency)} labelFormatter={(_label, payload) => payload?.[0]?.payload.fullMonth || ""} contentStyle={{ borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)" }} /><Bar dataKey="income" fill="var(--chart-income)" radius={[6, 6, 2, 2]} /><Bar dataKey="expenses" fill="var(--chart-expense)" radius={[6, 6, 2, 2]} /><Bar dataKey="savings" fill="var(--chart-saving)" radius={[6, 6, 2, 2]} /></BarChart></ResponsiveContainer></div> : <EmptyState icon={Sparkles} title="Your trend starts here" description="Add income, expenses, or savings activity to see monthly patterns." />}
        </article>

        <article className="panel month-panel">
          <header className="panel-header"><div><span className="eyebrow">THIS MONTH</span><h2>{month.label}</h2></div><StatusPill tone={month.net >= 0 ? "positive" : "negative"}>{month.net >= 0 ? "On track" : "Over budget"}</StatusPill></header>
          <div className="month-net"><span>Net cash flow</span><strong>{formatCurrency(month.net, currency)}</strong></div>
          <div className="month-lines"><div><span>Income <small className={month.incomeDelta >= 0 ? "up" : "down"}>{month.incomeDelta >= 0 ? <ArrowUpRight /> : <ArrowDownRight />}{Math.abs(month.incomeDelta).toFixed(0)}%</small></span><strong>{formatCurrency(month.currentIncome, currency)}</strong></div><div><span>Expenses <small className={month.expenseDelta <= 0 ? "up" : "down"}>{month.expenseDelta <= 0 ? <ArrowDownRight /> : <ArrowUpRight />}{Math.abs(month.expenseDelta).toFixed(0)}%</small></span><strong>{formatCurrency(month.currentExpenses, currency)}</strong></div></div>
          <p className="month-caption">Compared with last month</p>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--secondary">
        <article className="panel category-panel">
          <header className="panel-header"><div><span className="eyebrow">ALL-TIME BREAKDOWN</span><h2>Spending by category</h2></div><Link to="/expenses">View expenses <ArrowRight /></Link></header>
          {topCategories.length ? <div className="category-chart-layout"><div className="donut-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categories} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="91%" paddingAngle={3} stroke="none">{categories.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip formatter={(value) => formatCurrency(Number(value), currency)} contentStyle={{ borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)" }} /></PieChart></ResponsiveContainer><div><span>Total spent</span><strong>{formatCurrency(totals.totalExpenses, currency, true)}</strong></div></div><div className="category-legend">{topCategories.map((item) => <div key={item.name}><span><i style={{ backgroundColor: item.color }} />{item.name}</span><strong>{formatCurrency(item.value, currency)}</strong></div>)}</div></div> : <EmptyState icon={ReceiptText} title="No expenses yet" description="Record your first expense to build a category breakdown." />}
        </article>

        <article className="panel recent-panel">
          <header className="panel-header"><div><span className="eyebrow">LATEST ACTIVITY</span><h2>Recent transactions</h2></div><Link to="/transactions">See all <ArrowRight /></Link></header>
          {data.transactions.length ? <div className="transaction-list">{data.transactions.slice(0, 6).map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} currency={currency} showType={false} />)}</div> : <EmptyState icon={WalletCards} title="No transactions yet" description="Your income, expenses, transfers, and allocations will appear here." />}
        </article>
      </section>
    </div>
  );
}
