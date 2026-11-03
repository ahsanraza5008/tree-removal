#!/usr/bin/env node
/*
 * Builds src/_data/cities.json and src/_data/states.json from data/us-cities-dataset.json
 * (31,257 cities: city, state, county, zip_codes, lat, lng). Every entry in the 50 states + DC is kept;
 * Puerto Rico (281 entries) is excluded by request.
 * Run offline: `npm run cities`. Never runs at build time.
 *
 * Adds per city:
 *   slug          unique within the state (collisions get -county appended)
 *   countyLabel   how the county reads in a sentence ("Collier County", "Orleans Parish")
 *   rank          position in the source file (source is ordered by population)
 *   nearbyCities  8 nearest cities in the same state (pre-computed here, never at build time)
 *   v             variant slot 0..14, coloured so no city shares a slot with its nearest
 *                 neighbours. Templates pick spintax variants from it, so neighbouring
 *                 cities never show the same paragraph.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SLOTS = 15; // = business.citySpintaxVariants
const NEAR = 8;

const STATES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky",
  LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island",
  SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

const slugify = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/&/g, " and ").replace(/['’.]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function countyLabel(c) {
  const n = (c.county || "").trim();
  if (c.stateCode === "DC") return "the District of Columbia";
  if (!n) return `the ${c.city} area`;
  if (/ (County|Parish|Borough|Municipality|Census Area)$/.test(n)) return n;
  if (c.stateCode === "LA") return `${n} Parish`;
  if (c.stateCode === "AK") return `the ${n} area`;
  if (/ City$/.test(n) && !/^(Charles|James) City$/.test(n)) return n;
  return `${n} County`;
}

const src = JSON.parse(fs.readFileSync(path.join(ROOT, "data/us-cities-dataset.json"), "utf8"));
const skipped = src.filter(r => !STATES[r.state]);
if (skipped.length) console.log(`excluded (not in 50 states + DC): ${skipped.length}`);

// ---- 1. normalise + unique slugs (keep source order = population rank)
const used = new Set();
const cities = src.filter(r => STATES[r.state]).map((r, rank) => {
  const c = { city: r.city.trim(), stateCode: r.state, county: (r.county || "").trim(), lat: +r.lat, lng: +r.lng,
    zips: [...new Set((r.zip_codes || []).map(z => String(z).padStart(5, "0")))].sort(), rank };
  let slug = slugify(c.city) || "city";
  if (used.has(`${c.stateCode}|${slug}`)) slug = `${slug}-${slugify(c.county) || "area"}`;
  const base = slug; let i = 2;
  while (used.has(`${c.stateCode}|${slug}`)) slug = `${base}-${i++}`;
  used.add(`${c.stateCode}|${slug}`);
  return Object.assign(c, { slug, stateName: STATES[c.stateCode], stateSlug: slugify(STATES[c.stateCode]) });
});

// ---- 2. nearest neighbours, same state
const byState = new Map();
cities.forEach((c, i) => (byState.get(c.stateCode) || byState.set(c.stateCode, []).get(c.stateCode)).push(i));
const rad = d => (d * Math.PI) / 180;
const dist = (a, b) => {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  return Math.asin(Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2));
};
const near = cities.map(() => []);
for (const idx of byState.values()) {
  for (const i of idx) {
    const best = [];
    for (const j of idx) {
      if (i === j) continue;
      const d = dist(cities[i], cities[j]);
      if (best.length < NEAR || d < best[best.length - 1][0]) {
        best.push([d, j]); best.sort((x, y) => x[0] - y[0]); if (best.length > NEAR) best.pop();
      }
    }
    near[i] = best.map(b => b[1]);
  }
}

// ---- 3. variant slot colouring: neighbours never share a slot
const adj = cities.map(() => new Set());
near.forEach((ns, i) => ns.forEach(j => { adj[i].add(j); adj[j].add(i); }));
const order = cities.map((_, i) => i).sort((a, b) => adj[b].size - adj[a].size);
const slot = new Array(cities.length).fill(-1);
let conflicts = 0;
for (const i of order) {
  const taken = new Array(SLOTS).fill(0);
  adj[i].forEach(j => { if (slot[j] >= 0) taken[slot[j]]++; });
  let pick = -1, min = Infinity;
  for (let k = 0; k < SLOTS; k++) {
    const s = (i + k) % SLOTS;
    if (taken[s] < min) { min = taken[s]; pick = s; if (!min) break; }
  }
  if (min > 0) conflicts++;
  slot[i] = pick;
}

// ---- 4. write
const out = cities.map((c, i) => ({
  city: c.city, slug: c.slug, stateName: c.stateName, stateCode: c.stateCode, stateSlug: c.stateSlug,
  county: c.county, countyLabel: countyLabel(c),
  lat: c.lat, lng: c.lng, zips: c.zips, rank: c.rank, v: slot[i],
  nearbyCities: near[i].map(j => ({ city: cities[j].city, slug: cities[j].slug, stateCode: cities[j].stateCode })),
}));
const states = Object.entries(STATES).map(([code, name]) => ({
  name, code, slug: slugify(name), cityCount: out.filter(c => c.stateCode === code).length,
})).sort((a, b) => a.name.localeCompare(b.name));

fs.writeFileSync(path.join(ROOT, "src/_data/cities.json"), JSON.stringify(out));
fs.writeFileSync(path.join(ROOT, "src/_data/states.json"), JSON.stringify(states, null, 2));
console.log(`cities: ${out.length}  states: ${states.length}  slot conflicts: ${conflicts}  no-zip: ${out.filter(c => !c.zips.length).length}  slug collisions resolved: ${out.filter(c => c.slug !== slugify(c.city)).length}`);
