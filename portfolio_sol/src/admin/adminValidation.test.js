import { describe, expect, it } from "vitest";
import {
  MAX_FILE_BYTES,
  slugifyClientName,
  validateClientDraft,
  validateFiles,
} from "./adminValidation";

describe("admin client validation", () => {
  it("requires name, year, discipline and a logo for a new client", () => {
    expect(
      validateClientDraft({
        name: "",
        year: "",
        discipline: "",
        logo: null,
      }),
    ).toEqual({
      discipline: "El rubro o disciplina es obligatorio.",
      logo: "El logo es obligatorio.",
      name: "El nombre es obligatorio.",
      year: "El año es obligatorio.",
    });
  });

  it("does not require a replacement logo while editing", () => {
    expect(
      validateClientDraft(
        {
          name: "Maja",
          year: "2024",
          discipline: "Estética",
          logo: null,
          existingLogoPath: "maja/logo.png",
        },
        { editing: true },
      ),
    ).toEqual({});
  });

  it("creates a lowercase accent-free slug", () => {
    expect(slugifyClientName("  Sistemas Móviles  ")).toBe("sistemas-moviles");
  });

  it("rejects every file above the absolute 50 MB limit", () => {
    const oversized = new File([new Uint8Array(1)], "large.mp4", {
      type: "video/mp4",
    });
    Object.defineProperty(oversized, "size", { value: MAX_FILE_BYTES + 1 });

    expect(validateFiles([oversized], ["video/mp4"])).toEqual([
      {
        file: oversized,
        message:
          "El archivo supera el máximo permitido de 50 MB. Reducí su tamaño antes de volver a intentarlo.",
      },
    ]);
  });
});
