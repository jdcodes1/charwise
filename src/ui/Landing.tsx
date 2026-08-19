import type { PrRef } from "../github/types";
import Demo from "./Demo";
import PrLoader from "./PrLoader";

/**
 * The public front door. It leads with a worked example rather than a claim,
 * because the product is a rendering decision and nobody can evaluate that
 * from prose. Everything below the form is the real engine, not a screenshot.
 */
export default function Landing({
  onOpen,
  error,
  initialUrl,
  focusToken,
}: {
  onOpen: (ref: PrRef, token: string, urlText: string) => void;
  error?: string;
  initialUrl?: string;
  focusToken?: boolean;
}) {
  return (
    <div className="landing">
      <header className="hero">
        <p className="eyebrow">Open source · runs entirely in your browser</p>
        <h1>
          Change one character.
          <br />
          See <em>one character</em>.
        </h1>
        <p className="hero-sub">
          GitHub highlights whole lines, so a one-digit edit arrives as two lines of red and green for you to
          re-read. Charwise pairs the lines by similarity and diffs them down to the character.
        </p>

        <div className="hero-demo" aria-hidden="true">
          <div className="hero-demo-row hero-demo-them">
            <span className="hero-demo-label">GitHub</span>
            <code className="del-line">    timeout: 30_000,</code>
            <code className="add-line">    timeout: 60_000,</code>
          </div>
          <div className="hero-demo-row hero-demo-us">
            <span className="hero-demo-label">Charwise</span>
            <code>
              {"    timeout: "}
              <mark className="del-mark">3</mark>
              {"0_000,"}
            </code>
            <code>
              {"    timeout: "}
              <mark className="add-mark">6</mark>
              {"0_000,"}
            </code>
          </div>
        </div>
      </header>

      <PrLoader onOpen={onOpen} error={error} initialUrl={initialUrl} focusToken={focusToken} />

      <Demo />

      <footer className="landing-footer">
        <p>
          No accounts, no analytics, no server. Your token and your code stay in this tab.{" "}
          <a href="https://github.com/jdcodes1/charwise" target="_blank" rel="noreferrer noopener">
            Source on GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
