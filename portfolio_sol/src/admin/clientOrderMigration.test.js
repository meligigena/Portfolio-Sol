import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260811143000_admin_client_order.sql";

describe("client order migration", () => {
  it("defines an admin-only atomic reorder RPC with complete-list validation", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("admin_reorder_portfolio_clients");
    expect(sql).toContain("private.is_portfolio_admin()");
    expect(sql).toContain("duplicate client ids");
    expect(sql).toContain("client id list must contain every portfolio client");
    expect(sql).toContain("with ordinality");
    expect(sql).toContain("grant execute");
  });

  it("defines an admin-only delete RPC that restores consecutive positions", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("admin_delete_portfolio_client");
    expect(sql).toContain("portfolio client not found");
    expect(sql).toMatch(/row_number\(\) over \(order by sort_order, id\) - 1/);
  });
});
