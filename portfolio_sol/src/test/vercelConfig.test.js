import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cwd } from "node:process";
import { describe, expect, it } from "vitest";

const config = JSON.parse(
  readFileSync(resolve(cwd(), "vercel.json"), "utf8"),
);

describe("Vercel asset caching", () => {
  it("caches content-hashed build assets without caching the app shell", () => {
    expect(config.headers).toContainEqual({
      source: "/assets/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    });
    expect(config.rewrites).toContainEqual({ source: "/(.*)", destination: "/index.html" });
  });
});
