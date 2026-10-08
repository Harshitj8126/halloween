// Builds an SVG sprite from the game-icons.net set (CC BY 3.0, via @iconify-json/game-icons)
// and inlines it into index.html between the <!-- icons:start --> / <!-- icons:end --> markers,
// so <svg><use href="#i-bat"/></svg> works even when the page is opened from file://.
// Also writes assets/icons/sprite.svg for reference.
//
//   npm run icons
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const set = require("@iconify-json/game-icons/icons.json");

const ICONS = [
  "bat",
  "hanging-spider",
  "spider-web",
  "ghost",
  "cauldron",
  "musical-notes",
  "maze",
  "crystal-ball",
  "pumpkin-lantern",
  "portrait",
  "vampire-dracula",
  "witch-face",
  "werewolf",
  "candle-light",
  "entry-door",
  "carnival-mask",
  "coffin",
  "raven",
];

const size = (icon, key) => icon[key] || set[key] || 512;

const symbols = ICONS.map((name) => {
  const icon = set.icons[name];
  if (!icon) throw new Error(`game-icons has no icon named "${name}"`);
  return `<symbol id="i-${name}" viewBox="0 0 ${size(icon, "width")} ${size(icon, "height")}">${icon.body}</symbol>`;
}).join("\n    ");

const sprite = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
    <!-- game-icons.net by Lorc, Delapouite & contributors, CC BY 3.0 -->
    ${symbols}
  </svg>`;

mkdirSync("assets/icons", { recursive: true });
writeFileSync("assets/icons/sprite.svg", sprite.replace(' width="0" height="0" style="position:absolute"', "") + "\n");

const html = readFileSync("index.html", "utf8");
const re = /(<!-- icons:start -->)[\s\S]*?(<!-- icons:end -->)/;
if (!re.test(html)) throw new Error("index.html is missing the <!-- icons:start --> / <!-- icons:end --> markers");
writeFileSync("index.html", html.replace(re, `$1\n  ${sprite}\n  $2`));
console.log(`Inlined ${ICONS.length} icons into index.html`);
