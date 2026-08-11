import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260811150000_fix_admin_client_order_safeupdate.sql";

function reorderFunctionBody(sql) {
  return sql.match(
    /create or replace function public\.admin_reorder_portfolio_clients\([\s\S]*?as \$\$([\s\S]*?)\$\$;/i,
  )?.[1] ?? "";
}

describe("safe client order RPC migration", () => {
  it("scopes every UPDATE with an explicit WHERE clause", () => {
    const sql = readFileSync(migrationPath, "utf8");
    const updateStatements = reorderFunctionBody(sql).match(/update[\s\S]*?;/gi) ?? [];

    expect(updateStatements).toHaveLength(2);
    updateStatements.forEach((statement) => {
      expect(statement).toMatch(/\bwhere\b/i);
    });
    expect(updateStatements[0]).toMatch(
      /where\s+client\.id\s*=\s*any\(p_client_ids\)/i,
    );
  });

  it("maps every requested UUID to a consecutive zero-based position", () => {
    const sql = readFileSync(migrationPath, "utf8");
    const body = reorderFunctionBody(sql);

    expect(body).toMatch(
      /unnest\(p_client_ids\) with ordinality as requested\(client_id, position\)/i,
    );
    expect(body).toMatch(
      /set sort_order = \(?requested\.position - 1\)?(?:::\w+)?/i,
    );
    expect(body).toMatch(/where client\.id = requested\.client_id/i);
  });

  it("keeps admin, duplicate, completeness, and unknown-ID validation", () => {
    const sql = readFileSync(migrationPath, "utf8");
    const body = reorderFunctionBody(sql);

    expect(sql).toMatch(/p_client_ids uuid\[\][\s\S]*returns void/i);
    expect(sql).toMatch(/security invoker/i);
    expect(body).toContain("private.is_portfolio_admin()");
    expect(body).toContain("duplicate client ids are not allowed");
    expect(body).toContain("client id list must contain every portfolio client");
    expect(body).toContain("client id list contains an unknown portfolio client");
  });
});
