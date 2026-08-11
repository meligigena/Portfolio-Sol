import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH =
  "supabase/migrations/20260811130000_fix_portfolio_storage_object_name_policies.sql";

describe("portfolio Storage policies", () => {
  it("qualifies the current storage.objects row in every scoped write policy", () => {
    const migration = readFileSync(MIGRATION_PATH, "utf8");

    expect(migration).toContain(
      'drop policy if exists "Portfolio admins can upload objects" on storage.objects;',
    );
    expect(migration).toContain(
      'drop policy if exists "Portfolio admins can update objects" on storage.objects;',
    );
    expect(migration).toContain(
      'drop policy if exists "Portfolio admins can delete objects" on storage.objects;',
    );
    expect(migration).not.toContain(
      'drop policy if exists "Portfolio admins can inspect objects"',
    );
    expect(
      migration.match(
        /storage\.foldername\(storage\.objects\.name\)/g,
      ),
    ).toHaveLength(4);
    expect(migration).not.toMatch(/storage\.foldername\(name\)/);
    expect(migration.match(/bucket_id = 'portfolio-media'/g)).toHaveLength(4);
    expect(
      migration.match(/\(select private\.is_portfolio_admin\(\)\)/g),
    ).toHaveLength(4);
  });
});
