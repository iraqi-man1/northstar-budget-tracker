import { useState } from "react";
import { useToast } from "../context/ToastContext";
import { getErrorMessage } from "../lib/format";
import { useRefreshBudget } from "./useBudgetData";

export function useAction() {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const refresh = useRefreshBudget();

  async function run<T>(work: () => Promise<T>, successMessage: string) {
    setBusy(true);
    try {
      const result = await work();
      await refresh();
      toast(successMessage);
      return result;
    } catch (error) {
      toast(getErrorMessage(error), "error");
      throw error;
    } finally {
      setBusy(false);
    }
  }

  return { busy, run };
}
