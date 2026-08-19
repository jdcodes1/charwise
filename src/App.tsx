import { useEffect, useState } from "react";
import { addRecentPr, getToken } from "./github/token";
import { GitHubError, describeGitHubError } from "./github/types";
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
  // Every submission is a new attempt, so a retry after an error is a new query
  // rather than a cache hit on the rejection. See usePrQuery.
  const [attempt, setAttempt] = useState(0);
  // Held here because an error unmounts Review and mounts a *fresh* PrLoader:
  // without this the URL field comes back blank and the next click reports
  // "That is not a pull request URL" about a URL the user did type. Seeded
  // from the hash for the same reason on the other path: a bookmarked PR
  // opens with no token, and the identity the user already supplied has to
  // reach the field or the only available action blames them for it.
  // parsePrUrl accepts this shorthand, so it round-trips.
  const [urlText, setUrlText] = useState(() => {
    const fromHash = refFromHash();
    return fromHash ? `${fromHash.owner}/${fromHash.repo}#${fromHash.number}` : "";
  });
  const query = usePrQuery(ref, token, attempt);

  useEffect(() => {
    const onHashChange = () => setRef(refFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (query.data && ref) addRecentPr(ref, query.data.title);
  }, [query.data, ref]);

  function open(next: PrRef, nextToken: string, nextUrlText: string) {
    setToken(nextToken);
    setRef(next);
    setUrlText(nextUrlText);
    setAttempt((n) => n + 1);
    window.location.hash = encodeURIComponent(`${next.owner}/${next.repo}#${next.number}`);
  }

  // Mirrors usePrQuery's `enabled`. A disabled react-query v5 query still
  // reports isPending, so checking isPending first left a deep link with no
  // token stuck on "Loading diff…" with no inputs on screen and nothing
  // fetching — which is every bookmarked PR, since the token is sessionStorage
  // by design.
  if (!ref || !token) return <PrLoader onOpen={open} initialUrl={urlText} />;
  if (query.isPending) return <main className="status">Loading diff…</main>;
  if (query.error) {
    const rejectedToken = query.error instanceof GitHubError && query.error.code === "auth";
    return <PrLoader onOpen={open} error={describeGitHubError(query.error)} initialUrl={urlText} focusToken={rejectedToken} />;
  }
  return <Review pr={query.data} />;
}
