import { StrictMode, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { portfolioMediaUrl } from "../lib/portfolioMedia";
import { createEmptyAdminDraft } from "./adminDraft";
import { ClientEditor } from "./ClientEditor";
import { FileDropzone } from "./FileDropzone";

const IMAGE_TYPES = ["image/jpeg", "image/png"];

function DropzoneHarness({ initialItems = [], mediaKind = "post", multiple = true }) {
  const [items, setItems] = useState(initialItems);

  return (
    <FileDropzone
      accept=".jpg,.jpeg,.png"
      allowedMimeTypes={IMAGE_TYPES}
      items={items}
      mediaKind={mediaKind}
      multiple={multiple}
      onChange={setItems}
    />
  );
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
});
