export interface PrRef {
  owner: string;
  repo: string;
  number: number;
}

export interface GhFile {
  filename: string;
  /** Set only for renames. */
  previousFilename: string | null;
  status: string;
  additions: number;
  deletions: number;
  /** Absent when GitHub omits the patch because the file is too large. */
  patch?: string;
}

export interface GhPr {
  ref: PrRef;
  title: string;
  headSha: string;
  baseSha: string;
  files: GhFile[];
}

export type GitHubErrorCode = "auth" | "notfound" | "ratelimit" | "network" | "unknown";

export class GitHubError extends Error {
  readonly code: GitHubErrorCode;
  readonly resetAt: Date | null;

  constructor(code: GitHubErrorCode, message: string, resetAt: Date | null = null) {
    super(message);
    this.name = "GitHubError";
    this.code = code;
    this.resetAt = resetAt;
  }
}

/**
 * The message to show the user. `resetAt` was parsed and stored but never
 * read, so "Rate limit reached" told the reader to wait without saying until
 * when. Formatted as a local time, because a UTC timestamp is not something
 * anyone can act on without arithmetic.
 */
export function describeGitHubError(error: Error): string {
  if (error instanceof GitHubError && error.code === "ratelimit" && error.resetAt) {
    return `${error.message} — resets at ${error.resetAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }
  return error.message;
}
