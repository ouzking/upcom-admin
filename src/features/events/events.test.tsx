import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInAs } from "@/test/fakes";
import { renderRoutes } from "@/test/render";
import type { EventRow } from "@/types";
import EventEditPage from "./EventEditPage";

const repo = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), setStatus: vi.fn(), remove: vi.fn() }));

vi.mock("@/repositories/auth.repository", async () => (await import("@/test/fakes")).authModule);
vi.mock("@/repositories/events.repository", () => ({ eventsRepository: repo }));

const routes = [
  { path: "/evenements/nouveau", element: <EventEditPage /> },
  { path: "/evenements/:id", element: <EventEditPage /> },
];

describe("Événements", () => {
  beforeEach(() => signInAs("editor"));

  it("exige une date et refuse une fin antérieure au début", async () => {
    const { user } = renderRoutes(routes, "/evenements/nouveau");
    await user.type(await screen.findByRole("textbox", { name: "Titre" }), "Salon des entreprises");
    await user.click(screen.getByRole("button", { name: "Publier" }));
    expect(await screen.findByText("La date de l'événement est requise.")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^Début/), "2026-11-20T10:00");
    await user.type(screen.getByLabelText(/^Fin/), "2026-11-19T10:00");
    await user.click(screen.getByRole("button", { name: "Publier" }));
    expect(await screen.findByText("La date de fin doit être postérieure à la date de début.")).toBeInTheDocument();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("crée et publie un événement", async () => {
    repo.create.mockImplementation(async (input: Partial<EventRow>) => ({ ...input, created_at: "", updated_at: "" }) as EventRow);
    const { user } = renderRoutes(routes, "/evenements/nouveau");

    await user.type(await screen.findByRole("textbox", { name: "Titre" }), "Salon des entreprises");
    await user.type(screen.getByLabelText(/^Début/), "2026-11-20T10:00");
    await user.type(screen.getByRole("textbox", { name: "Lieu" }), "Dakar");
    await user.click(screen.getByRole("button", { name: "Publier" }));

    await waitFor(() => expect(repo.create).toHaveBeenCalledTimes(1));
    const payload = repo.create.mock.calls[0]![0] as EventRow;
    expect(payload).toMatchObject({ title: "Salon des entreprises", location: "Dakar", end_date: null, status: "published" });
    expect(new Date(payload.event_date).toISOString()).toBe(new Date("2026-11-20T10:00").toISOString());
    expect(await screen.findByText("Publication effectuée.")).toBeInTheDocument();
  });
});
