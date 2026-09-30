# Phase 1: Core AI Job Application Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify the complete Phase 1 pipeline for JPilot: Paste Job JD → Analyze JD → Match Score → Retrieve Relevant Candidate Experience → Tailor Resume → Truth Validation → Generate LaTeX → Compile Resume PDF → Generate Tailored Cover Letter → Final Application Package.

**Architecture:** TypeScript-first architecture with modular domain agents, strict fact-id linkage to Sana Liaqat's Candidate Knowledge Base, multi-tier LaTeX & PDF generation engine with automatic recovery, and strict Truth Validation gate.

**Tech Stack:** Node.js / TypeScript, Anthropic Claude SDK (@anthropic-ai/sdk), LaTeX compilation engine, file-based structured persistence under `/applications/{company}/{role}_{job_id}/`.

**Spec:** `docs/superpowers/specs/2026-09-30-jpilot-design.md`

## Global Constraints

- Never fabricate experience, employers, achievements, skills, certifications, dates, metrics, education, or technologies.
- The master resume at `/candidate/master_resume.tex` is strictly read-only and must never be modified or overwritten.
- Every generated bullet point and cover letter achievement must map to a valid `fact_id`.
- Unverified facts must be automatically pruned; contradictory claims must abort generation.
- The pipeline must handle both raw JD text and URLs.

---

### Task 1: Candidate Knowledge Base & Master Resume Storage

**Files:**
- Create: `candidate/candidate_profile.json`
- Create: `candidate/experience.json`
- Create: `candidate/projects.json`
- Create: `candidate/skills.json`
- Create: `candidate/master_resume.tex`
- Create: `src/types/candidate.ts`
- Create: `src/services/candidate/knowledgeBase.ts`
- Test: `tests/candidateKnowledgeBase.test.ts`

**Interfaces:**
- Consumes: Raw candidate profile details from spec.
- Produces: `CandidateKnowledgeBase` class with `getCandidateProfile()`, `getExperiences()`, `getProjects()`, `getSkills()`, `getFactById(factId: string): Fact | undefined`.

- [ ] **Step 1: Write candidate knowledge base data and type interfaces**
- [ ] **Step 2: Write unit test validating fact ID lookup and zero-hallucination fact catalog**
- [ ] **Step 3: Implement `CandidateKnowledgeBase` class**
- [ ] **Step 4: Create canonical `candidate/master_resume.tex`**
- [ ] **Step 5: Run tests and verify fact integrity**
- [ ] **Step 6: Git commit**

---

### Task 2: JD Intelligence & Location/Visa Analysis Agent

**Files:**
- Create: `src/types/job.ts`
- Create: `src/services/ai/claudeClient.ts`
- Create: `src/services/jd/jdIntelligenceAgent.ts`
- Create: `src/services/jd/locationVisaExtractor.ts`
- Test: `tests/jdIntelligence.test.ts`

**Interfaces:**
- Consumes: Raw JD text or extracted web content.
- Produces: `ParsedJobDescription` containing company, role, country, city, remote policy, work authorization category (`VISA_SPONSORED`, `REMOTE_CONTRACT_OPEN`, `LOCAL_AUTH_REQUIRED`, `UNSPECIFIED_NEEDS_CHECK`), must-haves, nice-to-haves, domain tags, tools, ATS keywords.

- [ ] **Step 1: Write failing test with a sample PM Job Description**
- [ ] **Step 2: Implement `ClaudeClient` with structured JSON output and fallback resilience**
- [ ] **Step 3: Implement `LocationVisaExtractor` and `JDIntelligenceAgent`**
- [ ] **Step 4: Run test to verify JD parsing and location/visa categorization**
- [ ] **Step 5: Git commit**

---

### Task 3: Weighted Semantic Matching Engine

**Files:**
- Create: `src/types/match.ts`
- Create: `src/services/matching/semanticMatcher.ts`
- Test: `tests/semanticMatcher.test.ts`

**Interfaces:**
- Consumes: `ParsedJobDescription` and `CandidateKnowledgeBase`.
- Produces: `MatchResult` with overall match percentage (0-100), breakdown (Role 25%, Exp 20%, Domain 15%, Skills 20%, Tools 10%, Location 5%, Preferred 5%), strong matches, partial matches, gaps, and risk flags.

- [ ] **Step 1: Write failing unit test verifying weighted score calculation against test vectors**
- [ ] **Step 2: Implement `SemanticMatcher` scoring algorithm and gap identification**
- [ ] **Step 3: Run test and verify score calculations**
- [ ] **Step 4: Git commit**

---

### Task 4: Resume Tailoring & Experience Bullet Ranker

**Files:**
- Create: `src/types/resume.ts`
- Create: `src/services/tailoring/bulletRanker.ts`
- Create: `src/services/tailoring/resumeTailoringAgent.ts`
- Test: `tests/resumeTailoring.test.ts`

**Interfaces:**
- Consumes: `ParsedJobDescription`, `MatchResult`, and `CandidateKnowledgeBase`.
- Produces: `TailoredResumeAST` containing tailored headline, summary, reordered bullet points with explicit `source_fact_ids`, prioritized projects, and ATS keywords.

- [ ] **Step 1: Write failing test verifying bullet ranking prioritizes FinTech/payments when JD requests payments**
- [ ] **Step 2: Implement `BulletRanker` and `ResumeTailoringAgent`**
- [ ] **Step 3: Verify that employer names, dates, degrees, and verified metrics remain 100% unaltered**
- [ ] **Step 4: Run test and verify AST generation**
- [ ] **Step 5: Git commit**

---

### Task 5: Strict Truth Validation Agent

**Files:**
- Create: `src/services/validation/truthValidationAgent.ts`
- Test: `tests/truthValidation.test.ts`

**Interfaces:**
- Consumes: `TailoredResumeAST` and `CandidateKnowledgeBase`.
- Produces: `TruthValidationReport` classifying every claim as `VERIFIED`, `SUPPORTED_REWRITE`, `UNVERIFIED`, or `CONTRADICTORY`. Prunes unverified claims and aborts on contradictory claims.

- [ ] **Step 1: Write test with intentional fake metric/tool to verify hard-rejection**
- [ ] **Step 2: Implement `TruthValidationAgent` claim extractor and verifier**
- [ ] **Step 3: Verify rejection of unverified facts and passage of verified facts**
- [ ] **Step 4: Git commit**

---

### Task 6: Multi-Tier LaTeX & PDF Compilation Engine

**Files:**
- Create: `src/services/validation/latexSyntaxValidator.ts`
- Create: `src/services/pdf/latexGenerator.ts`
- Create: `src/services/pdf/pdfCompiler.ts`
- Test: `tests/pdfCompiler.test.ts`

**Interfaces:**
- Consumes: Validated `TailoredResumeAST` and `/candidate/master_resume.tex`.
- Produces: `tailored_resume.tex` and compiled `tailored_resume.pdf` with validation (size, non-empty, page budget).

- [ ] **Step 1: Write LaTeX escaping & syntax validator test (special chars `&`, `%`, `$`, `#`, `_`)**
- [ ] **Step 2: Implement `LaTeXGenerator` template merger**
- [ ] **Step 3: Implement multi-tier `PDFCompiler` with automatic fallback and retry repair**
- [ ] **Step 4: Verify PDF generation produces readable, non-empty PDF**
- [ ] **Step 5: Git commit**

---

### Task 7: Tailored Cover Letter Generator

**Files:**
- Create: `src/services/coverletter/coverLetterAgent.ts`
- Test: `tests/coverLetter.test.ts`

**Interfaces:**
- Consumes: `ParsedJobDescription`, `MatchResult`, and `CandidateKnowledgeBase`.
- Produces: `cover_letter.md` and `cover_letter.pdf` (250–400 words, strictly grounded, 4-part structure).

- [ ] **Step 1: Write test validating cover letter structure and absence of hallucinated facts**
- [ ] **Step 2: Implement `CoverLetterAgent` and PDF formatter**
- [ ] **Step 3: Verify markdown and PDF outputs**
- [ ] **Step 4: Git commit**

---

### Task 8: End-to-End Orchestrator & CLI Verification Demo

**Files:**
- Create: `src/services/orchestrator/phase1Pipeline.ts`
- Create: `src/cli/runPhase1Demo.ts`
- Test: `tests/endToEndPhase1.test.ts`

**Interfaces:**
- Consumes: Raw JD or test file.
- Produces: Complete application package under `/applications/{company}/{role}_{job_id}/` containing `jd.txt`, `job.json`, `match_analysis.json`, `tailored_resume.tex`, `tailored_resume.pdf`, `cover_letter.md`, `cover_letter.pdf`, `application_metadata.json`.

- [ ] **Step 1: Implement `Phase1Pipeline` orchestrator linking all agents**
- [ ] **Step 2: Build CLI demonstration runner with real-time logging and audit summary**
- [ ] **Step 3: Run end-to-end test on a real Senior/Staff Product Manager Job Description**
- [ ] **Step 4: Inspect generated LaTeX, PDF, cover letter, match analysis, and audit files**
- [ ] **Step 5: Final review and commit**
