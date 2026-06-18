# NLP Lead Generator

A single-page lead generation tool built with Nuxt 3. It scrapes public sources, extracts contacts, and scores leads by intent using NLP heuristics — then lets you filter, triage, and export them.

## What it does

Add a **source**, click scrape, and the app pulls fresh leads into a single searchable database.

### Supported sources

| Source | Input | What it finds |
|--------|-------|---------------|
| **Telegram** | `@channel_name` | Posts in public channels |
| **hh.ru** | search query (e.g. `веб разработка`) | Companies hiring developers |
| **FL.ru** | search query (e.g. `создание сайта`) | Freelance project postings |
| **Habr Career** | search query (e.g. `стартап разработка`) | Tech companies |

### Features

- **Intent scoring** — each lead gets a 0–100 score and an intent label (high / medium / low / none) derived from message content.
- **Contact extraction** — name, company, email, phone, and Telegram handle pulled from raw text.
- **Unified table** — search, filter by source / intent / status, and paginate across all collected leads.
- **Pipeline status** — mark each lead New → Contacted → Qualified → Rejected.
- **Message preview** — inspect the original source message and open the link.
- **CSV export** — download the full database for use elsewhere.
- **Local persistence** — leads and sources are stored in the browser (`localStorage`), no backend DB required.

## Architecture

```
/
├── pages/index.vue          # The single page — sources sidebar + leads table
├── composables/useLeads.ts  # Lead/source state, dedupe, scoring, persistence, CSV
├── layouts/default.vue      # App shell (header + footer)
├── server/api/
│   ├── scrape.post.ts       # Telegram scraper
│   ├── scrape-hh.post.ts    # hh.ru scraper
│   ├── scrape-fl.post.ts    # FL.ru scraper
│   └── scrape-habr.post.ts  # Habr Career scraper
└── types/index.ts           # Lead / LeadSource / SourceType models
```

Each scrape endpoint is self-contained: it fetches from the source, parses results, extracts contacts, and returns scored `Lead[]`. The UI is a pure function of the state held in `useLeads`.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev   # http://localhost:3000
```

## Production

```bash
npm run build
node .output/server/index.mjs
```
