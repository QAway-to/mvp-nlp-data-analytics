# MVP NLP Data Analytics

A powerful CRM and Analytics dashboard built with Nuxt 3, designed for visualizing sales pipelines and data analysis.

## Core Modules & Features

The application is built around three key modules, each serving a distinct business function.

### 1. Smart Deals CRM (`/deals`)
A full-featured Kanban board for managing B2B/B2C sales pipelines.
*   **Bitrix24-style Interface**: Visual pipeline summary showing stage distribution and total values.
*   **Rich Deal Cards**: Display probability (weighted forecast), next planned activity, and contact details.
*   **Interactive Workflow**: Drag-and-drop deals between stages.
*   **Detail View**: Slide-out panel for deal specifics, AI insights (Risk Score/Sentiment), and activity streams.
*   **B2B/B2C Support**: Dedicated tagging and visual differentiation for different deal types.

### 2. NLP Data Analytics (`/datasets`)
An intelligent engine for processing and querying raw data files.
*   **Universal Import**: detailed support for CSV and Excel (.xlsx) file uploads.
*   **AI-Powered Analysis**: Natural Language Processing to query data (e.g., "Show me sales trend for Q1").
*   **Persistence**: Save datasets and generated reports to local storage for quick access.
*   **Visualizations**: Auto-generated charts and statistical summaries based on queries.

### 3. Dashboard (`/`)
A central hub for real-time monitoring.
*   **Key Metrics**: Recent activity, total pipeline value, and conversion rates.
*   **Navigation**: Quick access to recent reports and active deals.

## Project Structure

The project follows a modular architecture separating data, logic, and presentation:

```
/
├── assets/          # Global styles (including Tailwind definitions)
├── components/      # Reusable UI Building Blocks
│   ├── analytics/   # Specific analytics components
│   └── ...          # Shared components (FileUploader, ChatInterface)
├── composables/     # Business Logic & State Management
│   ├── useDeals.ts  # Deals state, mock data, and logic
│   ├── useDataAnalysis.ts
│   └── ...
├── layouts/         # Page Wrappers (Dashboard layout)
├── pages/           # Views (Routing)
│   ├── deals.vue    # Deals Pipeline UI
│   ├── index.vue    # Dashboard Home
│   └── ...
├── types/           # Data Models & Interfaces (Truth Source)
└── server/          # API Endpoints
```

## Architecture Pattern

The application relies on a **Separation of Concerns** principle where the UI is a function of the State:

1.  **Data Models (`types/`)**:
    *   Defines the "Shape" of data (e.g., `Deal`, `PipelineColumn`).
    *   Pure TypeScript interfaces, no logic.

2.  **Logic Layer (`composables/`)**:
    *   Acts as the "Brain".
    *   Manages State (`ref`, `reactive`) and Business Logic.
    *   Exposes a clean API to the UI (e.g., `moveDeal`, `pipelineReport`).
    *   Completely decoupled from the DOM.

3.  **Presentation Layer (`pages/` & `components/`)**:
    *   **Subscribes** to the Logic Layer.
    *   Reactive Views that automatically update when state changes.
    *   Handles user interactions by calling methods from Composables.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build
```
