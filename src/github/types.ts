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

export type GitHubErrorCode = "auth" | "notfound" | "ratelimit" | "unknown";

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
