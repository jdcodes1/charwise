import { useState } from "react";
import { clearAllLocalData, getRecentPrs, getToken, isTokenRemembered, setToken } from "../github/token";
import type { PrRef } from "../github/types";
import { parsePrUrl } from "../github/url";

export default function PrLoader({
  onOpen,
  error,
}: {
  onOpen: (ref: PrRef, token: string) => void;
  error?: string;
}) {
  const [url, setUrl] = useState("");
  const [token, setTokenValue] = useState(() => getToken() ?? "");
  const [remember, setRemember] = useState(() => isTokenRemembered());
  const [localError, setLocalError] = useState<string | null>(null);
  const [recent, setRecent] = useState(() => getRecentPrs());

  function open(ref: PrRef) {
    setLocalError(null);
    setToken(token, remember);
    onOpen(ref, token);
  }

  function submit() {
    const ref = parsePrUrl(url);
    if (!ref) {
      setLocalError("That is not a pull request URL. Try github.com/owner/repo/pull/123");
      return;
    }
    open(ref);
  }

  function clearEverything() {
    clearAllLocalData();
    setTokenValue("");
    setRemember(false);
    setRecent([]);
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
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="github.com/owner/repo/pull/123"
          />
        </label>
        <label>
          GitHub token
          <input type="password" value={token} onChange={(e) => setTokenValue(e.target.value)} placeholder="ghp_…" />
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
      </section>

      {recent.length > 0 && (
        <section className="recent">
          <h2>Recent</h2>
          <ul>
            {recent.map((entry) => (
              <li key={entry.label}>
                <button type="button" onClick={() => open(entry.ref)}>
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
