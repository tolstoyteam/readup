import { useQuotesContext } from "@/features/quotes/context/quotes-provider";

export function useQuotes() {
  return useQuotesContext();
}
