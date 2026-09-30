# Phase 2: Trello Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement automated, bidirectional Trello integration for JPilot: board provisioning, list setup, dynamic label assignment, card creation with structured description, checklist creation, and PDF file attachments with Human-in-the-Loop review queue.

**Architecture:** A dedicated `TrelloAgent` backed by a robust `TrelloClient` adhering to official Trello REST API v1. Supports direct credentialed execution via `TRELLO_API_KEY` and `TRELLO_TOKEN`, rate-limiting backoff, and mock simulation mode for testing and air-gapped environments.

**Tech Stack:** TypeScript / Node.js, native fetch / form-data file upload, Trello REST API.

**Spec:** `docs/superpowers/specs/2026-09-30-jpilot-design.md` (Section 19–24)

## Global Constraints

- Never create duplicate Trello cards for the same job (`dedupe_key = normalized_company + normalized_title + source_job_id`).
- Respect `HUMAN_APPROVAL_MODE = true`: New applications must be queued in "🔥 High Match" or "🟢 Ready to Apply" and must never be auto-submitted.
- Attach tailored resume PDF, cover letter PDF, LaTeX source, and original JD link directly to the card.
- Automatically construct the 11-step "Application Checklist" on every created card.

---

### Task 1: Trello Data Types & TrelloClient REST Service

**Files:**
- Create: `src/types/trello.ts`
- Create: `src/services/trello/trelloClient.ts`
- Test: `tests/trelloClient.test.ts`

**Interfaces:**
- Consumes: `TRELLO_API_KEY`, `TRELLO_TOKEN`, `TRELLO_BOARD_ID` from environment.
- Produces: `TrelloClient` with:
  - `getOrCreateBoard(boardName: string): Promise<TrelloBoard>`
  - `getLists(boardId: string): Promise<TrelloList[]>`
  - `createList(boardId: string, name: string): Promise<TrelloList>`
  - `createCard(listId: string, options: CreateCardOptions): Promise<TrelloCard>`
  - `createChecklist(cardId: string, name: string, items: string[]): Promise<TrelloChecklist>`
  - `addAttachment(cardId: string, filePath: string, name: string): Promise<TrelloAttachment>`
  - `addUrlAttachment(cardId: string, url: string, name: string): Promise<TrelloAttachment>`

- [ ] **Step 1: Write failing unit test for `TrelloClient` mock and API modes**
- [ ] **Step 2: Implement `src/types/trello.ts` and `src/services/trello/trelloClient.ts`**
- [ ] **Step 3: Run unit test and verify API contract**
- [ ] **Step 4: Git commit**

---

### Task 2: TrelloAgent with Schema Formatter & Checklist Engine

**Files:**
- Create: `src/services/trello/trelloAgent.ts`
- Test: `tests/trelloAgent.test.ts`

**Interfaces:**
- Consumes: `ParsedJobDescription`, `MatchResult`, `PipelinePackageResult`.
- Produces: `TrelloCardResult` containing card URL, card ID, list assigned ("🔥 High Match" if >=80%, "🟢 Ready to Apply" if 65-79%), labels assigned, checklist attached, and files linked.

- [ ] **Step 1: Write unit test validating card title `[Match %] Company | Role | Location` and structured description**
- [ ] **Step 2: Implement `TrelloAgent` with canonical board setup, label matching, description templating, and checklist initialization**
- [ ] **Step 3: Run unit test and verify card formatting and checklist items**
- [ ] **Step 4: Git commit**

---

### Task 3: Pipeline Integration & End-to-End Verification

**Files:**
- Modify: `src/services/orchestrator/phase1Pipeline.ts` (promote to full application orchestrator)
- Modify: `src/cli/runPhase1Demo.ts`
- Test: `tests/endToEndPhase2.test.ts`

**Interfaces:**
- Consumes: Raw JD.
- Produces: End-to-end package generation + automatic Trello card creation with attachments.

- [ ] **Step 1: Wire `TrelloAgent` into the orchestrator pipeline**
- [ ] **Step 2: Write end-to-end integration test verifying card creation and file attachment linkage**
- [ ] **Step 3: Run demo CLI and verify complete flow**
- [ ] **Step 4: Review and git commit**
