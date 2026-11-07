// Resolves the site's public origin at BUILD time, so the domain never has to be hard-coded.
// Order of precedence:
//   1. SITE_URL            Vercel env var (Project → Settings → Environment Variables), e.g. for a
//                          custom domain later: https://www.example.com
//   2. business.json "domain"   the live domain (treeremovalpros.vercel.app)
//   3. VERCEL_PROJECT_PRODUCTION_URL   Vercel's own project URL, only if "domain" is empty.
//                          (Vercel reports the internal *-veyn.vercel.app name, not the alias.)
// Canonicals, og:url, JSON-LD, sitemap.xml and robots.txt all read from here.
const business = require("../_data/business.json");

const raw = process.env.SITE_URL || business.domain || process.env.VERCEL_PROJECT_PRODUCTION_URL;
const host = String(raw).trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();
const origin = `https://${host}`;

module.exports = { host, origin, source: process.env.SITE_URL ? "SITE_URL" : business.domain ? "business.json" : "VERCEL_PROJECT_PRODUCTION_URL" };
