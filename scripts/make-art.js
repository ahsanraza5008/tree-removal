// Generates the tree-ring cross-section artwork (hero + logo + favicon). Run once: node scripts/make-art.js
const fs = require("fs");
const path = require("path");
const R = path.join(__dirname, "..");

// deterministic noise
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function ringPath(cx, cy, r, wob, phase, pts = 72) {
  const p = [];
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const rr = r + Math.sin(a * 3 + phase) * wob + Math.sin(a * 5 + phase * 2) * wob * 0.45 + (r * 0.035) * Math.cos(a - 0.6);
    p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.97]);
  }
  // smooth closed curve (Catmull-Rom -> Bezier)
  let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 0; i < pts; i++) {
    const p0 = p[(i - 1 + pts) % pts], p1 = p[i], p2 = p[(i + 1) % pts], p3 = p[(i + 2) % pts];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + "Z";
}

// ---- hero rings: 400x400, felling notch cut from the right
const cx = 196, cy = 204;
let rings = "";
const radii = [];
for (let r = 14; r < 168; r += 9 + rnd() * 7) radii.push(r);
radii.forEach((r, i) => {
  const w = (1.2 + rnd() * 2.2).toFixed(1);
  rings += `<path class="ring" style="--i:${i}" d="${ringPath(cx, cy, r, 1.5 + r * 0.025, rnd() * 6)}" stroke-width="${w}"/>`;
});
const outer = ringPath(cx, cy, 182, 5, 1.2, 96);
const cambium = ringPath(cx, cy, 172, 4.6, 1.2, 96);
// checks (radial cracks)
let checks = "";
for (let k = 0; k < 3; k++) {
  const a = 2.2 + k * 1.3 + rnd() * 0.4, r1 = 40 + rnd() * 30, r2 = 110 + rnd() * 40;
  checks += `<path class="check" d="M${(cx + Math.cos(a) * r1).toFixed(1)} ${(cy + Math.sin(a) * r1).toFixed(1)} L${(cx + Math.cos(a + 0.04) * r2).toFixed(1)} ${(cy + Math.sin(a + 0.04) * r2).toFixed(1)}"/>`;
}
const hero = `<svg class="rings" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
<defs><clipPath id="notch"><path d="M0 0H400V400H0Z M400 150 L262 204 L400 258Z" clip-rule="evenodd"/></clipPath></defs>
<g clip-path="url(#notch)">
<path class="bark" d="${outer}"/>
<path class="wood" d="${cambium}"/>
<g class="growth" fill="none">${rings}</g>
<g class="checks" fill="none">${checks}</g>
<circle class="pith" cx="${cx}" cy="${cy}" r="4.5"/>
</g>
<path class="kerf" d="M400 150 L262 204 L400 258" fill="none"/>
</svg>`;
fs.writeFileSync(path.join(R, "src/_includes/svg/rings.njk"), hero);

// ---- small mark (logo + favicon): simplified, 64x64
seed = 11;
let small = "";
[7, 13, 19, 24].forEach((r, i) => { small += `<path d="${ringPath(32, 32, r, 0.8, i * 1.7, 48)}" fill="none" stroke="#6b4b33" stroke-width="2"/>`; });
const mark = (bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg ? '<rect width="64" height="64" rx="12" fill="#1e3a2a"/>' : ""}<path d="${ringPath(32, 32, 29, 1.4, 0.4, 48)}" fill="#4a3526"/><path d="${ringPath(32, 32, 26.5, 1.2, 0.4, 48)}" fill="#ecdcbc"/>${small}<circle cx="32" cy="32" r="2.2" fill="#6b4b33"/><path d="M64 22 L44 32 L64 42Z" fill="${bg ? "#1e3a2a" : "#f2c418"}"/></svg>`;
fs.writeFileSync(path.join(R, "src/assets/img/favicon.svg"), mark(false));
fs.writeFileSync(path.join(R, "src/assets/img/icon-tile.svg"), mark(true));
// logo mark as an include (inline, currentColor-free so it renders in header)
// inline logo: colours come from CSS variables (no hex in templates)
const inline = mark(false)
  .replace("<svg ", '<svg class="mark" aria-hidden="true" focusable="false" ')
  .replace(/fill="#4a3526"/, 'class="m-bark"').replace(/fill="#ecdcbc"/, 'class="m-wood"')
  .replace(/fill="none" stroke="#6b4b33" stroke-width="2"/g, 'class="m-ring"')
  .replace(/fill="#6b4b33"/, 'class="m-pith"').replace(/fill="#f2c418"/, 'class="m-notch"');
fs.writeFileSync(path.join(R, "src/_includes/svg/mark.njk"), inline);
console.log("art written");
