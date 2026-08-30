import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

const featureTypes = ["feature", "feature-db"];
const sharedTypes = ["shared", "shared-server"];

const sameFeatureTargets = [
  {
    element: {
      type: "feature",
      captured: { featureName: "{{ from.element.captured.featureName }}" },
    },
  },
  {
    element: {
      type: "feature-db",
      captured: { featureName: "{{ from.element.captured.featureName }}" },
    },
  },
];

const architectureConfig = {
  files: ["src/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
  plugins: { boundaries },
  settings: {
    "boundaries/elements": [
      {
        type: "feature-db",
        pattern: "src/features/*/server/db",
        partialMatch: false,
        capture: ["featureName"],
      },
      // WDS models each app file as a separate element so only CSS can flow
      // between app files. Boundaries v7 retains `mode: "full"` as the only
      // file-level element form; `partialMatch: false` still uses folders.
      {
        type: "app",
        pattern: "src/app/**/*",
        mode: "full",
        capture: ["_", "fileName"],
      },
      {
        type: "feature",
        pattern: "src/features/*",
        partialMatch: false,
        capture: ["featureName"],
      },
      {
        type: "shared-server",
        pattern: "src/server",
        partialMatch: false,
      },
      {
        type: "shared",
        pattern: ["src/components", "src/hooks", "src/lib"],
        partialMatch: false,
      },
      {
        type: "prisma",
        pattern: "src/prisma",
        partialMatch: false,
      },
    ],
    "boundaries/dependency-nodes": [
      "import",
      "export",
      "dynamic-import",
      "require",
    ],
    "boundaries/legacy-templates": false,
    "import/resolver": {
      typescript: { project: "./tsconfig.json" },
      node: true,
    },
  },
  rules: {
    "boundaries/dependencies": [
      "error",
      {
        default: "disallow",
        checkUnknownLocals: true,
        policies: [
          {
            from: { element: { type: "app" } },
            allow: {
              to: {
                element: {
                  type: "feature",
                  fileInternalPath: ["ui.ts", "actions.ts", "server.ts"],
                },
              },
            },
          },
          {
            from: { element: { type: "app" } },
            allow: { to: { element: { type: sharedTypes } } },
          },
          {
            from: { element: { type: "app" } },
            allow: {
              to: {
                element: {
                  type: "app",
                  captured: { fileName: "*.css" },
                },
              },
            },
          },
          {
            from: { element: { type: featureTypes } },
            to: { element: { type: featureTypes } },
            allow: { to: sameFeatureTargets },
          },
          {
            from: { element: { type: featureTypes } },
            allow: { to: { element: { type: sharedTypes } } },
          },
          {
            from: { element: { type: "feature-db" } },
            allow: { to: { element: { type: "prisma" } } },
          },
          {
            from: { element: { type: sharedTypes } },
            allow: { to: { element: { type: sharedTypes } } },
          },
          {
            from: { element: { type: "prisma" } },
            allow: { to: { element: { type: sharedTypes } } },
          },
          {
            from: { element: { type: "shared-server" } },
            allow: { to: { element: { type: "prisma" } } },
          },
        ],
      },
    ],
    "boundaries/no-unknown-files": "error",
    "boundaries/no-unknown-dependencies": [
      "error",
      { require: "element" },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/prisma/generated/**",
  ]),
  architectureConfig,
]);

export default eslintConfig;
