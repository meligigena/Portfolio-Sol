import path from "node:path";
import { clients } from "../src/data/clients.js";
import {
  createAdminClient,
  loadMigrationEnv,
  migrationConfig,
} from "./lib/portfolio-media.mjs";

const EXPECTED_SLUGS = [
  "rambla",
  "aqualand",
  "tardeo",
  "peumax",
  "desnac",
  "sistemas-moviles",
  "vectus",
  "maja",
  "el-tori",
];

const MIME_TYPES = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".mp4", "video/mp4"],
  [".webm", "video/webm"],
  [".mov", "video/quicktime"],
]);

function serializeItem(item, fallbackKind = null) {
  return {
    media_kind: item.type ?? fallbackKind,
    storage_path: item.src,
    title: item.title ?? path.basename(item.src),
    alt_text: item.alt ?? "",
    mime_type: MIME_TYPES.get(path.extname(item.src).toLowerCase()) ?? null,
    width: item.width ?? null,
    height: item.height ?? null,
    audio_enabled:
      (item.type ?? fallbackKind) === "video"
        ? item.audioEnabled !== false
        : null,
    config: {
      ...(item.config ?? {}),
      presentation: item.presentation,
      poster_path: item.poster,
      viewport: item.viewport,
    },
  };
}

function serializeBlock(block) {
  const section = {
    section_type: block.type,
    title: block.title,
    config: {
      presentation: block.presentation,
    },
    items: [],
    groups: [],
  };

  if (block.type === "carouselPairs") {
    section.groups = block.items.map((group) => ({
      group_kind: "carousel",
      label: group.label,
      config: {},
      items: group.items.map((item) => serializeItem(item, "carouselSlide")),
    }));
  } else if (block.type === "catalogPair") {
    section.groups = block.items.map((group) => ({
      group_kind: "catalog",
      label: group.label,
      config: {},
      items: group.pages.map((item) => serializeItem(item, "catalogPage")),
    }));
  } else if (block.type === "mediaRows") {
    section.groups = block.rows.map((row, index) => ({
      group_kind: "media_row",
      label: `Fila ${index + 1}`,
      config: {},
      items: row.map((item) => serializeItem(item, "video")),
    }));
  } else {
    section.items = (block.items ?? []).map((item) => serializeItem(item));
  }

  if (block.companionVideo) {
    section.groups.push({
      group_kind: "story_companion",
      label: "Video companion",
      config: {},
      items: [serializeItem(block.companionVideo, "video")],
    });
  }

  return section;
}

function clientPayload(client, sortOrder) {
  const storagePrefix = client.cover.split("/")[0];
  return {
    client: {
      slug: client.slug,
      storage_prefix: storagePrefix,
      name: client.name,
      year: String(client.year),
      disciplines: client.disciplines,
      logo_path: client.cover,
      sort_order: sortOrder,
      published: true,
      coming_soon: Boolean(client.comingSoon),
      config: {},
    },
    sections: (client.content ?? []).map(serializeBlock),
    editions: (client.editions ?? []).map((edition, index) => ({
      edition_key: edition.id,
      label: edition.label,
      sort_order: index,
      coming_soon: Boolean(edition.comingSoon),
      config: {},
      sections: (edition.content ?? []).map(serializeBlock),
    })),
  };
}

function inventory(payloads) {
  return payloads.reduce(
    (summary, payload) => {
      const sections = [
        ...payload.sections,
        ...payload.editions.flatMap((edition) => edition.sections),
      ];
      summary.sections += sections.length;
      summary.groups += sections.reduce(
        (count, section) => count + section.groups.length,
        0,
      );
      summary.items += sections.reduce(
        (count, section) =>
          count +
          section.items.length +
          section.groups.reduce(
            (groupCount, group) => groupCount + group.items.length,
            0,
          ),
        0,
      );
      return summary;
    },
    { clients: payloads.length, groups: 0, items: 0, sections: 0 },
  );
}

const actualSlugs = clients.map((client) => client.slug);
if (JSON.stringify(actualSlugs) !== JSON.stringify(EXPECTED_SLUGS)) {
  throw new Error(
    `Refusing database migration: expected ${EXPECTED_SLUGS.join(", ")}; received ${actualSlugs.join(", ")}.`,
  );
}

const payloads = clients.map(clientPayload);
console.log("Portfolio database migration inventory:");
console.table(inventory(payloads));

if (!process.argv.includes("--apply")) {
  console.log("Dry run only. Re-run `npm run db:seed -- --apply` after applying migrations.");
  process.exit(0);
}

loadMigrationEnv(process.cwd());
const supabase = createAdminClient(migrationConfig());

for (const payload of payloads) {
  const { data: row, error: upsertError } = await supabase
    .from("portfolio_clients")
    .upsert(
      {
        ...payload.client,
        published: false,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (upsertError) throw upsertError;

  const { error: replaceError } = await supabase.rpc(
    "admin_replace_portfolio_client",
    { p_client_id: row.id, p_payload: payload },
  );
  if (replaceError) throw replaceError;
  console.log(`MIGRATED ${payload.client.slug}`);
}

const { data: migrated, error: verifyError } = await supabase
  .from("portfolio_clients")
  .select("slug, published")
  .in("slug", EXPECTED_SLUGS)
  .order("sort_order");
if (verifyError) throw verifyError;

if (
  migrated.length !== EXPECTED_SLUGS.length ||
  migrated.some((client) => !client.published)
) {
  throw new Error("Migration verification failed: not all nine clients are published.");
}

console.log("Database migration verified: 9/9 clients published.");
