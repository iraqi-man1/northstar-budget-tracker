import {
  eachMonthOfInterval,
  endOfMonth,
  isSameMonth,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import type { BudgetData, Expense } from "../types";
import { formatMonth } from "./format";

const sum = (values: number[]) => values.reduce((total, value) => total + Number(value || 0), 0);

export function calculateTotals(data: BudgetData) {
  const totalIncome = sum(data.income.map((item) => item.amount));
  const totalExpenses = sum(data.expenses.map((item) => item.amount));
  const savingsAllocated = sum(data.savingsAccounts.map((item) => item.balance));
  const goalsAllocated = sum(data.goals.map((item) => item.current_amount));
  const totalSavings = savingsAllocated + goalsAllocated;
  const availableBalance = totalIncome - totalExpenses - totalSavings;
  return {
    totalIncome,
    totalExpenses,
    savingsAllocated,
    goalsAllocated,
    totalSavings,
    availableBalance,
    expensesAndSavings: totalExpenses + totalSavings,
  };
}

export function monthlySeries(data: BudgetData, months = 6) {
  const now = new Date();
  const range = eachMonthOfInterval({ start: startOfMonth(subMonths(now, months - 1)), end: endOfMonth(now) });
  return range.map((month) => {
    const income = sum(data.income.filter((item) => isSameMonth(parseISO(item.received_on), month)).map((item) => item.amount));
    const expenses = sum(data.expenses.filter((item) => isSameMonth(parseISO(item.spent_on), month)).map((item) => item.amount));
    const savings = sum(
      data.transactions
        .filter((item) => isSameMonth(parseISO(item.transaction_date), month))
        .map((item) => {
          if (item.type === "savings_deposit" || item.type === "goal_deposit") return item.amount;
          if (item.type === "savings_withdrawal" || item.type === "goal_withdrawal") return -item.amount;
          return 0;
        }),
    );
    return { month: formatMonth(month), fullMonth: formatMonth(month, true), income, expenses, savings };
  });
}

export function currentMonthSummary(data: BudgetData) {
  const now = new Date();
  const previous = subMonths(now, 1);
  const currentIncome = sum(data.income.filter((item) => isSameMonth(parseISO(item.received_on), now)).map((item) => item.amount));
  const previousIncome = sum(data.income.filter((item) => isSameMonth(parseISO(item.received_on), previous)).map((item) => item.amount));
  const currentExpenses = sum(data.expenses.filter((item) => isSameMonth(parseISO(item.spent_on), now)).map((item) => item.amount));
  const previousExpenses = sum(data.expenses.filter((item) => isSameMonth(parseISO(item.spent_on), previous)).map((item) => item.amount));
  const delta = (current: number, prior: number) => (prior === 0 ? (current > 0 ? 100 : 0) : ((current - prior) / prior) * 100);
  return {
    label: formatMonth(now, true),
    currentIncome,
    currentExpenses,
    net: currentIncome - currentExpenses,
    incomeDelta: delta(currentIncome, previousIncome),
    expenseDelta: delta(currentExpenses, previousExpenses),
  };
}

export function categorySeries(expenses: Expense[], data: BudgetData) {
  const totals = new Map<string, number>();
  for (const expense of expenses) {
    const category = data.categories.find((item) => item.id === expense.category_id);
    const name = category?.name || "Uncategorized";
    totals.set(name, (totals.get(name) || 0) + Number(expense.amount));
  }
  return [...totals.entries()]
    .map(([name, value]) => ({
      name,
      value,
      color: data.categories.find((item) => item.name === name)?.color || "#89928f",
    }))
    .sort((a, b) => b.value - a.value);
}
