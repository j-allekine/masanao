import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { scripts?: { predev?: string } };

describe("Prisma client startup contract", () => {
  it("regenerates the client before starting the development server", () => {
    const predev = packageJson.scripts?.predev ?? "";

    expect(predev).toContain("prisma generate");
    expect(predev.indexOf("prisma generate")).toBeLessThan(
      predev.indexOf("prisma migrate deploy"),
    );
  });
});
