# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Interview coding challenge — **implemented**. `backend/` (Node + Express + Mongoose) and `frontend/` (Vue 3 + Pinia) are built and end-to-end verified against a Docker MongoDB. Assignment in `proposal.md`, mockup in `圖片1.png`, written Q&A answers in `ANSWERS.md`, run/deploy guide in `README.md`.

## The assignment (from `proposal.md`)

Build a **3D part/material editor** with three regions that share one part state:

1. **Mesh List** (left) — render parts from JSON; each row shows name + computed total price.
2. **Material Editor** (right) — clicking a part in the list loads its info here; editing color or values updates the part.
3. **BOM Summary** (bottom) — table of all parts with base price, multiplier, line total, and a grand total.

Core requirement: editing a part in the Material Editor must **immediately sync** to both the Mesh List and BOM Summary (three non-parent/child siblings sharing one source of truth).

Each part: `id`, `name`, `category`, `color` (hex), `basePrice` (number), `multiplier` (number), `metadata { material, weight }`. **Line total = `basePrice * multiplier`.** The seed JSON (4 parts) lives in `proposal.md`.

`proposal.md` also contains written Q&A (cross-component state, slider debounce/throttle to avoid UI freeze, Mongoose schema, fetch/axios persistence with failure UX, pagination/virtual scroll for 10k+ rows). These are answered in docs/code comments. The schema question asks for a real **Mongoose schema** — this backend is Node.js + Mongoose, so the actual `Part` model file IS the answer (typed fields, `required`, indexes on `id`/`category`).

## Architecture

Two deployables, one MongoDB database, all hosted on **Zeabur**:

- **Frontend** — Vue 3 + TypeScript (Vite). Shared part state via a **Pinia** store (the answer to the "three sibling components" question — single store, components read/write through it). Editor writes should be **throttled/debounced** before hitting the API so slider drags don't flood requests or freeze the UI.
- **Backend** — Node.js + Express + TypeScript REST API, using **Mongoose** as the MongoDB ODM. Exposes CRUD for parts and a paginated list endpoint.
- **Database** — MongoDB. A Mongoose `Part` schema maps the JSON above; index `id` (unique) and `category`. `metadata` is a nested sub-document `{ material, weight }`.

Frontend → REST (JSON) → Express → Mongoose → MongoDB. Line total and grand total are **computed**, not stored, to avoid drift.

## Commands

> These reflect the intended toolchain; verify against the actual scaffolding once it exists.

Frontend (`frontend/`):
- `npm install` — install deps
- `npm run dev` — Vite dev server
- `npm run build` — type-check + production build
- `npm run test` / `npm run test -- <file>` — Vitest (single file by path)
- `npm run lint`

Backend (`backend/`):
- `npm install` — install deps
- `npm run dev` — run API locally (ts-node / nodemon, watch mode)
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run compiled API (used by Zeabur)
- `npm run seed` — load the canonical parts from `proposal.md` into MongoDB

## Zeabur deployment

- Deploy frontend and backend as **separate Zeabur services** from this monorepo (set each service's root directory to `frontend/` and `backend/`).
- Add a **MongoDB** service; Zeabur injects a connection URI — read it from `process.env.MONGODB_URI` in the backend (don't hardcode credentials).
- Frontend needs the backend's public URL via a build-time env var (e.g. `VITE_API_BASE_URL`); configure CORS on the backend to allow the frontend origin.

## Conventions

- Prices/multipliers are numeric; format for display only at the edge (never store formatted strings).
- The seed JSON in `proposal.md` is the canonical sample data — seed the DB from it.
- Keep total-price math in one shared place (a frontend util mirrored by the backend) so the list, editor, and BOM never disagree.
