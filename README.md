# Mr March Static Rebuild

This project rebuilds `mr-march.com` into a deployable static site that outputs to `dist/`.
It no longer depends on Framer runtime code.

## What changed

- Multi-page routes are generated into `dist/`
- All pages are now generated from local Python data and HTML templates
- Internal links are normalized for static hosting
- Google Analytics and Framer event tracking are removed
- Images, video, and icons are served from the local `assets/` directory
- The output is ready for static deployment

## Commands

```bash
npm run build
npm run dev
```

- `npm run build`: fetches the source site and rebuilds `dist/`
- `npm run dev`: serves `dist/` at `http://127.0.0.1:4173`

## Deployment

Deploy the `dist/` directory to any static host, for example:

- Netlify
- Vercel static hosting
- GitHub Pages
- Cloudflare Pages

`netlify.toml` is included and already points Netlify at `dist/`.

## Architecture

- Source content lives in [scripts/site_data.py](/Users/zhihu/Documents/New%20project/scripts/site_data.py)
- Static page generation lives in [scripts/build_site.py](/Users/zhihu/Documents/New%20project/scripts/build_site.py)
- Local media assets live in `assets/framer/`
- Final deployable output is written to `dist/`

## Current route coverage

- `/`
- `/about/`
- `/case-studies/`
- `/experiments/`
- `/case-studies/solace/`
- `/case-studies/work-well-being/`
- `/case-studies/parkit/`
- `/case-studies/grab/`
- `/case-studies/career-explorer/`
- `/case-studies/content-collection/`
