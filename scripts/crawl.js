#!/usr/bin/env node
// Crawls the built site in _site the way a search engine would: starts at "/", follows every
// internal <a href>, then compares against sitemap.xml. Mirrors Vercel's serving rules from
// vercel.json (trailingSlash: true, cleanUrls: true) to tell 200s from redirects and 404s.
// Usage: npm run crawl
const fs = require("fs");
const path = require("path");
const { origin } = require("../lib/site.js");
const ROOT = path.join(__dirname, "../_site");

const decode = s => s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const exists = p => { try { return fs.statSync(p).isFile(); } catch { return false; } };

// How Vercel would answer a path: { status, location? }
function serve(p) {
  if (/[?]/.test(p)) p = p.split("?")[0];
  const file = path.join(ROOT, p);
  if (/\.[a-z0-9]+$/i.test(p)) {
    if (p.endsWith(".html")) return { status: 308, location: p.replace(/(index)?\.html$/, "").replace(/([^/])$/, "$1/") };
    return exists(file) ? { status: 200, asset: true } : { status: 404 };
  }
  if (!p.endsWith("/")) return { status: 308, location: p + "/" };
  return exists(path.join(file, "index.html")) ? { status: 200 } : { status: 404 };
}

const pages = new Map(); // url -> info
const linkIssues = { broken: [], redirect: [], uppercase: [], query: [], absoluteInternal: [], chains: [] };
const queue = ["/"];
const seen = new Set(queue);
const inlinks = new Map();
const note = (arr, s) => { if (arr.length < 15) arr.push(s); arr.total = (arr.total || 0) + 1; };

while (queue.length) {
  const url = queue.shift();
  const html = fs.readFileSync(path.join(ROOT, url, "index.html"), "utf8");
  const head = html.slice(0, html.indexOf("</head>"));
  const info = {
    titles: [...head.matchAll(/<title>([^<]*)<\/title>/g)].map(m => decode(m[1])),
    descs: [...head.matchAll(/<meta name="description" content="([^"]*)"/g)].map(m => decode(m[1])),
    canon: [...html.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map(m => m[1]),
    robots: [...head.matchAll(/<meta name="robots" content="([^"]*)"/g)].map(m => m[1]),
    h1: (html.match(/<h1[\s>]/g) || []).length,
    h1text: decode(((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || "").replace(/<[^>]+>/g, "")),
  };
  pages.set(url, info);
  for (const m of html.matchAll(/<a\s[^>]*href="([^"]+)"/g)) {
    let href = decode(m[1]);
    if (/^(tel:|mailto:|sms:|#)/.test(href)) continue;
    if (/^https?:\/\//i.test(href)) {
      if (href.toLowerCase().startsWith(origin)) { note(linkIssues.absoluteInternal, `${url} -> ${href}`); href = href.slice(origin.length) || "/"; }
      else continue; // external
    }
    const [p] = href.split("#");
    if (!p) continue;
    if (p !== p.toLowerCase()) note(linkIssues.uppercase, `${url} -> ${href}`);
    if (p.includes("?")) note(linkIssues.query, `${url} -> ${href}`);
    let r = serve(p), hops = 0, cur = p;
    while (r.status === 308 && hops < 5) { hops++; cur = r.location; r = serve(cur); }
    if (r.status === 404) { note(linkIssues.broken, `${url} -> ${href}`); continue; }
    if (hops === 1) note(linkIssues.redirect, `${url} -> ${href} (308 -> ${cur})`);
    if (hops > 1) note(linkIssues.chains, `${url} -> ${href} (${hops} hops)`);
    if (r.asset) continue;
    inlinks.set(cur, (inlinks.get(cur) || 0) + 1);
    if (!seen.has(cur)) { seen.add(cur); queue.push(cur); }
  }
}

// page-level checks
const bad = { titleCount: [], descCount: [], canonCount: [], canonWrong: [], h1: [], noindex: [] };
const dup = { title: new Map(), desc: new Map(), canon: new Map(), h1: new Map() };
for (const [url, i] of pages) {
  if (i.titles.length !== 1) note(bad.titleCount, `${url} (${i.titles.length})`);
  if (i.descs.length !== 1) note(bad.descCount, `${url} (${i.descs.length})`);
  if (i.canon.length !== 1) note(bad.canonCount, `${url} (${i.canon.length})`);
  else if (i.canon[0] !== origin + url) note(bad.canonWrong, `${url} -> ${i.canon[0]}`);
  if (i.h1 !== 1) note(bad.h1, `${url} (${i.h1})`);
  if (i.robots.some(r => /noindex/i.test(r))) note(bad.noindex, url);
  for (const [k, v] of [["title", i.titles[0]], ["desc", i.descs[0]], ["canon", i.canon[0]], ["h1", i.h1text]]) if (v != null) dup[k].set(v, [...(dup[k].get(v) || []), url]);
}
const dupList = m => [...m.entries()].filter(([, u]) => u.length > 1);

// sitemap vs crawl
const sm = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const smIssues = { wrongOrigin: [], not200: [], notCanonical: [], noindex: [], dupes: locs.length - new Set(locs).size };
const smPaths = new Set();
for (const loc of locs) {
  if (!loc.startsWith(origin + "/")) { note(smIssues.wrongOrigin, loc); continue; }
  const p = loc.slice(origin.length); smPaths.add(p);
  const r = serve(p);
  if (r.status !== 200) { note(smIssues.not200, `${loc} (${r.status})`); continue; }
  const i = pages.get(p);
  if (i && i.canon[0] !== loc) note(smIssues.notCanonical, loc);
  if (i && i.robots.some(x => /noindex/i.test(x))) note(smIssues.noindex, loc);
}
const orphans = [...smPaths].filter(p => !pages.has(p));
const missingFromSitemap = [...pages.keys()].filter(p => !smPaths.has(p) && !pages.get(p).robots.some(x => /noindex/.test(x)));

// robots.txt
const robots = fs.readFileSync(path.join(ROOT, "robots.txt"), "utf8");
const robotsSitemap = (robots.match(/^Sitemap:\s*(\S+)/m) || [])[1];
const disallows = [...robots.matchAll(/^Disallow:\s*(\S*)/gm)].map(m => m[1]).filter(Boolean);

// 404 page
const p404 = fs.existsSync(path.join(ROOT, "404.html")) ? fs.readFileSync(path.join(ROOT, "404.html"), "utf8") : "";

const fmt = a => (a.total ? `${a.total}${a.length ? "  e.g. " + a.slice(0, 5).join(" | ") : ""}` : "0");
console.log(`origin: ${origin}`);
console.log(`pages reached by crawl: ${pages.size}   sitemap URLs: ${locs.length}`);
console.log("\nINTERNAL LINKS");
for (const [k, v] of Object.entries(linkIssues)) console.log(`  ${k}: ${fmt(v)}`);
console.log("\nPAGE TAGS");
for (const [k, v] of Object.entries(bad)) console.log(`  ${k}: ${fmt(v)}`);
console.log(`  duplicate titles: ${dupList(dup.title).length}${dupList(dup.title).length ? "  e.g. " + dupList(dup.title).slice(0, 3).map(([t, u]) => `"${t}" on ${u.join(", ")}`).join(" | ") : ""}`);
console.log(`  duplicate descriptions: ${dupList(dup.desc).length}${dupList(dup.desc).length ? "  e.g. " + dupList(dup.desc).slice(0, 2).map(([, u]) => u.join(", ")).join(" | ") : ""}`);
console.log(`  duplicate canonicals: ${dupList(dup.canon).length}`);
console.log(`  duplicate H1s: ${dupList(dup.h1).length}${dupList(dup.h1).length ? "  e.g. " + dupList(dup.h1).slice(0, 3).map(([t, u]) => `"${t}" on ${u.join(", ")}`).join(" | ") : ""}`);
console.log("\nSITEMAP");
for (const [k, v] of Object.entries(smIssues)) console.log(`  ${k}: ${typeof v === "number" ? v : fmt(v)}`);
console.log(`  in sitemap but not reachable by links (orphans): ${orphans.length}${orphans.length ? "  e.g. " + orphans.slice(0, 5).join(", ") : ""}`);
console.log(`  indexable pages missing from sitemap: ${missingFromSitemap.length}${missingFromSitemap.length ? "  e.g. " + missingFromSitemap.slice(0, 5).join(", ") : ""}`);
console.log("\nROBOTS.TXT");
console.log(`  sitemap line: ${robotsSitemap} ${robotsSitemap === origin + "/sitemap.xml" ? "OK" : "MISMATCH"}`);
console.log(`  disallow rules: ${disallows.length ? disallows.join(", ") : "none (CSS, JS and all pages crawlable)"}`);
console.log("\n404 PAGE");
console.log(`  canonical tags: ${(p404.match(/rel="canonical"/g) || []).length}   noindex: ${/name="robots" content="[^"]*noindex/.test(p404) ? "yes" : "no"}`);
