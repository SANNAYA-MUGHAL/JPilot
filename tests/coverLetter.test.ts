import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CoverLetterAgent } from '../src/services/coverletter/coverLetterAgent.js';
import { CandidateKnowledgeBase } from '../src/services/candidate/knowledgeBase.js';
import type { ParsedJobDescription } from '../src/types/job.js';
import type { MatchResult } from '../src/types/match.js';

test('CoverLetterAgent generates structured markdown and PDF', async () => {
  const kb = new CandidateKnowledgeBase();
  const agent = new CoverLetterAgent(kb);

  const mockJd: ParsedJobDescription = {
    job_id: 'JD_TEST_CL',
    title: 'Senior Product Manager - Payments',
    company: 'FinTech Leaders Ltd',
    location: 'London, UK',
    country: 'United Kingdom',
    remote_policy: 'HYBRID',
    visa_status: 'VISA_SPONSORED',
    visa_reasoning: 'Sponsorship provided',
    employment_type: 'Full-time',
    must_have_skills: ['Payments', 'Adyen', 'Split Payments'],
    nice_to_have_skills: ['SQL'],
    responsibilities: ['Scale checkout APIs', 'Reduce payment transaction drop-offs'],
    domains: ['FinTech', 'Payments'],
    tools: ['Mixpanel', 'Jira'],
    technologies_and_apis: ['Adyen', 'REST APIs'],
    ats_keywords: ['Payments', 'Adyen', 'Split Payments'],
    raw_text: 'FinTech PM role',
    discovered_at: new Date().toISOString(),
  };

  const mockMatch: MatchResult = {
    overall_score: 90,
    tier: 'HIGH_ALIGNMENT',
    breakdown: {
      role_score: 100,
      experience_score: 100,
      skills_score: 95,
      domain_score: 95,
      tools_score: 90,
      location_score: 90,
      preferred_score: 80,
    },
    strong_matches: ['Payments', 'Adyen'],
    partial_matches: [],
    missing_mandatory: [],
    missing_preferred: [],
    application_risks: [],
    recommendation: 'Apply',
  };

  const outputDir = path.resolve(process.cwd(), 'tests/tmp_cover_letter');
  const result = await agent.generateCoverLetter(mockJd, mockMatch, outputDir);

  assert.ok(result.word_count >= 200 && result.word_count <= 450, `Word count: ${result.word_count}`);
  assert.ok(fs.existsSync(result.pdf_path));
  assert.ok(fs.existsSync(path.join(outputDir, 'cover_letter.md')));

  const mdContent = fs.readFileSync(path.join(outputDir, 'cover_letter.md'), 'utf8');
  assert.ok(mdContent.includes('Sana Liaqat'));
  assert.ok(mdContent.includes('FinTech Leaders Ltd'));
  assert.ok(mdContent.includes('Senior Product Manager - Payments'));

  const pdfHeader = fs.readFileSync(result.pdf_path).subarray(0, 5).toString();
  assert.equal(pdfHeader, '%PDF-');

  // Clean up
  fs.rmSync(outputDir, { recursive: true, force: true });
});
