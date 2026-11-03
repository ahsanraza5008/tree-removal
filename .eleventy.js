// graceful-fs prevents EMFILE errors on Windows during 30k+ file builds
const { gracefulify } = require("graceful-fs");
const fs = require("fs");
gracefulify(fs);

const business = require("./src/_data/business.json");

/* ------------------------------------------------------------------ */
/*  City data: grouped once here (O(n)), never recomputed in templates */
/* ------------------------------------------------------------------ */
const allCities = require("./src/_data/cities.json");
// PREVIEW=1 builds a small sample for fast local design work; `npm run build` builds everything.
const PREVIEW = process.env.PREVIEW === "1";
const cityPages = PREVIEW
  ? allCities.filter(c => ["naples", "miami", "houston", "denver", "boise", "portland", "burlington", "bangor"].includes(c.slug)).slice(0, 12)
  : allCities;

const citiesByState = {};
for (const c of allCities) (citiesByState[c.stateCode] = citiesByState[c.stateCode] || []).push(c);
for (const k in citiesByState) citiesByState[k].sort((a, b) => a.city.localeCompare(b.city));

const { fill, pick } = require("./lib/spin.js");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy({ "src/assets/img/favicon.svg": "favicon.svg" });
  eleventyConfig.addPassthroughCopy({ "src/assets/img/favicon.ico": "favicon.ico" });
  eleventyConfig.addPassthroughCopy({ "src/assets/img/apple-touch-icon.png": "apple-touch-icon.png" });

  eleventyConfig.addGlobalData("cityPages", cityPages);
  eleventyConfig.addGlobalData("citiesByState", citiesByState);
  eleventyConfig.addGlobalData("buildYear", new Date().getFullYear());

  eleventyConfig.addFilter("slug", str =>
    String(str).toLowerCase().replace(/&/g, "and").replace(/\s+/g, "-").replace(/[^\w-]/g, "").replace(/-+/g, "-")
  );
  eleventyConfig.addFilter("where", (arr, key, val) => (arr || []).filter(item => item[key] === val));
  eleventyConfig.addFilter("cap", s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s));
  eleventyConfig.addFilter("pick", pick);
  eleventyConfig.addFilter("toLocale", n => Number(n || 0).toLocaleString("en-US"));
  eleventyConfig.addFilter("fill", fill);
  // JSON-safe string for JSON-LD (used with | safe so schema text matches the visible copy exactly)
  eleventyConfig.addFilter("jsonStr", s => JSON.stringify(String(s == null ? "" : s)).slice(1, -1).replace(/</g, "\\u003c"));
  eleventyConfig.addFilter("topByRank", (list, n) => (list || []).slice().sort((a, b) => a.rank - b.rank).slice(0, n));
  eleventyConfig.addFilter("letterGroups", list => {
    const g = {};
    for (const c of list || []) {
      const L = c.city.charAt(0).toUpperCase();
      (g[L] = g[L] || []).push(c);
    }
    return Object.keys(g).sort().map(letter => ({ letter, cities: g[letter] }));
  });

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
