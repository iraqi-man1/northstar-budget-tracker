export type ThemePreference = "light" | "dark" | "system";
export type AppLanguage = "en" | "ar";

export interface Profile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  currency: string;
  theme: ThemePreference;
  language: AppLanguage;
  created_at: string;
  updated_at: string;
}

export interface IncomeSource {
  id: string;
  user_id: string;
  name: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface IncomeEntry {
  id: string;
  user_id: string;
  source_id: string | null;
  amount: number;
  received_on: string;
  description: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  spent_on: string;
  merchant: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavingsAccount {
  id: string;
  user_id: string;
  name: string;
  account_type: "savings" | "money_market" | "investment" | "cash";
  institution: string | null;
  color: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  color: string;
  status: "active" | "completed";
  created_at: string;
  updated_at: string;
}

export type TransactionType =
  | "income"
  | "expense"
  | "savings_deposit"
  | "savings_withdrawal"
  | "savings_transfer"
  | "goal_deposit"
  | "goal_withdrawal";

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  transaction_date: string;
  description: string;
  notes: string | null;
  income_id: string | null;
  expense_id: string | null;
  savings_account_id: string | null;
  destination_savings_account_id: string | null;
  goal_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface BudgetData {
  profile: Profile;
  incomeSources: IncomeSource[];
  categories: ExpenseCategory[];
  income: IncomeEntry[];
  expenses: Expense[];
  savingsAccounts: SavingsAccount[];
  goals: Goal[];
  transactions: Transaction[];
}

export const currencies = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "IQD", name: "Iraqi Dinar", symbol: "IQD" },
] as const;
