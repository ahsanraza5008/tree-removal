#!/usr/bin/env node
// Audits JSON-LD on every built page in _site:
//  - parses; one @graph per page
//  - every internal URL uses the trailing-slash format and points at a page that exists
//  - every {"@id"} reference resolves inside the same graph
//  - no Review / AggregateRating / rating properties anywhere
//  - FAQPage text equals the visible FAQ text exactly
//  - expected node types per page kind
const fs = require("fs");
const path = require("path");
const { SITE } = require("../lib/schema.js");
const ROOT = path.join(__dirname, "../_site");

const decode = s => s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const pages = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name === "index.html") pages.push(p); } })(ROOT);

const problems = [];
const typeCount = {};
const bad = (url, msg) => { if (problems.length < 40) problems.push(`${url}: ${msg}`); else problems.length++; };

function walkJson(node, fn, key) {
  if (Array.isArray(node)) return node.forEach(n => walkJson(n, fn, key));
  if (node && typeof node === "object") { fn(node); for (const k of Object.keys(node)) walkJson(node[k], fn, k); }
  else if (typeof node === "string") fn(node, key);
}

for (const file of pages) {
  const url = "/" + path.relative(ROOT, path.dirname(file)).split(path.sep).join("/") + "/";
  const u = url === "//" ? "/" : url;
  const html = fs.readFileSync(file, "utf8");
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (blocks.length !== 1) { bad(u, `expected 1 JSON-LD block, found ${blocks.length}`); continue; }
  let j; try { j = JSON.parse(blocks[0][1]); } catch (e) { bad(u, "invalid JSON"); continue; }
  const graph = j["@graph"] || [];
  const ids = new Set(graph.map(n => n["@id"]).filter(Boolean));
  const types = graph.map(n => n["@type"]);
  types.forEach(t => (typeCount[t] = (typeCount[t] || 0) + 1));

  // no reviews / ratings
  if (/"(Review|AggregateRating|Rating)"|"(review|aggregateRating|reviewRating|ratingValue)"/.test(blocks[0][1])) bad(u, "contains review/rating");

  // URLs + @id refs
  walkJson(graph, (v, key) => {
    if (typeof v === "string") {
      if (v.startsWith(SITE)) {
        const pathOnly = v.slice(SITE.length).split("#")[0];
        const isFile = /\.[a-z0-9]+$/i.test(pathOnly);
        if (!isFile && !pathOnly.endsWith("/")) bad(u, `URL not in trailing-slash format: ${v}`);
        const target = path.join(ROOT, pathOnly, "index.html");
        const asset = path.join(ROOT, pathOnly);
        if (!fs.existsSync(target) && !(fs.existsSync(asset) && fs.statSync(asset).isFile())) bad(u, `URL points to a missing page: ${v}`);
      } else if (/^https?:\/\//.test(v) && !/^https:\/\/(schema\.org|en\.wikipedia\.org)\//.test(v)) bad(u, `unexpected external URL: ${v}`);
    } else if (v && v["@id"] && Object.keys(v).length <= 2 && !v["@type"]) {
      if (!ids.has(v["@id"])) bad(u, `unresolved @id reference ${v["@id"]}`);
    }
  });

  // every page: business + website + page
  if (!types.includes("HomeAndConstructionBusiness")) bad(u, "missing business node");
  if (!types.includes("WebSite")) bad(u, "missing WebSite node");
  if (u !== "/" && !types.includes("BreadcrumbList")) bad(u, "missing BreadcrumbList");

  // breadcrumb mirrors the visible breadcrumb
  const bc = graph.find(n => n["@type"] === "BreadcrumbList");
  if (bc) {
    const last = bc.itemListElement[bc.itemListElement.length - 1].item;
    if (last !== SITE + u) bad(u, `breadcrumb last item ${last} != page URL`);
    const visible = [...html.matchAll(/<nav class="crumbs"[\s\S]*?<\/nav>/g)][0];
    if (visible) {
      const names = [...visible[0].matchAll(/>([^<>]+)<\/(a|span)>/g)].map(m => decode(m[1]).trim());
      const ld = bc.itemListElement.map(i => i.name);
      if (names.join("|") !== ld.join("|")) bad(u, `breadcrumb names differ: visible ${names.join(" > ")} vs schema ${ld.join(" > ")}`);
    }
  }

  // FAQ == visible
  const faq = graph.find(n => n["@type"] === "FAQPage");
  const visQ = [...html.matchAll(/<summary><h3>([\s\S]*?)<\/h3><\/summary>/g)].map(m => decode(m[1]));
  const visA = [...html.matchAll(/<div class="faq-a"><p>([\s\S]*?)<\/p>/g)].map(m => decode(m[1]));
  if (visQ.length && !faq) bad(u, "visible FAQ but no FAQPage");
  if (faq) {
    const q = faq.mainEntity.map(e => e.name), a = faq.mainEntity.map(e => e.acceptedAnswer.text);
    if (q.join("\n") !== visQ.join("\n") || a.join("\n") !== visA.join("\n")) bad(u, "FAQ schema text differs from visible FAQ");
  }

  // page-specific expectations
  const depth = u.split("/").filter(Boolean).length;
  if (u === "/services/" && types.filter(t => t === "Service").length !== 6) bad(u, "expected 6 Service nodes");
  const isStaticPage = ["/", "/services/", "/service-areas/", "/about/", "/contact/"].includes(u);
  if (!isStaticPage && depth >= 1 && !types.includes("Service")) bad(u, "state/city page missing Service");
}

console.log(`pages checked: ${pages.length}`);
console.log("node types:", typeCount);
console.log(problems.length ? `problems (${problems.length}):\n  ` + problems.slice(0, 40).join("\n  ") : "problems: none");
process.exitCode = problems.length ? 1 : 0;
