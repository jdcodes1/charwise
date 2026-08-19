import { describe, expect, it, vi } from "vitest";
import { fetchPr } from "./fetchPr";
import { GitHubError, describeGitHubError } from "./types";

const REF = { owner: "o", repo: "r", number: 5 };

const json = (body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });

const prBody = { title: "Speed up the loader", head: { sha: "head1" } };

const file = (n: number) => ({
  filename: `src/f${n}.ts`,
  status: "modified",
  additions: 1,
  deletions: 1,
  patch: "@@ -1,1 +1,1 @@\n-a\n+b",
});

describe("fetchPr", () => {
  it("returns the title, SHAs, and files", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) =>
      String(input).includes("/files") ? json([file(1)]) : json(prBody),
    ) as unknown as typeof fetch;

    const pr = await fetchPr(REF, "tok", fetchImpl);
    expect(pr.title).toBe("Speed up the loader");
    expect(pr.headSha).toBe("head1");
    expect(pr.files.map((f) => f.filename)).toEqual(["src/f1.ts"]);
  });

  it("sends the token and the diff accept header", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) =>
      String(input).includes("/files") ? json([]) : json(prBody),
    ) as unknown as typeof fetch;

    await fetchPr(REF, "tok", fetchImpl);
    const init = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok");
    expect(headers.Accept).toBe("application/vnd.github+json");
  });

  it("follows pagination until a short page", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => file(i));
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (!url.includes("/files")) return json(prBody);
      return url.includes("page=2") ? json([file(999)]) : json(page1);
    }) as unknown as typeof fetch;

    const pr = await fetchPr(REF, "tok", fetchImpl);
    expect(pr.files).toHaveLength(101);
  });

  it("maps a rename to previousFilename", async () => {
    const renamed = { ...file(1), status: "renamed", previous_filename: "src/old.ts" };
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) =>
      String(input).includes("/files") ? json([renamed]) : json(prBody),
    ) as unknown as typeof fetch;

    const pr = await fetchPr(REF, "tok", fetchImpl);
    expect(pr.files[0].previousFilename).toBe("src/old.ts");
  });

  it("throws an auth error on 401", async () => {
    const fetchImpl = vi.fn(async () => json({ message: "Bad credentials" }, { status: 401 })) as unknown as typeof fetch;
    await expect(fetchPr(REF, "tok", fetchImpl)).rejects.toMatchObject({ code: "auth" });
  });

  it("throws a notfound error on 404", async () => {
    const fetchImpl = vi.fn(async () => json({ message: "Not Found" }, { status: 404 })) as unknown as typeof fetch;
    await expect(fetchPr(REF, "tok", fetchImpl)).rejects.toMatchObject({ code: "notfound" });
  });

  it("throws a ratelimit error with a reset time on an exhausted 403", async () => {
    const reset = String(Math.floor(Date.UTC(2026, 7, 18, 12, 0, 0) / 1000));
    const fetchImpl = vi.fn(async () =>
      json({ message: "rate limited" }, {
        status: 403,
        headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": reset },
      }),
    ) as unknown as typeof fetch;

    const error = await fetchPr(REF, "tok", fetchImpl).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GitHubError);
    expect((error as GitHubError).code).toBe("ratelimit");
    expect((error as GitHubError).resetAt?.toISOString()).toBe("2026-08-18T12:00:00.000Z");
  });

  it("puts the reset time in the message the user is shown", async () => {
    const resetAt = new Date(Date.UTC(2026, 7, 18, 12, 0, 0));
    const fetchImpl = vi.fn(async () =>
      json({ message: "rate limited" }, {
        status: 403,
        headers: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": String(Math.floor(resetAt.getTime() / 1000)),
        },
      }),
    ) as unknown as typeof fetch;

    const error = (await fetchPr(REF, "tok", fetchImpl).catch((e: unknown) => e)) as GitHubError;
    // Local time, because "resets at 12:00 UTC" is not something the reader
    // can act on without doing arithmetic.
    const local = resetAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    expect(describeGitHubError(error)).toBe(`Rate limit reached — resets at ${local}`);
  });

  it("leaves a rate-limit message alone when GitHub sent no reset header", async () => {
    const fetchImpl = vi.fn(async () =>
      json({ message: "rate limited" }, { status: 403, headers: { "x-ratelimit-remaining": "0" } }),
    ) as unknown as typeof fetch;

    const error = (await fetchPr(REF, "tok", fetchImpl).catch((e: unknown) => e)) as GitHubError;
    expect(describeGitHubError(error)).toBe("Rate limit reached");
  });

  it("stops instead of looping forever when every page is full", async () => {
    const full = Array.from({ length: 100 }, (_, i) => file(i));
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) =>
      String(input).includes("/files") ? json(full) : json(prBody),
    ) as unknown as typeof fetch;

    await expect(fetchPr(REF, "tok", fetchImpl)).rejects.toMatchObject({ code: "unknown" });
  });

  it("maps a network-level rejection to a typed error", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;

    const error = await fetchPr(REF, "tok", fetchImpl).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GitHubError);
    expect((error as GitHubError).code).toBe("network");
  });

  it("maps an unreadable body to a typed error", async () => {
    const fetchImpl = vi.fn(async () => new Response("not json", { status: 200 })) as unknown as typeof fetch;
    await expect(fetchPr(REF, "tok", fetchImpl)).rejects.toBeInstanceOf(GitHubError);
  });

  it("maps a wrong-shaped files payload to a typed error", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) =>
      String(input).includes("/files") ? json({ message: "not an array" }) : json(prBody),
    ) as unknown as typeof fetch;

    await expect(fetchPr(REF, "tok", fetchImpl)).rejects.toBeInstanceOf(GitHubError);
  });

  it("throws unknown for any other failure", async () => {
    const fetchImpl = vi.fn(async () => json({ message: "boom" }, { status: 500 })) as unknown as typeof fetch;
    await expect(fetchPr(REF, "tok", fetchImpl)).rejects.toMatchObject({ code: "unknown" });
  });

  it("keeps a file with no patch, leaving patch undefined", async () => {
    const big = { filename: "big.json", status: "modified", additions: 9000, deletions: 9000 };
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) =>
      String(input).includes("/files") ? json([big]) : json(prBody),
    ) as unknown as typeof fetch;

    const pr = await fetchPr(REF, "tok", fetchImpl);
    expect(pr.files[0].patch).toBeUndefined();
  });
});
