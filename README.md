# Meeting Room Booking

A meeting room booking app for employees: no two groups can book the same room at the same time. Admins manage rooms and users.

> **This project is for people who are new to AI and want to learn how to code with AI.**
> It is a real exercise that shows the whole workflow: write a specification → the AI makes a plan → you approve it → the AI codes and tests → you accept the result. The booking app is just the assignment; **learning how to work with AI is the point**. It is not a product for real use.

## Who this project is for

| You are… | You will get |
|---|---|
| New to coding with AI (not sure where to start or how to hand work to an AI) | A complete example: the input specification, the working rules, a step-by-step commit history, and the resulting code and tests |
| A developer who wants to hand a whole feature to an AI instead of asking for one snippet at a time | How to write a specification clear enough for an AI to work from, and how to keep control of the result |
| Someone who wants to check whether AI-written code can be trusted | A test suite tied to each business rule, so you can run it and judge for yourself |

You do **not** need to know Spring Boot or React beforehand to read the project and learn the workflow. To run the app you need the JDK and Node.js (see [Quick start](#quick-start)).

## Who does what

| Task | Who |
|---|---|
| Write and approve the specification ([docs/SRS.md](docs/SRS.md)); decide when the specification and the code disagree | **Human** |
| Approve the plan before the AI codes, review the result, accept the work | **Human** |
| Write all backend (Java Spring Boot) and frontend (React) code, write tests, run compile and tests, report back | **AI** ([Claude Code](https://claude.com/claude-code) by Anthropic) |

Humans do not type code. The commit history shows each step: commits with a `Co-Authored-By: Claude` line are the AI's work.

**Review carefully before using this for anything real.** There are automated tests, but the tests were also written by the AI.

## How we work with the AI here

The rules live in [CLAUDE.md](CLAUDE.md); Claude Code reads this file at the start of every session. The workflow has five steps:

1. **The AI reads the specification and the relevant code, then makes a plan.** No code yet.
2. **The human approves the plan.** This is the earliest and cheapest place to catch a mistake.
3. **The AI codes following the plan**, then runs compile and tests.
4. **The AI reports**: what it did and which business rules (BR) now have tests. The AI must not say "done" without compile/test output.
5. **If the specification and the code disagree, the AI stops and asks**; it does not decide by itself.

Three things make this workflow work:

- **A clear specification** is the only input: the clearer it is, the less the AI has to guess. Read [docs/SRS.md](docs/SRS.md) to learn how to write one.
- **Rules written down as a file** ([CLAUDE.md](CLAUDE.md)): folder structure, naming conventions, build/test commands, and a "Never" list (do not edit tests to make them pass, do not add dependencies without asking, …).
- **Automatic checks**: every business rule has at least one test; the hook in [.claude/settings.json](.claude/settings.json) compiles the backend each time the AI finishes a turn, and the AI must fix any error.

## Suggested reading order

1. This page, starting with [Who does what](#who-does-what).
2. [docs/SRS.md](docs/SRS.md): the input specification. The "How to read this document" section at the top explains the notation (BR, D, error codes).
3. [CLAUDE.md](CLAUDE.md): the ground rules between human and AI.
4. `git log`: watch the AI build one API at a time (A1 → A6, then login and the frontend).
5. Run the app (see [Quick start](#quick-start)), then read the code in `backend/` and `frontend/`.

Suggested exercise after reading: add a new API to the SRS (for example, list all bookings, which is currently missing, see [Known limitations](#known-limitations)), then hand it to the AI and follow the same five steps.

## Quick start

You need to run **two** things side by side: the backend (API) and the frontend (UI). Open two terminal windows.

### 1. Prerequisites

| Tool | Version | Check |
|---|---|---|
| JDK | **17 or later** | `java -version` |
| Node.js | **22.12 or later** (tried with 24) | `node -v` |
| Internet access | first run | Maven and npm download dependencies |

You do not need to install Maven separately; use the `mvnw` wrapper in `backend/`. You do not need to install a database (H2 runs in memory).

### 2. Terminal 1: backend

```bash
cd backend

./mvnw spring-boot:run        # Linux / macOS
mvnw.cmd spring-boot:run      # Windows
```

On the first run `mvnw` downloads Maven and libraries, which takes a few minutes. The backend is ready when the log shows `Started MeetingRoomBookingApplication` (about 13 seconds once downloads are done). It listens on port **8082**.

Quick check:

```bash
curl -s -X POST http://localhost:8082/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
# → {"code":"00","message":"Success","data":{"accessToken":"...","tokenType":"Bearer","expiresIn":3600}}
```

### 3. Terminal 2: frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** and log in with `admin` / `admin`.

The dev server forwards `/api` requests to the backend on port 8082, so no CORS setup is needed.

### 4. Try it out

The UI labels are in Vietnamese; the English meaning is in parentheses.

1. Log in as `admin` / `admin` and create a room in the **Phòng** (Rooms) tab.
2. **Người dùng** (Users) tab, ADMIN only: create a regular user (role USER).
3. Click **Xem lịch** (View schedule) on a room, pick a date, then **Đặt phòng** (Book room). Enter the date as `dd/MM/yyyy` (free typing such as `2 3 2026` also works) and the time in 24-hour format.
4. **Lịch đặt** (Bookings) tab: see which rooms are booked on a given day, with times.

Data is kept in memory, so it is **lost when the backend stops**; every restart leaves only the default `admin` account.

### Configuration

Defaults are in `backend/src/main/resources/application.properties`. Override them with environment variables:

| Environment variable | Meaning | Default |
|---|---|---|
| `SERVER_PORT` | Backend port | `8082` |
| `APP_JWT_SECRET` | JWT signing key, at least 32 bytes. The default is for development only | dev value in the file |
| `APP_ADMIN_PASSWORD` | Password of the default `admin` (a warning is logged while it is still `admin`) | `admin` |
| `BACKEND_URL` | (frontend) backend address the dev server proxies to | `http://localhost:8082` |

### Troubleshooting

| Symptom | Fix |
|---|---|
| `java -version` is below 17, or Maven reports the wrong Java version | Install JDK 17+ and point `JAVA_HOME` at it (`export JAVA_HOME=/path/to/jdk-17` or `$env:JAVA_HOME="C:\...\jdk-17"`), then open a new terminal. |
| Backend reports `Port 8082 was already in use` | Another application uses 8082. Run the backend on another port, e.g. PowerShell: `$env:SERVER_PORT="8083"; mvnw.cmd spring-boot:run`; bash: `SERVER_PORT=8083 ./mvnw spring-boot:run`. Then run the frontend with a matching `BACKEND_URL`: `$env:BACKEND_URL="http://localhost:8083"; npm run dev` (bash: `BACKEND_URL=http://localhost:8083 npm run dev`). |
| Login always shows "Hệ thống đang gặp lỗi" (the UI's generic system-error message) | An older backend build may still be running. Stop it completely and start it again from the `backend/` folder. |
| `./mvnw: Permission denied` (Linux/macOS) | `chmod +x backend/mvnw`. |
| `npm test` or `npm run dev` reports the wrong Node version | Use Node 22.12+ (Vitest requires it). For `dev`/`build` only, Node 20.19+ also works. |
| You are sent back to the login screen while using the app | The session expired (1 hour), or the backend restarted so regular users no longer exist. Log in again. |

### Running tests

```bash
cd backend && ./mvnw test        # backend (Windows: mvnw.cmd test)
cd frontend && npm test          # frontend, uses Vitest
cd frontend && npm run build     # type-check and build the frontend
```

Repo convention: every business rule (BR) has at least one test; BR9 (concurrent booking) has a test with two simultaneous requests.

## Technology

| Component | Notes |
|---|---|
| Backend | Java 17, Spring Boot 4.1.1 (Web MVC, Data JPA, Validation, Security + OAuth2 resource server for JWT) |
| Database | H2 in-memory, **data is lost on restart** (SRS D5) |
| Build | Maven (with Maven Wrapper) |
| Frontend | React + Vite + TypeScript, tested with Vitest |

## Features

Full specification in [docs/SRS.md](docs/SRS.md) (v1.4).

| # | Method | Path | Description | Access |
|---|---|---|---|---|
| U0 | POST | `/api/auth/login` | Log in, receive a JWT | public |
| U1 | POST | `/api/users` | Create a user | ADMIN |
| U2 | GET | `/api/users` | List users | ADMIN |
| A1 | POST | `/api/rooms` | Create a room | ADMIN |
| A2 | GET | `/api/rooms` | List rooms | ADMIN, USER |
| A3 | POST | `/api/bookings` | Book a room | ADMIN, USER |
| A4 | PUT | `/api/bookings/{id}` | Update a booking | organizer, ADMIN |
| A5 | POST | `/api/bookings/{id}/cancel` | Cancel a booking | organizer, ADMIN |
| A6 | GET | `/api/bookings?roomId=&date=` | One room's schedule for one day | ADMIN, USER |

Notable design points:

- **No overlapping bookings:** `[s1, e1)` and `[s2, e2)` overlap when `s1 < e2 AND s2 < e1`; touching edges (10:00 – 10:00) are allowed. `CANCELLED` bookings do not count.
- **Concurrent booking:** the record is locked inside the transaction (`SELECT ... FOR UPDATE`) before the overlap check, so exactly one request succeeds.
- **Authorization:** JWT (HS256, 1-hour expiry); passwords hashed with BCrypt. The organizer comes from the token, never from the client. The frontend keeps the token in `sessionStorage`, so it is gone when the tab closes.
- **Time zone:** fixed to `Asia/Ho_Chi_Minh`; times are sent and received without an offset, e.g. `2026-10-22T09:00:00`.
- **Uniform response:** `{ "code": "00", "message": "Success", "data": { } }`; errors use the same envelope (without `data`) with their own codes 80–99, see the code table in the SRS.

## Known limitations

- **The Bookings screen** only shows one day at a time, because the SRS has no API that lists all bookings. The frontend assembles it from each room's schedule, so the number of calls equals the number of rooms.
- **Out of scope** (per the SRS): refresh tokens, logout/token revocation, password change, locking/deleting/editing users, recurring bookings, email invitations, pagination, disabling/deleting/editing rooms.

## Folder structure

```
meeting-room-booking/
├── docs/SRS.md                          # Requirements specification (source of truth)
├── CLAUDE.md                            # Rules for working with the AI
├── .claude/settings.json                # Hook: compile the backend after each AI turn
├── backend/                             # Spring Boot
│   ├── pom.xml, mvnw, mvnw.cmd, .mvn/
│   ├── src/main/java/com/practice/booking/   # controller / service / repository / entity / dto / exception / config
│   ├── src/main/resources/application.properties
│   └── src/test/java/com/practice/booking/   # Backend tests
└── frontend/                            # React + Vite + TypeScript (see frontend/README.md)
```

The repo root only holds the README, the docs (`docs/`), `CLAUDE.md`, the Claude Code config (`.claude/`) and git config.
