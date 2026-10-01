# missinglinkmusic

Website for Missing LINK - https://missinglinkmusic.net

Built with [Astro](https://astro.build) → static files in `dist/`, deployed to Hetzner via FTPS on push to `main`.

```sh
pnpm install
pnpm dev     # http://localhost:4321
pnpm build   # outputs dist/
```

Static assets (fonts, images, robots.txt, sitemap.xml) live in `public/`; pages in `src/pages/`, shared layout in `src/layouts/Base.astro`, Tailwind theme (fonts, animations) in `src/styles/global.css`.
