# Phase 4: Operations Dashboard, Analytics, Skill Gap Intelligence & Daily Digest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build operations analytics, skill gap intelligence, resume diff explainability (`ADDED/EMPHASIZED`, `REORDERED`, `REWRITTEN`, `REMOVED`), daily digest generation, and settings management for JPilot.

**Architecture:** An `AnalyticsService` indexing persisted applications under `/applications/`, a `SkillGapIntelligence` service categorizing missing skills into "Candidate has but under-emphasized" vs "Genuinely lacks", a `DailyDigestGenerator` formatting executive email/CLI digests with Trello links, and a `DashboardService` modeling the multi-tab Job Details view.

**Tech Stack:** TypeScript / Node.js, file-system storage reader, Markdown digest generator.

**Spec:** `docs/superpowers/specs/2026-09-30-jpilot-design.md` (Sections 26, 27, 28, 29, 37, 39)

## Global Constraints

- Provide clear resume diff explainability explaining WHY each change was made (`ADDED/EMPHASIZED`, `REORDERED`, `REWRITTEN`, `REMOVED`) linked to `source_fact_ids`.
- In skill gap intelligence, clearly delineate between candidate's existing underemphasized skills vs genuinely missing competencies.
- Daily digest must aggregate discovered, processed, skipped, high-match opportunities, and Trello card URLs.

---

### Task 1: Analytics & Skill Gap Intelligence Engine

**Files:**
- Create: `src/types/analytics.ts`
- Create: `src/services/analytics/analyticsService.ts`
- Create: `src/services/analytics/skillGapIntelligence.ts`
- Test: `tests/analyticsAndSkillGaps.test.ts`

- [ ] **Step 1: Write unit test validating analytics aggregation and skill gap categorization**
- [ ] **Step 2: Implement `src/types/analytics.ts`, `AnalyticsService`, and `SkillGapIntelligence`**
- [ ] **Step 3: Run unit test and verify metric calculations**
- [ ] **Step 4: Git commit**

---

### Task 2: Daily Digest & Resume Diff Explainability

**Files:**
- Create: `src/services/digest/dailyDigestGenerator.ts`
- Create: `src/services/dashboard/dashboardService.ts`
- Create: `src/services/settings/settingsManager.ts`
- Test: `tests/dashboardAndDigest.test.ts`

- [ ] **Step 1: Write unit test validating daily digest report layout and resume change explainability AST diffing**
- [ ] **Step 2: Implement `DailyDigestGenerator`, `DashboardService`, and `SettingsManager`**
- [ ] **Step 3: Run unit test and verify digest formatting**
- [ ] **Step 4: Git commit**

---

### Task 3: Operations Dashboard Verification & End-to-End Test

**Files:**
- Create: `src/cli/runDashboardDemo.ts`
- Test: `tests/endToEndPhase4.test.ts`

- [ ] **Step 1: Build dashboard CLI demo showing metrics, daily digest, and job details tabs**
- [ ] **Step 2: Run end-to-end integration test verifying complete Phase 4 functionality**
- [ ] **Step 3: Review and git commit**
