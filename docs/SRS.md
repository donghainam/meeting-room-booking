# SRS — Meeting Room Booking (v1.4)

## How to read this document

**SRS (Software Requirements Specification)** describes what the system must do, clearly enough that a person, or an AI such as Claude Code, can write the right code without guessing. In this project the SRS is the **single source of truth**: if code or tests disagree with it, stop and ask; do not decide alone. See the [README](../README.md) for how humans and the AI work together.

This document suits people who are new to handing work to an AI: read it to see what a "clear enough" specification looks like (every field has a type and constraints, every rule has its own code and error code, and the order of checks is spelled out).

Quick guide:

| To find out | Read section |
|---|---|
| What the system is for | 1 |
| What data exists and which fields are required | 2 |
| Who may call which API | 3 |
| What each API takes and returns | 4 |
| Business rules, and the order of checks when several are violated | 5 |
| Time format | 6 |
| Error codes and logging | 7 |
| What is deliberately not built | 8 |
| Why the design is the way it is | 9 |

Notation used in this document:

| Notation | Meaning | Example |
|---|---|---|
| U0–U2, A1–A6 | API codes: U = users and login, A = rooms and bookings | A3 = Book a room |
| BR1–BR9 | **B**usiness **R**ule. Each BR has at least one test in the code | BR4 = No overlapping bookings |
| D1–D7 | **D**ecision: a design decision already made, with its reason | D3 = locking to prevent double booking |
| 80–99 | Error codes returned to the client (see section 7) | 93 = room already booked |
| ADMIN, USER | The two roles: ADMIN manages everything, USER only books rooms and manages their own bookings | |

## 1. Goal
Employees book meeting rooms; no two groups may book the same room at the same time. Admins manage rooms and users.

## 2. Data objects
Convention: **required** = not null, and a String must not be empty. Every String (except `password`) is trimmed of leading and trailing whitespace before validation. Extra fields in the body are ignored.

### User
| Field | Type | Constraints |
|---|---|---|
| id | Long | auto-generated |
| username | String | required, 3–50 characters, only `a-z A-Z 0-9 . _ -`, unique **case-insensitively** |
| password | String | required, 8–72 characters; stored only as a BCrypt hash, never returned |
| role | Enum | `ADMIN` / `USER`, default `USER` |

### Room
| Field | Type | Constraints |
|---|---|---|
| id | Long | auto-generated |
| name | String | required, ≤ 100 characters, unique **case-insensitively** (`Room A` = `room a`) |
| capacity | Integer | required, 1–100 |
| active | Boolean | always `true` on creation (any value sent by the client is ignored) |

### Booking
| Field | Type | Constraints |
|---|---|---|
| id | Long | auto-generated |
| roomId | Long | required, the room must exist, cannot be changed |
| title | String | required, ≤ 200 characters |
| organizer | String | `username` of the logged-in user (taken from the token, the client does not send it) |
| attendees | Integer | required, ≥ 1 |
| startTime | DateTime | required |
| endTime | DateTime | required |
| status | Enum | `BOOKED` on creation, `CANCELLED` once cancelled |

## 3. Authorization

- Every API except U0 needs the header `Authorization: Bearer <token>`. A missing, wrong-scheme, invalid or expired token → 80 (even for a URL that does not exist).
- A role without enough permission → 92.

| Code | API name | Method | Path | Access |
|---|---|---|---|---|
| U0 | Log in | POST | `/api/auth/login` | public |
| U1 | Create a user | POST | `/api/users` | ADMIN |
| U2 | List users | GET | `/api/users` | ADMIN |
| A1 | Create a room | POST | `/api/rooms` | ADMIN |
| A2 | List rooms | GET | `/api/rooms` | ADMIN, USER |
| A3 | Book a room | POST | `/api/bookings` | ADMIN, USER |
| A4 | Update a booking | PUT | `/api/bookings/{id}` | organizer, ADMIN (BR7) |
| A5 | Cancel a booking | POST | `/api/bookings/{id}/cancel` | organizer, ADMIN (BR7) |
| A6 | View a room's schedule by day | GET | `/api/bookings?roomId=&date=` | ADMIN, USER |

### Default admin account
- On startup, if the user `admin` does not exist, create `admin` / `ADMIN` with the password from `app.admin.password` (default `admin`; the 8–72 character rule does not apply).
- While the password is still `admin`, log a `WARN`: "Default admin password in use".

## 4. API

- Success: HTTP 200, envelope D2. `data` is the object just created/updated (U1, A1, A3–A5), the token (U0), or an array that may be empty (U2, A2, A6).
- **U0 Log in**:
  - Body: `{ "username": "...", "password": "..." }`. `username` is case-insensitive.
  - Returns `data`: `{ "accessToken": "...", "tokenType": "Bearer", "expiresIn": 3600 }` (seconds).
  - Missing, empty, or wrong username/password (including a password over 72 bytes) → 80; it does not reveal which field was wrong.
- **U1 Create a user**: body `{ "username", "password", "role" }`; if `role` is omitted it is `USER` (an `ADMIN` can also be created), any other value → 90. Duplicate username → 81. Returns `{ id, username, role }`.
- **U2 List users**: returns `[{ id, username, role }]`, sorted by `id` ascending.
- **A2 List rooms**: sorted by `id` ascending.
- **A4 Update a booking**: send all of `title`, `attendees`, `startTime`, `endTime` (replaces everything).
- **A5 Cancel a booking**: no body; returns the booking with `status = CANCELLED`.
- **A6 View a room's schedule by day**:
  - `roomId` and `date` (`yyyy-MM-dd`) are required; room does not exist → 91.
  - Returns `BOOKED` bookings that intersect `[date 00:00, date+1 00:00)`, sorted by `startTime`, including bookings that cross midnight.
  - A booking ending exactly at 00:00 does not belong to the next day.

## 5. Business rules

- **BR1 — End time after start time**: `endTime > startTime`.
- **BR2 — Future bookings only**: `startTime > now`, applies to both create and update.
- **BR3 — At most 4 hours**: `endTime − startTime ≤ 4h`.
- **BR4 — No overlapping bookings**: the same room has no 2 overlapping `BOOKED` bookings.
  - `[s1, e1)` and `[s2, e2)` overlap when `s1 < e2 AND s2 < e1`; touching edges (09–10 and 10–11) do not overlap.
  - Ignore `CANCELLED` bookings and the booking being updated.
- **BR5 — Within room capacity**: `attendees ≤ capacity`.
- **BR6 — Room must be active**: `active = true` (there is no API to deactivate a room yet, see section 8).
- **BR7 — Only the organizer or an admin may update/cancel**: the logged-in user is the `organizer`, or has the role `ADMIN`.
- **BR8 — Only bookings that have not started may be updated/cancelled**: the booking must be `BOOKED` and `startTime > now`.
- **BR9 — No double booking under concurrent requests**: 2 book/update requests for overlapping times in the same room sent at the same moment → exactly 1 succeeds, the other gets 93.

### Order of checks
When several rules are violated → return the error of the first step. Every API (except U0) always checks first: token → 80, role → 92.

| Step | A3 Book a room | A4 Update a booking | A5 Cancel a booking |
|---|---|---|---|
| 1 | Fields, format → 90 | same as A3 | `id` of the wrong type → 90 |
| 2 | BR1 End time after start time, BR3 At most 4 hours → 90 | same as A3 | Booking does not exist → 91 |
| 3 | Room does not exist → 91 | Booking does not exist → 91 | BR7 Only the organizer or an admin may update/cancel → 92 |
| 4 | BR6 Room must be active → 96 | BR7 Only the organizer or an admin may update/cancel → 92 | BR8 Only bookings that have not started may be updated/cancelled → 97 |
| 5 | BR2 Future bookings only → 94 | BR8 Only bookings that have not started may be updated/cancelled → 97 | |
| 6 | BR5 Within room capacity → 95 | BR6, BR2, BR5 as in A3 | |
| 7 | BR4 No overlapping bookings → 93 | BR4 No overlapping bookings → 93 | |

Example: another user cancels an already-cancelled booking → 92, because BR7 comes before BR8.

## 6. Time
- Requests and responses use `yyyy-MM-ddTHH:mm:ss`, no offset (e.g. `2026-10-22T09:00:00`). Sending an offset → 90.
- `now` is computed in the application time zone (D1).

## 7. Errors

```json
{ "code": "90", "message": "Invalid data input. Please try again" }
```

| Code | HTTP | Message | When |
|---|---|---|---|
| 80 | 401 | Unauthorized | Missing/invalid/expired token; wrong, missing or empty username/password on login |
| 81 | 409 | Username already exists | Duplicate username (including concurrent requests) |
| 90 | 400 | Invalid data input. Please try again | Missing/invalid field, wrong format, malformed JSON, missing param, BR1 End time after start time, BR3 At most 4 hours |
| 91 | 404 | Resource not found | Room / booking not found |
| 92 | 403 | Permission denied | Role without enough permission; BR7 Only the organizer or an admin may update/cancel |
| 93 | 409 | Room is already booked for this time | BR4 No overlapping bookings, BR9 No double booking under concurrent requests |
| 94 | 422 | Booking time must be in the future | BR2 Future bookings only |
| 95 | 422 | Attendees exceed room capacity | BR5 Within room capacity |
| 96 | 422 | Room is not available | BR6 Room must be active |
| 97 | 422 | Booking can no longer be modified | BR8 Only bookings that have not started may be updated/cancelled |
| 98 | 409 | Room name already exists | Duplicate room name (including concurrent requests) |
| 99 | 500 | System error. Please try again later | Unexpected error |

- Messages are fixed as in the table.
- Unknown URL: with a valid token → HTTP 404 with an empty body (not in the D2 envelope); without one → 80.

Logging:
- 80–98: one `WARN` line (code + path + reason), no stack trace. A 90 error only logs the field/header/param name, never the value the client sent.
- 99: `ERROR` with stack trace; the client only receives the generic message.
- Never log a `password` or a token.

## 8. Out of scope
Refresh tokens, logout/token revocation, password change, locking/deleting/editing users, recurring bookings, email invitations, pagination, disabling/deleting/editing rooms.

## 9. Design decisions
- **D1 — Time zone**: fixed to `Asia/Ho_Chi_Minh` (`app.timezone`); `now` comes from a `Clock` bean.
- **D2 — Response envelope**: success `{ "code": "00", "message": "Success", "data": { } }`; errors as in section 7, without `data`. Errors 80/92 raised in the Spring Security layer must also return exactly this envelope.
- **D3 — Locking for BR9**: `SELECT ... FOR UPDATE` in a transaction, before the overlap check.
  - A3 Book a room: lock the room.
  - A4 Update a booking: lock the booking, then the room (fixed order, to avoid deadlock).
  - A5 Cancel a booking: lock the booking.
  - A test with 2 concurrent requests is mandatory for A3 and A4.
- **D4 — Unique room name**: a `nameKey` column (name in lowercase) has a unique constraint; checked before saving, and the constraint catches the concurrent case → 98.
- **D5 — Storage**: H2 in-memory, data is lost on restart (extra users are lost too; the default admin is recreated).
- **D6 — Authentication**: JWT signed with HS256, 1-hour expiry, payload contains `sub` (username) and `role`.
  - The secret comes from the `app.jwt.secret` setting (≥ 32 bytes); never commit a real secret.
  - Use `spring-boot-starter-security` + `spring-boot-starter-security-oauth2-resource-server` (no third-party JWT library needed).
  - A token that is still valid but whose user no longer exists → 80.
- **D7 — Passwords**: hashed with BCrypt.

## Change history
| Version | Date | Content |
|---|---|---|
| 1.0 | 2026-10-21 | First approved version |
| 1.1 | 2026-10-22 | Synced from the A1–A6 code; added order of checks, D4, D5; named the APIs and BRs; tightened wording |
| 1.2 | 2026-10-22 | ADMIN/USER roles, JWT login (U0), user management (U1, U2), default admin; removed `X-User-Id`; BR7 allows admin; error codes 80, 81; D6, D7 |
| 1.3 | 2026-10-22 | Split the `attendees` row; clarified: U0 missing/empty/too long → 80, wrong `role` → 90, extra fields ignored, unknown URL without token → 80, wrong Bearer scheme → 80; tightened wording |
| 1.4 | 2026-10-22 | Presentation only; no change to rules, error codes or API behavior: added "How to read this document" (what an SRS is, quick guide, explanation of BR/D/error-code notation) for people new to working with AI; translated to English |
