# Charwise

Character-level diff viewer for GitHub pull requests.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173, paste a PR URL, and paste a GitHub token with `repo`
scope (or `public_repo` for public repositories).

## Privacy

Everything runs in your browser.

- There is no server. The page contacts `api.github.com` and nothing else — no
  analytics, no telemetry, no CDN, no remote fonts.
- Your diffs are parsed and rendered in the tab. They are never uploaded anywhere.
- Your token is kept for the current tab only and forgotten when you close it,
  unless you tick **Remember on this device**. It is sent to `api.github.com` in
  an `Authorization` header, never in a URL.
- **Clear local data** on the start screen erases the token, the recent-PR list,
  and every viewed mark.

`npm test` enforces this: `src/privacy.test.ts` fails on any non-GitHub URL in the
source, and the Playwright suite fails if the running app makes one.

## Keys

| Key | Action |
|---|---|
| `j` / `]` | next file |
| `k` / `[` | previous file |
| `v` | mark the active file viewed |
| `u` | toggle split / unified |
| `/` | filter files |

## Tests

```bash
npm test     # unit
npm run e2e  # playwright smoke
```

See `context.md` for architecture.
