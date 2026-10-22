# CLAUDE.md — meeting-room-booking

## Project
A project for employees to book meeting rooms. Main stack: Java Spring Boot 4; Java 17; H2 database.

## Requirements
- Follow docs/SRS.md.
- When the SRS and the code disagree, ask; do not decide on your own.

## Folder structure
- `backend/`: Spring Boot (pom.xml, mvnw, src/). Run every Maven command in this folder.
- `frontend/`: React + Vite + TypeScript.
- `docs/`: the SRS. The repo root only holds README, CLAUDE.md, docs/, `.claude/` and git config.

## Build & test
- JDK 17 is at `~/.jdks/ms-17.0.20.1` (PATH currently points to Java 8, do NOT use it)
- Compile: `cd backend; $env:JAVA_HOME="$HOME\.jdks\ms-17.0.20.1"; .\mvnw.cmd -q compile`
- Test:    `cd backend; $env:JAVA_HOME="$HOME\.jdks\ms-17.0.20.1"; .\mvnw.cmd -q test`

## Code conventions
- Package: by layer (controller/, service/, repository/)
- DTO: [Action][Entity]Request.java / [Entity]Response.java
- Response: response envelope
    ```json
    { "code": "00", "message": "Success", "data": { } }
    ```
- Errors: return an error code for each case. Error codes are defined in an `ErrorCode` enum (code, message, httpStatus) + one `BusinessException(ErrorCode)` + one `@RestControllerAdvice` that handles them centrally
- Time: get the current time through an injected `Clock` bean (ZoneId Asia/Ho_Chi_Minh). Calling LocalDateTime.now() directly is forbidden.

## Testing
- Every BR in the SRS has at least 1 test, and the test name includes the BR code (e.g. br4_overlap_returns93). BR9 must have a test with 2 concurrent requests.

## Workflow
1. Read the SRS + relevant code, make a plan
2. Present the plan, wait for ANam to approve
3. Code following the plan
4. Compile + test, paste the output
5. Report: what was done, which BRs now have tests

## Never
- Never say "done" before pasting the compile/test output.
- Never edit docs/SRS.md without asking first.
- Never add a new dependency without asking first.
- Never edit/delete tests to make them pass. If a test fails and you suspect the SRS is ambiguous, stop and ask.
