import { useQuery } from "@tanstack/react-query";
import { fetchPr } from "../github/fetchPr";
import type { GhPr, PrRef } from "../github/types";

/**
 * Fetch a PR, cached for five minutes. Disabled until a ref and token exist.
 *
 * `attempt` is part of the cache key on purpose. Without it, re-submitting the
 * same PR after an error lands on the already-errored query and react-query
 * serves the cached rejection without issuing a request — so "Token rejected —
 * re-enter it" becomes an instruction the app then ignores. Bumping `attempt`
 * makes each submission a distinct query, which is the only way a retry with a
 * corrected token can reach the network.
 */
export function usePrQuery(ref: PrRef | null, token: string, attempt: number) {
  return useQuery<GhPr, Error>({
    queryKey: ["pr", ref?.owner, ref?.repo, ref?.number, attempt],
    queryFn: () => fetchPr(ref as PrRef, token),
    enabled: ref !== null && token !== "",
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
