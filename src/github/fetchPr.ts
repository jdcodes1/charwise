import { GitHubError } from "./types";
import type { GhFile, GhPr, PrRef } from "./types";

const API = "https://api.github.com";
const PER_PAGE = 100;

/**
 * GitHub caps a PR at 300 changed files, so ten pages is far past any real
 * response. The cap exists so a misbehaving or proxied endpoint that keeps
 * returning full pages cannot spin forever and exhaust the tab's memory.
 */
const MAX_PAGES = 10;

interface RawFile {
  filename: string;
  previous_filename?: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

interface RawPr {
  title: string;
  head: { sha: string };
}

function toGitHubError(response: Response): GitHubError {
  if (response.status === 401) {
    return new GitHubError("auth", "Token rejected — re-enter it");
  }
  if (response.status === 404) {
    return new GitHubError("notfound", "PR not found, or the token lacks access to this repo");
  }
  if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") {
    const reset = response.headers.get("x-ratelimit-reset");
    const resetAt = reset ? new Date(Number(reset) * 1000) : null;
    return new GitHubError("ratelimit", "Rate limit reached", resetAt);
  }
  return new GitHubError("unknown", `GitHub request failed (${response.status})`);
}

async function get<T>(url: string, token: string, fetchImpl: typeof fetch): Promise<T> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  } catch {
    // fetch rejects rather than resolving when the browser is offline, DNS
    // fails, or CORS blocks the request. Without this the UI's error switch
    // sees a raw TypeError and falls through to no message at all.
    throw new GitHubError("network", "Could not reach GitHub — check your connection");
  }

  if (!response.ok) throw toGitHubError(response);

  try {
    return (await response.json()) as T;
  } catch {
    throw new GitHubError("unknown", "GitHub returned a response this app could not read");
  }
}

function toGhFile(raw: RawFile): GhFile {
  return {
    filename: raw.filename,
    previousFilename: raw.previous_filename ?? null,
    status: raw.status,
    additions: raw.additions,
    deletions: raw.deletions,
    patch: raw.patch,
  };
}

/** Fetch a PR's metadata and every changed file, following pagination. */
export async function fetchPr(ref: PrRef, token: string, fetchImpl: typeof fetch = fetch): Promise<GhPr> {
  const base = `${API}/repos/${ref.owner}/${ref.repo}/pulls/${ref.number}`;
  const pr = await get<RawPr>(base, token, fetchImpl);

  const files: GhFile[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await get<RawFile[]>(`${base}/files?per_page=${PER_PAGE}&page=${page}`, token, fetchImpl);
    if (!Array.isArray(batch)) {
      throw new GitHubError("unknown", "GitHub returned a response this app could not read");
    }
    files.push(...batch.map(toGhFile));
    if (batch.length < PER_PAGE) break;
    if (page === MAX_PAGES) {
      throw new GitHubError("unknown", `This PR has more than ${MAX_PAGES * PER_PAGE} changed files`);
    }
  }

  return { ref, title: pr.title, headSha: pr.head.sha, files };
}
