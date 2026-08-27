import { ArrowRight } from "lucide-react";
import { formatCurrency, formatDate, humanize } from "../lib/format";
import { TransactionIconGlyph } from "./icons";
import type { Transaction } from "../types";

function direction(type: Transaction["type"]) {
  if (type === "income" || type === "savings_withdrawal" || type === "goal_withdrawal") return "positive";
  if (type === "savings_transfer") return "neutral";
  return "negative";
}

export function TransactionRow({ transaction, currency, showType = true }: { transaction: Transaction; currency: string; showType?: boolean }) {
  const tone = direction(transaction.type);
  return (
    <div className="transaction-row">
      <span className={`transaction-icon transaction-icon--${tone}`}><TransactionIconGlyph type={transaction.type} /></span>
      <div className="transaction-main"><strong>{transaction.description}</strong><span>{formatDate(transaction.transaction_date)}{showType ? ` · ${humanize(transaction.type)}` : ""}</span></div>
      {transaction.type === "savings_transfer" && <ArrowRight className="transaction-transfer" />}
      <strong className={`transaction-amount transaction-amount--${tone}`}>
        {tone === "positive" ? "+" : tone === "negative" ? "−" : ""}{formatCurrency(transaction.amount, currency)}
      </strong>
    </div>
  );
}
