import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { AuthContext } from "../context/auth-context";
import { ThemeContext } from "../context/theme-context";
import LoginPage from "./LoginPage";

function Location() { return <output>{useLocation().pathname}</output>; }
let login, startDemo;
beforeEach(() => {
  login = vi.fn().mockResolvedValue({});
  startDemo = vi.fn().mockResolvedValue({});
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { demo_available: true } }), { headers: { "Content-Type": "application/json" } })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function setup() {
  render(<MemoryRouter initialEntries={["/login"]}><ThemeContext.Provider value={{ dark: false, toggle: vi.fn() }}><AuthContext.Provider value={{ login, startDemo }}><LoginPage /><Location /></AuthContext.Provider></ThemeContext.Provider></MemoryRouter>);
}

it("submits personal credentials and navigates after success", async () => {
  setup();
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "me@example.com" } });
  fireEvent.change(screen.getByLabelText(/senha|password/i), { target: { value: "password" } });
  fireEvent.click(screen.getByRole("button", { name: "Entrar na minha conta" }));
  await waitFor(() => expect(login).toHaveBeenCalledWith("me@example.com", "password"));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("/"));
});

it("starts one demo on double click with empty personal fields and navigates", async () => {
  let finish;
  startDemo.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  setup();
  const button = await screen.findByRole("button", { name: "Experimentar demonstração" });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  fireEvent.click(button);
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute("aria-busy", "true");
  expect(startDemo).toHaveBeenCalledTimes(1);
  expect(login).not.toHaveBeenCalled();
  await act(async () => finish());
  expect(screen.getByRole("status")).toHaveTextContent("/");
});

it("shows demo errors and allows another attempt", async () => {
  startDemo.mockRejectedValue(new Error("Capacidade temporariamente esgotada."));
  setup();
  const button = await screen.findByRole("button", { name: "Experimentar demonstração" });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  expect(await screen.findByRole("alert")).toHaveTextContent("Capacidade");
  expect(button).toBeEnabled();
});

it("keeps demo unavailable when configuration disables it", async () => {
  fetch.mockResolvedValue(new Response(JSON.stringify({ success: true, data: { demo_available: false } }), { headers: { "Content-Type": "application/json" } }));
  setup();
  await screen.findByText(/demonstração indisponível/i);
  expect(screen.getByRole("button", { name: "Experimentar demonstração" })).toBeDisabled();
});

it("loads public configuration and starts a new demo after the previous demo expired", async () => {
  sessionStorage.setItem("agency-hub.demo", JSON.stringify({ expired: true }));
  setup();

  const button = await screen.findByRole("button", { name: "Experimentar demonstração" });
  await waitFor(() => expect(button).toBeEnabled());
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toBe("/api/v1/config");
  expect(fetch.mock.calls[0][1]).toMatchObject({ credentials: "omit" });

  fireEvent.click(button);
  await waitFor(() => expect(startDemo).toHaveBeenCalledTimes(1));
  expect(screen.getByRole("status")).toHaveTextContent("/");
});
