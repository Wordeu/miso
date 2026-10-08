# Silo

A responsive hardware landing page, built with semantic HTML, CSS, SVG, and vanilla JavaScript. Vite handles development and production assets; Formspree collects early-access signups.

## Run

Requires Node 20.19+ and npm.

```sh
npm install
npm run dev
```

Open http://localhost:5173. For production, run `npm run build` then `npm start`. Set `PORT` to change the port. On Vercel, use `npm run build` with `dist` as the output directory; signups go directly to Formspree without a backend or environment variables.

## Edit

- `src/content.js`: primary copy and animation settings.
- `index.html`: page structure, supporting copy, and SVG construction drawings.
- `src/style.css`: colors, spacing, typography, breakpoints, and animation. Design tokens are in `:root`.
- `public/models/`: the three supplied logo assets, displayed in grayscale.
- `server.mjs`: local application server and legacy file-based waitlist API.

The signup form submits to `https://formspree.io/f/mwlvoqoo`, configured in the form's `action` in `index.html`. View collected emails in that form's Submissions tab in your Formspree account. Notification emails and spam settings are managed in Formspree. JavaScript shows success and error messages inline; the HTML form also supports direct submission without JavaScript. The public form endpoint is not a secret and needs no API key.

The legacy `/api/waitlist` endpoint in the local Node server still stores entries in `.data/waitlist.jsonl`, but the signup form no longer uses it. Existing local entries are not automatically transferred to Formspree.

## Verify

```sh
npm run build
npm test
```

Browser checks use installed Google Chrome and a separate production server on port 5184. Formspree requests are mocked so tests never add entries to the real inbox. Legacy API checks use an isolated temporary directory. Coverage includes the Formspree request, success and error handling, responsive overflow, assets, keyboard and pointer interactions, scroll reveal, reduced motion, and legacy API validation.

## Reference

Inspected the live https://normal.ai page, its HTML, stylesheet, and interactions, alongside the supplied screenshot. Silo independently implements the reference's restrained construction drawings, traveling dashed outlines, pointer reveal, scroll motion, and oversized footer typography. Normal's code, fonts, branding, and assets are not included. Inter is self-hosted through `@fontsource/inter`; the model logos are the user-supplied assets.
