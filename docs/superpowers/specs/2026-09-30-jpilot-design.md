# Design Specification: JPilot — AI Job Application & Resume Tailoring Agent

**Date:** 2026-09-30  
**Status:** Approved  
**Candidate:** Sana Liaqat (Senior Product Manager, 7+ Years Experience)  
**System Architecture:** Next.js (App Router) + TypeScript + Prisma (SQLite / PostgreSQL) + Anthropic Claude (Sonnet 3.5) + LaTeX Engine

---

## 1. Executive Summary & Core Objective

JPilot is a production-grade, highly automated AI job application operations system. It discovers target opportunities, extracts and analyzes job descriptions, strictly checks eligibility and visa/remote authorization constraints, scores candidate-JD fit using semantic matching, tailors a canonical master LaTeX resume without inventing facts, executes multi-tier PDF compilation with fallback repair, crafts targeted cover letters, creates structured Trello cards, and presents a rich multi-tab operations dashboard.

### Core Cardinal Rule (Zero Hallucination Guarantee)
The system operates under a strict non-negotiable rule:
> **Zero Fabrication Policy**: The system must NEVER invent employers, job dates, degrees, certifications, metrics, team sizes, tools, or ownership. Every tailored bullet point, summary statement, and cover letter claim must resolve to a verified `fact_id` in the master candidate knowledge base. Unverified claims are stripped; contradictory claims trigger a hard pipeline stop.

---

## 2. System Architecture & Components

```mermaid
flowchart TD
    subgraph Data Layer
        KB["Candidate Knowledge Base\n(/candidate/*.json)"]
        MasterTeX["Master LaTeX Template\n(/candidate/master_resume.tex)"]
        DB[(Prisma ORM / SQLite)]
        AppStore["Application Storage\n(/applications/{company}/{role}_{id}/)"]
    end

    subgraph Agent Pipeline (Phase 1)
        Input["Paste JD / Job URL"] --> Discover["Normalization & Deduplication"]
        Discover --> HardFilter["Eligibility & Seniority Filter"]
        HardFilter --> LocationVisa["Location, Country & Visa Intelligence"]
        LocationVisa --> JDAgent["JD Intelligence Agent (Claude 3.5)"]
        JDAgent --> SemanticMatch["Weighted Matching Engine"]
        SemanticMatch --> TailorAgent["Resume Tailoring Agent"]
        TailorAgent --> TruthAgent{"Truth Validation Agent\n(Zero-Hallucination Gate)"}
        TruthAgent -- Verified --> LaTeXGen["LaTeX Generator & Escaper"]
        TruthAgent -- Unverified --> CanonicalFallback["Fallback to Canonical Fact"]
        TruthAgent -- Contradictory --> AlertHalt["Abort & Log Alert"]
        LaTeXGen --> PDFGen["Multi-Tier PDF Compiler\n(Local / Cloud / Headless)"]
        TruthAgent -- Verified --> CoverAgent["Cover Letter Generator"]
        CoverAgent --> CoverPDF["Cover Letter PDF Compiler"]
    end

    subgraph Trello & Tracking (Phase 2)
        PDFGen --> TrelloAgent["Trello Board Agent\n(Cards, Labels, Checklists, Attachments)"]
        CoverPDF --> TrelloAgent
    end

    subgraph Operations Dashboard
        DB --> DashboardUI["Next.js Operations Dashboard"]
        AppStore --> DashboardUI
    end
```

---

## 3. Data Models & Schemas

### 3.1 Candidate Knowledge Base (`/candidate/`)
* `candidate_profile.json`:
  * Personal info: Sana Liaqat, contact, social links, current locations.
  * Positioning: Product Manager with 7+ years of experience across Product Management, QA, Technical Support, Project Management, SaaS, FinTech, PropTech, marketplaces, eCommerce, payments, integrations, analytics, and product operations.
  * Target Titles: Product Manager, Technical Product Manager, Associate Product Manager, Product Operations Manager, Product Owner, Platform Product Manager, FinTech Product Manager, SaaS Product Manager, AI Product Manager, Project Manager (Secondary: QA Lead, Senior QA, Technical Project Manager).
  * Geographies: Remote Worldwide, Europe, UK, UAE, France, Luxembourg, Germany, Netherlands, Relocation supported.
  * Work Authorizations & Visas: Tracks current visas, willingness to relocate with sponsorship, and openness to B2B/EOR remote contracts.
* `experience.json`:
  * Employment records with verified IDs (`EXP_01`, `EXP_02`, etc.): company, role, dates, location, responsibilities, quantified achievements, integrations (Adyen, MangoPay, Split Payments, Tabby, Wallet orchestration), tools (Mixpanel, New Relic, CleverTap, Mezmo, Jira, Confluence), verified metrics (e.g. 23% cancellation reduction, delivery slot optimization).
* `projects.json`:
  * Fact-indexed projects (`PRJ_01`, etc.) containing problem, discovery, candidate role, actions, technical context, stakeholders, tools, and verified results.
* `skills.json`:
  * Categorized skills: Product Strategy, APIs & Integrations, Payments & FinTech, Analytics & Experimentation, Quality & Testing, Methodologies (Scrum, Kanban, Agile).
* `master_resume.tex`:
  * Canonical, beautiful LaTeX template that remains strictly read-only.

### 3.2 Database Schema (Prisma)
* `Job`: `id`, `company`, `role`, `location`, `country`, `remote_type`, `visa_status`, `raw_jd`, `parsed_jd`, `status`, `dedupe_key`, `created_at`.
* `JobMatch`: `id`, `job_id`, `overall_score`, `role_score`, `skill_score`, `domain_score`, `experience_score`, `location_score`, `strengths`, `gaps`, `risks`.
* `Application`: `id`, `job_id`, `status` (`DRAFT`, `ANALYZED`, `READY_TO_APPLY`, `APPLIED`, `INTERVIEW`, `REJECTED`, `OFFER`), `resume_tex_path`, `resume_pdf_path`, `cover_letter_md_path`, `cover_letter_pdf_path`, `trello_card_id`, `applied_at`.
* `FactAudit`: `id`, `application_id`, `bullet_text`, `fact_ids`, `verification_status` (`VERIFIED`, `SUPPORTED_REWRITE`).
* `AgentRun`: `id`, `run_number`, `jobs_discovered`, `jobs_processed`, `jobs_matched`, `packages_generated`, `errors`, `started_at`, `completed_at`.

---

## 4. Pipeline Agent Specifications

### 4.1 JD Intelligence Agent (Claude 3.5 Sonnet)
Extracts structured JSON:
* Company, role title, primary country, city, remote policy (Global, EU-only, UK-only, US-only, On-site).
* Visa/Work Authorization Classification:
  * `VISA_SPONSORED`: Relocation/visa offered.
  * `REMOTE_CONTRACT_OPEN`: Open to global B2B/EOR contracting.
  * `LOCAL_AUTH_REQUIRED`: Explicit local citizenship or permanent right-to-work required.
  * `UNSPECIFIED_NEEDS_CHECK`: Flagged for candidate inspection.
* Must-have vs nice-to-have requirements, domain knowledge, product methodologies, tools, platform integrations, APIs, and key ATS keywords.

### 4.2 Semantic Matching Engine
Calculates weighted match score:
* **Core Role Alignment (25%)**
* **Relevant Experience (20%)**
* **Mandatory Skills (20%)**
* **Domain Alignment (15%)** (FinTech, SaaS, PropTech, eCommerce, Marketplaces)
* **Tools & Technical Alignment (10%)**
* **Location & Work Authorization (5%)**
* **Preferred Qualifications (5%)**

Tiers:
* **80%–100%**: High Alignment (Immediate full package generation)
* **65%–79%**: Good Alignment (Package generation recommended)
* **50%–64%**: Review (Requires human review before package generation)
* **<50%**: Low Match (Logged and skipped unless overridden)

### 4.3 Resume Tailoring Agent
* Reorders and re-prioritizes candidate experience bullets and projects based on semantic relevance to JD priorities.
* Tailors professional headline and executive summary to echo JD focus without inventing skills.
* Reorders core competencies and ATS terminology truthfully.
* Strict Preservation: Never changes company names, employment dates, degrees, institutions, or verified metrics.

### 4.4 Truth Validation Agent (Mandatory Hard Gate)
* Parses every generated bullet point into individual factual assertions.
* Cross-references claims against `candidate_profile.json`, `experience.json`, and `projects.json`.
* Verdicts:
  * `VERIFIED`: Exact factual backing in knowledge base.
  * `SUPPORTED_REWRITE`: Truthful reframing using JD nomenclature without adding unbacked features/skills.
  * `UNVERIFIED`: Stripped immediately and replaced with canonical knowledge base bullet.
  * `CONTRADICTORY`: Halts package creation with error log.

### 4.5 Multi-Tier LaTeX & PDF Compilation Engine
1. **LaTeX Sanitization**: Auto-escapes reserved characters (`&`, `%`, `$`, `#`, `_`, `{`, `}`), verifies balanced braces, and ensures valid typography commands.
2. **Compiler Strategy**:
   * *Tier 1 (Host TeX)*: Invokes `pdflatex` or `latexmk` if available.
   * *Tier 2 (Cloud / Overleaf API)*: Compiles via configured remote LaTeX endpoint.
   * *Tier 3 (Zero-Fail Headless PDF Fallback)*: High-fidelity typographically matched headless PDF compiler ensuring a clean, validated PDF is guaranteed under any environment.
3. **PDF Validator**: Confirms file generation, file size > 5KB, target page budget (1–2 pages), valid PDF header (`%PDF-`), and non-empty pages. Up to 3 auto-repair retries on error.

### 4.6 Cover Letter Agent
* 250–400 words, four-part structure:
  1. Compelling opening focused on company and role context.
  2. 2–3 strongest verified evidence points from Sana's background.
  3. Direct connection between verified experience and key JD challenges.
  4. Confident, concise call-to-action.
* Outputs both `cover_letter.md` and compiled `cover_letter.pdf`.

---

## 5. Storage Structure per Job Application

Each analyzed job is persisted into an auditable file hierarchy:
```
/applications/{company}/{role}_{job_id}/
├── jd.txt
├── job.json
├── match_analysis.json
├── tailored_resume.tex
├── tailored_resume.pdf
├── cover_letter.md
├── cover_letter.pdf
└── application_metadata.json
```

---

## 6. UI & Operations Dashboard

Built with Next.js App Router, Tailwind CSS, Lucide icons, and React components:
* **Real-time Pipeline Runner**: Direct paste input for Job Description text or URL with live streaming progress indicators through each agent stage.
* **Multi-Tab Job Inspector**:
  * **Overview**: Role, company, location, country, remote status, visa category, posted date, source URL, salary, action buttons.
  * **JD Analysis**: Requirements breakdown (must-haves vs nice-to-haves), ATS keywords, platform integrations, tools.
  * **Match Analysis**: Visual score breakdown (Role, Exp, Domain, Skills, Tools, Location), strong matches, partial matches, gaps, and risks.
  * **Resume Diff & Explainability**: Side-by-side diff highlighting **ADDED/EMPHASIZED**, **REORDERED**, **REWRITTEN**, and **REMOVED** bullets with linked `source_fact_id`s.
  * **Cover Letter**: Live formatted preview with markdown editing and PDF recompile.
  * **History & Audit**: Step-by-step audit logs with timestamps and truth validation proofs.
* **Skill Gap Intelligence**: Aggregate dashboard of market trends across processed jobs compared to candidate competencies.
* **Settings**: Configurable target roles, excluded titles, minimum match thresholds, country preferences, work authorization status, and Trello board configuration.

---

## 7. Phase Implementation Roadmap

* **Phase 1 (MVP First Demo - Current Focus)**:
  * Master Candidate Knowledge Base for Sana Liaqat
  * Master LaTeX resume template
  * Manual JD/URL input
  * Claude-powered JD intelligence & location/visa classification
  * Weighted semantic matching
  * Traceable resume tailoring & truth validation
  * Multi-tier LaTeX to PDF compilation
  * Custom cover letter generation (MD + PDF)
  * End-to-end verification with a real Product Manager JD
* **Phase 2**:
  * Trello board integration (Card creation, labels, checklists, PDF attachments)
* **Phase 3**:
  * Job discovery adapters, deduplication, and scheduler
* **Phase 4**:
  * Advanced analytics, daily digest, and skill intelligence
* **Phase 5**:
  * Human-in-the-loop application submission assistance
