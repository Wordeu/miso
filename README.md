# Silo

A responsive hardware landing page, built with semantic HTML, CSS, SVG, and vanilla JavaScript. Vite handles development and production assets; a small Node server provides the optional waitlist endpoint.

## Run

Requires Node 20.19+ and npm.

```sh
npm install
npm run dev
```

Open http://localhost:5173. For production, run `npm run build` then `npm start`. Set `PORT` to change the port. The signup form overlays the construction drawing and saves release-notification requests through the Node waitlist endpoint.

## Edit

- `src/content.js`: primary copy and animation settings.
- `index.html`: page structure, supporting copy, and SVG construction drawings.
- `src/style.css`: colors, spacing, typography, breakpoints, and animation. Design tokens are in `:root`.
- `public/models/`: the three supplied logo assets, displayed in grayscale.
- `server.mjs`: waitlist API and application server.

Waitlist entries are validated, deduplicated, and saved in `.data/waitlist.jsonl` with restricted file permissions. The directory is gitignored and never served in production. Set `WAITLIST_DATA_DIR` to a persistent directory when deploying. Storage supports one Node process; use a shared database before running multiple instances. No email provider is connected, and joining does not send a confirmation email. Add your privacy notice and retention policy before collecting public signups.

## Verify

```sh
npm run build
npm test
```

Browser checks use installed Google Chrome and a separate production server on port 5184. Test submissions go to an isolated temporary directory, never the real waitlist. Coverage includes responsive overflow, assets, invalid and duplicate submissions, persistence, network errors, keyboard and pointer interactions, scroll reveal, reduced motion, and API validation.

## Reference

Inspected the live https://normal.ai page, its HTML, stylesheet, and interactions, alongside the supplied screenshot. Silo independently implements the reference's restrained construction drawings, traveling dashed outlines, pointer reveal, scroll motion, and oversized footer typography. Normal's code, fonts, branding, and assets are not included. Inter is self-hosted through `@fontsource/inter`; the model logos are the user-supplied assets.
