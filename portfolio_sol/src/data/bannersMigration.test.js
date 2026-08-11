import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260811160000_portfolio_banners.sql";

describe("portfolio banners migration", () => {
  it("adds the real banner types and converts only the existing Rambla records", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toContain("'banners'");
    expect(migration).toContain("'banner'");
    expect(migration).toContain("rambla/banners/banner_horizontal.jpeg");
    expect(migration).toContain("rambla/banners/banner_vertical.png");
    expect(migration).toMatch(/from public\.portfolio_clients[\s\S]+where slug = 'rambla'/i);
    expect(migration).toMatch(/update public\.portfolio_sections[\s\S]+where section\.id = banner_section_id[\s\S]+section\.client_id = rambla_id/i);
    expect(migration).toMatch(/update public\.portfolio_media_items[\s\S]+storage_path in \(/i);
    expect(migration).not.toMatch(/insert into public\.portfolio_media_items/i);
    expect(migration).not.toMatch(/disable row level security/i);
  });
});
