import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchBudgetData } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function useBudgetData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["budget", user?.id],
    queryFn: () => fetchBudgetData(user!),
    enabled: Boolean(user),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useRefreshBudget() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["budget", user?.id] });
}
