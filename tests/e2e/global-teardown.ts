import { writeFileSync } from "node:fs";
import { join } from "node:path";

export default async function globalTeardown() {
  const originalTsconfig = process.env.MASANAO_E2E_TSCONFIG_CONTENT;

  if (originalTsconfig) {
    writeFileSync(
      join(process.cwd(), "tsconfig.json"),
      originalTsconfig,
      "utf8",
    );
  }
}
