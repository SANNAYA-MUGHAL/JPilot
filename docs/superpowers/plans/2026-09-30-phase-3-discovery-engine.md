# Phase 3: Job Discovery Engine, Deduplication & Scheduler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modular, multi-source job discovery engine with rate-limited adapters, hard eligibility filtering, composite & fuzzy deduplication, and automated scheduled execution.

**Architecture:** An extensible `JobSourceAdapter` interface permitting plug-and-play sources (Greenhouse ATS, Lever ATS, Remote Job Board APIs), a `DeduplicationAgent` generating composite deduplication keys (`normalized_company + normalized_title + source_job_id`) and fuzzy matching, an `EligibilityFilter` enforcing candidate parameters before costly processing, and a `JobScheduler` supporting 6-hour, daily, and manual trigger modes.

**Tech Stack:** TypeScript / Node.js, SQLite/JSON discovery registry, rate-limited HTTP fetchers.

**Spec:** `docs/superpowers/specs/2026-09-30-jpilot-design.md` (Sections 5, 6, 7, 34, 35, 38)

## Global Constraints

- Prefer jobs posted within the last 7 days (prioritize last 24h, last 3d).
- Never re-process duplicate jobs or generate duplicate Trello cards.
- Respect rate limiting with exponential backoff and never bypass anti-bot/CAPTCHAs.
- Isolate job-level failures: a failure on one job must NEVER abort processing of the remaining batch.

---

### Task 1: Job Discovery Types & Source Adapters

**Files:**
- Create: `src/types/discovery.ts`
- Create: `src/services/discovery/jobSourceAdapter.ts`
- Create: `src/services/discovery/adapters/remoteJobAdapter.ts`
- Create: `src/services/discovery/adapters/greenhouseAdapter.ts`
- Test: `tests/jobSourceAdapters.test.ts`

- [ ] **Step 1: Write unit test validating adapter interface and normalization**
- [ ] **Step 2: Implement `src/types/discovery.ts` and `JobSourceAdapter` interface**
- [ ] **Step 3: Implement `RemoteJobAdapter` and `GreenhouseAdapter`**
- [ ] **Step 4: Run unit test and verify normalized job output**
- [ ] **Step 5: Git commit**

---

### Task 2: Deduplication Agent & Eligibility Filter

**Files:**
- Create: `src/services/discovery/deduplicationAgent.ts`
- Create: `src/services/discovery/eligibilityFilter.ts`
- Test: `tests/deduplicationAndEligibility.test.ts`

- [ ] **Step 1: Write unit test validating composite key, fuzzy duplicate detection, and eligibility filtering**
- [ ] **Step 2: Implement `DeduplicationAgent` with persistence registry and fuzzy similarity**
- [ ] **Step 3: Implement `EligibilityFilter` (internship pruning, language check, irrelevant role check)**
- [ ] **Step 4: Run unit test and verify duplicate rejection**
- [ ] **Step 5: Git commit**

---

### Task 3: Discovery Engine & Scheduler

**Files:**
- Create: `src/services/discovery/jobDiscoveryEngine.ts`
- Create: `src/services/scheduler/jobScheduler.ts`
- Test: `tests/discoveryEngine.test.ts`

- [ ] **Step 1: Write integration test for discovery engine batch processing and error isolation**
- [ ] **Step 2: Implement `JobDiscoveryEngine` and `JobScheduler`**
- [ ] **Step 3: Verify scheduled execution and registry persistence**
- [ ] **Step 4: Git commit**
