import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fetchAboutContent } from "./siteContent";

describe("public site content database", () => {
  it("loads About from the public portfolio_site_content row", async () => {
    const content = {
      graphicDesign: ["Diseño uno", "Diseño dos"],
      videoEditing: ["Video uno", "Video dos"],
      keySkills: ["Comunicación"],
      technicalSkills: ["Canva"],
      languages: ["Inglés C1 — Cambridge University"],
    };
    const single = vi.fn().mockResolvedValue({
      data: { content_key: "about", content },
      error: null,
    });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    const client = { from: vi.fn(() => ({ select })) };

    await expect(fetchAboutContent(client)).resolves.toEqual(content);
    expect(client.from).toHaveBeenCalledWith("portfolio_site_content");
    expect(select).toHaveBeenCalledWith("content_key, content");
    expect(eq).toHaveBeenCalledWith("content_key", "about");
  });

  it("does not silently replace a database error with hardcoded content", async () => {
    const error = new Error("portfolio_site_content is unavailable");
    const single = vi.fn().mockResolvedValue({ data: null, error });
    const client = {
      from: vi.fn(() => ({
        select: () => ({ eq: () => ({ single }) }),
      })),
    };

    await expect(fetchAboutContent(client)).rejects.toThrow(
      "portfolio_site_content is unavailable",
    );
  });

  it("keeps server-only migration tooling able to verify site content", () => {
    const sql = readFileSync(
      "supabase/migrations/20260811020100_portfolio_site_content_service_role.sql",
      "utf8",
    );

    expect(sql).toContain(
      "grant select, insert, update, delete on public.portfolio_site_content to service_role",
    );
  });
});
