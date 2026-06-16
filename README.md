# mvp-nlp-data-analytics

> CRM and analytics platform — Kanban sales pipeline, NLP-powered dataset querying, and AI-generated chart insights.

Three integrated modules built with Nuxt 3: a B2B/B2C deal pipeline modelled after Bitrix24, a natural-language interface for querying uploaded CSV/XLSX files, and a central dashboard with real-time KPIs.

## Features

**Smart Deals CRM (`/deals`)**
- **Kanban board** — drag-and-drop stages with probability-weighted pipeline value
- **Rich deal cards** — AI risk score, sentiment label, next planned activity, contact info
- **Detail panel** — slide-out view with full activity stream and AI insights
- **B2B / B2C tagging** — visual differentiation and separate metrics per type

**NLP Data Analytics (`/datasets`)**
- **Universal import** — CSV and XLSX file upload with column auto-detection
- **Natural language queries** — ask questions like "Show Q1 sales trend" and get a chart
- **Persistent reports** — saved datasets and generated charts via local storage
- **Auto-visualizations** — bar, line, and pie charts generated from query results

**Dashboard (`/`)**
- Real-time KPIs, pipeline value, conversion rate
- Quick links to recent reports and active deals

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Nuxt 3 (Vue 3) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Charts | Custom composables |
| Data | CSV / XLSX parsing, localStorage |

## Getting Started

```bash
npm install
npm run dev   # http://localhost:3000
```

## Project Structure

```
├── pages/
│   ├── index.vue        # Dashboard
│   ├── deals.vue        # Kanban CRM
│   └── datasets.vue     # NLP analytics
├── components/          # UI widgets (cards, charts, panels)
├── composables/         # useDeals, useDataset, useNLP
├── server/              # API routes
└── types/               # Shared TypeScript interfaces
```

## License

MIT
