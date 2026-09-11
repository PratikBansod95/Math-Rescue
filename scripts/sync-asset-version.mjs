import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = path.join(root, "public", "index.html");
const cssPath = path.join(root, "public", "css", "styles.css");
const jsPath = path.join(root, "public", "js", "main.js");

function hashFile(filePath) {
  const bytes = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 10);
}

const cssVersion = hashFile(cssPath);
const jsVersion = hashFile(jsPath);
let html = fs.readFileSync(indexPath, "utf8");

html = html.replace(
  /href="\.\/css\/styles\.css\?v=[^"]+"/,
  `href="./css/styles.css?v=${cssVersion}"`,
);
html = html.replace(
  /src="\.\/js\/main\.js\?v=[^"]+"/,
  `src="./js/main.js?v=${jsVersion}"`,
);

fs.writeFileSync(indexPath, html);

const manifest = {
  css: cssVersion,
  js: jsVersion,
  builtAt: new Date().toISOString(),
};
fs.writeFileSync(
  path.join(root, "public", "asset-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(`Asset versions synced: css=${cssVersion} js=${jsVersion}`);
