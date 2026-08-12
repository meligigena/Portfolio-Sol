import { slugifyClientName } from "./adminValidation";
import { hasRenderableProjectContent } from "../data/projectContent";

const SECTION_TITLES = {
  stories: "Stories",
  posts: "Posts",
  carousels: "Carruseles",
  videos: "Videos",
  catalogs: "Catálogos",
  banners: "Banners",
};

export const STANDARD_SECTION_KEYS = [
  "stories",
  "posts",
  "carousels",
  "videos",
  "catalogs",
  "banners",
];

const SECTION_TYPES = {
  stories: "storySequence",
  posts: "postGrid",
  carousels: "carouselPairs",
  videos: "videoStack",
  catalogs: "catalogPair",
  banners: "banners",
};

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
    preservedEditions: [],
  };
}

function existingItem(item) {
  return {
    id: item.id,
    existing: true,
    removed: false,
    storagePath: item.src,
    name: item.src.split("/").at(-1),
    type: item.type,
    mimeType: item.mimeType ?? null,
    alt: item.alt ?? "",
    width: item.width,
    height: item.height,
    presentation: item.presentation,
    audioEnabled: item.audioEnabled !== false,
    config: item.config ?? {},
    viewport: item.viewport,
  };
}

function blockItems(client, type) {
  return client.content?.find((block) => block.type === type)?.items ?? [];
}

function groupDraft(group, kind) {
  const sourceItems = kind === "catalog" ? group.pages : group.items;
  return {
    id: group.id ?? draftId(kind),
    existing: true,
    removed: false,
    label: group.label,
    items: (sourceItems ?? []).map(existingItem),
  };
}

export function clientToAdminDraft(client) {
  const draft = createEmptyAdminDraft();
  const storyBlock = client.content?.find((block) => block.type === "storySequence");
  const bannerBlock = client.content?.find((block) => block.type === "banners");
  const storagePrefix = client.storagePrefix ?? client.slug;
  const sectionOrder = [];
  const customSections = [];

  (client.content ?? []).forEach((block) => {
    const standardKey = Object.entries(SECTION_TYPES).find(
      ([, type]) => type === block.type,
    )?.[0];
    if (standardKey) {
      if (!sectionOrder.includes(standardKey)) sectionOrder.push(standardKey);
      return;
    }
    if (block.type === "customMedia") {
      const custom = {
        id: block.id ?? draftId("custom"),
        existing: true,
        removed: false,
        title: block.title,
        config: block.config ?? {
          presentation: block.presentation ?? "mediaGrid",
        },
        items: (block.items ?? []).map(existingItem),
      };
      customSections.push(custom);
      sectionOrder.push(`custom:${custom.id}`);
    }
  });
  STANDARD_SECTION_KEYS.forEach((key) => {
    if (!sectionOrder.includes(key)) sectionOrder.push(key);
  });

  return {
    ...draft,
    id: client.id,
    slug: client.slug,
    storagePrefix,
    name: client.name,
    year: client.year,
    discipline: client.disciplines?.join(" / ") ?? "",
    existingLogoPath: client.cover,
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
    bannerTitle: bannerBlock?.title ?? SECTION_TITLES.banners,
    customSections,
    sectionOrder,
    sectionConfig: {
      storySequence: storyBlock
        ? {
            presentation: storyBlock.presentation,
            companionVideo: storyBlock.companionVideo,
          }
        : {},
    },
    preservedEditions: client.editions ?? [],
  };
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
    id: draftId(resolvedKind),
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
      resolvedKind === "story"
        ? "phone"
        : resolvedKind === "video"
          ? "reel"
          : "raw",
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
    id: draftId(kind),
    existing: false,
    removed: false,
    label: `${kind === "carousel" ? "Carrusel" : "Catálogo"} ${index + 1}`,
    items: [],
  };
}

function serializeItem(item, resolvedPaths) {
  const storagePath = item.existing
    ? item.storagePath
    : resolvedPaths.get(item.id);

  return {
    id: item.existing ? item.id : undefined,
    media_kind: item.type,
    storage_path: storagePath,
    title: item.name,
    alt_text: item.alt || item.name,
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

function serializePublicBlock(block) {
  const direct = (block.items ?? []).map((item) => ({
    media_kind: item.type,
    storage_path: item.src,
    title: item.title,
    alt_text: item.alt,
    width: item.width,
    height: item.height,
    audio_enabled: item.type === "video" ? item.audioEnabled !== false : null,
    config: { presentation: item.presentation },
  }));
  const groups =
    block.type === "mediaRows"
      ? (block.rows ?? []).map((row, index) => ({
          group_kind: "media_row",
          label: `Fila ${index + 1}`,
          config: {},
          items: row.map((item) => ({
            media_kind: item.type,
            storage_path: item.src,
            title: item.title,
            alt_text: item.alt,
            width: item.width,
            height: item.height,
            audio_enabled: item.audioEnabled !== false,
            config: { presentation: item.presentation },
          })),
        }))
      : [];

  return {
    section_type: block.type,
    title: block.title,
    config: {
      presentation: block.presentation,
    },
    items: direct,
    groups,
  };
}

export function buildClientPayload(draft, resolvedPaths = new Map()) {
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
      draft.bannerTitle?.trim() || SECTION_TITLES.banners,
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
            section.title.trim(),
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
  if (storyConfig.companionVideo && storySection) {
    const companion = storyConfig.companionVideo;
    storySection.groups.push({
      group_kind: "story_companion",
      label: "Video companion",
      config: {},
      items: [
        {
          media_kind: companion.type,
          storage_path: companion.src,
          title: companion.title,
          alt_text: companion.alt,
          width: companion.width,
          height: companion.height,
          audio_enabled: false,
          config: { presentation: companion.presentation },
        },
      ],
    });
  }

  const slug = draft.slug || slugifyClientName(draft.name);
  const editions = draft.preservedEditions.map((edition, index) => {
    const editionSections = (edition.content ?? []).map(serializePublicBlock);

    return {
      edition_key: edition.id,
      label: edition.label,
      sort_order: index,
      coming_soon: !hasRenderableProjectContent({ content: editionSections }),
      config: {},
      sections: editionSections,
    };
  });
  const effectiveComingSoon = !hasRenderableProjectContent({
    content: sections,
    editions: editions.map((edition) => ({ content: edition.sections })),
  });

  return {
    client: {
      slug,
      storage_prefix: draft.storagePrefix ?? slug,
      name: draft.name.trim(),
      year: String(draft.year).trim(),
      disciplines: [draft.discipline.trim()],
      logo_path: draft.logo ? resolvedPaths.get("logo") : draft.existingLogoPath,
      sort_order: draft.sortOrder,
      published: draft.published !== false,
      coming_soon: effectiveComingSoon,
      config: {},
    },
    sections,
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
  ];
}
