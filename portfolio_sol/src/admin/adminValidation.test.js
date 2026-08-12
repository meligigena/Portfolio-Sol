import { describe, expect, it } from "vitest";
import {
  MAX_FILE_BYTES,
  slugifyClientName,
  validateClientDraft,
  validateFiles,
  validateFilesForUpload,
} from "./adminValidation";

function mp4Box(type, payload = new Uint8Array()) {
  const box = new Uint8Array(8 + payload.length);
  const view = new DataView(box.buffer);
  view.setUint32(0, box.length);
  box.set([...type].map((character) => character.charCodeAt(0)), 4);
  box.set(payload, 8);
  return box;
}

function videoFile({ codec = "avc1", fastStart = true, name = "video.mp4" } = {}) {
  const ftyp = mp4Box("ftyp", new TextEncoder().encode("isom0000isomavc1"));
  const sampleEntry = mp4Box(codec, new Uint8Array(32));
  const audioEntry = mp4Box("mp4a", new Uint8Array(8));
  const moov = mp4Box("moov", new Uint8Array([...sampleEntry, ...audioEntry]));
  const mdat = mp4Box("mdat", new Uint8Array(8));
  const bytes = fastStart
    ? new Uint8Array([...ftyp, ...moov, ...mdat])
    : new Uint8Array([...ftyp, ...mdat, ...moov]);

  return new File([bytes], name, { type: "video/mp4" });
}

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

  it("accepts an MP4 whose real video sample entry is H.264 with AAC and faststart", async () => {
    await expect(
      validateFilesForUpload([videoFile()], ["video/mp4"]),
    ).resolves.toEqual([]);
  });

  it("rejects HEVC by its real codec even when the extension and MIME say MP4", async () => {
    const file = videoFile({ codec: "hvc1" });

    await expect(
      validateFilesForUpload([file], ["video/mp4"]),
    ).resolves.toEqual([
      {
        file,
        message:
          "Este video utiliza HEVC/H.265 y puede no reproducirse correctamente en todos los dispositivos. Convertí el archivo a MP4 H.264 antes de subirlo.",
      },
    ]);
  });

  it("rejects H.264 MP4 without faststart before upload", async () => {
    const file = videoFile({ fastStart: false });

    await expect(
      validateFilesForUpload([file], ["video/mp4"]),
    ).resolves.toEqual([
      {
        file,
        message:
          "Este video no tiene faststart. Exportalo como MP4 H.264 con el inicio rápido habilitado antes de subirlo.",
      },
    ]);
  });
});
