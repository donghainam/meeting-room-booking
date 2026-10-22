# Frontend — Meeting Room Booking

The web UI of the meeting room booking app. This project is a **code-with-AI** exercise for people new to AI: all frontend code was written by Claude Code, while humans approved the plans and accepted the results. For the background, the workflow and the specification, see the [root README](../README.md) and [docs/SRS.md](../docs/SRS.md).

## Features

Log in, view and create rooms, view a room's schedule by day, create/update/cancel bookings, see all rooms' bookings for one day, and (ADMIN only) create and list users. See the SRS for the details of each API.

## Technology

React 19, TypeScript, Vite, tested with Vitest + Testing Library, linted with Oxlint.

## Run

Requires Node.js 22.12 or later and the backend running on port 8082 (see the [root README](../README.md#quick-start)).

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # run tests (Vitest)
npm run build     # type-check and build
npm run lint      # Oxlint
```

The dev server forwards `/api` requests to the backend (default `http://localhost:8082`, change it with the `BACKEND_URL` environment variable), so no CORS setup is needed.

## Structure of `src/`

| Folder / file | Role |
|---|---|
| `api/` | Functions that call the backend, grouped by area (auth, rooms, bookings, users), plus the shared `client.ts` |
| `auth/` | Stores the login session (token in `sessionStorage`) |
| `components/` | Screens and forms; tests sit next to each component (`*.test.tsx`) |
| `styles/` | `tokens.css` (colors, font sizes, …) and `app.css` |
| `time.ts`, `validation.ts`, `errors.ts`, `types.ts` | Time handling, input validation, error-code mapping, shared types |
