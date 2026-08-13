import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationDirectory = "supabase/migrations";
const migrationSuffix = "_fix_rambla_utf8_content.sql";

function readMigration() {
  const matches = readdirSync(migrationDirectory).filter((name) =>
    name.endsWith(migrationSuffix),
  );

  expect(matches).toHaveLength(1);
  return {
    name: matches[0],
    sql: readFileSync(`${migrationDirectory}/${matches[0]}`, "utf8"),
  };
}

describe("Rambla UTF-8 data-fix migration", () => {
  it("updates only the three known records using their exact corrupt values", () => {
    const { sql } = readMigration();
    const updates = sql.match(/update public\.portfolio_(?:sections|media_items)/gi) ?? [];

    expect(updates).toHaveLength(3);
    expect(sql).toContain("id = '21cab915-c2f4-4b44-9f72-21fdf923501a'");
    expect(sql).toContain("and title = 'CreaciÃ³n de marca'");
    expect(sql).toContain("id = 'c00cb23c-62a7-45f3-9cf2-42743891e4db'");
    expect(sql).toContain(
      "and alt_text = 'PresentaciÃ³n horizontal de la identidad de marca de Rambla.'",
    );
    expect(sql).toContain("id = '7218b4d6-2a50-4a71-91de-ada9f42a26fc'");
    expect(sql).toContain(
      "and alt_text = 'PresentaciÃ³n vertical de la identidad de marca de Rambla.'",
    );
    expect(sql).not.toMatch(/\b(?:alter|create|delete|insert|drop|storage|policy)\b/i);
  });

  it("writes real Spanish accents and no mojibake in the replacement values", () => {
    const { name, sql } = readMigration();
    const replacementValues = [...sql.matchAll(/set\s+(?:title|alt_text)\s*=\s*'([^']+)'/gi)]
      .map((match) => match[1]);

    expect(name).toMatch(/^\d{14}_fix_rambla_utf8_content\.sql$/);
    expect(replacementValues).toEqual([
      "Creación de marca",
      "Presentación horizontal de la identidad de marca de Rambla.",
      "Presentación vertical de la identidad de marca de Rambla.",
    ]);
    expect(replacementValues.join(" ")).not.toMatch(/[ÃÂâ]/);
  });
});
