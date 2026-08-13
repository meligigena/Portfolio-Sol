import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppRouter } from "../app/router";
import { NetworkTitle } from "../components/typography/NetworkTitle";
import { getClientBySlug } from "../data/clients";
import { contact } from "../data/contact";
import { portfolioMediaUrl } from "../lib/portfolioMedia";
import { About } from "../sections/About";
import { StorySequence } from "../components/media/StorySequence";

const aboutContent = {
  profile: "PERFIL / EXPERIENCIA",
  graphicDesign: [
    "Desarrollo de piezas visuales para marcas y redes sociales, adaptadas a las necesidades estéticas y comunicacionales de cada cliente.",
    "Conceptualización y diseño con foco en la identidad visual, asegurando coherencia, impacto y profesionalismo en cada entrega.",
  ],
  videoEditing: [
    "Edición creativa y narrativa de contenido audiovisual para plataformas digitales, con especial atención al ritmo, estilo y mensaje.",
    "Adaptación de videos a distintos formatos y objetivos (reels, TikToks, presentaciones, contenido institucional), maximizando el engagement y la calidad visual.",
  ],
  keySkills: [
    "Comunicación visual clara y efectiva",
    "Creatividad y pensamiento conceptual",
    "Capacidad de adaptación a diferentes estilos y marcas",
    "Resolución ágil y proactiva de problemas",
  ],
  technicalSkills: [
    "Canva",
    "CapCut",
    "Adobe Illustrator",
    "Adobe Photoshop",
    "Adobe Premiere Pro",
    "Google Drive",
  ],
  languages: [
    "Inglés C1 — Cambridge University",
    "Portugués conversacional",
  ],
};

function renderRoute(path = "/") {
  const router = createAppRouter([path]);
  render(<RouterProvider router={router} />);
  return router;
}

function mockIntersectionObserver() {
  const instances = [];

  class MockIntersectionObserver {
    constructor(callback) {
      this.callback = callback;
      this.disconnect = vi.fn();
      this.observe = vi.fn();
      instances.push(this);
    }
  }

  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  return instances;
}

function collectVideoSources(value) {
  if (Array.isArray(value)) {
    return value.flatMap(collectVideoSources);
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const ownSource =
    value.type === "video" && typeof value.src === "string" ? [value.src] : [];
  const nestedSources = Object.entries(value)
    .filter(([key]) => key !== "src")
    .flatMap(([, nestedValue]) => collectVideoSources(nestedValue));

  return [...ownSource, ...nestedSources];
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete document.fonts;
});

describe("portfolio routes", () => {
  it.each([
    ["/sobre-mi", "#sobre-mi"],
    ["/contacto", "#contacto"],
  ])("resolves the shared section route %s inside the Home SPA", async (path, hash) => {
    const router = renderRoute(path);

    expect(
      await screen.findByRole("heading", { level: 1, name: "PORTFOLIO" }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
    expect(router.state.location.hash).toBe(hash);
  });

  it("renders the Home content", () => {
    renderRoute();

    expect(
      screen.getByRole("heading", { level: 1, name: "PORTFOLIO" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Sobre mí" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Contacto" }),
    ).toBeInTheDocument();
  });

  it("keeps the hero title hidden until the Network font is ready", async () => {
    let resolveFont;
    const fontLoad = new Promise((resolve) => {
      resolveFont = resolve;
    });
    const load = vi.fn(() => fontLoad);

    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { load, ready: Promise.resolve() },
    });

    renderRoute();

    const title = screen.getByRole("heading", { level: 1, name: "PORTFOLIO" });
    const indexHtml = readFileSync("index.html", "utf8");
    const heroStyles = readFileSync("src/styles/hero.css", "utf8");

    expect(load).toHaveBeenCalledWith('400 1em "Network Free"');
    expect(title).toHaveAttribute("data-font-ready", "false");
    expect(indexHtml).toMatch(
      /rel="preload"[^>]+as="font"[^>]+NetworkFreeVersion\.ttf/,
    );
    expect(heroStyles).toMatch(
      /\.hero__title\[data-font-ready="false"\][^{]*\{[^}]*visibility:\s*hidden/,
    );

    await act(async () => resolveFont([]));

    expect(title).toHaveAttribute("data-font-ready", "true");
  });

  it("renders exactly the definitive nine-client sequence", () => {
    renderRoute();

    expect(
      [...document.querySelectorAll(".client-card__link")].map((link) =>
        link.getAttribute("aria-label"),
      ),
    ).toEqual([
      "Rambla",
      "Aqualand",
      "Tardeo",
      "Peumax",
      "Desnac",
      "Sistemas Móviles",
      "Vectus",
      "Maja",
      "El Tori",
    ]);
    expect(document.querySelectorAll(".client-card")).toHaveLength(9);
    expect(document.body).not.toHaveTextContent(/CLIENTE PENDIENTE|ASSET PENDIENTE/);
  });

  it("uses the web H.264 routes for every converted fallback video", () => {
    const expectedSources = [
      "desnac/videos/apps desnac 2-web-h264.mp4",
      "desnac/videos/Copia de IMG_6492-web-h264.mp4",
      "desnac/videos/Copia de power bi-web-h264.mp4",
      "maja/videos/copy_349D56FE-B414-4951-96AF-7B78D52889BF-web-h264.mp4",
      "maja/videos/copy_75EBDB0E-FA48-4E6B-8826-7A4370218237-web-h264.mp4",
      "maja/videos/copy_b0a4a16b55120efed5db24eb404cc356-web-h264.mp4",
      "maja/videos/copy_23CA139B-41CF-4ED6-8F98-FAC3BB8634F4-web-h264.mp4",
      "rambla/videos/Copia de copy_B191B18E-8D69-40E0-B36C-61C96D1EA930-web-h264.mp4",
      "rambla/videos/Copia de rambla 2.0-web-h264.mp4",
      "rambla/videos/Copia de Rambla godere video 1-web-h264.mp4",
      "rambla/videos/Copia de video rejunte 1-web-h264.mp4",
      "sistemas-moviles/videos/0810(1)-web-h264.mp4",
      "sistemas-moviles/videos/Copia de sistemas hik vision-web-h264.mp4",
      "tardeo/edicion 1/fila 1/club tardeo max carra-web-h264.mp4",
      "tardeo/edicion 1/fila 1/jaime tardeo-web-h264.mp4",
      "tardeo/edicion 1/fila 1/la vuelta banda tardeo-web-h264.mp4",
      "tardeo/edicion 1/fila 1/mati marquez tardeo-web-h264.mp4",
      "tardeo/edicion 1/fila 1/tardeo mica marquez-web-h264.mp4",
      "tardeo/edicion 1/fila 1/tardeo tomi lujan-web-h264.mp4",
      "tardeo/edicion 1/fila 2/Copia de max carra tardeo-web-h264.mp4",
      "tardeo/edicion 1/fila 2/tardeo early-web-h264.mp4",
      "tardeo/edicion 1/fila 2/tardeo final-web-h264.mp4",
    ];
    const convertedSources = [
      "desnac",
      "maja",
      "rambla",
      "sistemas-moviles",
      "tardeo",
    ]
      .flatMap((slug) => collectVideoSources(getClientBySlug(slug)))
      .filter((source) => source !== "rambla/stories/historias rambla.mp4");

    expect([...new Set(convertedSources)].sort()).toEqual(expectedSources.sort());
    expect(getClientBySlug("rambla").projects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: "rambla/stories/historias rambla.mp4" }),
      ]),
    );
  });

  it("uses one non-overlapping Network title treatment everywhere", async () => {
    const globalStyles = readFileSync("src/styles/global.css", "utf8");
    const networkRule =
      globalStyles.match(/\.network-title\s*{[^}]+}/)?.[0] ?? "";
    const router = renderRoute();

    [
      screen.getByRole("heading", { level: 1, name: "PORTFOLIO" }),
      screen.getByRole("heading", { level: 2, name: "MIS TRABAJOS" }),
      screen.getByRole("heading", { level: 2, name: "Sobre mí" }),
      screen.getByRole("heading", { level: 2, name: "Contacto" }),
    ].forEach((heading) => expect(heading).toHaveClass("network-title"));

    await router.navigate("/portfolio/rambla");
    expect(
      await screen.findByRole(
        "heading",
        { level: 1, name: "Rambla" },
        { timeout: 3000 },
      ),
    ).toHaveClass("network-title");
    expect(networkRule).toContain("font-family: var(--font-display)");
    expect(networkRule).toContain("font-kerning: none");
    expect(networkRule).toContain("letter-spacing: 0");
    expect(networkRule).not.toMatch(/letter-spacing:\s*-/);
  });

  it("removes accents only from the visible Network title text", () => {
    render(<NetworkTitle as="h2" text="Árbol, pingüino y corazón" />);

    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Árbol, pingüino y corazón",
    });

    expect(heading).toHaveTextContent("Arbol, pinguino y corazon");
    expect(heading).toHaveClass("network-title");
  });

  it("repairs mojibake only for heading presentation without mutating the source", () => {
    const sourceTitle = "CreaciÃ³n de marca";
    render(<NetworkTitle as="h2" text={sourceTitle} />);

    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Creación de marca",
    });

    expect(heading).toHaveTextContent("Creacion de marca");
    expect(sourceTitle).toBe("CreaciÃ³n de marca");
  });

  it("keeps real client names while normalizing only Network headings", async () => {
    const router = renderRoute();
    const aboutHeading = screen.getByRole("heading", { level: 2, name: "Sobre mí" });

    expect(aboutHeading).toHaveTextContent("Sobre mi");
    expect(
      screen.getByRole("heading", { level: 3, name: "Sistemas Móviles" }),
    ).toHaveTextContent("Sistemas Móviles");

    await router.navigate("/portfolio/sistemas-moviles");
    const clientHeading = await screen.findByRole(
      "heading",
      {
        level: 1,
        name: "Sistemas Móviles",
      },
      { timeout: 3000 },
    );

    expect(clientHeading).toHaveTextContent("Sistemas Moviles");
  });

  it("keeps section dividers separate from their titles", () => {
    renderRoute();

    ["portfolio", "sobre-mi", "contacto"].forEach((sectionId) => {
      const section = document.getElementById(sectionId);
      const header = section.querySelector("header");
      const divider = header.querySelector("[data-section-divider]");
      const heading = header.querySelector("h2");

      expect(divider).toBeInTheDocument();
      expect(
        divider.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  it("keeps the Portfolio heading layered above the horizontal client rail", () => {
    const styles = readFileSync("src/styles/portfolio.css", "utf8");
    const headerRule = styles.match(/\.portfolio-rail__header\s*{[^}]+}/)?.[0] ?? "";
    const stageRule = styles.match(/\.portfolio-rail__stage\s*{[^}]+}/)?.[0] ?? "";

    expect(headerRule).toContain("position: relative");
    expect(headerRule).toContain("z-index: 3");
    expect(stageRule).toContain("position: relative");
    expect(stageRule).toContain("z-index: 1");
  });

  it("renders the Hero letters without clipping wrappers", () => {
    renderRoute();

    const title = screen.getByRole("heading", { level: 1, name: "PORTFOLIO" });
    const letters = [...title.children];

    expect(title.querySelector(".hero__title-reveal")).not.toBeInTheDocument();
    expect(letters).toHaveLength(9);
    expect(letters.every((letter) => letter.classList.contains("hero__letter"))).toBe(
      true,
    );
  });

  it("uses an expanded clipping path for the Hero title reveal", () => {
    const styles = readFileSync("src/styles/hero.css", "utf8");
    const titleRule = styles.match(/\.hero__title\s*{[^}]+}/)?.[0] ?? "";

    expect(titleRule).toContain("--hero-title-reveal: -8%");
    expect(titleRule).toContain("clip-path: polygon");
    expect(titleRule).toContain("-22%");
    expect(titleRule).toContain("122%");
  });

  it("renders updated section headings and the personal photograph", () => {
    renderRoute();

    expect(
      screen.getByRole("heading", { level: 2, name: "MIS TRABAJOS" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Portfolio" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Sol Fanara" })).toHaveAttribute(
      "src",
      "/fotografia_personal.jpeg",
    );
  });

  it("places About block dividers below their headings", () => {
    renderRoute();

    [
      "DISEÑO GRÁFICO",
      "EDICIÓN DE VIDEO",
      "Habilidades clave",
      "Habilidades técnicas",
      "Idiomas",
    ].forEach((label) => {
      const heading = screen.getByText(label);
      const divider = heading.nextElementSibling;

      expect(divider).toHaveAttribute("data-block-divider");
    });
  });

  it("renders key skills without trailing punctuation", () => {
    render(<About content={aboutContent} />);

    [
      "Comunicación visual clara y efectiva",
      "Creatividad y pensamiento conceptual",
      "Capacidad de adaptación a diferentes estilos y marcas",
      "Resolución ágil y proactiva de problemas",
    ].forEach((skill) => {
      expect(screen.getByText(skill)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Comunicación visual clara y efectiva\./)).not.toBeInTheDocument();
  });

  it("renders About content supplied by the database without changing its layout", () => {
    render(<About content={aboutContent} />);

    expect(screen.getByText("PERFIL / EXPERIENCIA")).toBeInTheDocument();
    expect(screen.getByText("Portugués conversacional")).toBeInTheDocument();
    expect(document.querySelector(".about__lead")).toBeInTheDocument();
    expect(document.querySelector(".about__skills")).toBeInTheDocument();
  });

  it("uses the same text element for the main contact actions", () => {
    renderRoute();

    const primaryTexts = document.querySelectorAll(".contact__primary-text");

    expect(primaryTexts).toHaveLength(2);
    expect(primaryTexts[0]).toHaveTextContent("fanaraasol@gmail.com");
    expect(primaryTexts[1]).toHaveTextContent("Escribir por Whatsapp");
  });

  it("groups both contact icons and texts as consistent actions", () => {
    renderRoute();

    const groups = document.querySelectorAll(".contact__action-content");

    expect(groups).toHaveLength(2);
    groups.forEach((group) => {
      expect(group.firstElementChild.tagName).toBe("svg");
      expect(group.lastElementChild).toHaveClass("contact__primary-text");
    });
    expect(screen.queryByText("EMAIL")).not.toBeInTheDocument();
  });

  it("renders keyboard-accessible web contact links", () => {
    renderRoute();

    const emailLink = screen.getByRole("link", { name: contact.email });
    const whatsappLink = screen.getByRole("link", {
      name: "Escribir por Whatsapp",
    });

    expect(emailLink).toHaveAttribute("href", contact.emailHref);
    expect(emailLink).toHaveAttribute("target", "_blank");
    expect(emailLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(emailLink.tabIndex).toBe(0);

    expect(whatsappLink).toHaveAttribute("href", contact.whatsappHref);
    expect(whatsappLink).toHaveAttribute("target", "_blank");
    expect(whatsappLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(whatsappLink.tabIndex).toBe(0);
  });

  it("renders Peumax with its real client metadata", () => {
    renderRoute();

    const peumaxLink = screen.getByRole("link", { name: "Peumax" });

    expect(peumaxLink).toBeInTheDocument();
    expect(peumaxLink.querySelector(".client-card__preview img")).toHaveAttribute(
      "src",
      portfolioMediaUrl("peumax/logo.jpeg"),
    );
    expect(peumaxLink.querySelector(".client-card__preview")).toHaveClass(
      "client-card__preview--asset",
    );
    expect(
      [...peumaxLink.querySelectorAll(".client-card__meta > *")].map((item) =>
        item.textContent.trim(),
      ),
    ).toEqual(["Peumax", "2024", "Repuestos de Automotores"]);
    expect(screen.getByText("Repuestos de Automotores")).toBeInTheDocument();
    expect(screen.getAllByText("2024")).toHaveLength(2);
  });

  it("renders Aqualand with its real client metadata", () => {
    renderRoute();

    const aqualandLink = screen.getByRole("link", { name: "Aqualand" });

    expect(aqualandLink).toBeInTheDocument();
    expect(aqualandLink.querySelector(".client-card__preview img")).toHaveAttribute(
      "src",
      portfolioMediaUrl("aqualand/logo.jpg"),
    );
    expect(
      [...aqualandLink.querySelectorAll(".client-card__meta > *")].map((item) =>
        item.textContent.trim(),
      ),
    ).toEqual(["Aqualand", "2025", "Venta de artículos varios"]);
  });

  it("renders Vectus with its real client metadata", () => {
    renderRoute();

    const vectusLink = screen.getByRole("link", { name: "Vectus" });

    expect(vectusLink).toBeInTheDocument();
    expect(vectusLink.querySelector(".client-card__preview img")).toHaveAttribute(
      "src",
      portfolioMediaUrl("vectus/logo.jpg"),
    );
    expect(
      [...vectusLink.querySelectorAll(".client-card__meta > *")].map((item) =>
        item.textContent.trim(),
      ),
    ).toEqual(["Vectus", "2025", "Ciberseguridad"]);
  });

  it("renders Tardeo as one client with its confirmed metadata", () => {
    renderRoute();

    const tardeoLink = screen.getByRole("link", { name: "Tardeo" });

    expect(tardeoLink).toBeInTheDocument();
    expect(tardeoLink.querySelector(".client-card__preview img")).toHaveAttribute(
      "src",
      portfolioMediaUrl("tardeo/logo.jpeg"),
    );
    expect(
      [...tardeoLink.querySelectorAll(".client-card__meta > *")].map((item) =>
        item.textContent.trim(),
      ),
    ).toEqual(["Tardeo", "2026", "Eventos/Entretenimiento"]);
    expect(tardeoLink).toHaveAttribute("href", "/portfolio/tardeo");
  });

  it.each([
    {
      name: "Sistemas Móviles",
      href: "/portfolio/sistemas-moviles",
      cover: "sistemas-moviles/logo.jpg",
      metadata: ["Sistemas Móviles", "2025", "Sistemas de Seguridad"],
    },
    {
      name: "Rambla",
      href: "/portfolio/rambla",
      cover: "rambla/logo.jpg",
      metadata: ["Rambla", "2026", "Eventos/Entretenimiento"],
    },
    {
      name: "Maja",
      href: "/portfolio/maja",
      cover: "maja/logo.png",
      metadata: ["Maja", "2024", "Estética"],
    },
  ])("renders $name from its real folder and metadata", ({ cover, href, metadata, name }) => {
    renderRoute();

    const clientLink = screen.getByRole("link", { name });

    expect(clientLink).toHaveAttribute("href", href);
    expect(clientLink.querySelector(".client-card__preview img")).toHaveAttribute(
      "src",
      portfolioMediaUrl(cover),
    );
    expect(
      [...clientLink.querySelectorAll(".client-card__meta > *")].map((item) =>
        item.textContent.trim(),
      ),
    ).toEqual(metadata);
  });

  it("renders El Tori with its confirmed metadata", () => {
    renderRoute();

    const toriLink = screen.getByRole("link", { name: "El Tori" });

    expect(toriLink.querySelector(".client-card__preview img")).toHaveAttribute(
      "src",
      portfolioMediaUrl("tori/logo.jpeg"),
    );
    expect(
      [...toriLink.querySelectorAll(".client-card__meta > *")].map((item) =>
        item.textContent.trim(),
      ),
    ).toEqual(["El Tori", "2026", "Restobar"]);
  });

  it("renders Desnac with its newly available real cover", () => {
    renderRoute();

    const desnacLink = screen.getByRole("link", { name: "Desnac" });

    expect(desnacLink).toBeInTheDocument();
    expect(desnacLink.querySelector(".client-card__preview img")).toHaveAttribute(
      "src",
      portfolioMediaUrl("desnac/logo.jpg"),
    );
    expect(
      [...desnacLink.querySelectorAll(".client-card__meta > *")].map((item) =>
        item.textContent.trim(),
      ),
    ).toEqual(["Desnac", "2025", "Empresa de Software"]);
  });

  it("keeps the Peumax introduction concise and free of case numbering", async () => {
    renderRoute("/portfolio/peumax");

    await screen.findByRole("heading", { level: 1, name: "Peumax" });

    expect(screen.getAllByText("Repuestos de Automotores")).toHaveLength(1);
    expect(screen.queryByText(/CASO \d{2} \/ \d{2}/i)).not.toBeInTheDocument();
  });

  it("navigates from a client selection to its route", async () => {
    const router = renderRoute();

    fireEvent.click(
      screen.getByRole("link", { name: "Peumax" }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/portfolio/peumax");
    });
  });

  it("renders every real Peumax asset in the correct presentation", async () => {
    renderRoute("/portfolio/peumax");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Peumax" }),
    ).toBeInTheDocument();

    const storyDevice = document.querySelector("[data-story-device]");
    const storySlides = document.querySelectorAll("[data-story-slide]");
    const posts = document.querySelectorAll('[data-media-kind="post"]');

    expect(document.querySelectorAll("[data-story-device]")).toHaveLength(1);
    expect(storySlides).toHaveLength(8);
    const feedBlocks = [...document.querySelectorAll("[data-feed-block]")];
    const carouselPairs = document.querySelectorAll("[data-carousel-pair]");
    const carousels = document.querySelectorAll("[data-carousel]");

    expect(posts).toHaveLength(8);
    expect(carousels).toHaveLength(2);
    expect(carouselPairs).toHaveLength(1);
    expect(storyDevice.querySelectorAll(".project-media__phone")).toHaveLength(1);
    expect(storyDevice.querySelector(".project-media__phone-frame")).toHaveAttribute(
      "src",
      "/iphone.png",
    );
    storySlides.forEach((slide) => {
      expect(slide.querySelector("img")).toHaveAttribute("width", "1080");
      expect(slide.querySelector("img")).toHaveAttribute("height", "1920");
    });
    expect(storyDevice.querySelector("figcaption")).toHaveTextContent(/^STORY$/);
    posts.forEach((post) => {
      expect(post.querySelector(".project-media__phone")).not.toBeInTheDocument();
      expect(post.querySelector("img")).toHaveAttribute("width", "1080");
      expect(post.querySelector("img")).toHaveAttribute("height", "1350");
      expect(post.querySelector("figcaption")).toHaveTextContent(/^POST$/);
    });

    expect(feedBlocks.map((block) => block.getAttribute("data-feed-block"))).toEqual([
      "postPair",
      "postPair",
      "postPair",
      "postPair",
    ]);
    expect(feedBlocks[0].querySelectorAll('[data-media-kind="post"]')).toHaveLength(2);
    expect(feedBlocks[1].querySelectorAll('[data-media-kind="post"]')).toHaveLength(2);
    expect(feedBlocks[2].querySelectorAll('[data-media-kind="post"]')).toHaveLength(2);
    expect(feedBlocks[3].querySelectorAll('[data-media-kind="post"]')).toHaveLength(2);
    expect(
      [...carousels].map((carousel) => carousel.querySelectorAll("[data-carousel-slide]").length),
    ).toEqual([3, 2]);
    expect(
      [...document.querySelectorAll(".case-study__sequence-title")].map((heading) =>
        heading.textContent.trim(),
      ),
    ).toEqual(["Stories", "Posts", "Carruseles"]);
    expect(document.querySelector(".case-study__media")).not.toHaveTextContent(
      /\.jpe?g|\.png|carrusel A|carrusel B/i,
    );
    expect(screen.queryByText("ENTREGABLES")).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+ PIEZAS/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Stories" })).toHaveClass(
      "case-study__sequence-title",
    );
    expect(screen.getByRole("heading", { name: "Posts" })).toHaveClass(
      "case-study__sequence-title",
    );
  });

  it("renders every Aqualand post before its synchronized carousel pair", async () => {
    renderRoute("/portfolio/aqualand");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Aqualand" }),
    ).toBeInTheDocument();

    const storySlides = document.querySelectorAll("[data-story-slide]");
    const feedBlocks = [...document.querySelectorAll("[data-feed-block]")];
    const posts = document.querySelectorAll('[data-media-kind="post"]');
    const carousels = document.querySelectorAll("[data-carousel]");

    expect(storySlides).toHaveLength(7);
    expect(document.querySelectorAll("[data-story-device]")).toHaveLength(1);
    expect(posts).toHaveLength(4);
    expect(carousels).toHaveLength(2);
    expect(document.querySelectorAll("[data-carousel-pair]")).toHaveLength(1);
    expect(feedBlocks.map((block) => block.getAttribute("data-feed-block"))).toEqual([
      "postPair",
      "postPair",
    ]);
    expect(feedBlocks[0].querySelectorAll('[data-media-kind="post"]')).toHaveLength(2);
    expect(feedBlocks[1].querySelectorAll('[data-media-kind="post"]')).toHaveLength(2);
    expect(
      [...carousels].map((carousel) => carousel.querySelectorAll("[data-carousel-slide]").length),
    ).toEqual([5, 3]);
    expect(
      [...document.querySelectorAll(".case-study__sequence-title")].map((heading) =>
        heading.textContent.trim(),
      ),
    ).toEqual(["Stories", "Posts", "Carruseles", "Catalogos"]);
    expect(document.querySelector(".case-study__media")).not.toHaveTextContent(
      /\.jpe?g|\.png|carrusel A|carrusel B/i,
    );
    document.querySelectorAll("[data-carousel] figcaption").forEach((caption) => {
      expect(caption).toHaveTextContent(/^CARRUSEL$/);
    });
  });

  it("renders Aqualand catalogs as one reusable pair in filename order", async () => {
    renderRoute("/portfolio/aqualand");

    await screen.findByRole("heading", { level: 1, name: "Aqualand" });

    const pair = document.querySelector("[data-catalog-pair]");
    const catalogs = [...pair.querySelectorAll("[data-catalog]")];

    expect(pair).toBeInTheDocument();
    expect(catalogs).toHaveLength(2);
    expect(catalogs.map((catalog) => catalog.querySelectorAll("[data-catalog-page]").length)).toEqual([
      9,
      8,
    ]);
    expect(
      [...catalogs[0].querySelectorAll("img")].map((image) => image.getAttribute("src")),
    ).toEqual(
      Array.from(
        { length: 9 },
        (_, index) =>
          portfolioMediaUrl(`aqualand/catalogos/catalogo1/${index + 1}.jpg`),
      ),
    );
  });

  it("keeps carousel labels outside the animated track", async () => {
    renderRoute("/portfolio/aqualand");

    await screen.findByRole("heading", { level: 1, name: "Aqualand" });

    document.querySelectorAll("[data-carousel]").forEach((carousel) => {
      const track = carousel.querySelector("[data-carousel-track]");
      const label = carousel.querySelector("[data-carousel-label]");

      expect(label).toHaveTextContent(/^CARRUSEL$/);
      expect(track).not.toContainElement(label);
    });
  });

  it("renders Vectus as a reusable video stack without empty content sections", async () => {
    renderRoute("/portfolio/vectus");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Vectus" }),
    ).toBeInTheDocument();

    expect(screen.queryByRole("heading", { name: "Stories" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Posts" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Videos" })).toHaveClass(
      "case-study__sequence-title",
    );
    expect(document.querySelector("[data-video-stack]")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-video-slide]")).toHaveLength(5);
    expect(document.querySelectorAll('[data-media-kind="video"]')).toHaveLength(5);
    expect(document.querySelectorAll("video")).toHaveLength(5);
    expect(
      [...document.querySelectorAll("[data-video-slide] source")].map((source) =>
        source.getAttribute("src"),
      ),
    ).toEqual([
      portfolioMediaUrl("vectus/videos/CONSEJOS-web-h264.mp4"),
      portfolioMediaUrl("vectus/videos/Copia de riesgos vectus-web-h264.mp4"),
      portfolioMediaUrl("vectus/videos/Copia de SUMMIT-web-h264.mp4"),
      portfolioMediaUrl("vectus/videos/Copia de VECTUS S21-web-h264.mp4"),
      portfolioMediaUrl("vectus/videos/Copia de webinar-web-h264.mp4"),
    ]);
    document.querySelectorAll("[data-video-slide] video").forEach((video, index) => {
      expect(video.muted).toBe(true);
      expect(video).toHaveAttribute("playsinline");
      expect(video).toHaveAttribute("preload", index === 0 ? "auto" : "none");
    });
    document.querySelectorAll("[data-video-stack] figcaption").forEach((caption) => {
      expect(caption).toHaveTextContent(/^VIDEO$/);
      expect(caption).not.toHaveTextContent(/\.mp4|\.mov/i);
    });
    expect(screen.getByRole("button", { name: "Activar sonido" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("lets the shared video stack unmute only its active video after interaction", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    renderRoute("/portfolio/vectus");

    await screen.findByRole("heading", { level: 1, name: "Vectus" });
    const soundButton = screen.getByRole("button", { name: "Activar sonido" });
    const videos = [...document.querySelectorAll("[data-video-stack] video")];

    fireEvent.click(soundButton);

    expect(soundButton).toHaveAttribute("aria-pressed", "true");
    expect(videos[0].muted).toBe(false);
    expect(videos.slice(1).every((video) => video.muted)).toBe(true);
    play.mockRestore();
  });

  it("mutes and pauses an audible stacked video as soon as it leaves the viewport", async () => {
    const observers = mockIntersectionObserver();
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause");
    renderRoute("/portfolio/vectus");

    await screen.findByRole("heading", { level: 1, name: "Vectus" });
    const soundButton = screen.getByRole("button", { name: "Activar sonido" });
    const activeVideo = document.querySelector("[data-video-stack] video");

    fireEvent.click(soundButton);
    expect(activeVideo.muted).toBe(false);

    act(() => {
      observers[0].callback([
        {
          target: activeVideo,
          isIntersecting: false,
          intersectionRatio: 0,
        },
      ]);
    });

    await waitFor(() => {
      expect(activeVideo.muted).toBe(true);
      expect(soundButton).toHaveAttribute("aria-pressed", "false");
    });
    expect(pause).toHaveBeenCalledWith();
    pause.mockRestore();
  });

  it("renders Tardeo editions from data and keeps its media in the approved order", async () => {
    renderRoute("/portfolio/tardeo");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Tardeo" }),
    ).toBeInTheDocument();

    const editionOne = screen.getByRole("tab", { name: "Edición 1" });
    const editionTwo = screen.getByRole("tab", { name: "Edición 2" });
    const rows = [...document.querySelectorAll("[data-media-row]")];
    const sectionHeadings = [...document.querySelectorAll(".case-study__sequence-title")];

    expect(editionOne).toHaveAttribute("aria-selected", "true");
    expect(editionTwo).toHaveAttribute("aria-selected", "false");
    expect(sectionHeadings.map((heading) => heading.textContent.trim())).toEqual([
      "Posts",
      "Stories",
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelectorAll("video")).toHaveLength(6);
    expect(rows[1].querySelectorAll("video")).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Activar sonido" })).toHaveLength(1);
    expect(document.querySelectorAll("[data-story-device]")).toHaveLength(1);
    expect(document.querySelectorAll("[data-story-slide]")).toHaveLength(7);
    expect(document.querySelector("[data-story-device] figcaption")).toHaveTextContent(
      /^STORY$/,
    );

    fireEvent.click(editionTwo);

    expect(editionTwo).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Próximamente")).toBeInTheDocument();
    expect(document.querySelector("[data-media-row]")).not.toBeInTheDocument();
    expect(document.querySelector("[data-story-device]")).not.toBeInTheDocument();

    fireEvent.click(editionOne);

    expect(screen.queryByText("Próximamente")).not.toBeInTheDocument();
    expect(document.querySelectorAll("[data-media-row]")).toHaveLength(2);
  });

  it("loads and plays only Tardeo videos that enter the viewport", async () => {
    const observers = mockIntersectionObserver();
    const play = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockResolvedValue(undefined);
    const router = renderRoute("/portfolio/aqualand");

    await screen.findByRole("heading", { level: 1, name: "Aqualand" });
    await router.navigate("/portfolio/tardeo");
    await screen.findByRole("heading", { level: 1, name: "Tardeo" });

    const videos = [...document.querySelectorAll("[data-media-row] video")];
    let rowObserver;

    await waitFor(() => {
      rowObserver = observers.find((observer) =>
        observer.observe.mock.calls.some(([target]) => target === videos[0]),
      );
      expect(rowObserver).toBeDefined();
    });

    expect(videos).toHaveLength(9);
    videos.forEach((video) => {
      expect(video).toHaveAttribute("preload", "none");
      expect(video).not.toHaveAttribute("autoplay");
    });
    expect(play).not.toHaveBeenCalled();

    act(() => {
      rowObserver.callback(
        videos.map((target, index) => ({
          target,
          isIntersecting: index === 0,
          intersectionRatio: index === 0 ? 0.8 : 0,
        })),
      );
    });

    expect(play).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledWith();
    play.mockRestore();
  });

  it("keeps Tardeo row one muted and only allows sound on the first video of row two", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    renderRoute("/portfolio/tardeo");

    await screen.findByRole("heading", { level: 1, name: "Tardeo" });

    const rows = [...document.querySelectorAll("[data-media-row]")];
    const firstRowVideos = [...rows[0].querySelectorAll("video")];
    const secondRowVideos = [...rows[1].querySelectorAll("video")];
    const soundButton = screen.getByRole("button", { name: "Activar sonido" });

    expect(firstRowVideos).toHaveLength(6);
    expect(secondRowVideos).toHaveLength(3);
    expect(firstRowVideos.every((video) => video.muted)).toBe(true);
    expect(secondRowVideos.every((video) => video.muted)).toBe(true);
    expect(rows[0].querySelector(".video-sound-toggle")).not.toBeInTheDocument();
    expect(rows[1].querySelectorAll(".video-sound-toggle")).toHaveLength(1);

    fireEvent.click(soundButton);

    expect(firstRowVideos.every((video) => video.muted)).toBe(true);
    expect(secondRowVideos[0].muted).toBe(false);
    expect(secondRowVideos.slice(1).every((video) => video.muted)).toBe(true);
    play.mockRestore();
  });

  it("releases Tardeo row audio when its visible video leaves the viewport", async () => {
    const observers = mockIntersectionObserver();
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause");
    renderRoute("/portfolio/tardeo");

    await screen.findByRole("heading", { level: 1, name: "Tardeo" });
    const soundButton = screen.getByRole("button", { name: "Activar sonido" });
    const audibleVideo = document.querySelector('[data-audio-enabled="true"]');

    fireEvent.click(soundButton);
    expect(audibleVideo.muted).toBe(false);

    act(() => {
      observers[0].callback([
        {
          target: audibleVideo,
          isIntersecting: false,
          intersectionRatio: 0,
        },
      ]);
    });

    await waitFor(() => {
      expect(audibleVideo.muted).toBe(true);
      expect(soundButton).toHaveAttribute("aria-pressed", "false");
    });
    expect(pause).toHaveBeenCalledWith();
    pause.mockRestore();
  });

  it("renders Sistemas Móviles with every available standard content block", async () => {
    renderRoute("/portfolio/sistemas-moviles");

    await screen.findByRole("heading", { level: 1, name: "Sistemas Móviles" });

    expect(
      [...document.querySelectorAll(".case-study__sequence-title")].map((heading) =>
        heading.textContent.trim(),
      ),
    ).toEqual(["Stories", "Posts", "Carruseles", "Videos"]);
    expect(document.querySelectorAll("[data-story-slide]")).toHaveLength(3);
    expect(document.querySelectorAll('[data-media-kind="post"]')).toHaveLength(4);
    expect(document.querySelectorAll("[data-carousel]")).toHaveLength(1);
    expect(document.querySelectorAll("[data-carousel-slide]")).toHaveLength(2);
    expect(document.querySelectorAll("[data-video-slide]")).toHaveLength(2);
  });

  it("omits descriptive category subtitles from reusable case-study headers", async () => {
    const router = renderRoute("/portfolio/aqualand");

    await screen.findByRole("heading", { level: 1, name: "Aqualand" });
    expect(document.querySelector(".case-study__media")).not.toHaveTextContent(
      /Redes Sociales|Instagram|Editorial/i,
    );

    await router.navigate("/portfolio/sistemas-moviles");
    await screen.findByRole("heading", { level: 1, name: "Sistemas Móviles" });
    expect(document.querySelector(".case-study__media")).not.toHaveTextContent(
      /Redes Sociales|Instagram|Editorial/i,
    );
  });

  it("uses more contained responsive clamps for case-study titles", () => {
    const styles = readFileSync("src/styles/case-study.css", "utf8");
    const introTitleRule =
      styles.match(/\.case-study__intro h1\s*{[^}]+}/)?.[0] ?? "";
    const sequenceTitleRule =
      styles.match(/\.case-study__sequence-header h2\s*{[^}]+}/)?.[0] ?? "";

    expect(introTitleRule).toContain("font-size: clamp(3.75rem, 8vw, 8.5rem)");
    expect(sequenceTitleRule).toContain("font-size: clamp(2.75rem, 5vw, 5rem)");
    expect(styles).toContain("font-size: clamp(3.25rem, 12.5vw, 4.75rem)");
    expect(styles).toContain("font-size: clamp(2.75rem, 11vw, 5rem)");
  });

  it("gives the long Sistemas Moviles Network title safe character and line spacing", async () => {
    const styles = readFileSync("src/styles/case-study.css", "utf8");
    const longTitleRule =
      styles.match(
        /\.case-study__intro h1\.case-study__intro-title--multiline\s*{[^}]+}/,
      )?.[0] ?? "";
    renderRoute("/portfolio/sistemas-moviles");

    const heading = await screen.findByRole("heading", {
      level: 1,
      name: "Sistemas Móviles",
    });

    expect(heading).toHaveClass("case-study__intro-title--multiline");
    expect(heading.children).toHaveLength(0);
    expect(longTitleRule).toContain("letter-spacing: 0.055em");
    expect(longTitleRule).toContain("line-height: 1.18");
  });

  it("renders Rambla brand creation before Stories with responsive Supabase banners", async () => {
    renderRoute("/portfolio/rambla");

    await screen.findByRole("heading", { level: 1, name: "Rambla" });

    const storySection = document.querySelector(".case-study__stories");
    const brandBanner = document.querySelector("[data-brand-banner]");
    const brandPicture = brandBanner.querySelector("picture");
    const mobileSource = brandPicture.querySelector("source");
    const desktopImage = brandPicture.querySelector("img");
    const companionVideo = storySection.querySelector("[data-story-video-device] video");

    const brandHeading = screen.getByRole("heading", {
      level: 2,
      name: "Creación de marca",
    });

    expect(brandHeading).toHaveTextContent("Creacion de marca");
    expect(getClientBySlug("rambla").content[0].title).toBe("Creación de marca");
    expect(getClientBySlug("rambla").content[0].type).toBe("banners");
    expect(
      [...document.querySelectorAll(".case-study__sequence-title")].map((heading) =>
        heading.textContent.trim(),
      ),
    ).toEqual(["Creacion de marca", "Stories", "Videos"]);
    expect(mobileSource).toHaveAttribute("media", "(max-width: 47.99rem)");
    expect(mobileSource).toHaveAttribute(
      "srcset",
      portfolioMediaUrl("rambla/banners/banner_vertical.png"),
    );
    expect(desktopImage).toHaveAttribute(
      "src",
      portfolioMediaUrl("rambla/banners/banner_horizontal.jpeg"),
    );
    expect(brandBanner).toHaveAttribute("data-brand-banner-presentation", "responsiveBanner");

    expect(storySection.querySelectorAll("[data-story-device]")).toHaveLength(2);
    expect(storySection.querySelectorAll(".project-media__phone-frame")).toHaveLength(2);
    expect(storySection.querySelectorAll("[data-story-track]")).toHaveLength(1);
    expect(storySection.querySelectorAll("[data-story-slide]")).toHaveLength(5);
    expect(companionVideo).toHaveAttribute(
      "src",
      portfolioMediaUrl("rambla/stories/historias rambla.mp4"),
    );
    expect(companionVideo.muted).toBe(true);
    expect(companionVideo).not.toHaveAttribute("autoplay");
    expect(companionVideo).toHaveAttribute("playsinline");
    expect(companionVideo).toHaveAttribute("preload", "none");
    expect(storySection.querySelector(".video-sound-toggle")).not.toBeInTheDocument();
  });

  it("keeps a disabled story companion muted and exposes sound only when enabled", () => {
    const projects = [
      { id: "story", src: "rambla/stories/one.jpg", alt: "Story" },
    ];
    const companion = {
      id: "companion",
      type: "video",
      src: "rambla/stories/companion.mp4",
      alt: "Companion",
      width: 1080,
      height: 1920,
      audioEnabled: false,
    };
    const { rerender } = render(
      <StorySequence
        companionVideo={companion}
        presentation="dualPhoneVideo"
        projects={projects}
      />,
    );
    const disabledVideo = screen.getByLabelText("Companion");

    expect(disabledVideo).toHaveAttribute("data-audio-enabled", "false");
    expect(disabledVideo.muted).toBe(true);
    expect(screen.queryByRole("button", { name: "Activar sonido" })).not.toBeInTheDocument();

    rerender(
      <StorySequence
        companionVideo={{ ...companion, audioEnabled: true }}
        presentation="dualPhoneVideo"
        projects={projects}
      />,
    );
    const enabledVideo = screen.getByLabelText("Companion");
    const soundButton = screen.getByRole("button", { name: "Activar sonido" });

    expect(enabledVideo.muted).toBe(true);
    fireEvent.click(soundButton);
    expect(enabledVideo.muted).toBe(false);
  });

  it("defines the approved responsive banner reveal with cleanup and reduced motion", () => {
    const source = readFileSync(
      "src/components/media/ResponsiveBrandBanner.jsx",
      "utf8",
    );

    expect(source).toContain('createReveal("inset(0% 100% 0% 0%)")');
    expect(source).toContain('createReveal("inset(100% 0% 0% 0%)")');
    expect(source).toContain("{ scale: 1.04 }");
    expect(source).toContain("{ scale: 1, duration: 1, ease: \"none\" }");
    expect(source).toContain("scrub: 0.8");
    expect(source).toContain("prefers-reduced-motion: no-preference");
    expect(source).toContain("media.revert()");
    expect(source).not.toContain("pin:");
  });

  it("renders Maja only with the standard blocks backed by real available assets", async () => {
    renderRoute("/portfolio/maja");

    await screen.findByRole("heading", { level: 1, name: "Maja" });

    expect(
      [...document.querySelectorAll(".case-study__sequence-title")].map((heading) =>
        heading.textContent.trim(),
      ),
    ).toEqual(["Videos"]);
    expect(document.querySelectorAll("[data-video-slide]")).toHaveLength(4);
  });

  it("renders Desnac entirely from reusable content blocks", async () => {
    renderRoute("/portfolio/desnac");

    await screen.findByRole("heading", { level: 1, name: "Desnac" });

    expect(screen.getByText("Empresa de Software")).toBeInTheDocument();
    expect(screen.getByText("2025")).toBeInTheDocument();
    expect(
      [...document.querySelectorAll(".case-study__sequence-title")].map((heading) =>
        heading.textContent.trim(),
      ),
    ).toEqual(["Stories", "Posts", "Carruseles", "Videos"]);
    expect(document.querySelectorAll("[data-story-slide]")).toHaveLength(7);
    expect(document.querySelectorAll('[data-media-kind="post"]')).toHaveLength(6);
    expect(document.querySelectorAll("[data-carousel-pair]")).toHaveLength(2);
    expect(
      [...document.querySelectorAll("[data-carousel]")].map(
        (carousel) => carousel.querySelectorAll("[data-carousel-slide]").length,
      ),
    ).toEqual([4, 5, 3, 4]);
    expect(document.querySelectorAll("[data-video-slide]")).toHaveLength(3);
    expect(
      [...document.querySelectorAll("[data-video-slide] source")].map((source) =>
        source.getAttribute("src"),
      ),
    ).toEqual([
      portfolioMediaUrl("desnac/videos/apps desnac 2-web-h264.mp4"),
      portfolioMediaUrl("desnac/videos/Copia de IMG_6492-web-h264.mp4"),
      portfolioMediaUrl("desnac/videos/Copia de power bi-web-h264.mp4"),
    ]);
  });

  it("renders a generic coming-soon client without empty sections", async () => {
    renderRoute("/portfolio/el-tori");

    await screen.findByRole("heading", { level: 1, name: "El Tori" });

    expect(screen.getByText("Próximamente")).toBeInTheDocument();
    expect(document.querySelector(".case-study__intro-meta")).toBeInTheDocument();
    expect(document.querySelector(".case-study__sequence")).not.toBeInTheDocument();
    expect(document.querySelector(".case-study__pagination")).toBeInTheDocument();
  });

  it("removes coming soon when El Tori receives content without a manual flag", async () => {
    const elTori = getClientBySlug("el-tori");
    elTori.content = [
      {
        type: "postGrid",
        title: "Posts",
        items: [
          {
            id: "el-tori-post-1",
            type: "post",
            src: "tori/posts/one.jpg",
            alt: "Post de El Tori.",
            width: 1080,
            height: 1350,
          },
        ],
      },
    ];

    try {
      renderRoute("/portfolio/el-tori");
      await screen.findByRole("heading", { level: 1, name: "El Tori" });

      expect(screen.queryByText("Próximamente")).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: "Posts" })).toBeInTheDocument();
    } finally {
      delete elTori.content;
    }
  });

  it("removes case numbering from every client header", async () => {
    renderRoute("/portfolio/aqualand");

    await screen.findByRole("heading", { level: 1, name: "Aqualand" });

    expect(document.querySelector(".case-study__index")).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/CASO \d{2} \/ \d{2}/i);
  });

  it("styles pagination labels and client names through reusable elements", async () => {
    renderRoute("/portfolio/aqualand");

    await screen.findByRole("heading", { level: 1, name: "Aqualand" });

    const pagination = document.querySelector(".case-study__pagination");
    const labels = pagination.querySelectorAll(".case-study__pagination-label");
    const names = pagination.querySelectorAll(".case-study__pagination-name");

    expect([...labels].map((label) => label.textContent.trim())).toEqual([
      "Cliente anterior",
      "Cliente siguiente",
    ]);
    expect([...names].map((name) => name.textContent.trim())).toEqual([
      "Rambla",
      "Tardeo",
    ]);
  });

  it("navigates through consecutive client routes in the SPA", async () => {
    const router = renderRoute("/portfolio/rambla");

    await screen.findByRole("heading", { level: 1, name: "Rambla" });
    fireEvent.click(screen.getByRole("link", { name: /Cliente siguiente\s*Aqualand/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/portfolio/aqualand");
    });
    expect(
      await screen.findByRole("heading", { level: 1, name: "Aqualand" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: /Cliente siguiente\s*Tardeo/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/portfolio/tardeo");
    });
    expect(
      await screen.findByRole("heading", { level: 1, name: "Tardeo" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: /Cliente siguiente\s*Peumax/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/portfolio/peumax");
    });
    expect(await screen.findByRole("heading", { level: 1, name: "Peumax" })).toBeInTheDocument();
  });

  it("does not expose old pending clients as portfolio routes", async () => {
    renderRoute("/portfolio/cliente-pendiente-02");

    expect(
      await screen.findByRole("heading", {
        name: "Página no encontrada",
      }),
    ).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/CLIENTE PENDIENTE|ASSET PENDIENTE/);
  });

  it("renders Not Found for an unknown client slug", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderRoute("/portfolio/cliente-inexistente");

    expect(
      await screen.findByRole("heading", { name: "Página no encontrada" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Volver a Portfolio" }),
    ).toHaveAttribute("href", "/#portfolio");
    expect(warning).not.toHaveBeenCalled();
    warning.mockRestore();
  });

  it("scrolls to Portfolio when returning from a client route", async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const router = renderRoute("/portfolio/peumax");

    fireEvent.click(
      await screen.findByRole("link", { name: "← Volver al portfolio", exact: true }),
    );

    await waitFor(() => {
      expect(router.state.location.hash).toBe("#portfolio");
    });
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("keeps one shared Portfolio return link fixed throughout every case study", async () => {
    const styles = readFileSync("src/styles/case-study.css", "utf8");
    renderRoute("/portfolio/aqualand");

    const returnLink = await screen.findByRole("link", {
      name: "← Volver al portfolio",
      exact: true,
    });
    const fixedRule = styles.match(/\.case-study__back-link\s*{[^}]+}/)?.[0] ?? "";

    expect(document.querySelectorAll(".case-study__back-link")).toHaveLength(1);
    expect(returnLink).toHaveClass("case-study__back-link");
    expect(fixedRule).toContain("position: fixed");
    expect(fixedRule).toContain("z-index:");
  });

  it("uses the standard carruseles folder outside posts", () => {
    const clientData = readFileSync("src/data/clients.js", "utf8");

    expect(clientData).not.toMatch(/\/posts\/carrusel/i);
    expect(clientData).toMatch(/\/carruseles\/carrusel/i);
  });
});
