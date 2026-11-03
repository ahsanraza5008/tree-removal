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
const paras = new Map(); // url -> Set of paragraph hashes
const FIXED = /^(Tree removal, stump grinding and storm cleanup for homeowners|Ranges are typical|Limbs chipped|Lean, decay|The crew protects|Where the tree)/;
const fnv = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const cityByUrl = new Map(cities.map(c => [`/${c.stateSlug}/${c.slug}/`, c]));
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
  if (isCity) {
    // keep only hashes of the varied paragraphs, with the city/county names stripped
    const c = cityByUrl.get(url);
    paras.set(url, new Set([...html.matchAll(/<p[^>]*>([^<]{120,})/g)].map(m => m[1])
      .filter(p => !FIXED.test(p)).map(p => fnv(p.split(c.city).join("#").split(c.countyLabel).join("@")))));
  }
}
check("/", false); check("/services/", false); check("/service-areas/", false); check("/about/", false); check("/contact/", false);
for (const s of states) check(`/${s.slug}/`, false);
for (const c of cities) check(`/${c.stateSlug}/${c.slug}/`, true);
console.log("issues:", issues);
const dupTitles = [...titles.values()].filter(n => n > 1).length;
console.log(`duplicate titles: ${dupTitles} (same-name towns across states share patterns; within-state duplicates are not expected)`);

// 3. neighbours sharing a varied paragraph
let shared = 0, pairs = 0;
const byKey = new Map(cities.map(x => [x.stateCode + "|" + x.slug, x]));
for (const c of cities) {
  const A = paras.get(`/${c.stateSlug}/${c.slug}/`); if (!A) continue;
  for (const n of c.nearbyCities.slice(0, 4)) {
    const nc = byKey.get(n.stateCode + "|" + n.slug);
    const B = paras.get(`/${nc.stateSlug}/${nc.slug}/`); if (!B) continue;
    pairs++;
    for (const h of B) if (A.has(h)) { shared++; break; }
  }
}
console.log(`neighbour pairs checked: ${pairs}, pairs sharing a varied paragraph: ${shared}`);
