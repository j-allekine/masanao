import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

// Export the existing BrandMark: Lucide Sprout, 1.75 stroke, and the app's colors.
// Dependencies come from the staged build, so the checkout needs no node_modules.
const [source, build, destination] = process.argv.slice(2);
const require = createRequire(join(build, "package.json"));
const { createElement } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { SproutIcon } = require("lucide-react");
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const css = readFileSync(join(source, "src/app/globals.css"), "utf8");
function token(name) {
  const color = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6});`))?.[1];
  if (!color) throw new Error(`Missing brand color: ${name}`);
  return color;
}
const sprout = renderToStaticMarkup(createElement(SproutIcon, {
  x: 6, y: 6, width: 24, height: 24, strokeWidth: 1.75, color: token("primary-foreground"),
}));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 36 36"><rect width="36" height="36" rx="6" fill="${token("primary")}"/>${sprout}</svg>`;
const sizes = [16, 24, 32, 48, 64, 128, 256];
const images = await Promise.all(sizes.map((size) => sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (let index = 0; index < sizes.length; index += 1) {
  const entry = 6 + 16 * index;
  header[entry] = header[entry + 1] = sizes[index] % 256;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(images[index].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += images[index].length;
}
writeFileSync(destination, Buffer.concat([header, ...images]));
