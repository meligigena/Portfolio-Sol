import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertManifestSafeToWrite,
  FIFTY_MIB,
  formatLargestVideo,
  migrationConfig,
  migrationDecision,
  tusRequestConfig,
} from "./portfolio-media.mjs";

describe("formatLargestVideo", () => {
  it("handles an image-only migration inventory", () => {
    expect(formatLargestVideo(null)).toBe("none");
  });
});

describe("assertManifestSafeToWrite", () => {
  it("refuses to replace the migration inventory with a smaller post-cleanup scan", () => {
    expect(() =>
      assertManifestSafeToWrite({ existingCount: 144, nextCount: 2 }),
    ).toThrow("Refusing to shrink the portfolio media manifest");
  });

  it("allows an equal or larger inventory", () => {
    expect(() =>
      assertManifestSafeToWrite({ existingCount: 144, nextCount: 144 }),
    ).not.toThrow();
    expect(() =>
      assertManifestSafeToWrite({ existingCount: 144, nextCount: 145 }),
    ).not.toThrow();
  });
});

describe("migrationConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the server-only Supabase secret key", () => {
    vi.stubEnv("SUPABASE_URL", "https://project-ref.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("VITE_SUPABASE_STORAGE_BUCKET", "portfolio-media");

    expect(migrationConfig()).toEqual({
      bucket: "portfolio-media",
      secretKey: "sb_secret_test",
      supabaseUrl: "https://project-ref.supabase.co",
    });
  });

  it("does not fall back to the legacy service role key", () => {
    vi.stubEnv("SUPABASE_URL", "https://project-ref.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "legacy-key");

    expect(() => migrationConfig()).toThrow("SUPABASE_SECRET_KEY");
  });
});

describe("migrationDecision", () => {
  it("keeps a file of exactly 50 MiB eligible for resumable upload", () => {
    expect(migrationDecision({ bytes: FIFTY_MIB })).toEqual({
      status: "UPLOAD",
      strategy: "resumable (TUS)",
    });
  });

  it("skips a file larger than 50 MiB without treating it as a failure", () => {
    expect(migrationDecision({ bytes: FIFTY_MIB + 1 })).toEqual({
      status: "SKIPPED_SIZE_LIMIT",
      strategy: "none",
    });
  });
});

describe("tusRequestConfig", () => {
  it("uses the gateway with apikey and a signed token, never a Bearer secret", () => {
    const request = tusRequestConfig({
      secretKey: "sb_secret_test",
      signedToken: "signed.jwt.token",
      supabaseUrl: "https://project-ref.supabase.co/",
    });

    expect(request).toEqual({
      endpoint:
        "https://project-ref.supabase.co/storage/v1/upload/resumable",
      headers: {
        apikey: "sb_secret_test",
        "x-signature": "signed.jwt.token",
      },
    });
    expect(request.headers).not.toHaveProperty("authorization");
  });
});
