import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const sourceRoot = fileURLToPath(new URL("./src/", import.meta.url));
const serverOnlyStub = fileURLToPath(
  new URL("./tests/server-only.ts", import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: {
      "@": sourceRoot,
      "server-only": serverOnlyStub,
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
  },
});
