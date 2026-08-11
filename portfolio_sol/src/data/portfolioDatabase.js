import { getSupabaseBrowserClient, isSupabaseConfigured } from "../lib/supabase";
import {
  hasRenderableContentBlock,
  hasRenderableEditionContent,
  hasRenderableProjectContent,
} from "./projectContent";

const PORTFOLIO_SELECT = `
  id,
  slug,
  storage_prefix,
  name,
  year,
  disciplines,
  logo_path,
  sort_order,
  published,
  coming_soon,
  config,
  portfolio_sections (
    id,
    edition_id,
    section_type,
    title,
    sort_order,
    config,
    portfolio_media_items (
      id, media_kind, storage_path, title, alt_text, mime_type,
      width, height, sort_order, audio_enabled, config
    ),
    portfolio_media_groups (
      id, group_kind, label, sort_order, config,
      portfolio_media_items (
        id, media_kind, storage_path, title, alt_text, mime_type,
        width, height, sort_order, audio_enabled, config
      )
    )
  ),
  portfolio_editions (
    id,
    edition_key,
    label,
    sort_order,
    coming_soon,
    config,
    portfolio_sections (
      id,
      edition_id,
      section_type,
      title,
      sort_order,
      config,
      portfolio_media_items (
        id, media_kind, storage_path, title, alt_text, mime_type,
        width, height, sort_order, audio_enabled, config
      ),
      portfolio_media_groups (
        id, group_kind, label, sort_order, config,
        portfolio_media_items (
          id, media_kind, storage_path, title, alt_text, mime_type,
          width, height, sort_order, audio_enabled, config
        )
      )
    )
  )
`;

function sortByOrder(items = []) {
  return [...items].sort(
    (left, right) =>
      (left.sort_order ?? 0) - (right.sort_order ?? 0) ||
      String(left.id).localeCompare(String(right.id)),
  );
}

function mapMediaItem(item) {
  const mapped = {
    id: item.id,
    title: item.title ?? item.config?.title ?? item.media_kind,
    type: item.media_kind,
    src: item.storage_path,
    mimeType: item.mime_type ?? null,
    poster: item.config?.poster_path ?? null,
    alt: item.alt_text ?? "",
    width: item.width ?? item.config?.width ?? 1080,
    height: item.height ?? item.config?.height ?? 1350,
    presentation: item.config?.presentation ?? "raw",
    config: item.config ?? {},
    viewport: item.config?.viewport,
  };

  if (item.audio_enabled !== null && item.audio_enabled !== undefined) {
    mapped.audioEnabled = item.audio_enabled;
  }

  return mapped;
}

function mapGroup(group, sectionType) {
  const items = sortByOrder(group.portfolio_media_items)
    .map(mapMediaItem)
    .filter((item) => Boolean(item.src));

  if (sectionType === "catalogPair") {
    return { id: group.id, label: group.label, pages: items };
  }

  return { id: group.id, label: group.label, items };
}

function mapSection(section) {
  const directItems = sortByOrder(section.portfolio_media_items)
    .map(mapMediaItem)
    .filter((item) => Boolean(item.src));
  const groups = sortByOrder(section.portfolio_media_groups).filter((group) =>
    group.portfolio_media_items?.some((item) => Boolean(item.storage_path)),
  );
  const block = {
    id: section.id,
    type: section.section_type,
    title: section.title,
    config: section.config ?? {},
    ...section.config,
  };

  if (section.section_type === "mediaRows") {
    block.rows = groups.map((group) =>
      sortByOrder(group.portfolio_media_items)
        .map(mapMediaItem)
        .filter((item) => Boolean(item.src)),
    ).filter((row) => row.length > 0);
  } else if (
    section.section_type === "carouselPairs" ||
    section.section_type === "catalogPair"
  ) {
    block.items = groups.map((group) => mapGroup(group, section.section_type));
  } else {
    block.items = directItems;
  }

  const companionGroup = groups.find(
    (group) => group.group_kind === "story_companion",
  );
  if (companionGroup?.portfolio_media_items?.[0]) {
    block.companionVideo = mapMediaItem(companionGroup.portfolio_media_items[0]);
  }

  return block;
}

function mapSections(sections) {
  return sortByOrder(sections)
    .map(mapSection)
    .filter(hasRenderableContentBlock);
}

function flattenProjects(blocks) {
  return blocks.flatMap((block) => {
    if (block.type === "mediaRows") return block.rows.flat();
    if (block.type === "carouselPairs") {
      return block.items.flatMap((group) => group.items);
    }
    if (block.type === "catalogPair") {
      return block.items.flatMap((group) => group.pages);
    }
    return [block.companionVideo, ...(block.items ?? [])].filter(Boolean);
  });
}

export function mapPortfolioRowsToClients(rows) {
  return sortByOrder(rows).map((row) => {
    const content = mapSections(
      (row.portfolio_sections ?? []).filter((section) => !section.edition_id),
    );
    const editions = sortByOrder(row.portfolio_editions).map((edition) => {
      const editionContent = mapSections(edition.portfolio_sections);
      const mappedEdition = {
        id: edition.edition_key,
        label: edition.label,
        content: editionContent.length > 0 ? editionContent : undefined,
        ...edition.config,
      };

      return {
        ...mappedEdition,
        comingSoon: hasRenderableEditionContent(mappedEdition) ? undefined : true,
      };
    });
    const editionBlocks = editions.flatMap((edition) => edition.content ?? []);
    const mappedClient = {
      id: row.id,
      slug: row.slug,
      name: row.name,
      year: String(row.year),
      disciplines: row.disciplines ?? [],
      cover: row.logo_path,
      content: content.length > 0 ? content : undefined,
      editions: editions.length > 0 ? editions : undefined,
      projects: flattenProjects([...content, ...editionBlocks]),
      ...row.config,
      storagePrefix: row.storage_prefix,
      sortOrder: row.sort_order,
    };

    return {
      ...mappedClient,
      comingSoon: hasRenderableProjectContent(mappedClient) ? undefined : true,
    };
  });
}

export async function fetchPublishedPortfolioClients() {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await getSupabaseBrowserClient()
    .from("portfolio_clients")
    .select(PORTFOLIO_SELECT)
    .eq("published", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return mapPortfolioRowsToClients(data ?? []);
}

export async function fetchAdminPortfolioClients(client = getSupabaseBrowserClient()) {
  const { data, error } = await client
    .from("portfolio_clients")
    .select(PORTFOLIO_SELECT)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return mapPortfolioRowsToClients(data ?? []);
}
