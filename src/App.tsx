import { useEffect, useState } from "react";
import { addRecentPr, getToken } from "./github/token";
import type { PrRef } from "./github/types";
import { parsePrUrl } from "./github/url";
import { usePrQuery } from "./state/usePrQuery";
import PrLoader from "./ui/PrLoader";
import Review from "./ui/Review";

/**
 * The hash carries `owner/repo#number` and nothing else — no token, no diff
 * content, so browser history holds only the PR's identity.
 */
export function refFromHash(): PrRef | null {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;
  try {
    return parsePrUrl(decodeURIComponent(hash));
  } catch {
    // decodeURIComponent throws URIError on a malformed escape such as "#%zz".
    // A hand-edited address bar must not blank the page.
    return null;
  }
}

export default function App() {
  const [ref, setRef] = useState<PrRef | null>(refFromHash);
  const [token, setToken] = useState(() => getToken() ?? "");
  const query = usePrQuery(ref, token);

  useEffect(() => {
    const onHashChange = () => setRef(refFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (query.data && ref) addRecentPr(ref, query.data.title);
  }, [query.data, ref]);

  function open(next: PrRef, nextToken: string) {
    setToken(nextToken);
    setRef(next);
    window.location.hash = encodeURIComponent(`${next.owner}/${next.repo}#${next.number}`);
  }

  if (!ref) return <PrLoader onOpen={open} />;
  if (query.isPending) return <main className="status">Loading diff…</main>;
  if (query.error) return <PrLoader onOpen={open} error={query.error.message} />;
  return <Review pr={query.data} />;
}
