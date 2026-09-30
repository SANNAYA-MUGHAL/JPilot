# Phase 5: Human-Approved Application Assistance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement safe, human-supervised application assistance ensuring zero automated mass submissions, strict stopping on sensitive/unknown questions, verified submission confirmation, and automatic Trello card state transitions to "📤 Applied".

**Architecture:** An `ApplicationAssistant` requiring explicit `approveApplication()` and `executeAssistedApply()` calls. It automatically pre-fills standard candidate profile fields, uploads the tailored resume and cover letter, halts on sensitive/unapproved questions (salary expectation, security clearance, demographic questions), logs submission confirmations, and moves the corresponding Trello card to "📤 Applied".

**Tech Stack:** TypeScript / Node.js, Candidate Knowledge Base mapping, Trello status updater.

**Spec:** `docs/superpowers/specs/2026-09-30-jpilot-design.md` (Sections 24 & 25)

## Global Constraints

- Initial version MUST strictly operate in `HUMAN_APPROVAL_MODE = true`.
- Never submit an application without explicit human approval.
- Never invent answers to salary expectations, visa sponsorship commitments, demographic questions, security clearance, or notice periods.
- The Application Checklist on Trello must only mark "Submit application" complete when submission is explicitly confirmed.

---

### Task 1: Submission Types & ApplicationAssistant

**Files:**
- Create: `src/types/submission.ts`
- Create: `src/services/submission/applicationAssistant.ts`
- Test: `tests/applicationAssistant.test.ts`

- [ ] **Step 1: Write unit test validating sensitive question blocking, human approval gate, and submission confirmation**
- [ ] **Step 2: Implement `src/types/submission.ts` and `ApplicationAssistant`**
- [ ] **Step 3: Run unit test and verify Trello list update to '📤 Applied'**
- [ ] **Step 4: Git commit**
