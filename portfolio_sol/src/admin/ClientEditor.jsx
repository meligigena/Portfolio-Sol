import { useMemo, useState } from "react";
import { DisplayHeading } from "../components/typography/DisplayHeading";
import {
  createEmptyAdminDraft,
  createPendingEdition,
  createPendingEditionSection,
  createPendingGroup,
  createPendingCustomSection,
  editionDraftIdentity,
} from "./adminDraft";
import {
  CUSTOM_SECTION_DEFINITION,
  getAvailableSectionDefinitions,
  getSectionDefinitionByKey,
  getSectionDefinitionByType,
} from "./adminSectionRegistry";
import {
  IMAGE_MIME_TYPES,
  slugifyClientName,
  validateClientDraft,
  VIDEO_MIME_TYPES,
} from "./adminValidation";
import { FileDropzone } from "./FileDropzone";

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp";
const VIDEO_ACCEPT = ".mp4";

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
        aria-label="Mover sección hacia arriba"
        disabled={index === 0}
        onClick={() => onMove(-1)}
        type="button"
      >
        Subir
      </button>
      <button
        aria-label="Mover sección hacia abajo"
        disabled={index === total - 1}
        onClick={() => onMove(1)}
        type="button"
      >
        Bajar
      </button>
      {onRemove && (
        <button onClick={onRemove} type="button">Eliminar sección</button>
      )}
    </div>
  );
}

function sectionItems(section) {
  return [
    ...(section.items ?? []),
    ...(section.groups ?? []).flatMap((group) => group.items ?? []),
    ...(section.companionVideo ? [section.companionVideo] : []),
  ];
}

function AddSectionControl({ context, onAdd, presentTypes }) {
  const [requestedType, setRequestedType] = useState("");
  const available = getAvailableSectionDefinitions({ context, presentTypes });
  const selectedType = available.some(
    (definition) => definition.type === requestedType,
  )
    ? requestedType
    : available[0]?.type ?? "";

  return (
    <div className="admin-add-section-control">
      <label>
        Tipo de sección
        <select
          onChange={(event) => setRequestedType(event.target.value)}
          value={selectedType}
        >
          {available.map((definition) => (
            <option key={definition.type} value={definition.type}>
              {definition.label}
            </option>
          ))}
        </select>
      </label>
      <button
        className="admin-secondary-action"
        disabled={!selectedType}
        onClick={() => onAdd(selectedType)}
        type="button"
      >
        + Añadir sección
      </button>
    </div>
  );
}

function hasEditionContent(edition) {
  return edition.sections.some((section) =>
    sectionItems(section).some((item) => !item.removed),
  );
}

function hasRootDraftContent(draft) {
  return (
    [draft.stories, draft.posts, draft.videos, draft.banners].some((items) =>
      (items ?? []).some((item) => !item.removed),
    ) ||
    [draft.carousels, draft.catalogs].some((groups) =>
      (groups ?? []).some((group) =>
        !group.removed && group.items.some((item) => !item.removed),
      ),
    ) ||
    (draft.customSections ?? []).some(
      (section) => !section.removed && (section.title || section.items.length > 0),
    )
  );
}

function markSectionRemoved(section, removed) {
  return {
    ...section,
    removed,
    items: (section.items ?? []).map((item) => ({ ...item, removed })),
    groups: (section.groups ?? []).map((group) => ({
      ...group,
      removed,
      items: (group.items ?? []).map((item) => ({ ...item, removed })),
    })),
    companionVideo: section.companionVideo
      ? { ...section.companionVideo, removed }
      : undefined,
  };
}

function DraftGroupedUploads({ kind, section, onChange }) {
  const isRows = kind === "media_row";
  const isCarousel = kind === "carousel";
  const itemKind = isRows ? "video" : isCarousel ? "carouselSlide" : "catalogPage";
  const accept = isRows ? VIDEO_ACCEPT : IMAGE_ACCEPT;
  const allowedMimeTypes = isRows ? VIDEO_MIME_TYPES : IMAGE_MIME_TYPES;
  const noun = isRows ? "fila" : isCarousel ? "carrusel" : "catálogo";

  return (
    <>
      {section.groups.map((group, groupIndex) => (
        <div
          className={`admin-media-group${group.removed ? " is-removed" : ""}`}
          key={group.id ?? group.tempId}
        >
          <div className="admin-media-group__header">
            <div>
              <h4>{group.label}</h4>
              <label>
                Nombre
                <input
                  disabled={group.removed}
                  onChange={(event) =>
                    onChange({
                      ...section,
                      groups: section.groups.map((entry, index) =>
                        index === groupIndex ? { ...entry, label: event.target.value } : entry,
                      ),
                    })
                  }
                  value={group.label}
                />
              </label>
            </div>
            <button
              onClick={() =>
                onChange({
                  ...section,
                  groups: group.existing
                    ? section.groups.map((entry, index) =>
                        index === groupIndex
                          ? {
                              ...entry,
                              removed: !entry.removed,
                              items: entry.items.map((item) => ({
                                ...item,
                                removed: !entry.removed,
                              })),
                            }
                          : entry,
                      )
                    : section.groups.filter((_entry, index) => index !== groupIndex),
                })
              }
              type="button"
            >
              {group.removed ? "Conservar grupo" : "Eliminar grupo"}
            </button>
          </div>
          {!group.removed && (
            <FileDropzone
              accept={accept}
              allowedMimeTypes={allowedMimeTypes}
              items={group.items}
              mediaKind={itemKind}
              onChange={(items) =>
                onChange({
                  ...section,
                  groups: section.groups.map((entry, index) =>
                    index === groupIndex ? { ...entry, items } : entry,
                  ),
                })
              }
              showAudio={isRows}
            />
          )}
        </div>
      ))}
      <button
        className="admin-secondary-action"
        onClick={() => {
          const group = createPendingGroup(
            isCarousel ? "carousel" : isRows ? "row" : "catalog",
            section.groups.length,
          );
          onChange({
            ...section,
            groups: [
              ...section.groups,
              {
                ...group,
                kind,
                label: `${isRows ? "Fila" : isCarousel ? "Carrusel" : "Catálogo"} ${section.groups.length + 1}`,
              },
            ],
          });
        }}
        type="button"
      >
        + Añadir {noun}
      </button>
    </>
  );
}

function DraftBannerUploads({ section, onChange }) {
  const variants = [
    ["desktop", "Desktop / tablet grande"],
    ["mobile", "Mobile"],
  ];

  return (
    <div className="admin-banner-variants">
      {variants.map(([viewport, label]) => (
        <div className="admin-banner-variant" key={viewport}>
          <h3>{label}</h3>
          <FileDropzone
            accept={IMAGE_ACCEPT}
            allowedMimeTypes={IMAGE_MIME_TYPES}
            items={section.items.filter((item) => item.viewport === viewport)}
            mediaKind="banner"
            multiple={false}
            onChange={(items) =>
              onChange({
                ...section,
                items: [
                  ...section.items.filter((item) => item.viewport !== viewport),
                  ...items,
                ],
              })
            }
            pendingItemMetadata={{ viewport }}
          />
        </div>
      ))}
    </div>
  );
}

function DraftSectionEditor({ index, onChange, onMove, onRemove, section, total }) {
  const definition = getSectionDefinitionByType(section.type);
  const companionDefinition = definition?.companion;

  return (
    <Section
      actions={
        <SectionOrderActions
          index={index}
          onMove={onMove}
          onRemove={onRemove}
          total={total}
        />
      }
      title={(section.editorTitle ?? section.title) || "Sección personalizada"}
    >
      {section.type === "customMedia" && (
        <label>
          Nombre de la sección
          <input
            onChange={(event) => onChange({ ...section, title: event.target.value })}
            value={section.title}
          />
        </label>
      )}
      {section.type === "banners" && (
        <label>
          Título público
          <input
            onChange={(event) => onChange({ ...section, title: event.target.value })}
            value={section.title}
          />
        </label>
      )}
      {definition?.uploader === "direct" && (
        <FileDropzone
          accept={definition.accept}
          allowedMimeTypes={definition.allowedMimeTypes}
          items={section.items}
          mediaKind={definition.mediaKind}
          onChange={(items) => onChange({ ...section, items })}
          showAudio={definition.showAudio}
        />
      )}
      {section.type === "storySequence" &&
        companionDefinition &&
        (section.companionVideo || section.presentation === "dualPhoneVideo") && (
          <div className="admin-media-group">
            <div className="admin-media-group__header">
              <h3>{companionDefinition.label}</h3>
            </div>
            <FileDropzone
              accept={companionDefinition.accept}
              allowedMimeTypes={companionDefinition.allowedMimeTypes}
              items={section.companionVideo ? [section.companionVideo] : []}
              maxItems={companionDefinition.maxItems}
              mediaKind={companionDefinition.mediaKind}
              onChange={(items) =>
                onChange({ ...section, companionVideo: items[0] ?? null })
              }
              pendingItemMetadata={companionDefinition.pendingItemMetadata}
              showAudio={companionDefinition.showAudio}
            />
          </div>
        )}
      {section.type === "banners" && (
        <DraftBannerUploads onChange={onChange} section={section} />
      )}
      {definition?.uploader === "grouped" && (
        <DraftGroupedUploads
          kind={definition.groupKind}
          onChange={onChange}
          section={section}
        />
      )}
    </Section>
  );
}

function EditionEditor({ edition, onEditionChange }) {
  const activeSections = edition.sections.filter((section) => !section.removed);
  const sectionIdentity = (section) => section.id ?? section.tempId;
  const updateSection = (sectionKey, nextSection) =>
    onEditionChange({
      ...edition,
      sections: edition.sections.map((section) =>
        sectionIdentity(section) === sectionKey ? nextSection : section,
      ),
    });

  return (
    <section className="admin-edition" data-admin-edition={editionDraftIdentity(edition)}>
      <header className="admin-edition__header">
        <DisplayHeading as="h2" text={edition.label} />
      </header>
      {activeSections.map((section, index) => (
        <DraftSectionEditor
          index={index}
          key={sectionIdentity(section)}
          onChange={(nextSection) =>
            updateSection(sectionIdentity(section), nextSection)
          }
          onMove={(offset) => {
            const target = index + offset;
            if (target < 0 || target >= activeSections.length) return;
            const nextActive = [...activeSections];
            [nextActive[index], nextActive[target]] = [nextActive[target], nextActive[index]];
            onEditionChange({
              ...edition,
              sections: [
                ...nextActive,
                ...edition.sections.filter((sectionEntry) => sectionEntry.removed),
              ],
            });
          }}
          onRemove={() =>
            updateSection(sectionIdentity(section), markSectionRemoved(section, true))
          }
          section={section}
          total={activeSections.length}
        />
      ))}
      {edition.sections
        .filter((section) => section.removed)
        .map((section) => (
          <div className="admin-notice" key={sectionIdentity(section)}>
            <span>{section.title || "Sección personalizada"} se eliminará al confirmar.</span>
            <button
              onClick={() =>
                updateSection(sectionIdentity(section), markSectionRemoved(section, false))
              }
              type="button"
            >
              Conservar sección
            </button>
          </div>
        ))}
      {activeSections.length === 0 && (
        <p className="admin-edition__empty">Esta edición todavía no tiene secciones.</p>
      )}
      <AddSectionControl
        context="edition"
        onAdd={(type) =>
          onEditionChange({
            ...edition,
            sections: [...edition.sections, createPendingEditionSection(type)],
          })
        }
        presentTypes={edition.sections.map((section) => section.type)}
      />
    </section>
  );
}

export function ClientEditor({ initialDraft, mode, onCancel, onSaved, service }) {
  const [draft, setDraft] = useState(initialDraft ?? createEmptyAdminDraft());
  const [activeEditionIdentity, setActiveEditionIdentity] = useState(() => {
    const firstEdition = initialDraft?.editionDrafts?.[0];
    return firstEdition ? editionDraftIdentity(firstEdition) : null;
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);
  const [saveError, setSaveError] = useState("");
  const editing = mode === "edit";
  const generatedSlug = useMemo(
    () => (editing ? draft.slug : slugifyClientName(draft.name)),
    [draft.name, draft.slug, editing],
  );
  const activeEdition = draft.editionDrafts.find(
    (edition) => editionDraftIdentity(edition) === activeEditionIdentity,
  );
  const logoItems = useMemo(() => {
    if (draft.logo) return [draft.logo];
    if (!draft.existingLogoPath) return [];
    return [
      {
        id: "current-client-logo",
        existing: true,
        removed: draft.logoRemoved,
        storagePath: draft.existingLogoPath,
        name: draft.existingLogoPath.split("/").at(-1),
        type: "logo",
        alt: `Logo actual de ${draft.name || "cliente"}`,
      },
    ];
  }, [draft.existingLogoPath, draft.logo, draft.logoRemoved, draft.name]);

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

  const renderContentSection = (sectionKey, index) => {
    const definition = getSectionDefinitionByKey(sectionKey);
    const storedEntries = definition?.draftField
      ? draft[definition.draftField] ?? []
      : [];
    const standardSection = definition
      ? {
          id: definition.key,
          type: definition.type,
          editorTitle: definition.label,
          title:
            definition.type === "banners" ? draft.bannerTitle : definition.label,
          items: definition.uploader === "grouped" ? [] : storedEntries,
          groups: definition.uploader === "grouped" ? storedEntries : [],
          config:
            definition.type === "storySequence"
              ? draft.sectionConfig.storySequence ?? definition.initialConfig
              : definition.initialConfig,
          presentation:
            definition.type === "storySequence"
              ? draft.sectionConfig.storySequence?.presentation
              : definition.initialConfig.presentation,
          companionVideo:
            definition.type === "storySequence"
              ? draft.sectionConfig.storySequence?.companionVideo
              : undefined,
        }
      : null;
    const customId = sectionKey.startsWith("custom:")
      ? sectionKey.slice("custom:".length)
      : null;
    const custom = draft.customSections.find((section) => section.id === customId);
    const section = standardSection ?? (custom
      ? { ...custom, type: "customMedia", groups: [], config: custom.config ?? {} }
      : null);
    if (!section) return null;

    if (custom?.removed) {
      return (
        <div className="admin-notice" key={sectionKey}>
          <span>{custom.title || "Sección personalizada"} se eliminará al confirmar.</span>
          <button
            onClick={() =>
              setDraft({
                ...draft,
                customSections: draft.customSections.map((entry) =>
                  entry.id === custom.id
                    ? {
                        ...entry,
                        removed: false,
                        items: entry.items.map((item) => ({
                          ...item,
                          removed: false,
                        })),
                      }
                    : entry,
                ),
              })
            }
            type="button"
          >
            Conservar sección
          </button>
        </div>
      );
    }

    const updateRootSection = (nextSection) => {
      if (definition) {
        const nextDraft = {
          ...draft,
          [definition.draftField]:
            definition.uploader === "grouped"
              ? nextSection.groups
              : nextSection.items,
        };
        if (definition.type === "storySequence") {
          nextDraft.sectionConfig = {
            ...draft.sectionConfig,
            storySequence: {
              ...(nextSection.config ?? {}),
              presentation: nextSection.presentation,
              companionVideo: nextSection.companionVideo ?? null,
            },
          };
        }
        if (definition.type === "banners") {
          nextDraft.bannerTitle = nextSection.title;
        }
        setDraft(nextDraft);
      } else if (custom) {
        setDraft({
          ...draft,
          customSections: draft.customSections.map((entry) =>
            entry.id === custom.id ? { ...entry, ...nextSection } : entry,
          ),
        });
        setErrors((current) => ({ ...current, customSections: undefined }));
      }
    };

    return (
      <DraftSectionEditor
        index={index}
        key={sectionKey}
        onChange={updateRootSection}
        onMove={(offset) => moveSection(index, offset)}
        onRemove={custom ? () => removeCustomSection(custom) : null}
        section={section}
        total={draft.sectionOrder.length}
      />
    );
  };

  const addRootSection = (type) => {
    if (type === CUSTOM_SECTION_DEFINITION.type) {
      const section = createPendingCustomSection();
      setDraft({
        ...draft,
        customSections: [...draft.customSections, section],
        sectionOrder: [...draft.sectionOrder, `custom:${section.id}`],
      });
      return;
    }

    const definition = getSectionDefinitionByType(type);
    if (!definition?.key || draft.sectionOrder.includes(definition.key)) return;
    setDraft({
      ...draft,
      sectionOrder: [...draft.sectionOrder, definition.key],
    });
  };

  const enableEditions = () => {
    if (
      hasRootDraftContent(draft) &&
      !globalThis.confirm?.(
        "El editor normal contiene cambios. ¿Querés descartarlos y empezar con Edición 1?",
      )
    ) {
      return;
    }
    const firstEdition = createPendingEdition([]);
    const emptyDraft = createEmptyAdminDraft();
    setDraft((current) => ({
      ...current,
      stories: emptyDraft.stories,
      posts: emptyDraft.posts,
      carousels: emptyDraft.carousels,
      videos: emptyDraft.videos,
      catalogs: emptyDraft.catalogs,
      banners: emptyDraft.banners,
      customSections: emptyDraft.customSections,
      sectionOrder: emptyDraft.sectionOrder,
      sectionConfig: emptyDraft.sectionConfig,
      usesEditions: true,
      editionDrafts: [firstEdition],
    }));
    setActiveEditionIdentity(editionDraftIdentity(firstEdition));
  };

  const disableEditions = () => {
    const hasContent = draft.editionDrafts.some(hasEditionContent);
    if (
      hasContent &&
      !globalThis.confirm?.(
        "Las ediciones contienen archivos o contenido. ¿Querés descartarlos y volver al editor normal?",
      )
    ) {
      return;
    }
    setDraft({ ...draft, usesEditions: false, editionDrafts: [] });
    setActiveEditionIdentity(null);
  };

  const addEdition = () => {
    const nextEdition = createPendingEdition(draft.editionDrafts);
    setDraft({
      ...draft,
      editionDrafts: [...draft.editionDrafts, nextEdition],
    });
    setActiveEditionIdentity(editionDraftIdentity(nextEdition));
  };

  const discardActiveEdition = () => {
    if (!activeEdition || activeEdition.persistedId || hasEditionContent(activeEdition)) return;
    const currentIndex = draft.editionDrafts.findIndex(
      (edition) => editionDraftIdentity(edition) === activeEditionIdentity,
    );
    const nextEditions = draft.editionDrafts.filter(
      (edition) => editionDraftIdentity(edition) !== activeEditionIdentity,
    );
    const fallback = nextEditions[Math.max(0, currentIndex - 1)] ?? nextEditions[0];
    setDraft({ ...draft, editionDrafts: nextEditions });
    setActiveEditionIdentity(fallback ? editionDraftIdentity(fallback) : null);
  };

  const updateActiveEdition = (nextEdition) => {
    setDraft({
      ...draft,
      editionDrafts: draft.editionDrafts.map((edition) =>
        editionDraftIdentity(edition) === activeEditionIdentity ? nextEdition : edition,
      ),
    });
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
      </header>
      <div className="admin-editor__actions">
        <button disabled={Boolean(status)} onClick={onCancel} type="button">
          Cancelar
        </button>
        <button className="admin-confirm" disabled={Boolean(status)} type="submit">
          {status ? "Guardando…" : "Confirmar cambios"}
        </button>
      </div>

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
          <h3>{editing ? "Logo" : "Logo *"}</h3>
          <FileDropzone
            accept={IMAGE_ACCEPT}
            allowedMimeTypes={IMAGE_MIME_TYPES}
            editableSingle
            items={logoItems}
            mediaKind="logo"
            multiple={false}
            onChange={(items) => {
              const nextLogo = items[0] ?? null;
              setDraft((current) => {
                if (!nextLogo) {
                  return { ...current, logo: null, logoRemoved: false };
                }
                if (nextLogo.existing) {
                  return {
                    ...current,
                    logo: null,
                    logoRemoved: nextLogo.removed,
                  };
                }
                return { ...current, logo: nextLogo, logoRemoved: false };
              });
              setErrors((current) => ({ ...current, logo: undefined }));
            }}
          />
          {errors.logo && <p className="admin-error">{errors.logo}</p>}
        </div>
        {editing ? (
          draft.usesEditions && (
            <p className="admin-notice">Este cliente utiliza ediciones.</p>
          )
        ) : (
          <label className="admin-check admin-use-editions">
            <input
              checked={draft.usesEditions}
              onChange={(event) =>
                event.target.checked ? enableEditions() : disableEditions()
              }
              type="checkbox"
            />
            <span>Utilizar ediciones</span>
          </label>
        )}
      </Section>

      {draft.usesEditions ? (
        <>
          <div className="admin-edition-selector">
            <div
              aria-label={`Ediciones de ${draft.name || "nuevo cliente"}`}
              className="admin-edition-tabs"
              role="tablist"
            >
              {draft.editionDrafts.map((edition) => {
                const identity = editionDraftIdentity(edition);
                return (
                  <button
                    aria-selected={identity === activeEditionIdentity}
                    key={identity}
                    onClick={() => setActiveEditionIdentity(identity)}
                    role="tab"
                    type="button"
                  >
                    {edition.label}
                  </button>
                );
              })}
            </div>
            <button
              className="admin-secondary-action admin-add-edition"
              onClick={addEdition}
              type="button"
            >
              + Agregar edición
            </button>
          </div>
          {activeEdition && (
            <>
              <EditionEditor
                edition={activeEdition}
                key={activeEditionIdentity}
                onEditionChange={updateActiveEdition}
              />
              {!activeEdition.persistedId && !hasEditionContent(activeEdition) && (
                <button
                  className="admin-discard-edition"
                  onClick={discardActiveEdition}
                  type="button"
                >
                  Descartar edición
                </button>
              )}
            </>
          )}
        </>
      ) : (
        <>
          {draft.sectionOrder.map(renderContentSection)}
          {errors.customSections && (
            <p className="admin-error">{errors.customSections}</p>
          )}
          <AddSectionControl
            context="root"
            onAdd={addRootSection}
            presentTypes={draft.sectionOrder
              .map((key) => getSectionDefinitionByKey(key)?.type)
              .filter(Boolean)}
          />
        </>
      )}
      {draft.usesEditions && errors.customSections && (
        <p className="admin-error">{errors.customSections}</p>
      )}

      {status && (
        <p aria-live="polite" className="admin-progress">
          Guardando cliente…{" "}
          {status.total > 0 &&
            `Subiendo ${status.category} ${status.current}/${status.total}`}
        </p>
      )}
      {saveError && <p className="admin-error" role="alert">{saveError}</p>}
    </form>
  );
}
