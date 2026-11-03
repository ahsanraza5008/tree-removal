#!/usr/bin/env node
// Post-build audit: page count, meta lengths, leftover tokens, JSON-LD validity,
// FAQ schema == visible FAQ, and neighbouring cities never sharing a paragraph.
// Run after `npm run build`:  npm run check
const fs = require("fs");
const path = require("path");
const SITE = path.join(__dirname, "../_site");
const cities = require("../src/_data/cities.json");
const states = require("../src/_data/states.json");

const decode = s => s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const read = url => { try { return fs.readFileSync(path.join(SITE, url, "index.html"), "utf8"); } catch { return null; } };

// 1. page count
let count = 0;
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { if (f.isDirectory()) walk(path.join(d, f.name)); else if (f.name === "index.html") count++; } })(SITE);
const expected = 5 + states.length + cities.length; // home, services, service-areas, about, contact (+404.html, sitemap, robots as files)
console.log(`index.html pages: ${count}  expected: ${expected}  ${count === expected ? "OK" : "MISMATCH"}`);
for (const f of ["404.html", "sitemap.xml", "robots.txt", "favicon.ico", "favicon.svg"]) if (!fs.existsSync(path.join(SITE, f))) console.log(`missing ${f}`);
const smCount = (fs.readFileSync(path.join(SITE, "sitemap.xml"), "utf8").match(/<loc>/g) || []).length;
console.log(`sitemap URLs: ${smCount}  ${smCount === expected ? "OK" : "MISMATCH"}`);

// 2. per-page checks
const issues = { missing: 0, titleLong: 0, titleNoKw: 0, descLong: 0, tokens: 0, jsonld: 0, faqMismatch: 0 };
const paras = new Map(); // url -> Set of paragraphs
const titles = new Map();
function check(url, isCity) {
  const html = read(url);
  if (!html) { issues.missing++; return; }
  const title = decode((html.match(/<title>([^<]*)/) || [])[1] || "");
  const desc = decode((html.match(/name="description" content="([^"]*)/) || [])[1] || "");
  if (title.length > 60) issues.titleLong++;
  if (!title.includes("Tree Removal")) issues.titleNoKw++;
  if (desc.length > 155) issues.descLong++;
  titles.set(title, (titles.get(title) || 0) + 1);
  if (/%[a-zA-Z.]+%/.test(html)) issues.tokens++;
  let faqLd = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const j = JSON.parse(m[1]);
      for (const n of j["@graph"] || [j]) if (n["@type"] === "FAQPage") faqLd = n.mainEntity.map(q => q.acceptedAnswer.text);
    } catch { issues.jsonld++; }
  }
  const visible = [...html.matchAll(/<div class="faq-a"><p>([\s\S]*?)<\/p>/g)].map(m => decode(m[1]));
  if (faqLd.length !== visible.length || faqLd.some((a, i) => a !== visible[i])) issues.faqMismatch++;
  if (isCity) paras.set(url, new Set([...html.matchAll(/<p[^>]*>([^<]{60,})/g)].map(m => m[1])));
}
check("/", false); check("/services/", false); check("/service-areas/", false); check("/about/", false); check("/contact/", false);
for (const s of states) check(`/${s.slug}/`, false);
for (const c of cities) check(`/${c.stateSlug}/${c.slug}/`, true);
console.log("issues:", issues);
const dupTitles = [...titles.values()].filter(n => n > 1).length;
console.log(`duplicate titles: ${dupTitles} (same-name towns across states share patterns; within-state duplicates are not expected)`);

// 3. neighbours sharing a long paragraph (city name differs, so compare with names stripped)
let shared = 0, pairs = 0;
const byKey = new Map(cities.map(x => [x.stateCode + "|" + x.slug, x]));
const FIXED = /^(Ranges are typical|Limbs chipped|Lean, decay|The crew protects|Where the tree)/;
const strip = (s, c) => s.split(c.city).join("#").split(c.countyLabel).join("@");
for (const c of cities) {
  const a = paras.get(`/${c.stateSlug}/${c.slug}/`); if (!a) continue;
  const A = new Set([...a].map(p => strip(p, c)));
  for (const n of c.nearbyCities.slice(0, 4)) {
    const nc = byKey.get(n.stateCode + "|" + n.slug);
    const b = paras.get(`/${nc.stateSlug}/${nc.slug}/`); if (!b) continue;
    pairs++;
    for (const p of b) if (!FIXED.test(p) && p.length > 120 && A.has(strip(p, nc))) { shared++; break; }
  }
  if (pairs > 20000) break;
}
console.log(`neighbour pairs checked: ${pairs}, pairs sharing a varied paragraph: ${shared}`);
