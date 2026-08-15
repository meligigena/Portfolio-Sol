import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260815120000_independent_video_story.sql";

describe("independent VideoStory migration", () => {
  it("extends only the section type check and preserves video as the media kind", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("'videoStory'");
    expect(sql).not.toMatch(/drop constraint[^;]+media_kind/i);
    expect(sql).not.toMatch(/disable row level security/i);
    expect(sql).not.toMatch(/create table/i);
  });

  it("does not rewrite client content or hardcode Rambla", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).not.toMatch(/\brambla\b/i);
    expect(sql).not.toMatch(
      /\b(insert|update|delete)\s+(into|from)?\s*public\.portfolio_(clients|editions|sections|media_groups|media_items)/i,
    );
    expect(sql).not.toMatch(/portfolio_media_items_media_kind_check/i);
  });
});
