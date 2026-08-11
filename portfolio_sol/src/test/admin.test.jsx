import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { AdminPage } from "../admin/AdminPage";

const aboutContent = {
  profile: "PERFIL / EXPERIENCIA",
  graphicDesign: ["Texto de diseño uno", "Texto de diseño dos"],
  videoEditing: ["Texto de video uno", "Texto de video dos"],
  keySkills: ["Comunicación visual clara y efectiva"],
  technicalSkills: ["Canva"],
  languages: ["Inglés C1 — Cambridge University"],
};

function createService(overrides = {}) {
  return {
    getSession: vi.fn().mockResolvedValue(null),
    isAdmin: vi.fn().mockResolvedValue(false),
    listClients: vi.fn().mockResolvedValue([]),
    onAuthStateChange: vi.fn(() => () => {}),
    getAboutContent: vi.fn().mockResolvedValue(aboutContent),
    saveAboutContent: vi.fn().mockResolvedValue(aboutContent),
    saveClient: vi.fn().mockResolvedValue({ slug: "nuevo-cliente" }),
    saveClientOrder: vi.fn().mockResolvedValue(),
    signIn: vi.fn(),
    signOut: vi.fn().mockResolvedValue(),
    ...overrides,
  };
}

describe("private portfolio admin", () => {
  it("uses one centered title treatment for every dashboard card", async () => {
    const service = createService({
      getSession: vi.fn().mockResolvedValue({ user: { id: "admin-user" } }),
      isAdmin: vi.fn().mockResolvedValue(true),
    });
    render(<AdminPage service={service} />);

    await screen.findByRole("button", { name: /Modificar cliente/i });
    const labels = [...document.querySelectorAll(".admin-dashboard__actions strong")];
    const styles = readFileSync("src/styles/admin.css", "utf8");
    const buttonRule =
      styles.match(/\.admin-dashboard__actions button\s*{[^}]+}/)?.[0] ?? "";
    const titleRule =
      styles.match(/\.admin-dashboard__actions strong\s*{[^}]+}/)?.[0] ?? "";

    expect(labels).toHaveLength(5);
    expect(
      labels.map((label) => [...label.children].map((line) => line.textContent)),
    ).toEqual([
      ["Añadir", "nuevo", "cliente"],
      ["Modificar", "cliente"],
      ["Eliminar", "cliente"],
      ["Ordenar", "clientes"],
      ["Editar", "Sobre mí"],
    ]);
    labels.forEach((label) =>
      expect(label).toHaveClass("admin-dashboard__action-title"),
    );
    expect(buttonRule).toContain("display: grid");
    expect(buttonRule).toContain('grid-template-areas: "card"');
    expect(titleRule).toContain(
      "font-size: clamp(1.5rem, 2.4vw, 2.5rem)",
    );
    expect(titleRule).toContain("align-self: center");
    expect(titleRule).toContain("justify-self: center");
    expect(titleRule).toContain("text-align: center");
  });

  it("reorders every client locally and persists only when requested", async () => {
    const clients = [
      { id: "rambla", name: "Rambla", year: "2026", sortOrder: 0 },
      { id: "aqualand", name: "Aqualand", year: "2025", sortOrder: 1 },
      { id: "el-tori", name: "El Tori", year: "2026", sortOrder: 2, comingSoon: true },
    ];
    const service = createService({
      getSession: vi.fn().mockResolvedValue({ user: { id: "admin-user" } }),
      isAdmin: vi.fn().mockResolvedValue(true),
      listClients: vi.fn().mockResolvedValue(clients),
    });
    render(<AdminPage service={service} />);

    fireEvent.click(
      await screen.findByRole("button", { name: /Ordenar clientes/i }),
    );
    const rows = await screen.findAllByTestId("client-order-row");

    fireEvent.dragStart(rows[2]);
    fireEvent.dragEnter(rows[0]);
    fireEvent.drop(rows[0]);

    expect(screen.getAllByTestId("client-order-name").map((node) => node.textContent)).toEqual([
      "El Tori",
      "Rambla",
      "Aqualand",
    ]);
    expect(screen.getAllByTestId("client-order-position").map((node) => node.textContent)).toEqual([
      "1",
      "2",
      "3",
    ]);
    expect(service.saveClientOrder).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Guardar orden" }));

    await waitFor(() => expect(service.saveClientOrder).toHaveBeenCalledOnce());
    expect(service.saveClientOrder).toHaveBeenCalledWith([
      "el-tori",
      "rambla",
      "aqualand",
    ]);
  });

  it("never renders the dashboard for an unauthenticated visitor", async () => {
    render(<AdminPage service={createService()} />);

    expect(screen.getByText("Verificando sesión…")).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Administración portfolio" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Añadir nuevo cliente")).not.toBeInTheDocument();
    expect(screen.queryByText(/crear cuenta|registrarse/i)).not.toBeInTheDocument();
  });

  it("shows an explicit error after an invalid login", async () => {
    const service = createService({
      signIn: vi.fn().mockRejectedValue(new Error("Invalid login credentials")),
    });
    render(<AdminPage service={service} />);

    await screen.findByRole("heading", { name: "Administración portfolio" });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "sol@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "incorrecta" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Credenciales incorrectas",
    );
  });

  it("logs out and returns to login without leaving the dashboard visible", async () => {
    const user = { id: "admin-user" };
    const service = createService({
      getSession: vi.fn().mockResolvedValue({ user }),
      isAdmin: vi.fn().mockResolvedValue(true),
    });
    render(<AdminPage service={service} />);

    expect(
      await screen.findByRole("button", { name: "Cerrar sesión" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    await waitFor(() => expect(service.signOut).toHaveBeenCalledOnce());
    expect(
      await screen.findByRole("heading", { name: "Administración portfolio" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Añadir nuevo cliente")).not.toBeInTheDocument();
  });

  it("uses Oswald only for Admin titles and Montserrat for the remaining UI", () => {
    const styles = readFileSync("src/styles/admin.css", "utf8");

    expect(styles).not.toContain("var(--font-display)");
    expect(styles).toMatch(
      /\.admin-login,[\s\S]*?font-family:\s*var\(--font-profile\)/,
    );
    expect(styles).toMatch(
      /\.admin-login h1,[\s\S]*?font-family:\s*var\(--font-utility\)/,
    );
    expect(styles).toMatch(
      /\.admin-editor__section-header > h2[\s\S]*?font-family:\s*var\(--font-profile\)/,
    );
    expect(styles).toMatch(
      /\.admin-about__section > h2[\s\S]*?font-family:\s*var\(--font-profile\)/,
    );
    expect(styles).toMatch(
      /\.admin-login button,[\s\S]*?font-family:\s*inherit/,
    );
    expect(styles).toContain("--admin-inline-padding:");
    expect(styles).toMatch(
      /\.admin-login form\s*{[\s\S]*?padding-inline:\s*var\(--admin-inline-padding\)/,
    );
  });

  it("removes accents only from the visible Admin heading text", async () => {
    const user = { id: "admin-user" };
    const service = createService({
      getSession: vi.fn().mockResolvedValue({ user }),
      isAdmin: vi.fn().mockResolvedValue(true),
    });
    render(<AdminPage service={service} />);

    fireEvent.click(
      await screen.findByRole("button", { name: /Añadir nuevo cliente/i }),
    );

    const catalogsHeading = screen.getByRole("heading", {
      level: 2,
      name: "Catálogos",
    });

    expect(catalogsHeading).toHaveTextContent("Catalogos");
  });

  it("keeps the structural About subtitle out of the editor and saves variable content once", async () => {
    const user = { id: "admin-user" };
    const service = createService({
      getSession: vi.fn().mockResolvedValue({ user }),
      isAdmin: vi.fn().mockResolvedValue(true),
    });
    render(<AdminPage service={service} />);

    fireEvent.click(
      await screen.findByRole("button", { name: /Editar Sobre mí/ }),
    );

    const graphicDesign = await screen.findByDisplayValue(/Texto de dise.o uno/);
    expect(screen.queryByRole("heading", { name: "Perfil" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Perfil")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("PERFIL / EXPERIENCIA")).not.toBeInTheDocument();

    fireEvent.change(graphicDesign, { target: { value: "DiseÃ±o actualizado" } });
    expect(service.saveAboutContent).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(service.saveAboutContent).toHaveBeenCalledOnce(),
    );
    expect(service.saveAboutContent).toHaveBeenCalledWith(
      expect.objectContaining({
        graphicDesign: [
          expect.stringContaining("actualizado"),
          expect.stringContaining("dos"),
        ],
      }),
    );
    expect(service.saveAboutContent.mock.calls[0][0]).not.toHaveProperty("profile");
    expect(
      await screen.findByRole("heading", {
        name: "Cambios guardados correctamente",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver Sobre mí en el portfolio" })).toHaveAttribute(
      "href",
      "/#sobre-mi",
    );
  });

  it("preserves About edits after a failed save so the admin can retry", async () => {
    const user = { id: "admin-user" };
    const service = createService({
      getSession: vi.fn().mockResolvedValue({ user }),
      isAdmin: vi.fn().mockResolvedValue(true),
      saveAboutContent: vi
        .fn()
        .mockRejectedValueOnce(new Error("La actualización fue rechazada"))
        .mockResolvedValueOnce(aboutContent),
    });
    render(<AdminPage service={service} />);

    fireEvent.click(
      await screen.findByRole("button", { name: /Editar Sobre mí/ }),
    );
    const graphicDesign = await screen.findByDisplayValue(/Texto de dise.o uno/);
    fireEvent.change(graphicDesign, { target: { value: "Texto que no debe perderse" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La actualización fue rechazada",
    );
    expect(graphicDesign).toHaveValue("Texto que no debe perderse");

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(service.saveAboutContent).toHaveBeenCalledTimes(2));
  });

  it("removes Resumen and accepts a named custom section with multiple files", async () => {
    const user = { id: "admin-user" };
    const service = createService({
      getSession: vi.fn().mockResolvedValue({ user }),
      isAdmin: vi.fn().mockResolvedValue(true),
    });
    render(<AdminPage service={service} />);

    fireEvent.click(
      await screen.findByRole("button", { name: /adir nuevo cliente/i }),
    );

    expect(screen.queryByLabelText("Resumen")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Banners" })).toBeInTheDocument();
    expect(screen.getByLabelText("Título público")).toHaveValue("Banners");
    expect(screen.getByRole("heading", { level: 3, name: "Desktop / tablet grande" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Mobile" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /adir secci.n/i }));
    fireEvent.change(screen.getByLabelText("Nombre de la secciÃ³n"), {
      target: { value: "Identidad visual" },
    });

    const files = [
      new File(["one"], "uno.jpg", { type: "image/jpeg" }),
      new File(["two"], "dos.png", { type: "image/png" }),
    ];
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fireEvent.change(fileInputs[fileInputs.length - 1], { target: { files } });

    expect(screen.getByText("uno.jpg")).toBeInTheDocument();
    expect(screen.getByText("dos.png")).toBeInTheDocument();
  });
});
