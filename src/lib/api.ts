import type { User } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import type { BudgetData, ExpenseCategory, IncomeSource, Profile, ThemePreference } from "../types";

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, fallback?: T): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data == null && fallback !== undefined) return fallback;
  if (result.data == null) throw new Error("The server returned no data.");
  return result.data;
}

export async function ensureProfile(user: User) {
  const client = getSupabase();
  const existing = await client.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return existing.data as Profile;
  const fullName = user.user_metadata.full_name || user.user_metadata.name || user.email?.split("@")[0] || "";
  const created = await client
    .from("profiles")
    .insert({ user_id: user.id, full_name: fullName, avatar_url: user.user_metadata.avatar_url || null })
    .select("*")
    .single();
  return unwrap(created) as Profile;
}

export async function fetchBudgetData(user: User): Promise<BudgetData> {
  const client = getSupabase();
  const [profile, incomeSources, categories, income, expenses, savingsAccounts, goals, transactions] = await Promise.all([
    ensureProfile(user),
    client.from("income_sources").select("*").order("name"),
    client.from("expense_categories").select("*").order("name"),
    client.from("income").select("*").order("received_on", { ascending: false }),
    client.from("expenses").select("*").order("spent_on", { ascending: false }),
    client.from("savings_accounts").select("*").order("created_at"),
    client.from("goals").select("*").order("target_date", { ascending: true, nullsFirst: false }),
    client.from("transactions").select("*").order("transaction_date", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  return {
    profile,
    incomeSources: unwrap(incomeSources, []) as IncomeSource[],
    categories: unwrap(categories, []) as ExpenseCategory[],
    income: unwrap(income, []),
    expenses: unwrap(expenses, []),
    savingsAccounts: unwrap(savingsAccounts, []),
    goals: unwrap(goals, []),
    transactions: unwrap(transactions, []),
  } as BudgetData;
}

export async function callRpc(name: string, args: Record<string, unknown>) {
  const result = await getSupabase().rpc(name, args);
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export async function updateProfile(userId: string, values: { full_name: string; currency: string; theme: ThemePreference }) {
  const result = await getSupabase().from("profiles").update(values).eq("user_id", userId).select("*").single();
  return unwrap(result) as Profile;
}

export async function createCategory(userId: string, values: Pick<ExpenseCategory, "name" | "icon" | "color">) {
  const result = await getSupabase().from("expense_categories").insert({ user_id: userId, ...values }).select("*").single();
  return unwrap(result) as ExpenseCategory;
}

export async function updateCategory(id: string, values: Pick<ExpenseCategory, "name" | "icon" | "color">) {
  const result = await getSupabase().from("expense_categories").update(values).eq("id", id).select("*").single();
  return unwrap(result) as ExpenseCategory;
}

export async function deleteCategory(id: string) {
  const result = await getSupabase().from("expense_categories").delete().eq("id", id);
  if (result.error) throw new Error(result.error.message);
}

export async function createIncomeSource(userId: string, values: Pick<IncomeSource, "name" | "color" | "is_active">) {
  const result = await getSupabase().from("income_sources").insert({ user_id: userId, ...values }).select("*").single();
  return unwrap(result) as IncomeSource;
}

export async function updateIncomeSource(id: string, values: Pick<IncomeSource, "name" | "color" | "is_active">) {
  const result = await getSupabase().from("income_sources").update(values).eq("id", id).select("*").single();
  return unwrap(result) as IncomeSource;
}

export async function deleteIncomeSource(id: string) {
  const result = await getSupabase().from("income_sources").delete().eq("id", id);
  if (result.error) throw new Error(result.error.message);
}
