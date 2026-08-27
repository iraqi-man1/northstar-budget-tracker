import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Car,
  CircleDollarSign,
  Goal as GoalIcon,
  HeartPulse,
  House,
  Landmark,
  PiggyBank,
  Receipt,
  Shapes,
  ShoppingBag,
  Sparkles,
  Utensils,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { TransactionType } from "../types";

const categoryIcons: Record<string, LucideIcon> = {
  house: House,
  utensils: Utensils,
  car: Car,
  "shopping-bag": ShoppingBag,
  "heart-pulse": HeartPulse,
  receipt: Receipt,
  sparkles: Sparkles,
  shapes: Shapes,
};

export function categoryIcon(name: string): LucideIcon {
  return categoryIcons[name] || Shapes;
}

export const categoryIconOptions = Object.keys(categoryIcons);

export function TransactionIconGlyph({ type }: { type: TransactionType }) {
  if (type === "income") return <ArrowDownLeft />;
  if (type === "expense") return <ArrowUpRight />;
  if (type === "savings_transfer") return <ArrowLeftRight />;
  if (type.startsWith("savings")) return <PiggyBank />;
  if (type.startsWith("goal")) return <GoalIcon />;
  return <CircleDollarSign />;
}

export function accountIcon(type: string): LucideIcon {
  if (type === "investment") return Landmark;
  if (type === "cash") return WalletCards;
  return PiggyBank;
}
