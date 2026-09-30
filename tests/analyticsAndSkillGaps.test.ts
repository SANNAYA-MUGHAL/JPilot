import test from 'node:test';
import assert from 'node:assert/strict';
import { SkillGapIntelligence } from '../src/services/analytics/skillGapIntelligence.js';
import { CandidateKnowledgeBase } from '../src/services/candidate/knowledgeBase.js';
import type { ParsedJobDescription } from '../src/types/job.js';
import type { MatchResult } from '../src/types/match.js';

test('SkillGapIntelligence distinguishes underemphasized skills from genuinely missing skills', () => {
  const kb = new CandidateKnowledgeBase();
  const intel = new SkillGapIntelligence(kb);

  const mockJd: ParsedJobDescription = {
    job_id: 'JOB_01',
    title: 'Senior Product Manager',
    company: 'FinTech Corp',
    location: 'London, UK',
    country: 'United Kingdom',
    remote_policy: 'REMOTE_WORLDWIDE',
    visa_status: 'VISA_SPONSORED',
    visa_reasoning: 'Sponsorship provided',
    employment_type: 'Full-time',
    must_have_skills: ['Payments', 'SQL', 'Solidity Smart Contracts'],
    nice_to_have_skills: ['Jira'],
    responsibilities: [],
    domains: ['FinTech'],
    tools: ['SQL', 'Jira'],
    technologies_and_apis: [],
    ats_keywords: [],
    raw_text: '',
    discovered_at: new Date().toISOString(),
  };

  const mockMatch: MatchResult = {
    overall_score: 85,
    tier: 'HIGH_ALIGNMENT',
    breakdown: {} as any,
    strong_matches: ['Payments'],
    partial_matches: [],
    // SQL is in candidate records (underemphasized), Solidity is NOT in records (genuinely lacking)
    missing_mandatory: ['SQL', 'Solidity Smart Contracts'],
    missing_preferred: [],
    application_risks: [],
    recommendation: '',
  };

  const report = intel.analyzeSkillGaps([{ parsedJd: mockJd, match: mockMatch }]);

  assert.equal(report.total_jobs_analyzed, 1);
  assert.ok(report.underemphasized_skills.some((s) => s.skill === 'SQL'));
  assert.equal(report.underemphasized_skills.find((s) => s.skill === 'SQL')?.classification, 'UNDER_EMPHASIZED');

  assert.ok(report.genuinely_lacking_skills.some((s) => s.skill === 'Solidity Smart Contracts'));
  assert.equal(report.genuinely_lacking_skills.find((s) => s.skill === 'Solidity Smart Contracts')?.classification, 'GENUINELY_LACKING');
});
