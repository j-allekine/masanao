import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const tokenPath = path.join(projectRoot, "tokens.json");
const outputPath = path.join(projectRoot, "src", "app", "tokens.css");

const tokens = JSON.parse(fs.readFileSync(tokenPath, "utf8"));

const isToken = (value) =>
  value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "$value");

const getPath = (document, tokenPathValue) => {
  return tokenPathValue.split(".").reduce((current, segment) => current?.[segment], document);
};

const resolveValue = (tokenPathValue, stack = []) => {
  if (stack.includes(tokenPathValue)) {
    throw new Error(`Circular design token reference: ${[...stack, tokenPathValue].join(" -> ")}`);
  }

  const token = getPath(tokens, tokenPathValue);
  if (!isToken(token)) {
    throw new Error(`Design token reference does not point to a token: ${tokenPathValue}`);
  }

  const value = token.$value;
  if (typeof value === "string" && /^\{[^}]+\}$/.test(value)) {
    return resolveValue(value.slice(1, -1), [...stack, tokenPathValue]);
  }

  return value;
};

const kebabCase = (value) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .toLowerCase();

const cssDimension = (tokenPathValue) => {
  const value = resolveValue(tokenPathValue);
  return `${value.value}${value.unit}`;
};

const cssColor = (tokenPathValue) => resolveValue(tokenPathValue).hex;

const cssFontFamily = (fontFamily) => {
  if (fontFamily === "Geist") return "var(--font-geist-sans)";
  if (fontFamily === "Geist Mono") return "var(--font-geist-mono)";
  return fontFamily.includes(" ") ? `\"${fontFamily}\"` : fontFamily;
};

const colorNames = Object.keys(tokens.color).filter((name) => isToken(tokens.color[name]));
const darkColorNames = Object.keys(tokens.theme.dark).filter((name) => isToken(tokens.theme.dark[name]));
const primitiveSpacingNames = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"];
const layoutSpacingNames = ["sidebarWidth", "contentMaxWidth", "pageGutter", "sectionGap", "navGroupGap"];

const colorVariables = (tokenRoot, names) =>
  names.map((name) => `  --masanao-${kebabCase(name)}: ${cssColor(`${tokenRoot}.${name}`)};`);

const typographyVariables = Object.entries(tokens.typography).flatMap(([name, token]) => {
  const value = token.$value;
  const variablePrefix = `  --masanao-type-${kebabCase(name)}`;
  return [
    `${variablePrefix}-family: ${cssFontFamily(value.fontFamily)};`,
    `${variablePrefix}-size: ${value.fontSize.value}${value.fontSize.unit};`,
    `${variablePrefix}-weight: ${value.fontWeight};`,
    `${variablePrefix}-line-height: ${value.lineHeight};`,
    `${variablePrefix}-letter-spacing: ${value.letterSpacing ? `${value.letterSpacing.value}${value.letterSpacing.unit}` : "normal"};`,
  ];
});

const lines = [
  "/* Generated from tokens.json. Run pnpm tokens:generate after changing design tokens. */",
  ":root {",
  ...colorVariables("color", colorNames),
  ...primitiveSpacingNames.map((name) => `  --masanao-space-${kebabCase(name)}: ${cssDimension(`spacing.${name}`)};`),
  ...layoutSpacingNames.map((name) => `  --masanao-layout-${kebabCase(name)}: ${cssDimension(`spacing.${name}`)};`),
  ...Object.keys(tokens.rounded)
    .filter((name) => isToken(tokens.rounded[name]))
    .map((name) => `  --masanao-radius-${kebabCase(name)}: ${cssDimension(`rounded.${name}`)};`),
  ...typographyVariables,
  "}",
  ".dark {",
  ...colorVariables("theme.dark", darkColorNames),
  "}",
  "",
].join("\n");

fs.writeFileSync(outputPath, lines, "utf8");
console.log(`Generated ${path.relative(projectRoot, outputPath)} from ${path.relative(projectRoot, tokenPath)}`);
