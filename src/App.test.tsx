import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App, { refFromHash } from "./App";

describe("refFromHash", () => {
  it("parses a well-formed hash", () => {
    window.location.hash = "#" + encodeURIComponent("o/r#5");
    expect(refFromHash()).toEqual({ owner: "o", repo: "r", number: 5 });
  });

  it("returns null for an empty hash", () => {
    window.location.hash = "";
    expect(refFromHash()).toBeNull();
  });

  it("returns null for junk rather than throwing", () => {
    window.location.hash = "#not-a-pr";
    expect(refFromHash()).toBeNull();
  });

  it("survives a malformed percent escape", () => {
    // decodeURIComponent throws URIError here; a hand-edited address bar must
    // not blank the page.
    window.location.hash = "#%zz";
    expect(refFromHash()).toBeNull();
  });
});

const PR = { title: "Raise the timeout", head: { sha: "head1" } };

const FILES = [
  {
    filename: "src/api/client.ts",
    status: "modified",
    additions: 1,
    deletions: 1,
    patch: "@@ -41,1 +41,1 @@\n-    timeout: 30_000,\n+    timeout: 60_000,",
  },
];

function respond(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return {
    ok: status < 400,
    status,
    headers: new Headers(headers),
    json: async () => body,
  } as unknown as Response;
}

const URL_FIELD = /pull request url/i;
const TOKEN_FIELD = /github token/i;
const OPEN = { name: /open diff/i } as const;

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}

const realFetch = globalThis.fetch;

describe("App", () => {
  beforeEach(() => {
    window.location.hash = "";
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("refetches when the same PR is submitted again after an error", async () => {
    let accept = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (!accept) return respond({ message: "Bad credentials" }, 401);
      return String(input).includes("/files") ? respond(FILES) : respond(PR);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderApp();
    await userEvent.type(screen.getByLabelText(URL_FIELD), "https://github.com/o/r/pull/5");
    await userEvent.type(screen.getByLabelText(TOKEN_FIELD), "bad-token");
    await userEvent.click(screen.getByRole("button", OPEN));

    expect(await screen.findByText(/token rejected/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    accept = true;
    await userEvent.clear(screen.getByLabelText(TOKEN_FIELD));
    await userEvent.type(screen.getByLabelText(TOKEN_FIELD), "good-token");
    await userEvent.click(screen.getByRole("button", OPEN));

    expect(await screen.findByText(/Raise the timeout/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });

  it("keeps the submitted URL in the field after an error", async () => {
    globalThis.fetch = vi.fn(async () => respond({ message: "Bad credentials" }, 401)) as unknown as typeof fetch;

    renderApp();
    await userEvent.type(screen.getByLabelText(URL_FIELD), "https://github.com/o/r/pull/5");
    await userEvent.type(screen.getByLabelText(TOKEN_FIELD), "bad-token");
    await userEvent.click(screen.getByRole("button", OPEN));

    expect(await screen.findByText(/token rejected/i)).toBeInTheDocument();
    expect(screen.getByLabelText(URL_FIELD)).toHaveValue("https://github.com/o/r/pull/5");
  });

  it("focuses the token field when the token was rejected", async () => {
    globalThis.fetch = vi.fn(async () => respond({ message: "Bad credentials" }, 401)) as unknown as typeof fetch;

    renderApp();
    await userEvent.type(screen.getByLabelText(URL_FIELD), "https://github.com/o/r/pull/5");
    await userEvent.type(screen.getByLabelText(TOKEN_FIELD), "bad-token");
    await userEvent.click(screen.getByRole("button", OPEN));

    expect(await screen.findByText(/token rejected/i)).toBeInTheDocument();
    expect(screen.getByLabelText(TOKEN_FIELD)).toHaveFocus();
  });

  it("shows the loader, not a spinner, for a deep link with no stored token", () => {
    window.location.hash = "#" + encodeURIComponent("o/r#5");
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderApp();

    expect(screen.getByLabelText(URL_FIELD)).toBeInTheDocument();
    expect(screen.getByRole("button", OPEN)).toBeInTheDocument();
    expect(screen.queryByText(/loading diff/i)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
