import { useEffect, useRef, useState } from "react";
import { portfolioMediaUrl } from "../lib/portfolioMedia";
import { createPendingItem, moveAdminMediaItem } from "./adminDraft";
import {
  VIDEO_UPLOAD_HELP,
  validateFiles,
  validateFilesForUpload,
} from "./adminValidation";
import { inspectMp4Video } from "./videoCompatibility";

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
  editableSingle = false,
  items,
  maxItems,
  mediaKind,
  multiple = true,
  onChange,
  pendingItemMetadata,
  showAudio = false,
}) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");
  const [validating, setValidating] = useState(false);
  const effectiveMaxItems = maxItems ?? (multiple ? Infinity : 1);
  const acceptsMultiple = multiple && effectiveMaxItems !== 1;
  const hasCurrentItem = items.some((item) => !item.removed);
  const usesEditableSingleActions = editableSingle || effectiveMaxItems === 1;

  const addPendingFiles = (files, details = []) => {
    const currentItem = items.find((item) => !item.removed) ?? items[0];
    const pending = files.map((file, index) =>
      createPendingItem(file, mediaKind, {
        ...pendingItemMetadata,
        width: details[index]?.width,
        height: details[index]?.height,
      }),
    );
    if (usesEditableSingleActions && currentItem && pending[0]) {
      pending[0].audioEnabled = currentItem.audioEnabled !== false;
      pending[0].replacedStoragePath = currentItem.existing
        ? currentItem.storagePath
        : currentItem.replacedStoragePath;
    }
    onChange(
      usesEditableSingleActions
        ? pending.slice(0, 1)
        : [...items, ...pending],
    );
  };

  const addFiles = (fileList) => {
    const files = [...fileList];
    if (files.length === 0) return;
    const activeItemCount = items.filter((item) => !item.removed).length;
    const availableSlots = usesEditableSingleActions
      ? effectiveMaxItems
      : effectiveMaxItems - activeItemCount;
    if (files.length > availableSlots) {
      setError(
        `Podés seleccionar como máximo ${availableSlots} ${availableSlots === 1 ? "archivo" : "archivos"}.`,
      );
      return;
    }
    const errors = validateFiles(files, allowedMimeTypes);
    if (errors.length > 0) {
      setError(errors[0].message);
      return;
    }

    setError("");
    if (!files.some((file) => file.type.startsWith("video/"))) {
      addPendingFiles(files);
      return;
    }

    setValidating(true);
    void validateFilesForUpload(files, allowedMimeTypes)
      .then((videoErrors) => {
        if (videoErrors.length > 0) {
          setError(videoErrors[0].message);
          return;
        }
        return Promise.all(files.map((file) => inspectMp4Video(file))).then(
          (details) => addPendingFiles(files, details),
        );
      })
      .catch(() => {
        setError(
          "No se pudo inspeccionar el codec de este video. Exportalo como MP4 H.264 antes de subirlo.",
        );
      })
      .finally(() => setValidating(false));
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
    const next = moveAdminMediaItem(items, index, offset);
    if (next !== items) onChange(next);
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
          multiple={acceptsMultiple}
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
          ref={inputRef}
          type="file"
        />
        <p>Arrastrá archivos acá o usá el selector.</p>
        {allowedMimeTypes.includes("video/mp4") && (
          <p>{VIDEO_UPLOAD_HELP}</p>
        )}
        <button
          disabled={validating}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {validating
            ? "Verificando video…"
            : usesEditableSingleActions && hasCurrentItem
              ? "Reemplazar"
              : acceptsMultiple
                ? "Seleccionar archivos"
                : "Seleccionar archivo"}
        </button>
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {items.length > 0 && (
        <div className="admin-media-list">
          {items.map((item, index) => (
            <div className="admin-media-entry" key={item.id ?? item.tempId}>
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
                  <span>Permitir sonido</span>
                </label>
              )}
              <div className="admin-media-entry__actions">
                {!usesEditableSingleActions && (
                  <>
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
                  </>
                )}
                <button onClick={() => removeItem(index)} type="button">
                  {item.existing && item.removed
                    ? "Conservar"
                    : usesEditableSingleActions
                      ? "Eliminar"
                      : "Quitar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
