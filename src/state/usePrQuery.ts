import { useQuery } from "@tanstack/react-query";
import { fetchPr } from "../github/fetchPr";
import type { GhPr, PrRef } from "../github/types";

/** Fetch a PR, cached for five minutes. Disabled until a ref and token exist. */
export function usePrQuery(ref: PrRef | null, token: string) {
  return useQuery<GhPr, Error>({
    queryKey: ["pr", ref?.owner, ref?.repo, ref?.number],
    queryFn: () => fetchPr(ref as PrRef, token),
    enabled: ref !== null && token !== "",
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
