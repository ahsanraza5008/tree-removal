// Resolves the site's public origin at BUILD time, so the domain never has to be hard-coded.
// Order of precedence:
//   1. SITE_URL            set it in Vercel (Project → Settings → Environment Variables) once you
//                          have a custom domain, e.g. https://www.example.com
//   2. VERCEL_PROJECT_PRODUCTION_URL
//                          system variable Vercel sets on every build: the project's production
//                          domain (its shortest custom domain, or the *.vercel.app one). Preview
//                          builds get it too, so preview pages still canonicalise to production.
//   3. business.json "domain"  local fallback for builds on your own machine.
// Canonicals, og:url, JSON-LD, sitemap.xml and robots.txt all read from here.
const business = require("../src/_data/business.json");

const raw = process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || business.domain;
const host = String(raw).trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();
const origin = `https://${host}`;

module.exports = { host, origin, source: process.env.SITE_URL ? "SITE_URL" : process.env.VERCEL_PROJECT_PRODUCTION_URL ? "VERCEL_PROJECT_PRODUCTION_URL" : "business.json" };
