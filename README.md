# Tree Removal Pros

Nationwide rank-and-rent tree removal site built with Eleventy 2 + Nunjucks.

- 5 main pages, 51 state pages, 30,976 city pages (`/florida/naples/`)
- Phone: (877) 624-0382

## Commands

```bash
npm install
npm run preview   # fast local preview with a 12-city sample (http://localhost:8080)
npm run build     # full production build into _site/
npm run check     # audit the built site (page count, meta lengths, FAQ schema, neighbour uniqueness)
npm run cities    # regenerate src/_data/cities.json from data/us-cities-dataset.json
```

## Deploy on Vercel

1. Import this GitHub repo in Vercel (Framework preset: Other). `vercel.json` already sets the
   build command (`npm run build`), the output folder (`_site`) and trailing-slash URLs.
2. Deploy. **You do not need to know the domain in advance.** Every build reads Vercel's
   `VERCEL_PROJECT_PRODUCTION_URL`, so canonicals, og:url, JSON-LD, `sitemap.xml` and `robots.txt`
   automatically use the project's production domain (see `lib/site.js`).
3. When you add a custom domain later, either redeploy (Vercel then reports the custom domain), or
   set `SITE_URL` (e.g. `https://www.example.com`) under Project → Settings → Environment Variables
   and redeploy. `SITE_URL` always wins.

Local builds fall back to `domain` in `src/_data/business.json`.

## Audits

```bash
npm run crawl         # crawls _site from "/": links, redirects, canonicals, titles, H1s, sitemap, robots
npm run check:schema  # JSON-LD on every page
npm run check         # page count, meta lengths, neighbour-paragraph uniqueness
```
