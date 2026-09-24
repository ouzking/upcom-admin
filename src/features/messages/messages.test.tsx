import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MessageItem } from "@/repositories/messages.repository";
import { signInAs } from "@/test/fakes";
import { renderRoutes } from "@/test/render";
import MessagesPage from "./MessagesPage";

const repo = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn(), countUnread: vi.fn(), update: vi.fn(), remove: vi.fn(), resendNotification: vi.fn() }));

vi.mock("@/repositories/auth.repository", async () => (await import("@/test/fakes")).authModule);
vi.mock("@/repositories/messages.repository", () => ({ messagesRepository: repo }));

const message = (overrides: Partial<MessageItem> = {}): MessageItem => ({
  id: "m-1",
  name: "Fatou Sow",
  email: "fatou@example.com",
  phone: null,
  subject: "Demande d'information",
  message: "Bonjour, j'aimerais connaître vos délais.",
  status: "new",
  internal_notes: null,
  notified_at: null,
  created_at: "2026-09-24T09:00:00Z",
  updated_at: "2026-09-24T09:00:00Z",
  ...overrides,
});

describe("Messages", () => {
  beforeEach(() => {
    signInAs("communication_manager");
    repo.list.mockResolvedValue({ items: [message(), message({ id: "m-2", name: "Ibrahima Ba", status: "read", subject: "Partenariat" })], total: 2, page: 1, pageSize: 25 });
    repo.update.mockResolvedValue(undefined);
  });

  it("affiche la boîte de réception (hors archivés)", async () => {
    renderRoutes([{ path: "/messages", element: <MessagesPage /> }], "/messages");
    const list = await screen.findByRole("list", { name: "Messages" });
    expect(within(list).getByText("Fatou Sow")).toBeInTheDocument();
    expect(within(list).getByLabelText("Non lu")).toBeInTheDocument();
    expect(repo.list).toHaveBeenCalledWith(expect.objectContaining({ filters: { inbox: true } }));
  });

  it("ouvrir un message non lu le marque comme lu", async () => {
    repo.get.mockResolvedValue(message());
    const { user } = renderRoutes([{ path: "/messages", element: <MessagesPage /> }], "/messages");

    await user.click(await screen.findByRole("button", { name: /Fatou Sow/ }));
    expect(within(await screen.findByRole("article")).getByText("Bonjour, j'aimerais connaître vos délais.")).toBeInTheDocument();
    await waitFor(() => expect(repo.update).toHaveBeenCalledWith("m-1", { status: "read" }));
  });

  it("archive un message", async () => {
    repo.get.mockResolvedValue(message({ status: "read" }));
    const { user } = renderRoutes([{ path: "/messages", element: <MessagesPage /> }], "/messages?id=m-1");

    await user.click(await screen.findByRole("button", { name: "Archiver" }));
    await waitFor(() => expect(repo.update).toHaveBeenCalledWith("m-1", { status: "archived" }));
    expect(await screen.findByText("Message archivé.")).toBeInTheDocument();
  });

  it("marque comme répondu et propose la réponse par e-mail", async () => {
    repo.get.mockResolvedValue(message({ status: "read" }));
    const { user } = renderRoutes([{ path: "/messages", element: <MessagesPage /> }], "/messages?id=m-1");

    expect(await screen.findByRole("link", { name: "Répondre" })).toHaveAttribute("href", expect.stringContaining("mailto:fatou@example.com"));
    await user.click(screen.getByRole("button", { name: "Marquer comme répondu" }));
    await waitFor(() => expect(repo.update).toHaveBeenCalledWith("m-1", { status: "replied" }));
  });

  it("n'autorise pas le traitement sans contacts.manage", async () => {
    signInAs("commercial");
    const { authState } = await import("@/test/fakes");
    authState.access = { role: "commercial", permissions: ["contacts.view"] };
    repo.get.mockResolvedValue(message());
    renderRoutes([{ path: "/messages", element: <MessagesPage /> }], "/messages?id=m-1");

    await within(await screen.findByRole("article")).findByText("Bonjour, j'aimerais connaître vos délais.");
    expect(screen.queryByRole("button", { name: "Archiver" })).not.toBeInTheDocument();
    expect(repo.update).not.toHaveBeenCalled();
  });
});
