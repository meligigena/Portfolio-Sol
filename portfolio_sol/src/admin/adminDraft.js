import { slugifyClientName } from "./adminValidation";
import {
  hasRenderableContentBlock,
  hasRenderableProjectContent,
} from "../data/projectContent";
import {
  ADMIN_SECTION_DEFINITIONS,
  CUSTOM_SECTION_DEFINITION,
  getSectionDefinitionByType,
} from "./adminSectionRegistry";

export const STANDARD_SECTION_KEYS = ADMIN_SECTION_DEFINITIONS
  .filter((definition) => definition.contexts.includes("root"))
  .map((definition) => definition.key);

const SECTION_TITLES = Object.fromEntries(
  ADMIN_SECTION_DEFINITIONS
    .filter((definition) => definition.key)
    .map((definition) => [definition.key, definition.label]),
);

function draftId(prefix) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

export function createEmptyAdminDraft() {
  return {
    id: null,
    slug: "",
    name: "",
    year: "",
    discipline: "",
    existingLogoPath: null,
    logo: null,
    logoRemoved: false,
    published: true,
    comingSoon: false,
    sortOrder: null,
    stories: [],
    posts: [],
    carousels: [],
    videos: [],
    catalogs: [],
    banners: [],
    bannerTitle: SECTION_TITLES.banners,
    customSections: [],
    sectionOrder: [...STANDARD_SECTION_KEYS],
    sectionConfig: {},
    usesEditions: false,
    editionDrafts: [],
  };
}

const MOJIBAKE_MARKERS = /[\u00c3\u00c2\u00e2]/;
const WINDOWS_1252_BYTES = new Map(
  [
    "€", "\u0081", "‚", "ƒ", "„", "…", "†", "‡",
    "ˆ", "‰", "Š", "‹", "Œ", "\u008d", "Ž", "\u008f",
    "\u0090", "‘", "’", "“", "”", "•", "–", "—",
    "˜", "™", "š", "›", "œ", "\u009d", "ž", "Ÿ",
  ].map((character, index) => [character, 0x80 + index]),
);

function windows1252Bytes(value) {
  const bytes = [];
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    const byte = codePoint <= 255 ? codePoint : WINDOWS_1252_BYTES.get(character);
    if (byte === undefined) return null;
    bytes.push(byte);
  }
  return Uint8Array.from(bytes);
}

export function normalizeAdminText(value) {
  if (typeof value !== "string" || !MOJIBAKE_MARKERS.test(value)) return value;

  let normalized = value;
  for (let pass = 0; pass < 3 && MOJIBAKE_MARKERS.test(normalized); pass += 1) {
    const bytes = windows1252Bytes(normalized);
    if (!bytes) break;
    try {
      normalized = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      break;
    }
  }
  return normalized;
}

function draftSignature(draft) {
  const { originalDraftSignature: _signature, ...comparable } = draft;
  return JSON.stringify(comparable);
}

export function hasAdminDraftChanges(draft) {
  return (
    !draft.originalDraftSignature ||
    draftSignature(draft) !== draft.originalDraftSignature
  );
}

function existingItem(item) {
  const normalizedAlt = normalizeAdminText(item.alt ?? "");
  return {
    id: item.id,
    tempId: null,
    existing: true,
    removed: false,
    storagePath: item.src,
    name: item.src.split("/").at(-1),
    originalTitle: item.title,
    type: item.type,
    mimeType: item.mimeType ?? null,
    alt: normalizedAlt,
    originalAlt: item.alt ?? "",
    width: item.width,
    height: item.height,
    presentation: item.presentation,
    audioEnabled: item.audioEnabled !== false,
    config: item.config ?? {},
    viewport: item.viewport,
  };
}

function blockItems(client, type) {
  return (
    client.content?.find(
      (block) => block.type === type && hasRenderableContentBlock(block),
    )?.items ?? []
  );
}

function groupDraft(group, kind) {
  const sourceItems = kind === "catalog" ? group.pages : group.items;
  return {
    id: group.id ?? null,
    tempId: group.id ? null : draftId(kind),
    existing: true,
    removed: false,
    label: group.label,
    items: (sourceItems ?? []).map(existingItem),
  };
}

function editionSectionDraft(block) {
  const base = {
    id: block.id ?? null,
    tempId: block.id ? null : draftId("edition-section"),
    type: block.type,
    title: normalizeAdminText(block.title ?? block.type),
    originalTitle: block.title ?? block.type,
    config: block.config ?? {},
    presentation: block.presentation,
    items: (block.items ?? []).map(existingItem),
    groups: [],
    existing: true,
    removed: false,
  };

  if (block.type === "mediaRows") {
    base.groups = (block.rows ?? []).map((items, index) => ({
      id: block.rowGroups?.[index]?.id ?? null,
      tempId: block.rowGroups?.[index]?.id
        ? null
        : draftId("media-row"),
      existing: true,
      removed: false,
      kind: "media_row",
      label: block.rowGroups?.[index]?.label ?? `Fila ${index + 1}`,
      config: block.rowGroups?.[index]?.config ?? {},
      items: items.map(existingItem),
    }));
  } else if (block.type === "carouselPairs" || block.type === "catalogPair") {
    base.groups = (block.items ?? []).map((group) =>
      groupDraft(group, block.type === "catalogPair" ? "catalog" : "carousel"),
    );
    base.items = [];
  }

  if (block.companionVideo) {
    base.companionVideo = existingItem(block.companionVideo);
  }
  return base;
}

function editionDraft(edition, index) {
  const editionKey = edition.editionKey ?? edition.id;
  const fallbackNumber = Number.parseInt(
    String(edition.label ?? editionKey).match(/(\d+)(?!.*\d)/)?.[1] ?? "",
    10,
  );
  const nextEdition = {
    tempId: null,
    persistedId: edition.databaseId ?? edition.persistedId ?? null,
    editionKey,
    number: Number.isFinite(edition.number) ? edition.number : fallbackNumber,
    label: normalizeAdminText(edition.label),
    originalLabel: edition.label,
    sortOrder: edition.sortOrder ?? index,
    config: edition.config ?? {},
    comingSoon: edition.comingSoon,
    sections: (edition.content ?? [])
      .filter(hasRenderableContentBlock)
      .map(editionSectionDraft),
  };
  nextEdition.originalDraftSignature = editionDraftSignature(nextEdition);
  return nextEdition;
}

function editionDraftSignature(edition) {
  const { originalDraftSignature: _signature, ...comparable } = edition;
  return JSON.stringify(comparable);
}

export function hasEditionDraftChanges(edition) {
  return (
    !edition.persistedId ||
    !edition.originalDraftSignature ||
    editionDraftSignature(edition) !== edition.originalDraftSignature
  );
}

export function editionDraftIdentity(edition) {
  return edition.persistedId ?? edition.tempId ?? edition.editionKey;
}

export function moveAdminMediaItem(items, index, offset) {
  const nextIndex = index + offset;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

export function createPendingEditionSection(type) {
  const definition = getSectionDefinitionByType(type);

  return {
    id: null,
    tempId: draftId("edition-section"),
    type,
    title: type === CUSTOM_SECTION_DEFINITION.type ? "" : definition?.label ?? type,
    originalTitle: null,
    config: { ...(definition?.initialConfig ?? {}) },
    presentation: definition?.initialConfig?.presentation,
    items: [],
    groups: [],
    existing: false,
    removed: false,
  };
}

export function createPendingEdition(editions = []) {
  const maxNumber = editions.reduce(
    (maximum, edition) =>
      Number.isFinite(edition.number) ? Math.max(maximum, edition.number) : maximum,
    0,
  );
  const maxSortOrder = editions.reduce(
    (maximum, edition) => Math.max(maximum, edition.sortOrder ?? -1),
    -1,
  );
  const number = maxNumber + 1;

  return {
    tempId: draftId("edition"),
    persistedId: null,
    editionKey: `edicion-${number}`,
    number,
    label: `Edición ${number}`,
    originalLabel: null,
    sortOrder: maxSortOrder + 1,
    config: {},
    comingSoon: true,
    sections: [],
  };
}

export function clientToAdminDraft(client) {
  const draft = createEmptyAdminDraft();
  const renderableContent = (client.content ?? []).filter(hasRenderableContentBlock);
  const storyBlock = renderableContent.find((block) => block.type === "storySequence");
  const bannerBlock = renderableContent.find((block) => block.type === "banners");
  const storagePrefix = client.storagePrefix ?? client.slug;
  const sectionOrder = [];
  const customSections = [];

  renderableContent.forEach((block) => {
    const standardKey = getSectionDefinitionByType(block.type)?.key;
    if (standardKey) {
      if (!sectionOrder.includes(standardKey)) sectionOrder.push(standardKey);
      return;
    }
    if (block.type === "customMedia") {
      const normalizedTitle = normalizeAdminText(block.title);
      const custom = {
        id: block.id ?? draftId("custom"),
        existing: true,
        removed: false,
        title: normalizedTitle,
        originalTitle: block.title,
        config: block.config ?? {
          presentation: block.presentation ?? "mediaGrid",
        },
        items: (block.items ?? []).map(existingItem),
      };
      customSections.push(custom);
      sectionOrder.push(`custom:${custom.id}`);
    }
  });
  const nextDraft = {
    ...draft,
    id: client.id,
    slug: client.slug,
    storagePrefix,
    name: client.name,
    year: client.year,
    discipline: client.disciplines?.join(" / ") ?? "",
    existingLogoPath: client.cover,
    logoRemoved: false,
    published: client.published !== false,
    comingSoon: !hasRenderableProjectContent(client),
    sortOrder: client.sortOrder ?? null,
    stories: blockItems(client, "storySequence").map(existingItem),
    posts: blockItems(client, "postGrid").map(existingItem),
    carousels: blockItems(client, "carouselPairs").map((group) =>
      groupDraft(group, "carousel"),
    ),
    videos: blockItems(client, "videoStack").map(existingItem),
    catalogs: blockItems(client, "catalogPair").map((group) =>
      groupDraft(group, "catalog"),
    ),
    banners: blockItems(client, "banners").map(existingItem),
    bannerTitle: normalizeAdminText(bannerBlock?.title ?? SECTION_TITLES.banners),
    originalBannerTitle: bannerBlock?.title ?? SECTION_TITLES.banners,
    customSections,
    sectionOrder,
    sectionConfig: {
      storySequence: storyBlock
        ? {
            presentation: storyBlock.presentation,
            companionVideo: storyBlock.companionVideo
              ? existingItem(storyBlock.companionVideo)
              : null,
          }
        : {},
    },
    usesEditions: (client.editions ?? []).length > 0,
    editionDrafts: (client.editions ?? []).map(editionDraft),
  };
  nextDraft.originalDraftSignature = draftSignature(nextDraft);
  return nextDraft;
}

export function createPendingItem(file, mediaKind, metadata = {}) {
  const resolvedKind =
    mediaKind === "custom"
      ? file.type.startsWith("video/")
        ? "video"
        : "image"
      : mediaKind;
  const isVertical = resolvedKind === "story" || resolvedKind === "video";
  return {
    id: null,
    tempId: draftId(resolvedKind),
    existing: false,
    removed: false,
    file,
    name: file.name,
    mimeType: file.type,
    type: resolvedKind,
    alt: "",
    width: metadata.width ?? 1080,
    height: metadata.height ?? (isVertical ? 1920 : 1350),
    presentation:
      metadata.presentation ??
      (resolvedKind === "story"
        ? "phone"
        : resolvedKind === "video"
          ? "reel"
          : "raw"),
    audioEnabled: true,
    viewport: metadata.viewport,
    config: metadata.viewport ? { viewport: metadata.viewport } : {},
  };
}

export function createPendingCustomSection() {
  return {
    id: draftId("custom"),
    existing: false,
    removed: false,
    title: "",
    config: { presentation: "mediaGrid" },
    items: [],
  };
}

export function createPendingGroup(kind, index) {
  return {
    id: null,
    tempId: draftId(kind),
    existing: false,
    removed: false,
    label: `${kind === "carousel" ? "Carrusel" : "Catálogo"} ${index + 1}`,
    items: [],
  };
}

function serializeItem(item, resolvedPaths) {
  const storagePath = item.existing
    ? item.storagePath
    : resolvedPaths.get(item.tempId);

  return {
    id: item.id ?? undefined,
    media_kind: item.type,
    storage_path: storagePath,
    title: item.existing ? item.originalTitle ?? item.name : item.name,
    alt_text:
      item.existing && item.alt === normalizeAdminText(item.originalAlt)
        ? item.originalAlt || item.name
        : item.alt || item.name,
    mime_type: item.mimeType,
    width: item.width,
    height: item.height,
    audio_enabled:
      item.type === "video" ? item.audioEnabled !== false : null,
    config: {
      ...(item.config ?? {}),
      presentation: item.presentation,
      viewport: item.viewport,
    },
  };
}

function active(items) {
  return items.filter((item) => !item.removed);
}

function directSection(type, title, items, resolvedPaths, config = {}) {
  const serializedItems = active(items).map((item) =>
    serializeItem(item, resolvedPaths),
  );
  if (serializedItems.length === 0) return null;
  return { section_type: type, title, config, items: serializedItems, groups: [] };
}

function groupedSection(type, title, kind, groups, resolvedPaths) {
  const serializedGroups = active(groups)
    .map((group) => ({
      group_kind: kind,
      label: group.label,
      config: {},
      items: active(group.items).map((item) => serializeItem(item, resolvedPaths)),
    }))
    .filter((group) => group.items.length > 0);
  if (serializedGroups.length === 0) return null;
  return { section_type: type, title, config: {}, items: [], groups: serializedGroups };
}

function originalText(current, original) {
  return current === normalizeAdminText(original) ? original : current;
}

function serializeEditionSection(section, resolvedPaths) {
  const groups = active(section.groups ?? [])
    .map((group) => ({
      id: group.id ?? undefined,
      group_kind:
        group.kind ??
        (section.type === "mediaRows"
          ? "media_row"
          : section.type === "catalogPair"
            ? "catalog"
            : "carousel"),
      label: group.label,
      config: group.config ?? {},
      items: active(group.items).map((item) => serializeItem(item, resolvedPaths)),
    }))
    .filter((group) => group.items.length > 0);
  const directItems = active(section.items ?? []).map((item) =>
    serializeItem(item, resolvedPaths),
  );
  const companion = section.companionVideo;
  if (companion && !companion.removed) {
    groups.push({
      group_kind: "story_companion",
      label: "Video companion",
      config: {},
      items: [serializeItem(companion, resolvedPaths)],
    });
  }

  return {
    id: section.id ?? undefined,
    section_type: section.type,
    title: originalText(section.title, section.originalTitle),
    config: {
      ...(section.config ?? {}),
      ...(section.presentation ? { presentation: section.presentation } : {}),
    },
    items: directItems,
    groups,
  };
}

export function buildClientPayload(
  draft,
  resolvedPaths = new Map(),
  { changedOnly = false } = {},
) {
  const storyConfig = draft.sectionConfig.storySequence ?? {};
  const sectionsByKey = {
    stories: directSection(
      "storySequence",
      SECTION_TITLES.stories,
      draft.stories,
      resolvedPaths,
      storyConfig.presentation
        ? { presentation: storyConfig.presentation }
        : { presentation: "singlePhone" },
    ),
    posts: directSection(
      "postGrid",
      SECTION_TITLES.posts,
      draft.posts,
      resolvedPaths,
    ),
    carousels: groupedSection(
      "carouselPairs",
      SECTION_TITLES.carousels,
      "carousel",
      draft.carousels,
      resolvedPaths,
    ),
    videos: directSection(
      "videoStack",
      SECTION_TITLES.videos,
      draft.videos,
      resolvedPaths,
    ),
    catalogs: groupedSection(
      "catalogPair",
      SECTION_TITLES.catalogs,
      "catalog",
      draft.catalogs,
      resolvedPaths,
    ),
    banners: directSection(
      "banners",
      originalText(
        draft.bannerTitle?.trim() || SECTION_TITLES.banners,
        draft.originalBannerTitle,
      ),
      draft.banners,
      resolvedPaths,
      { presentation: "responsiveBanner" },
    ),
  };
  const customByKey = new Map(
    (draft.customSections ?? []).map((section) => [
      `custom:${section.id}`,
      section.removed || !section.title.trim()
        ? null
        : directSection(
            "customMedia",
            originalText(section.title.trim(), section.originalTitle),
            section.items,
            resolvedPaths,
            section.config ?? { presentation: "mediaGrid" },
          ),
    ]),
  );
  const order = draft.sectionOrder ?? STANDARD_SECTION_KEYS;
  const sections = order
    .map((key) => sectionsByKey[key] ?? customByKey.get(key) ?? null)
    .filter(Boolean);

  const storySection = sections.find(
    (section) => section.section_type === "storySequence",
  );
  if (
    storyConfig.companionVideo &&
    !storyConfig.companionVideo.removed &&
    storySection
  ) {
    const companion = storyConfig.companionVideo;
    storySection.groups.push({
      group_kind: "story_companion",
      label: "Video companion",
      config: {},
      items: [
        {
          ...serializeItem(companion, resolvedPaths),
        },
      ],
    });
  }

  const slug = draft.slug || slugifyClientName(draft.name);
  const editions = (draft.usesEditions ? draft.editionDrafts ?? [] : [])
    .filter((edition) => !changedOnly || hasEditionDraftChanges(edition))
    .map((edition) => {
    const editionSections = edition.sections
      .filter((section) => !section.removed)
      .map((section) => serializeEditionSection(section, resolvedPaths))
      .filter(
        (section) => section.items.length > 0 || section.groups.length > 0,
      );

    return {
      id: edition.persistedId ?? undefined,
      edition_key: edition.editionKey,
      label: originalText(edition.label, edition.originalLabel),
      sort_order: edition.sortOrder,
      coming_soon: !hasRenderableProjectContent({ content: editionSections }),
      config: edition.config ?? {},
      sections: editionSections,
    };
    });
  const allEditionSections = (draft.editionDrafts ?? []).map((edition) => ({
    content: edition.sections
      .filter((section) => !section.removed)
      .map((section) => serializeEditionSection(section, resolvedPaths)),
  }));
  const effectiveComingSoon = !hasRenderableProjectContent({
    content: draft.usesEditions ? [] : sections,
    editions: draft.usesEditions ? allEditionSections : [],
  });

  return {
    client: {
      slug,
      storage_prefix: draft.storagePrefix ?? slug,
      name: draft.name.trim(),
      year: String(draft.year).trim(),
      disciplines: [draft.discipline.trim()],
      logo_path: draft.logo
        ? resolvedPaths.get("logo")
        : draft.logoRemoved
          ? null
          : draft.existingLogoPath,
      sort_order: draft.sortOrder,
      published: draft.published !== false,
      coming_soon: effectiveComingSoon,
      config: {},
    },
    sections: draft.usesEditions ? [] : sections,
    editions,
  };
}

export function allDraftItems(draft) {
  return [
    ...draft.stories,
    ...draft.posts,
    ...draft.videos,
    ...draft.carousels.flatMap((group) => group.items),
    ...draft.catalogs.flatMap((group) => group.items),
    ...(draft.banners ?? []),
    ...(draft.customSections ?? []).flatMap((section) => section.items),
    ...(draft.sectionConfig?.storySequence?.companionVideo
      ? [draft.sectionConfig.storySequence.companionVideo]
      : []),
    ...(draft.editionDrafts ?? []).flatMap((edition) =>
      edition.sections.flatMap((section) => [
        ...(section.items ?? []),
        ...(section.groups ?? []).flatMap((group) => group.items),
        ...(section.companionVideo ? [section.companionVideo] : []),
      ]),
    ),
  ];
}
