import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260815130000_fix_admin_delete_safeupdate.sql";
const schemaPath =
  "supabase/migrations/20260810213000_portfolio_admin_schema.sql";

describe("admin client deletion SafeUpdate migration", () => {
  const sql = readFileSync(migrationPath, "utf8");

  it("replaces the delete RPC without changing its security contract", () => {
    expect(sql).toMatch(
      /create or replace function public\.admin_delete_portfolio_client\s*\(\s*p_client_id uuid\s*\)/i,
    );
    expect(sql).toContain("private.is_portfolio_admin()");
    expect(sql).toMatch(/security invoker/i);
    expect(sql).toMatch(/set search_path = ''/i);
    expect(sql).toMatch(
      /revoke all on function public\.admin_delete_portfolio_client\(uuid\)[\s\S]+from public, anon, authenticated/i,
    );
    expect(sql).toMatch(
      /grant execute on function public\.admin_delete_portfolio_client\(uuid\)[\s\S]+to authenticated/i,
    );
  });

  it("scopes the collision-safe sort_order updates to clients after the deleted client", () => {
    expect(sql).toMatch(/where client\.sort_order > deleted_sort_order/i);
    expect(sql).toMatch(
      /set sort_order = client\.sort_order \+ safe_shift[\s\S]+where client\.id = any\(later_client_ids\)/i,
    );
    expect(sql).toMatch(
      /set sort_order = \(deleted_sort_order \+ requested\.position - 1\)::integer[\s\S]+where client\.id = requested\.client_id/i,
    );
  });

  it("keeps deletion and deterministic reordering inside the same RPC transaction", () => {
    expect(sql).toMatch(
      /select client\.sort_order[\s\S]+where client\.id = p_client_id/i,
    );
    expect(sql).toMatch(
      /delete from public\.portfolio_clients[\s\S]+where id = p_client_id/i,
    );
    expect(sql).toMatch(
      /array_agg\(client\.id order by client\.sort_order, client\.id\)/i,
    );
  });

  it("keeps the existing normal and edition metadata cascade intact", () => {
    const schemaSql = readFileSync(schemaPath, "utf8");

    expect(schemaSql).toMatch(
      /portfolio_editions[\s\S]+client_id uuid not null references public\.portfolio_clients\(id\) on delete cascade/i,
    );
    expect(schemaSql).toMatch(
      /portfolio_sections[\s\S]+client_id uuid not null references public\.portfolio_clients\(id\) on delete cascade/i,
    );
    expect(schemaSql).toMatch(
      /portfolio_media_groups[\s\S]+section_id uuid not null references public\.portfolio_sections\(id\) on delete cascade/i,
    );
    expect(schemaSql).toMatch(
      /portfolio_media_items[\s\S]+section_id uuid references public\.portfolio_sections\(id\) on delete cascade[\s\S]+group_id uuid references public\.portfolio_media_groups\(id\) on delete cascade/i,
    );
  });
});
