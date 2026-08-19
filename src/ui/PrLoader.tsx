import { useEffect, useRef, useState } from "react";
import { clearAllLocalData, getRecentPrs, getToken, isTokenRemembered, setToken } from "../github/token";
import type { PrRef } from "../github/types";
import { parsePrUrl } from "../github/url";

export default function PrLoader({
  onOpen,
  error,
  initialUrl = "",
  focusToken = false,
}: {
  /** The third argument is the text the user submitted, so a caller that
      re-mounts this component after an error can put it back. */
  onOpen: (ref: PrRef, token: string, urlText: string) => void;
  error?: string;
  initialUrl?: string;
  /** Set when the token was the thing GitHub rejected, so the cursor lands on
      the field the error message tells the user to correct. */
  focusToken?: boolean;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [token, setTokenValue] = useState(() => getToken() ?? "");
  const [remember, setRemember] = useState(() => isTokenRemembered());
  const [localError, setLocalError] = useState<string | null>(null);
  const [cleared, setCleared] = useState(false);
  const [recent, setRecent] = useState(() => getRecentPrs());
  const tokenRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusToken) tokenRef.current?.focus();
  }, [focusToken]);

  function open(ref: PrRef, urlText: string) {
    setLocalError(null);
    setToken(token, remember);
    onOpen(ref, token, urlText);
  }

  function submit() {
    const ref = parsePrUrl(url);
    if (!ref) {
      setLocalError("That is not a pull request URL. Try github.com/owner/repo/pull/123");
      return;
    }
    open(ref, url);
  }

  function clearEverything() {
    clearAllLocalData();
    setTokenValue("");
    setRemember(false);
    setRecent([]);
    // Without this the control looks like a no-op whenever there was nothing
    // visible to clear — the worst possible feedback on a privacy control.
    setCleared(true);
  }

  return (
    <main className="loader">
      <h1>Charwise</h1>
      <p className="tagline">Character-level diffs for GitHub pull requests.</p>

      <form
        className="loader-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label>
          Pull request URL
          {/* Deliberately type="text", not type="url": native constraint
              validation would block submission before our own message could
              render, and would reject the owner/repo#123 shorthand outright.
              parsePrUrl is the real validation. */}
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="github.com/owner/repo/pull/123"
          />
        </label>
        <label>
          GitHub token
          <input
            ref={tokenRef}
            type="password"
            value={token}
            onChange={(e) => setTokenValue(e.target.value)}
            placeholder="ghp_…"
          />
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember on this device
        </label>
        <button type="submit">Open diff</button>
      </form>

      {(localError ?? error) && <p className="error">{localError ?? error}</p>}

      <section className="privacy">
        <h2>Your code never leaves your browser</h2>
        <ul>
          <li>No server of ours exists. The page talks to api.github.com and nothing else.</li>
          <li>Diffs are computed in this tab. No analytics, no telemetry, no logging.</li>
          <li>
            Unchecked, your token is held for this tab only and forgotten when you close it. Checked, it is stored on
            this device until you clear it.
          </li>
        </ul>
        <button type="button" className="link" onClick={clearEverything}>
          Clear local data
        </button>
        {cleared && (
          <span className="cleared" role="status">
            Cleared.
          </span>
        )}
      </section>

      {recent.length > 0 && (
        <section className="recent">
          <h2>Recent</h2>
          <ul>
            {recent.map((entry) => (
              <li key={entry.label}>
                <button
                  type="button"
                  onClick={() => open(entry.ref, `${entry.ref.owner}/${entry.ref.repo}#${entry.ref.number}`)}
                >
                  {entry.label}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
