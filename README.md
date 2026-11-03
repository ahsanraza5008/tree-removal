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

1. Import this GitHub repo in Vercel (Framework preset: Other).
2. `vercel.json` already sets build command `npm run build` and output `_site`.
3. After the first deploy, put the real URL in `src/_data/business.json` → `domain` and push again,
   so canonicals, schema and the sitemap point at it.
