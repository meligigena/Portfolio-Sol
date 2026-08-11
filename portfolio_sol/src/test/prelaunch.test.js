import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("production deployment configuration", () => {
  it("rewrites every Vercel application route to the Vite SPA entry", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8"));

    expect(config.rewrites).toEqual([
      { source: "/(.*)", destination: "/index.html" },
    ]);
    expect(config).not.toHaveProperty("routes");
  });

  it("keeps server-only Supabase credentials out of Vite environment access", () => {
    const frontendSources = [
      readFileSync("src/lib/supabase.js", "utf8"),
      readFileSync("src/lib/portfolioMedia.js", "utf8"),
      readFileSync("src/data/PortfolioDataContext.jsx", "utf8"),
      readFileSync("src/admin/portfolioAdminService.js", "utf8"),
    ].join("\n");

    expect(frontendSources).not.toMatch(
      /import\.meta\.env\.(?:SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|DATABASE_PASSWORD|SUPABASE_ACCESS_TOKEN)/,
    );
  });
});
