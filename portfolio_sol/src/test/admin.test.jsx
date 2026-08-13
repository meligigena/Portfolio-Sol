import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

  it("centers the login title as a left-aligned editorial block", async () => {
    render(<AdminPage service={createService()} />);

    const heading = await screen.findByRole("heading", {
      name: /Administraci.n portfolio/i,
    });
    const styles = readFileSync("src/styles/admin.css", "utf8");
    const titleRule =
      styles.match(/\.admin-login h1\.admin-login__title\s*\{[^}]+}/)?.[0] ?? "";

    expect(heading).toHaveClass("admin-login__title");
    expect([...heading.children].map((line) => line.textContent)).toEqual([
      "Administracion",
      "portfolio",
    ]);
    expect(titleRule).toContain("width: fit-content");
    expect(titleRule).toContain("max-width: 100%");
    expect(titleRule).toContain("margin-inline: auto");
    expect(titleRule).toContain("text-align: left");
    expect(titleRule).toContain("font-size: clamp(2rem, 4.3vw, 3.5rem)");
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

  it.each([
    ["create", /adir nuevo cliente/i, null],
    ["edit", /Modificar cliente/i, /Cliente de prueba/i],
    ["about", /Editar Sobre m/i, null],
  ])("keeps one working Cancel action in the sticky %s form actions", async (_phase, actionName, clientName) => {
    const user = { id: "admin-user" };
    const client = {
      id: "client-id",
      slug: "cliente-de-prueba",
      storagePrefix: "cliente-de-prueba",
      name: "Cliente de prueba",
      year: "2026",
      disciplines: ["Diseño"],
      cover: "cliente-de-prueba/logo.jpg",
      content: [],
      editions: [],
    };
    const service = createService({
      getSession: vi.fn().mockResolvedValue({ user }),
      isAdmin: vi.fn().mockResolvedValue(true),
      listClients: vi.fn().mockResolvedValue([client]),
    });
    render(<AdminPage service={service} />);

    fireEvent.click(await screen.findByRole("button", { name: actionName }));
    if (clientName) {
      fireEvent.click(await screen.findByRole("button", { name: clientName }));
    }

    const cancelActions = await screen.findAllByRole("button", { name: "Cancelar" });
    expect(cancelActions).toHaveLength(1);
    const actions = cancelActions[0].closest(".admin-editor__actions");
    const formHeader = actions.closest("form").querySelector(".admin-editor__header");
    expect(actions).toBeInTheDocument();
    expect(formHeader.nextElementSibling).toBe(actions);

    fireEvent.click(cancelActions[0]);
    expect(await screen.findByRole("button", { name: /Modificar cliente/i })).toBeInTheDocument();
  });

  it("pins the shared form actions to the bottom without covering form content", () => {
    const styles = readFileSync("src/styles/admin.css", "utf8");
    const actionsRule =
      styles.match(/\.admin-editor__actions\s*\{[^}]+}/)?.[0] ?? "";
    const editorSpacingRule =
      styles.match(/\.admin-editor\s*\{[^}]*padding-bottom:[^}]+}/)?.[0] ?? "";
    const actionButtonRule =
      styles.match(/\.admin-editor__actions > button\s*\{[^}]+}/)?.[0] ?? "";
    const mobileStyles = styles.match(/@media \(max-width: 48rem\)[\s\S]+$/)?.[0] ?? "";

    expect(actionsRule).toContain("position: fixed");
    expect(actionsRule).toContain("bottom: 0");
    expect(actionsRule).not.toContain("top: 0");
    expect(actionsRule).toContain("display: flex");
    expect(actionsRule).toContain("background: var(--color-paper)");
    expect(actionsRule).toContain("max-width: calc(92rem");
    expect(editorSpacingRule).toContain("env(safe-area-inset-bottom)");
    expect(actionButtonRule).toContain("flex: 1 1 0");
    expect(actionButtonRule).toContain("min-width: 0");
    expect(mobileStyles).toContain("min-height: 3rem");
    expect(mobileStyles).toContain("overflow-wrap: anywhere");
  });

  it("limits the shared form action colors to precise-pointer hover", () => {
    const styles = readFileSync("src/styles/admin.css", "utf8");
    const actionButtonRule =
      styles.match(/\.admin-editor__actions > button\s*\{[^}]+}/)?.[0] ?? "";
    const hoverRule =
      styles.match(
        /@media \(hover: hover\) and \(pointer: fine\)[\s\S]*?(?=@media \(max-width: 48rem\))/,
      )?.[0] ?? "";
    const cancelHoverRule =
      hoverRule.match(
        /\.admin-editor__actions > button:not\(\.admin-confirm\):not\(:disabled\):hover\s*\{[^}]+}/,
      )?.[0] ?? "";

    expect(actionButtonRule).toContain("background-color 0.2s ease");
    expect(actionButtonRule).toContain("color 0.2s ease");
    expect(actionButtonRule).toContain("border-color 0.2s ease");
    expect(hoverRule).toContain(
      ".admin-editor__actions > button:not(.admin-confirm):not(:disabled):hover",
    );
    expect(hoverRule).toContain(
      ".admin-editor__actions > .admin-confirm:not(:disabled):hover",
    );
    expect(cancelHoverRule).toContain("border-color: #c62828");
    expect(cancelHoverRule).toContain("background: #c62828");
    expect(cancelHoverRule).not.toContain("var(--color-wine)");
    expect(hoverRule).toContain("background: #277a4a");
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
    fireEvent.change(screen.getByLabelText("Nombre de la sección"), {
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

  it("hides empty persisted sections and offers only missing standard sections", async () => {
    const user = { id: "admin-user" };
    const client = {
      id: "client-id",
      slug: "example",
      storagePrefix: "example",
      name: "Example",
      year: "2026",
      disciplines: ["Design"],
      cover: "example/logo.jpg",
      content: [
        {
          id: "posts",
          type: "postGrid",
          title: "Posts",
          items: [
            { id: "post", type: "post", src: "example/posts/one.jpg" },
          ],
        },
        { id: "empty-stories", type: "storySequence", title: "Stories", items: [] },
      ],
      editions: [],
    };
    const service = createService({
      getSession: vi.fn().mockResolvedValue({ user }),
      isAdmin: vi.fn().mockResolvedValue(true),
      listClients: vi.fn().mockResolvedValue([client]),
    });
    render(<AdminPage service={service} />);

    fireEvent.click(await screen.findByRole("button", { name: /Modificar cliente/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Example/ }));

    expect(screen.getByRole("heading", { level: 2, name: "Posts" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Stories" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Videos" })).not.toBeInTheDocument();

    const selector = screen.getByLabelText("Tipo de sección");
    expect([...selector.options].map((option) => option.textContent)).toEqual([
      "Stories",
      "Carruseles",
      "Videos",
      "Catálogos",
      "Banners",
      "Sección personalizada",
    ]);
    fireEvent.change(selector, { target: { value: "videoStack" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Añadir sección" }));

    expect(screen.getByRole("heading", { level: 2, name: "Videos" })).toBeInTheDocument();
    expect([...screen.getByLabelText("Tipo de sección").options].map((option) => option.value)).not.toContain(
      "videoStack",
    );
  });

  it("calculates missing sections independently for the active edition", async () => {
    const user = { id: "admin-user" };
    const client = {
      id: "festival-id",
      slug: "festival",
      storagePrefix: "festival",
      name: "Festival",
      year: "2026",
      disciplines: ["Eventos"],
      cover: "festival/logo.jpg",
      content: [],
      editions: [
        {
          id: "edicion-1",
          databaseId: "edition-1",
          editionKey: "edicion-1",
          label: "Edición 1",
          sortOrder: 0,
          content: [
            {
              id: "posts",
              type: "postGrid",
              title: "Posts",
              items: [{ id: "post", type: "post", src: "festival/posts/one.jpg" }],
            },
          ],
        },
        {
          id: "edicion-2",
          databaseId: "edition-2",
          editionKey: "edicion-2",
          label: "Edición 2",
          sortOrder: 1,
          content: [
            {
              id: "videos",
              type: "videoStack",
              title: "Videos",
              items: [{ id: "video", type: "video", src: "festival/videos/one.mp4" }],
            },
          ],
        },
      ],
    };
    const service = createService({
      getSession: vi.fn().mockResolvedValue({ user }),
      isAdmin: vi.fn().mockResolvedValue(true),
      listClients: vi.fn().mockResolvedValue([client]),
    });
    render(<AdminPage service={service} />);

    fireEvent.click(await screen.findByRole("button", { name: /Modificar cliente/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Festival/ }));

    expect([...screen.getByLabelText("Tipo de sección").options].map((option) => option.value)).not.toContain(
      "postGrid",
    );
    fireEvent.click(screen.getByRole("tab", { name: "Edición 2" }));
    expect([...screen.getByLabelText("Tipo de sección").options].map((option) => option.value)).toContain(
      "postGrid",
    );
  });

  it("shows the current logo and discards replace or remove drafts on Cancel", async () => {
    const user = { id: "admin-user" };
    const client = {
      id: "client-id",
      slug: "example",
      storagePrefix: "example",
      name: "Example",
      year: "2026",
      disciplines: ["Design"],
      cover: "example/logo.jpg",
      content: [],
      editions: [],
    };
    const service = createService({
      getSession: vi.fn().mockResolvedValue({ user }),
      isAdmin: vi.fn().mockResolvedValue(true),
      listClients: vi.fn().mockResolvedValue([client]),
    });
    render(<AdminPage service={service} />);

    fireEvent.click(await screen.findByRole("button", { name: /Modificar cliente/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Example/ }));
    expect(screen.getByAltText("Logo actual de Example")).toBeInTheDocument();
    const replacement = new File(["replacement"], "replacement.png", {
      type: "image/png",
    });
    fireEvent.change(document.querySelector('input[type="file"]'), {
      target: { files: [replacement] },
    });
    expect(screen.getByAltText("Preview de replacement.png")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(service.saveClient).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: /Modificar cliente/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Example/ }));
    expect(screen.getByAltText("Logo actual de Example")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(screen.getByText("Se eliminará al confirmar")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(service.saveClient).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: /Modificar cliente/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Example/ }));
    expect(screen.getByAltText("Logo actual de Example")).toBeInTheDocument();
  });

  it("creates and discards arbitrary local editions without losing tab drafts", async () => {
    const user = { id: "admin-user" };
    const service = createService({
      getSession: vi.fn().mockResolvedValue({ user }),
      isAdmin: vi.fn().mockResolvedValue(true),
    });
    render(<AdminPage service={service} />);

    fireEvent.click(
      await screen.findByRole("button", { name: /adir nuevo cliente/i }),
    );

    const usesEditions = screen.getByRole("checkbox", {
      name: "Utilizar ediciones",
    });
    expect(usesEditions).not.toBeChecked();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();

    fireEvent.click(usesEditions);
    expect(screen.getByRole("tab", { name: "Edición 1" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Agregar edición" }));
    fireEvent.change(screen.getByLabelText("Tipo de sección"), {
      target: { value: "storySequence" },
    });
    fireEvent.click(screen.getByRole("button", { name: "+ Añadir sección" }));
    const story = new File(["story"], "story-edicion-2.jpg", {
      type: "image/jpeg",
    });
    const editionFileInputs = document.querySelectorAll('input[type="file"]');
    fireEvent.change(editionFileInputs[editionFileInputs.length - 1], {
      target: { files: [story] },
    });

    fireEvent.click(screen.getByRole("tab", { name: "Edición 1" }));
    expect(screen.queryByText("story-edicion-2.jpg")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Edición 2" }));
    expect(screen.getByText("story-edicion-2.jpg")).toBeInTheDocument();

    for (let index = 0; index < 4; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "+ Agregar edición" }));
    }
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Edición 1",
      "Edición 2",
      "Edición 3",
      "Edición 4",
      "Edición 5",
      "Edición 6",
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Descartar edición" }));
    expect(screen.queryByRole("tab", { name: "Edición 6" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(5);
  });

  it("reconstructs six persisted editions in sort order and isolates their content", async () => {
    const user = { id: "admin-user" };
    const festival = {
      id: "festival-id",
      slug: "festival",
      storagePrefix: "festival",
      name: "Festival",
      year: "2026",
      disciplines: ["Eventos"],
      cover: "festival/logo.jpg",
      content: [],
      editions: Array.from({ length: 6 }, (_, index) => ({
        id: `edicion-${index + 1}`,
        databaseId: `edition-db-${index + 1}`,
        editionKey: `edicion-${index + 1}`,
        label: `Edición ${index + 1}`,
        sortOrder: index,
        content: index === 3
          ? [{
              id: "edition-four-posts",
              type: "postGrid",
              title: "Posts Edición 4",
              items: [{
                id: "edition-four-post",
                type: "post",
                src: "festival/edicion-4/post.jpg",
                alt: "Contenido exclusivo de Edición 4",
              }],
            }]
          : [],
      })),
    };
    const service = createService({
      getSession: vi.fn().mockResolvedValue({ user }),
      isAdmin: vi.fn().mockResolvedValue(true),
      listClients: vi.fn().mockResolvedValue([festival]),
    });
    render(<AdminPage service={service} />);

    fireEvent.click(await screen.findByRole("button", { name: /Modificar cliente/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Festival/ }));

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Edición 1",
      "Edición 2",
      "Edición 3",
      "Edición 4",
      "Edición 5",
      "Edición 6",
    ]);
    expect(screen.queryByText("post.jpg")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Edición 4" }));
    expect(screen.getByText("post.jpg")).toBeInTheDocument();
    expect(screen.getAllByText("post.jpg")).toHaveLength(1);
  });

  it("shows Tardeo Edition 1 posts and stories exactly once in the editor", async () => {
    const user = { id: "admin-user" };
    const tardeo = {
      id: "tardeo-id",
      slug: "tardeo",
      storagePrefix: "tardeo",
      name: "Tardeo",
      year: "2026",
      disciplines: ["Eventos/Entretenimiento"],
      cover: "tardeo/logo.jpeg",
      content: [],
      editions: [
        {
          id: "edicion-1",
          label: "Edición 1",
          content: [
            {
              id: "posts",
              type: "mediaRows",
              title: "Posts",
              rows: [
                [
                  {
                    id: "row-1",
                    type: "video",
                    src: "tardeo/edicion 1/fila 1/one.mp4",
                    alt: "Post fila 1",
                    audioEnabled: false,
                  },
                ],
                [
                  {
                    id: "row-2",
                    type: "video",
                    src: "tardeo/edicion 1/fila 2/two.mp4",
                    alt: "Post fila 2",
                    audioEnabled: true,
                  },
                ],
              ],
            },
            {
              id: "stories",
              type: "storySequence",
              title: "Stories",
              items: [
                {
                  id: "story",
                  type: "story",
                  src: "tardeo/edicion 1/stories/one.jpg",
                  alt: "Story Edición 1",
                },
              ],
            },
          ],
        },
      ],
    };
    const service = createService({
      getSession: vi.fn().mockResolvedValue({ user }),
      isAdmin: vi.fn().mockResolvedValue(true),
      listClients: vi.fn().mockResolvedValue([tardeo]),
    });
    render(<AdminPage service={service} />);

    fireEvent.click(await screen.findByRole("button", { name: /Modificar cliente/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Tardeo/ }));

    expect(screen.getByRole("heading", { name: "Edición 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Fila 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Fila 2" })).toBeInTheDocument();
    expect(screen.getAllByText("one.mp4")).toHaveLength(1);
    expect(screen.getAllByText("two.mp4")).toHaveLength(1);
    expect(screen.getAllByText("one.jpg")).toHaveLength(1);
  });

  it("shows one Rambla Video Story preview without an add-another action", async () => {
    const user = { id: "admin-user" };
    const rambla = {
      id: "rambla-id",
      slug: "rambla",
      storagePrefix: "rambla",
      name: "Rambla",
      year: "2026",
      disciplines: ["Eventos/Entretenimiento"],
      cover: "rambla/logo.jpg",
      content: [
        {
          id: "stories",
          type: "storySequence",
          title: "Stories",
          presentation: "dualPhoneVideo",
          items: [
            { id: "story", type: "story", src: "rambla/stories/one.jpg" },
          ],
          companionVideo: {
            id: "companion",
            type: "video",
            src: "rambla/stories/companion.mp4",
            alt: "Video companion de Rambla",
            audioEnabled: false,
          },
        },
      ],
      editions: [],
    };
    const service = createService({
      getSession: vi.fn().mockResolvedValue({ user }),
      isAdmin: vi.fn().mockResolvedValue(true),
      listClients: vi.fn().mockResolvedValue([rambla]),
    });
    render(<AdminPage service={service} />);

    fireEvent.click(await screen.findByRole("button", { name: /Modificar cliente/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Rambla/ }));

    const videoStory = screen
      .getByRole("heading", { name: "Video Story" })
      .closest(".admin-media-group");
    const videoStoryUi = within(videoStory);
    expect(videoStoryUi.getAllByLabelText("Video companion de Rambla")).toHaveLength(1);
    expect(videoStoryUi.getByRole("button", { name: "Reemplazar" })).toBeInTheDocument();
    expect(videoStoryUi.queryByRole("button", { name: "Seleccionar archivos" })).not.toBeInTheDocument();
    expect(videoStoryUi.queryByRole("button", { name: "Seleccionar archivo" })).not.toBeInTheDocument();
    expect(videoStoryUi.getByLabelText("Permitir sonido")).not.toBeChecked();
  });
});
