import { useMemo, useState } from "react";
import { DisplayHeading } from "../components/typography/DisplayHeading";
import {
  createEmptyAdminDraft,
  createPendingGroup,
  createPendingCustomSection,
} from "./adminDraft";
import {
  IMAGE_MIME_TYPES,
  slugifyClientName,
  validateClientDraft,
  VIDEO_MIME_TYPES,
} from "./adminValidation";
import { FileDropzone } from "./FileDropzone";

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp";
const VIDEO_ACCEPT = ".mp4,.webm,.mov";
const CUSTOM_ACCEPT = `${IMAGE_ACCEPT},${VIDEO_ACCEPT}`;

function Section({ actions = null, children, title }) {
  return (
    <section className="admin-editor__section">
      <div className="admin-editor__section-header">
        <DisplayHeading as="h2" text={title} />
        {actions}
      </div>
      {children}
    </section>
  );
}

function SectionOrderActions({ index, onMove, onRemove, total }) {
  return (
    <div className="admin-section-order-actions">
      <button
        aria-label="Mover secciÃ³n hacia arriba"
        disabled={index === 0}
        onClick={() => onMove(-1)}
        type="button"
      >
        Subir
      </button>
      <button
        aria-label="Mover secciÃ³n hacia abajo"
        disabled={index === total - 1}
        onClick={() => onMove(1)}
        type="button"
      >
        Bajar
      </button>
      {onRemove && (
        <button onClick={onRemove} type="button">Eliminar secciÃ³n</button>
      )}
    </div>
  );
}

function GroupedUploads({ draft, groupKey, kind, onDraftChange }) {
  const groups = draft[groupKey];
  const isCarousel = kind === "carousel";
  const itemKind = isCarousel ? "carouselSlide" : "catalogPage";

  return (
    <>
      {groups.map((group, groupIndex) => (
        <div
          className={`admin-media-group${group.removed ? " is-removed" : ""}`}
          key={group.id}
        >
          <div className="admin-media-group__header">
            <label>
              Nombre
              <input
                disabled={group.removed}
                onChange={(event) =>
                  onDraftChange({
                    ...draft,
                    [groupKey]: groups.map((entry, index) =>
                      index === groupIndex
                        ? { ...entry, label: event.target.value }
                        : entry,
                    ),
                  })
                }
                value={group.label}
              />
            </label>
            <button
              onClick={() =>
                onDraftChange({
                  ...draft,
                  [groupKey]: group.existing
                    ? groups.map((entry, index) =>
                        index === groupIndex
                          ? { ...entry, removed: !entry.removed }
                          : entry,
                      )
                    : groups.filter((_entry, index) => index !== groupIndex),
                })
              }
              type="button"
            >
              {group.removed ? "Conservar grupo" : "Eliminar grupo"}
            </button>
          </div>
          {!group.removed && (
            <FileDropzone
              accept={IMAGE_ACCEPT}
              allowedMimeTypes={IMAGE_MIME_TYPES}
              items={group.items}
              mediaKind={itemKind}
              onChange={(items) =>
                onDraftChange({
                  ...draft,
                  [groupKey]: groups.map((entry, index) =>
                    index === groupIndex ? { ...entry, items } : entry,
                  ),
                })
              }
            />
          )}
          <p>
            {group.label} — {group.items.filter((item) => !item.removed).length}{" "}
            {isCarousel ? "imágenes" : "páginas"}
          </p>
        </div>
      ))}
      <button
        className="admin-secondary-action"
        onClick={() =>
          onDraftChange({
            ...draft,
            [groupKey]: [...groups, createPendingGroup(kind, groups.length)],
          })
        }
        type="button"
      >
        + Añadir {isCarousel ? "otro carrusel" : "otro catálogo"}
      </button>
    </>
  );
}

function BannerUploads({ draft, onDraftChange }) {
  const variants = [
    { key: "desktop", label: "Desktop / tablet grande" },
    { key: "mobile", label: "Mobile" },
  ];
  const replaceVariant = (viewport, items) => {
    const nextByViewport = new Map(
      draft.banners
        .filter((item) => item.viewport !== viewport)
        .map((item) => [item.viewport, item]),
    );
    if (items[0]) nextByViewport.set(viewport, items[0]);
    onDraftChange({
      ...draft,
      banners: variants
        .map(({ key }) => nextByViewport.get(key))
        .filter(Boolean),
    });
  };

  return (
    <>
      <label>
        Título público
        <input
          onChange={(event) =>
            onDraftChange({ ...draft, bannerTitle: event.target.value })
          }
          value={draft.bannerTitle}
        />
      </label>
      <div className="admin-banner-variants">
        {variants.map((variant) => (
          <div className="admin-banner-variant" key={variant.key}>
            <h3>{variant.label}</h3>
            <FileDropzone
              accept={IMAGE_ACCEPT}
              allowedMimeTypes={IMAGE_MIME_TYPES}
              items={draft.banners.filter(
                (item) => item.viewport === variant.key,
              )}
              mediaKind="banner"
              multiple={false}
              onChange={(items) => replaceVariant(variant.key, items)}
              pendingItemMetadata={{ viewport: variant.key }}
            />
          </div>
        ))}
      </div>
    </>
  );
}

export function ClientEditor({ initialDraft, mode, onCancel, onSaved, service }) {
  const [draft, setDraft] = useState(initialDraft ?? createEmptyAdminDraft());
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);
  const [saveError, setSaveError] = useState("");
  const editing = mode === "edit";
  const generatedSlug = useMemo(
    () => (editing ? draft.slug : slugifyClientName(draft.name)),
    [draft.name, draft.slug, editing],
  );

  const updateField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const moveSection = (index, offset) => {
    const target = index + offset;
    if (target < 0 || target >= draft.sectionOrder.length) return;
    const sectionOrder = [...draft.sectionOrder];
    [sectionOrder[index], sectionOrder[target]] = [
      sectionOrder[target],
      sectionOrder[index],
    ];
    setDraft({ ...draft, sectionOrder });
  };

  const removeCustomSection = (section) => {
    if (section.existing) {
      setDraft({
        ...draft,
        customSections: draft.customSections.map((entry) =>
          entry.id === section.id
            ? {
                ...entry,
                removed: true,
                items: entry.items.map((item) => ({ ...item, removed: true })),
              }
            : entry,
        ),
      });
      return;
    }
    setDraft({
      ...draft,
      customSections: draft.customSections.filter((entry) => entry.id !== section.id),
      sectionOrder: draft.sectionOrder.filter(
        (key) => key !== `custom:${section.id}`,
      ),
    });
  };

  const sectionActions = (index, onRemove = null) => (
    <SectionOrderActions
      index={index}
      onMove={(offset) => moveSection(index, offset)}
      onRemove={onRemove}
      total={draft.sectionOrder.length}
    />
  );

  const renderContentSection = (sectionKey, index) => {
    const directSections = {
      stories: {
        accept: IMAGE_ACCEPT,
        allowedMimeTypes: IMAGE_MIME_TYPES,
        items: draft.stories,
        mediaKind: "story",
        title: "Stories",
      },
      posts: {
        accept: IMAGE_ACCEPT,
        allowedMimeTypes: IMAGE_MIME_TYPES,
        items: draft.posts,
        mediaKind: "post",
        title: "Posts",
      },
      videos: {
        accept: VIDEO_ACCEPT,
        allowedMimeTypes: VIDEO_MIME_TYPES,
        items: draft.videos,
        mediaKind: "video",
        showAudio: true,
        title: "Videos",
      },
    };
    const direct = directSections[sectionKey];
    if (direct) {
      return (
        <Section actions={sectionActions(index)} key={sectionKey} title={direct.title}>
          <FileDropzone
            accept={direct.accept}
            allowedMimeTypes={direct.allowedMimeTypes}
            items={direct.items}
            mediaKind={direct.mediaKind}
            onChange={(items) => setDraft({ ...draft, [sectionKey]: items })}
            showAudio={direct.showAudio}
          />
        </Section>
      );
    }
    if (sectionKey === "carousels" || sectionKey === "catalogs") {
      const isCarousel = sectionKey === "carousels";
      return (
        <Section
          actions={sectionActions(index)}
          key={sectionKey}
          title={isCarousel ? "Carruseles" : "Catálogos"}
        >
          <GroupedUploads
            draft={draft}
            groupKey={sectionKey}
            kind={isCarousel ? "carousel" : "catalog"}
            onDraftChange={setDraft}
          />
        </Section>
      );
    }
    if (sectionKey === "banners") {
      return (
        <Section actions={sectionActions(index)} key={sectionKey} title="Banners">
          <BannerUploads draft={draft} onDraftChange={setDraft} />
        </Section>
      );
    }

    const customId = sectionKey.startsWith("custom:")
      ? sectionKey.slice("custom:".length)
      : null;
    const custom = draft.customSections.find((section) => section.id === customId);
    if (!custom) return null;

    return (
      <Section
        actions={sectionActions(index, () => removeCustomSection(custom))}
        key={sectionKey}
        title={custom.title || "SecciÃ³n personalizada"}
      >
        <label>
          Nombre de la secciÃ³n
          <input
            disabled={custom.removed}
            onChange={(event) => {
              setDraft({
                ...draft,
                customSections: draft.customSections.map((section) =>
                  section.id === custom.id
                    ? { ...section, title: event.target.value }
                    : section,
                ),
              });
              setErrors((current) => ({ ...current, customSections: undefined }));
            }}
            value={custom.title}
          />
        </label>
        {!custom.removed && (
          <FileDropzone
            accept={CUSTOM_ACCEPT}
            allowedMimeTypes={[...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES]}
            items={custom.items}
            mediaKind="custom"
            onChange={(items) =>
              setDraft({
                ...draft,
                customSections: draft.customSections.map((section) =>
                  section.id === custom.id ? { ...section, items } : section,
                ),
              })
            }
            showAudio
          />
        )}
      </Section>
    );
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextDraft = { ...draft, slug: generatedSlug };
    const nextErrors = validateClientDraft(nextDraft, { editing });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus({ current: 0, total: 0, category: "cliente" });
    setSaveError("");
    try {
      const result = await service.saveClient(nextDraft, setStatus);
      setStatus({
        complete: true,
        slug: result.slug,
        warnings: result.cleanupWarnings ?? [],
      });
    } catch (error) {
      setSaveError(error.message);
      setStatus(null);
    }
  };

  if (status?.complete) {
    return (
      <section className="admin-success" aria-live="polite">
        <DisplayHeading as="h1" text="Cambios guardados correctamente" />
        {status.warnings?.map((warning) => (
          <p className="admin-error" key={warning}>{warning}</p>
        ))}
        <div>
          <button onClick={onSaved} type="button">Volver al panel</button>
          <a href={`/portfolio/${status.slug}`}>Ver cliente en portfolio</a>
        </div>
      </section>
    );
  }

  return (
    <form className="admin-editor" onSubmit={submit}>
      <header className="admin-editor__header">
        <div>
          <p>{editing ? "Modificar cliente" : "Nuevo cliente"}</p>
          <DisplayHeading as="h1" text={draft.name || "Cliente sin nombre"} />
        </div>
        <button disabled={Boolean(status)} onClick={onCancel} type="button">
          Cancelar
        </button>
      </header>

      <Section title="Datos principales">
        <div className="admin-fields">
          <label>
            Nombre *
            <input
              aria-invalid={Boolean(errors.name)}
              onChange={(event) => updateField("name", event.target.value)}
              value={draft.name}
            />
            {errors.name && <span className="admin-error">{errors.name}</span>}
          </label>
          <label>
            Año *
            <input
              aria-invalid={Boolean(errors.year)}
              inputMode="numeric"
              maxLength="4"
              onChange={(event) => updateField("year", event.target.value)}
              value={draft.year}
            />
            {errors.year && <span className="admin-error">{errors.year}</span>}
          </label>
          <label>
            Rubro / Disciplina *
            <input
              aria-invalid={Boolean(errors.discipline)}
              onChange={(event) => updateField("discipline", event.target.value)}
              value={draft.discipline}
            />
            {errors.discipline && (
              <span className="admin-error">{errors.discipline}</span>
            )}
          </label>
          <label>
            Slug
            <input disabled value={generatedSlug} />
          </label>
        </div>
        <div>
          <h3>Logo *</h3>
          {draft.existingLogoPath && !draft.logo && (
            <p>Logo actual: {draft.existingLogoPath}</p>
          )}
          <FileDropzone
            accept={IMAGE_ACCEPT}
            allowedMimeTypes={IMAGE_MIME_TYPES}
            items={draft.logo ? [draft.logo] : []}
            mediaKind="post"
            multiple={false}
            onChange={(items) => updateField("logo", items[0] ?? null)}
          />
          {errors.logo && <p className="admin-error">{errors.logo}</p>}
        </div>
      </Section>

      {draft.preservedEditions.length > 0 && (
        <aside className="admin-notice">
          Este cliente usa ediciones especiales. Su estructura y orden se conservan
          sin convertirlos al formato estándar.
        </aside>
      )}

      {draft.sectionOrder.map(renderContentSection)}
      {errors.customSections && (
        <p className="admin-error">{errors.customSections}</p>
      )}
      <button
        className="admin-secondary-action admin-add-section"
        onClick={() => {
          const section = createPendingCustomSection();
          setDraft({
            ...draft,
            customSections: [...draft.customSections, section],
            sectionOrder: [...draft.sectionOrder, `custom:${section.id}`],
          });
        }}
        type="button"
      >
        + Añadir sección
      </button>

      {status && (
        <p aria-live="polite" className="admin-progress">
          Guardando cliente…{" "}
          {status.total > 0 &&
            `Subiendo ${status.category} ${status.current}/${status.total}`}
        </p>
      )}
      {saveError && <p className="admin-error" role="alert">{saveError}</p>}
      <button className="admin-confirm" disabled={Boolean(status)} type="submit">
        {status ? "Guardando…" : "Confirmar cambios"}
      </button>
    </form>
  );
}
