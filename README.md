# CivicAI

**Your voice, written in the language of the law.**

CivicAI is a multilingual, multimodal civic action platform. Citizens report local
problems — broken infrastructure, water outages, unsafe streets, corruption — via
text, voice, or photo, in their own language. The app instantly:

- Classifies the issue by type and urgency
- Attaches location & timestamp metadata
- Identifies the responsible government authority
- Drafts a formal, legally-worded complaint letter
- Clusters duplicate reports from the same area into one community case
- Calculates a **Community Pressure Score** and flags stalled cases for escalation
- Visualizes all active issues on a public heatmap dashboard

Supported languages out of the box: **English, French, Arabic, Spanish, Portuguese,
Swahili** — with full right-to-left layout for Arabic.

## Tech stack

- React 18 + Vite
- [lucide-react](https://lucide.dev/) icons
- Browser Geolocation API + [OpenStreetMap Nominatim](https://nominatim.org/) for
  reverse geocoding (free, no API key)
- Web Speech API for voice-to-text where supported by the browser
- `localStorage` for persistence — fully static, no backend required

## Running locally

```bash
npm install
npm run dev
```

Then open the printed local URL (typically `http://localhost:5173`).

## Building for production

```bash
npm run build
npm run preview   # optional: preview the production build locally
```

## Deploying to Vercel

1. Push this repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Vercel auto-detects the Vite framework (a `vercel.json` is included for safety).
4. Click **Deploy**. No environment variables are required for the default
   (template-based) letter generation and local-storage persistence.

## Extending CivicAI

This MVP is intentionally self-contained (no backend, no API keys) so it deploys
instantly. To evolve it into a production system:

- **Real AI classification & letter drafting**: replace the heuristic in
  `src/lib/classify.js` and the templates in `src/lib/letters.js` with calls to an
  LLM (e.g. the Anthropic API) via a serverless function (Vercel Functions /
  `api/` directory) so API keys stay server-side.
- **Shared community data**: replace `src/lib/storage.js`
  (`localStorage`-based) with a real database (Postgres + PostGIS for geo
  clustering, or Supabase/Firebase) behind an API, so reports are visible across
  users/devices — currently each browser only sees its own submissions plus the
  seeded demo cases.
- **Voice transcription**: the Web Speech API works in supported browsers
  (mainly Chrome-based). For full multilingual/offline support, integrate a
  hosted speech-to-text service (e.g. Whisper) via a serverless function.
- **Authority directory**: `src/categories.js` currently uses generic authority
  names. For a specific country/region deployment, replace these with a real
  directory of government department names, emails, and addresses per locality.
- **Automatic escalation**: a scheduled job (Vercel Cron) could scan open cases
  older than N days with no status change and mark them `escalated: true`.

## Project structure

```
src/
  App.jsx              Main application UI and logic
  i18n.js              All translated strings (en, fr, ar, es, pt, sw)
  categories.js        Issue categories, icons, colors, authority names
  lib/
    classify.js        Multilingual keyword-based issue classifier
    letters.js         Formal complaint / escalation letter templates
    storage.js         localStorage persistence + demo seed data + clustering
    geo.js             Geolocation + reverse geocoding helpers
```

## License

MIT — build on this freely for civic good.
