import { ArrowRight } from "lucide-react";
import { formatCurrency, formatDate, humanize } from "../lib/format";
import { TransactionIconGlyph } from "./icons";
import type { Transaction } from "../types";
import { useLanguage } from "../context/LanguageContext";

function direction(type: Transaction["type"]) {
  if (type === "income" || type === "savings_withdrawal" || type === "goal_withdrawal") return "positive";
  if (type === "savings_transfer") return "neutral";
  return "negative";
}

export function TransactionRow({ transaction, currency, showType = true }: { transaction: Transaction; currency: string; showType?: boolean }) {
  const { language, t } = useLanguage();
  const tone = direction(transaction.type);
  let description = transaction.description;
  if (language === "ar") {
    if (transaction.type === "savings_deposit") description = description.replace(/^Deposit to /, "إيداع في ");
    if (transaction.type === "savings_withdrawal" || transaction.type === "goal_withdrawal") description = description.replace(/^Withdrawal from /, "سحب من ");
    if (transaction.type === "goal_deposit") description = description.replace(/^Contribution to /, "مساهمة في ");
    if (transaction.type === "savings_transfer") description = description.replace(" to ", " إلى ");
  }
  return (
    <div className="transaction-row">
      <span className={`transaction-icon transaction-icon--${tone}`}><TransactionIconGlyph type={transaction.type} /></span>
      <div className="transaction-main"><strong>{description}</strong><span>{formatDate(transaction.transaction_date)}{showType ? ` · ${t(humanize(transaction.type))}` : ""}</span></div>
      {transaction.type === "savings_transfer" && <ArrowRight className="transaction-transfer" />}
      <strong className={`transaction-amount transaction-amount--${tone}`}>
        {tone === "positive" ? "+" : tone === "negative" ? "−" : ""}{formatCurrency(transaction.amount, currency)}
      </strong>
    </div>
  );
}
