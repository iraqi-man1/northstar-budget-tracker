import { describe, expect, it } from "vitest";
import { calculateTotals, monthlySeries } from "./finance";
import type { BudgetData, Transaction } from "../types";

function fixture(): BudgetData {
  return {
    profile: { user_id: "u", full_name: "Test", avatar_url: null, currency: "USD", theme: "system", language: "en", created_at: "", updated_at: "" },
    incomeSources: [], categories: [],
    income: [
      { id: "i1", user_id: "u", source_id: null, amount: 5000, received_on: new Date().toISOString().slice(0, 10), description: "Salary", notes: null, created_at: "", updated_at: "" },
    ],
    expenses: [
      { id: "e1", user_id: "u", category_id: null, amount: 1200, spent_on: new Date().toISOString().slice(0, 10), merchant: "Rent", notes: null, created_at: "", updated_at: "" },
    ],
    savingsAccounts: [
      { id: "s1", user_id: "u", name: "One", account_type: "savings", institution: null, color: "#000000", balance: 700, created_at: "", updated_at: "" },
      { id: "s2", user_id: "u", name: "Two", account_type: "savings", institution: null, color: "#000000", balance: 300, created_at: "", updated_at: "" },
    ],
    goals: [
      { id: "g1", user_id: "u", name: "Trip", target_amount: 2000, current_amount: 400, target_date: null, color: "#000000", status: "active", created_at: "", updated_at: "" },
    ],
    transactions: [],
  };
}

function transaction(type: Transaction["type"], amount: number): Transaction {
  return { id: `${type}-${amount}`, user_id: "u", type, amount, transaction_date: new Date().toISOString().slice(0, 10), description: type, notes: null, income_id: null, expense_id: null, savings_account_id: null, destination_savings_account_id: null, goal_id: null, metadata: {}, created_at: new Date().toISOString() };
}

describe("financial calculations", () => {
  it("deducts expenses, savings accounts, and goal allocations from available balance", () => {
    const totals = calculateTotals(fixture());
    expect(totals.totalIncome).toBe(5000);
    expect(totals.totalExpenses).toBe(1200);
    expect(totals.totalSavings).toBe(1400);
    expect(totals.availableBalance).toBe(2400);
    expect(totals.expensesAndSavings).toBe(2600);
  });

  it("does not use transfer ledger rows when calculating balances", () => {
    const data = fixture();
    data.transactions = [transaction("savings_transfer", 9999)];
    expect(calculateTotals(data).availableBalance).toBe(2400);
    expect(monthlySeries(data).at(-1)?.savings).toBe(0);
  });

  it("nets deposits and withdrawals in monthly savings flow without double-counting transfers", () => {
    const data = fixture();
    data.transactions = [
      transaction("savings_deposit", 500),
      transaction("goal_deposit", 300),
      transaction("savings_withdrawal", 100),
      transaction("goal_withdrawal", 50),
      transaction("savings_transfer", 250),
    ];
    expect(monthlySeries(data).at(-1)?.savings).toBe(650);
  });
});
