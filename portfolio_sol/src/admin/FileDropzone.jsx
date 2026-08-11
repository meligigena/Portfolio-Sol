import { useEffect, useRef, useState } from "react";
import { portfolioMediaUrl } from "../lib/portfolioMedia";
import { createPendingItem } from "./adminDraft";
import { validateFiles } from "./adminValidation";

function PendingPreview({ file, kind }) {
  const previewRef = useRef(null);

  useEffect(() => {
    const nextUrl = globalThis.URL?.createObjectURL?.(file) ?? null;
    if (!nextUrl) return undefined;
    if (previewRef.current) previewRef.current.src = nextUrl;

    return () => globalThis.URL?.revokeObjectURL?.(nextUrl);
  }, [file]);

  if (kind === "video") {
    return <video aria-label={`Preview de ${file.name}`} muted ref={previewRef} />;
  }
  return <img alt={`Preview de ${file.name}`} ref={previewRef} />;
}

function ItemPreview({ item }) {
  const isVideo = item.type === "video";
  const source = item.existing ? portfolioMediaUrl(item.storagePath) : null;

  return (
    <div className={`admin-media-item${item.removed ? " is-removed" : ""}`}>
      <div className="admin-media-item__preview">
        {item.existing ? (
          isVideo ? (
            <video aria-label={item.alt || item.name} muted src={source} />
          ) : (
            <img alt={item.alt || item.name} src={source} />
          )
        ) : (
          <PendingPreview file={item.file} kind={isVideo ? "video" : "image"} />
        )}
      </div>
      <div>
        <strong>{item.name}</strong>
        <span>
          {item.file ? `${(item.file.size / 1024 / 1024).toFixed(2)} MB` : "Guardado"}
        </span>
        {item.removed && <span>Se eliminará al confirmar</span>}
      </div>
    </div>
  );
}

export function FileDropzone({
  accept,
  allowedMimeTypes,
  items,
  mediaKind,
  multiple = true,
  onChange,
  pendingItemMetadata,
  showAudio = false,
}) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");

  const addFiles = (fileList) => {
    const files = [...fileList];
    const errors = validateFiles(files, allowedMimeTypes);
    if (errors.length > 0) {
      setError(errors[0].message);
      return;
    }

    setError("");
    const pending = files.map((file) =>
      createPendingItem(file, mediaKind, pendingItemMetadata),
    );
    onChange(multiple ? [...items, ...pending] : pending.slice(0, 1));
  };

  const removeItem = (index) => {
    const item = items[index];
    if (item.existing) {
      onChange(
        items.map((entry, entryIndex) =>
          entryIndex === index ? { ...entry, removed: !entry.removed } : entry,
        ),
      );
    } else {
      onChange(items.filter((_entry, entryIndex) => entryIndex !== index));
    }
  };

  const moveItem = (index, offset) => {
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const next = [...items];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  };

  return (
    <div className="admin-dropzone-wrap">
      <div
        className="admin-dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addFiles(event.dataTransfer.files);
        }}
      >
        <input
          accept={accept}
          hidden
          multiple={multiple}
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
          ref={inputRef}
          type="file"
        />
        <p>Arrastrá archivos acá o usá el selector.</p>
        <button onClick={() => inputRef.current?.click()} type="button">
          Seleccionar archivos
        </button>
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {items.length > 0 && (
        <div className="admin-media-list">
          {items.map((item, index) => (
            <div className="admin-media-entry" key={item.id}>
              <ItemPreview item={item} />
              {showAudio && item.type === "video" && !item.removed && (
                <label className="admin-check">
                  <input
                    checked={item.audioEnabled !== false}
                    onChange={(event) =>
                      onChange(
                        items.map((entry, entryIndex) =>
                          entryIndex === index
                            ? { ...entry, audioEnabled: event.target.checked }
                            : entry,
                        ),
                      )
                    }
                    type="checkbox"
                  />
                  Permitir sonido
                </label>
              )}
              <div className="admin-media-entry__actions">
                <button
                  aria-label={`Mover ${item.name} hacia arriba`}
                  disabled={index === 0}
                  onClick={() => moveItem(index, -1)}
                  type="button"
                >
                  ↑
                </button>
                <button
                  aria-label={`Mover ${item.name} hacia abajo`}
                  disabled={index === items.length - 1}
                  onClick={() => moveItem(index, 1)}
                  type="button"
                >
                  ↓
                </button>
                <button onClick={() => removeItem(index)} type="button">
                  {item.existing && item.removed ? "Conservar" : "Quitar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
