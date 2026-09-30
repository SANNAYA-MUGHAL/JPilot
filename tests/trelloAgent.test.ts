import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { TrelloAgent } from '../src/services/trello/trelloAgent.js';
import { TrelloClient } from '../src/services/trello/trelloClient.js';
import type { ParsedJobDescription } from '../src/types/job.js';
import type { MatchResult } from '../src/types/match.js';
import type { PipelinePackageResult } from '../src/services/orchestrator/phase1Pipeline.js';

test('TrelloAgent formats card title, structured description, checklist, and attachments', async () => {
  const client = new TrelloClient();
  const agent = new TrelloAgent(client);

  const mockJd: ParsedJobDescription = {
    job_id: 'JOB_TRELLO_TEST',
    title: 'Senior Product Manager',
    company: 'Monzo',
    location: 'London, UK',
    country: 'United Kingdom',
    remote_policy: 'HYBRID',
    visa_status: 'VISA_SPONSORED',
    visa_reasoning: 'Relocation provided',
    employment_type: 'Full-time',
    must_have_skills: ['Payments', 'Adyen', 'Agile'],
    nice_to_have_skills: ['SQL'],
    responsibilities: ['Lead squad'],
    domains: ['FinTech'],
    tools: ['Jira', 'Mixpanel'],
    technologies_and_apis: ['REST APIs'],
    ats_keywords: ['Payments', 'Adyen'],
    raw_text: 'JD text',
    discovered_at: new Date().toISOString(),
  };

  const mockMatch: MatchResult = {
    overall_score: 88,
    tier: 'HIGH_ALIGNMENT',
    breakdown: {
      role_score: 100,
      experience_score: 100,
      skills_score: 90,
      domain_score: 90,
      tools_score: 90,
      location_score: 100,
      preferred_score: 80,
    },
    strong_matches: ['Core Product Manager match', 'FinTech domain experience'],
    partial_matches: [],
    missing_mandatory: [],
    missing_preferred: [],
    application_risks: [],
    recommendation: 'Ready to apply',
  };

  // Create temporary mock files to attach
  const tmpDir = path.resolve(process.cwd(), 'tests/tmp_trello_agent');
  fs.mkdirSync(tmpDir, { recursive: true });

  const mockPdf = path.join(tmpDir, 'tailored_resume.pdf');
  const mockTex = path.join(tmpDir, 'tailored_resume.tex');
  const mockClPdf = path.join(tmpDir, 'cover_letter.pdf');
  const mockClMd = path.join(tmpDir, 'cover_letter.md');
  const mockJdTxt = path.join(tmpDir, 'jd.txt');

  fs.writeFileSync(mockPdf, '%PDF-1.4 mock content');
  fs.writeFileSync(mockTex, '\\begin{document} mock \\end{document}');
  fs.writeFileSync(mockClPdf, '%PDF-1.4 cover letter');
  fs.writeFileSync(mockClMd, '# Cover Letter');
  fs.writeFileSync(mockJdTxt, 'Job Description');

  const mockPkg: PipelinePackageResult = {
    job_id: mockJd.job_id,
    company: mockJd.company,
    role: mockJd.title,
    match: mockMatch,
    truth_validation: {
      overall_passed: true,
      total_claims: 10,
      verified_count: 8,
      supported_rewrites: 2,
      unverified_count: 0,
      contradictory_count: 0,
      bullet_reports: [],
      sanitized_ast: {} as any,
    },
    package_dir: tmpDir,
    files: {
      jd_txt: mockJdTxt,
      job_json: '',
      match_analysis_json: '',
      tailored_resume_tex: mockTex,
      tailored_resume_pdf: mockPdf,
      cover_letter_md: mockClMd,
      cover_letter_pdf: mockClPdf,
      application_metadata_json: '',
    },
    compilation: {
      success: true,
      compiler_used: 'headless_engine',
      file_path: mockPdf,
      file_size_bytes: 8000,
      retries_used: 0,
    },
    cover_letter: {
      markdown_text: 'Letter',
      word_count: 280,
      pdf_path: mockClPdf,
      evidence_used: ['Engineered split payments reducing drop-offs by 18%'],
    },
    timing_ms: 120,
  };

  const trelloRes = await agent.createApplicationCard(mockJd, mockMatch, mockPkg);

  assert.equal(trelloRes.card_title, '[88%] Monzo | Senior Product Manager | London, UK');
  assert.equal(trelloRes.list_name, '🔥 High Match');
  assert.ok(trelloRes.card_id);
  assert.ok(trelloRes.card_url);
  assert.equal(trelloRes.attachments_count, 3); // Resume PDF, Cover Letter PDF, Resume LaTeX

  // Inspect Card Details in Mock Store
  const card = client.getMockCard(trelloRes.card_id);
  assert.ok(card);
  assert.ok(card.desc.includes('ROLE'));
  assert.ok(card.desc.includes('MATCH'));
  assert.ok(card.desc.includes('WHY IT MATCHES'));
  assert.ok(card.desc.includes('STATUS'));

  // Inspect Checklist
  const checklists = client.getMockChecklists(trelloRes.card_id);
  assert.equal(checklists.length, 1);
  assert.equal(checklists[0].name, 'Application Checklist');
  assert.equal(checklists[0].checkItems.length, 11);
  assert.equal(checklists[0].checkItems[0].name, 'Review tailored resume');
  assert.equal(checklists[0].checkItems[5].name, 'Submit application');

  // Inspect Attachments
  const attachments = client.getMockAttachments(trelloRes.card_id);
  assert.equal(attachments.length, 3);
  assert.ok(attachments.some((a) => a.name === 'tailored_resume.pdf'));
  assert.ok(attachments.some((a) => a.name === 'cover_letter.pdf'));
  assert.ok(attachments.some((a) => a.name === 'tailored_resume.tex'));

  // Clean up
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
