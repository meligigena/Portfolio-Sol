import { StrictMode, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { portfolioMediaUrl } from "../lib/portfolioMedia";
import { createEmptyAdminDraft } from "./adminDraft";
import { ClientEditor } from "./ClientEditor";
import { FileDropzone } from "./FileDropzone";

const IMAGE_TYPES = ["image/jpeg", "image/png"];

function DropzoneHarness({
  initialItems = [],
  maxItems,
  mediaKind = "post",
  multiple = true,
  onItemsChange = () => {},
  showAudio = false,
}) {
  const [items, setItems] = useState(initialItems);
  const updateItems = (nextItems) => {
    setItems(nextItems);
    onItemsChange(nextItems);
  };

  return (
    <>
      <FileDropzone
        accept={mediaKind === "video" ? ".mp4" : ".jpg,.jpeg,.png"}
        allowedMimeTypes={mediaKind === "video" ? ["video/mp4"] : IMAGE_TYPES}
        items={items}
        maxItems={maxItems}
        mediaKind={mediaKind}
        multiple={multiple}
        onChange={updateItems}
        showAudio={showAudio}
      />
      <output aria-label="Cantidad activa">
        {items.filter((item) => !item.removed).length}
      </output>
    </>
  );
}

function mp4Video(codec) {
  const encodeBox = (type, payload = new Uint8Array()) => {
    const box = new Uint8Array(8 + payload.length);
    new DataView(box.buffer).setUint32(0, box.length);
    box.set([...type].map((character) => character.charCodeAt(0)), 4);
    box.set(payload, 8);
    return box;
  };
  const ftyp = encodeBox("ftyp", new TextEncoder().encode("isom0000isomavc1"));
  const moov = encodeBox("moov", encodeBox(codec, new Uint8Array(32)));
  const mdat = encodeBox("mdat", new Uint8Array(8));
  return new File([new Uint8Array([...ftyp, ...moov, ...mdat])], "nuevo.mp4", {
    type: "video/mp4",
  });
}

describe("FileDropzone previews", () => {
  let nextObjectUrl;

  beforeEach(() => {
    let sequence = 0;
    nextObjectUrl = vi.fn(() => `blob:preview-${++sequence}`);
    vi.stubGlobal("URL", {
      createObjectURL: nextObjectUrl,
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the same concise requirements in every video dropzone", () => {
    render(
      <FileDropzone
        accept=".mp4"
        allowedMimeTypes={["video/mp4"]}
        items={[]}
        mediaKind="video"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Videos: MP4 en H.264 · Máximo 50 MB")).toBeInTheDocument();
    expect(screen.queryByText(/AAC|yuv420p|faststart|avc1/)).not.toBeInTheDocument();
  });

  it("keeps the committed local image preview valid in React StrictMode", () => {
    const { container } = render(
      <StrictMode>
        <DropzoneHarness />
      </StrictMode>,
    );
    const file = new File(["new image"], "nueva.jpg", { type: "image/jpeg" });

    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [file] },
    });

    const preview = screen.getByAltText("Preview de nueva.jpg");
    expect(preview).toHaveAttribute(
      "src",
      nextObjectUrl.mock.results.at(-1).value,
    );
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(
      preview.getAttribute("src"),
    );
  });

  it("continues using the remote Storage URL for persisted media", () => {
    render(
      <DropzoneHarness
        initialItems={[
          {
            id: "persisted",
            existing: true,
            removed: false,
            storagePath: "rambla/banners/banner_horizontal.jpeg",
            name: "banner_horizontal.jpeg",
            type: "banner",
            alt: "Banner horizontal",
          },
        ]}
      />,
    );

    expect(screen.getByAltText("Banner horizontal")).toHaveAttribute(
      "src",
      portfolioMediaUrl("rambla/banners/banner_horizontal.jpeg"),
    );
    expect(nextObjectUrl).not.toHaveBeenCalled();
  });

  it("shows the persisted logo with explicit replace and remove actions", () => {
    render(
      <DropzoneHarness
        initialItems={[
          {
            id: "persisted-logo",
            existing: true,
            removed: false,
            storagePath: "example/logo.jpg",
            name: "logo.jpg",
            type: "logo",
            alt: "Logo actual de Example",
          },
        ]}
        mediaKind="logo"
        multiple={false}
      />,
    );

    expect(screen.getByAltText("Logo actual de Example")).toHaveAttribute(
      "src",
      portfolioMediaUrl("example/logo.jpg"),
    );
    expect(screen.getByRole("button", { name: "Reemplazar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
  });

  it("replaces a remote logo locally without revoking or removing the remote URL", () => {
    const { container } = render(
      <DropzoneHarness
        initialItems={[
          {
            id: "persisted-logo",
            existing: true,
            removed: false,
            storagePath: "example/logo.jpg",
            name: "logo.jpg",
            type: "logo",
          },
        ]}
        mediaKind="logo"
        multiple={false}
      />,
    );
    const replacement = new File(["replacement"], "new-logo.png", {
      type: "image/png",
    });

    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [replacement] },
    });

    expect(screen.getByAltText("Preview de new-logo.png")).toHaveAttribute(
      "src",
      expect.stringMatching(/^blob:preview-/),
    );
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(
      portfolioMediaUrl("example/logo.jpg"),
    );
  });

  it("shows a persisted story companion with its audio control in Admin", () => {
    render(
      <FileDropzone
        accept=".mp4"
        allowedMimeTypes={["video/mp4"]}
        items={[
          {
            id: "companion",
            existing: true,
            removed: false,
            storagePath: "rambla/stories/companion.mp4",
            name: "companion.mp4",
            type: "video",
            alt: "Video companion de Rambla",
            audioEnabled: false,
          },
        ]}
        mediaKind="video"
        multiple={false}
        onChange={vi.fn()}
        showAudio
      />,
    );

    expect(screen.getByLabelText("Video companion de Rambla")).toHaveAttribute(
      "src",
      portfolioMediaUrl("rambla/stories/companion.mp4"),
    );
    expect(screen.getByLabelText("Permitir sonido")).not.toBeChecked();
  });

  it("replaces the current single video in the draft and preserves audio", async () => {
    const onItemsChange = vi.fn();
    const { container } = render(
      <DropzoneHarness
        initialItems={[
          {
            id: "companion",
            existing: true,
            removed: false,
            storagePath: "rambla/stories/companion.mp4",
            name: "companion.mp4",
            type: "video",
            audioEnabled: false,
          },
        ]}
        maxItems={1}
        mediaKind="video"
        onItemsChange={onItemsChange}
        showAudio
      />,
    );

    expect(screen.getByRole("button", { name: "Reemplazar" })).toBeInTheDocument();
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [mp4Video("avc1")] },
    });

    expect(await screen.findByLabelText("Preview de nuevo.mp4")).toBeInTheDocument();
    expect(screen.queryByText("companion.mp4")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Cantidad activa")).toHaveTextContent("1");
    expect(screen.getByLabelText("Permitir sonido")).not.toBeChecked();
    expect(onItemsChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        audioEnabled: false,
        existing: false,
        replacedStoragePath: "rambla/stories/companion.mp4",
      }),
    ]);
  });

  it("marks the persisted single video for removal and exposes the empty slot", () => {
    const onItemsChange = vi.fn();
    render(
      <DropzoneHarness
        initialItems={[
          {
            id: "companion",
            existing: true,
            removed: false,
            storagePath: "rambla/stories/companion.mp4",
            name: "companion.mp4",
            type: "video",
            audioEnabled: false,
          },
        ]}
        maxItems={1}
        mediaKind="video"
        onItemsChange={onItemsChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(screen.getByLabelText("Cantidad activa")).toHaveTextContent("0");
    expect(screen.getByRole("button", { name: "Seleccionar archivo" })).toBeInTheDocument();
    expect(onItemsChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ existing: true, removed: true }),
    ]);
  });

  it("fills an empty single-video slot with exactly one compatible file", async () => {
    const { container } = render(
      <DropzoneHarness maxItems={1} mediaKind="video" />,
    );

    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [mp4Video("avc1")] },
    });

    expect(await screen.findByLabelText("Preview de nuevo.mp4")).toBeInTheDocument();
    expect(screen.getByLabelText("Cantidad activa")).toHaveTextContent("1");
  });

  it("rejects multiple files when the configured maximum is one", () => {
    const { container } = render(
      <DropzoneHarness maxItems={1} mediaKind="video" />,
    );
    const input = container.querySelector('input[type="file"]');

    expect(input).not.toHaveAttribute("multiple");
    fireEvent.change(input, {
      target: { files: [mp4Video("avc1"), mp4Video("avc1")] },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Podés seleccionar como máximo 1 archivo.",
    );
    expect(screen.getByLabelText("Cantidad activa")).toHaveTextContent("0");
  });

  it("revokes a local preview when its pending file is removed", () => {
    const { container } = render(<DropzoneHarness />);
    const file = new File(["remove"], "quitar.png", { type: "image/png" });
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [file] },
    });
    const source = screen.getByAltText("Preview de quitar.png").getAttribute("src");

    fireEvent.click(screen.getByRole("button", { name: "Quitar" }));

    expect(screen.queryByAltText("Preview de quitar.png")).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(source);
  });

  it("keeps each local preview associated with its File after reordering", () => {
    const { container } = render(<DropzoneHarness />);
    const files = [
      new File(["one"], "uno.jpg", { type: "image/jpeg" }),
      new File(["two"], "dos.png", { type: "image/png" }),
    ];
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files },
    });
    const sources = new Map(
      files.map((file) => [
        file.name,
        screen.getByAltText(`Preview de ${file.name}`).getAttribute("src"),
      ]),
    );

    fireEvent.click(screen.getByRole("button", { name: "Mover dos.png hacia arriba" }));

    files.forEach((file) => {
      expect(screen.getByAltText(`Preview de ${file.name}`)).toHaveAttribute(
        "src",
        sources.get(file.name),
      );
    });
  });

  it("revokes the previous local preview when a single logo is replaced", () => {
    const { container } = render(<DropzoneHarness multiple={false} />);
    const first = new File(["first"], "logo-anterior.jpg", {
      type: "image/jpeg",
    });
    const second = new File(["second"], "logo-nuevo.png", {
      type: "image/png",
    });
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [first] } });
    const firstSource = screen
      .getByAltText("Preview de logo-anterior.jpg")
      .getAttribute("src");

    fireEvent.change(input, { target: { files: [second] } });

    expect(screen.getByAltText("Preview de logo-nuevo.png")).toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(firstSource);
  });

  it.each(["create", "edit"])(
    "shows a newly selected logo immediately in %s mode",
    (mode) => {
      const draft = {
        ...createEmptyAdminDraft(),
        id: mode === "edit" ? "client-id" : null,
        slug: mode === "edit" ? "example" : "",
        name: "Example",
        year: "2026",
        discipline: "Design",
        existingLogoPath: mode === "edit" ? "example/logo.jpg" : null,
      };
      const { container } = render(
        <ClientEditor
          initialDraft={draft}
          mode={mode}
          onCancel={vi.fn()}
          onSaved={vi.fn()}
          service={{}}
        />,
      );
      const file = new File([mode], `${mode}-logo.jpg`, {
        type: "image/jpeg",
      });

      fireEvent.change(container.querySelector('input[type="file"]'), {
        target: { files: [file] },
      });

      expect(screen.getByAltText(`Preview de ${mode}-logo.jpg`)).toHaveAttribute(
        "src",
        expect.stringMatching(/^blob:preview-/),
      );
    },
  );

  it("shows the HEVC explanation and never adds an incompatible video", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <FileDropzone
        accept=".mp4"
        allowedMimeTypes={["video/mp4"]}
        items={[]}
        mediaKind="video"
        onChange={onChange}
      />,
    );

    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [mp4Video("hvc1")] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Este video no es compatible con el portfolio. Exportalo como MP4 en H.264 e intentá nuevamente.",
    );
    await waitFor(() => expect(onChange).not.toHaveBeenCalled());
  });
});
