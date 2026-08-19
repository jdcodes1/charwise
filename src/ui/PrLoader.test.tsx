import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getToken, setToken } from "../github/token";
import PrLoader from "./PrLoader";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("PrLoader", () => {
  it("calls onOpen with the parsed ref and token", async () => {
    const onOpen = vi.fn();
    render(<PrLoader onOpen={onOpen} />);
    await userEvent.type(screen.getByLabelText(/pull request url/i), "https://github.com/o/r/pull/12");
    await userEvent.type(screen.getByLabelText(/token/i), "ghp_x");
    await userEvent.click(screen.getByRole("button", { name: /open/i }));
    expect(onOpen).toHaveBeenCalledWith(
      { owner: "o", repo: "r", number: 12 },
      "ghp_x",
      "https://github.com/o/r/pull/12",
    );
  });

  it("stores the token in sessionStorage by default", async () => {
    render(<PrLoader onOpen={() => {}} />);
    await userEvent.type(screen.getByLabelText(/pull request url/i), "https://github.com/o/r/pull/12");
    await userEvent.type(screen.getByLabelText(/token/i), "ghp_x");
    await userEvent.click(screen.getByRole("button", { name: /open/i }));
    expect(getToken()).toBe("ghp_x");
    expect(sessionStorage.getItem("charwise.token")).toBe("ghp_x");
    expect(localStorage.getItem("charwise.token")).toBeNull();
  });

  it("leaves remember unchecked by default", () => {
    render(<PrLoader onOpen={() => {}} />);
    expect(screen.getByRole("checkbox", { name: /remember/i })).not.toBeChecked();
  });

  it("persists the token to localStorage when remember is checked", async () => {
    render(<PrLoader onOpen={() => {}} />);
    await userEvent.type(screen.getByLabelText(/pull request url/i), "https://github.com/o/r/pull/12");
    await userEvent.type(screen.getByLabelText(/token/i), "ghp_x");
    await userEvent.click(screen.getByRole("checkbox", { name: /remember/i }));
    await userEvent.click(screen.getByRole("button", { name: /open/i }));
    expect(localStorage.getItem("charwise.token")).toBe("ghp_x");
  });

  it("clears every stored trace when asked", async () => {
    setToken("ghp_stored", true);
    localStorage.setItem("charwise.viewed.sha1", JSON.stringify(["a.ts"]));
    render(<PrLoader onOpen={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /clear local data/i }));
    expect(getToken()).toBeNull();
    expect(localStorage.getItem("charwise.viewed.sha1")).toBeNull();
    expect(screen.getByLabelText(/token/i)).toHaveValue("");
  });

  it("confirms that clearing happened even when nothing was stored", async () => {
    render(<PrLoader onOpen={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /clear local data/i }));
    expect(screen.getByRole("status")).toHaveTextContent("Cleared.");
  });

  it("states the privacy guarantee", () => {
    render(<PrLoader onOpen={() => {}} />);
    expect(screen.getByText(/never leaves your browser/i)).toBeInTheDocument();
  });

  it("pre-fills a stored token and reflects that it is remembered", () => {
    setToken("ghp_stored", true);
    render(<PrLoader onOpen={() => {}} />);
    expect(screen.getByLabelText(/token/i)).toHaveValue("ghp_stored");
    expect(screen.getByRole("checkbox", { name: /remember/i })).toBeChecked();
  });

  it("masks the token field", () => {
    render(<PrLoader onOpen={() => {}} />);
    expect(screen.getByLabelText(/token/i)).toHaveAttribute("type", "password");
  });

  it("rejects an unparseable url without calling onOpen", async () => {
    const onOpen = vi.fn();
    render(<PrLoader onOpen={onOpen} />);
    await userEvent.type(screen.getByLabelText(/pull request url/i), "nonsense");
    await userEvent.type(screen.getByLabelText(/token/i), "ghp_x");
    await userEvent.click(screen.getByRole("button", { name: /open/i }));
    expect(onOpen).not.toHaveBeenCalled();
    expect(screen.getByText(/not a pull request url/i)).toBeInTheDocument();
  });

  it("shows an error passed from the caller", () => {
    render(<PrLoader onOpen={() => {}} error="Token rejected — re-enter it" />);
    expect(screen.getByText("Token rejected — re-enter it")).toBeInTheDocument();
  });

  it("lists recent pull requests and opens one on click", async () => {
    const onOpen = vi.fn();
    localStorage.setItem(
      "charwise.recent",
      JSON.stringify([{ ref: { owner: "o", repo: "r", number: 9 }, label: "o/r#9 Fix it" }]),
    );
    setToken("ghp_stored", false);
    render(<PrLoader onOpen={onOpen} />);
    await userEvent.click(screen.getByRole("button", { name: /o\/r#9 Fix it/ }));
    expect(onOpen).toHaveBeenCalledWith({ owner: "o", repo: "r", number: 9 }, "ghp_stored", "o/r#9");
  });
});
