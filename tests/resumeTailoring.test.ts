import test from 'node:test';
import assert from 'node:assert/strict';
import { ResumeTailoringAgent } from '../src/services/tailoring/resumeTailoringAgent.js';
import { CandidateKnowledgeBase } from '../src/services/candidate/knowledgeBase.js';
import type { ParsedJobDescription } from '../src/types/job.js';
import type { MatchResult } from '../src/types/match.js';

test('ResumeTailoringAgent reorders bullets and retains fact IDs', async () => {
  const kb = new CandidateKnowledgeBase();
  const agent = new ResumeTailoringAgent(kb);

  const mockJd: ParsedJobDescription = {
    job_id: 'JD_PAYMENTS_01',
    title: 'Senior Product Manager - Payments & Checkout',
    company: 'Stripe Rival',
    location: 'London, UK',
    country: 'United Kingdom',
    remote_policy: 'HYBRID',
    visa_status: 'VISA_SPONSORED',
    visa_reasoning: 'Sponsorship provided',
    employment_type: 'Full-time',
    must_have_skills: ['Payments', 'Adyen', 'MangoPay', 'Split Payments'],
    nice_to_have_skills: ['SQL'],
    responsibilities: ['Own multi-currency gateway routing', 'Integrate Adyen and checkout APIs'],
    domains: ['FinTech', 'Payments'],
    tools: ['Postman', 'Mixpanel'],
    technologies_and_apis: ['Adyen', 'MangoPay', 'Split Payments'],
    ats_keywords: ['Adyen', 'MangoPay', 'Payments', 'Split Payments'],
    raw_text: 'Payments PM role requiring Adyen and MangoPay integration.',
    discovered_at: new Date().toISOString(),
  };

  const mockMatch: MatchResult = {
    overall_score: 92,
    tier: 'HIGH_ALIGNMENT',
    breakdown: {
      role_score: 100,
      experience_score: 100,
      skills_score: 100,
      domain_score: 100,
      tools_score: 90,
      location_score: 100,
      preferred_score: 80,
    },
    strong_matches: ['Payments', 'Adyen'],
    partial_matches: [],
    missing_mandatory: [],
    missing_preferred: [],
    application_risks: [],
    recommendation: 'Immediate apply',
  };

  const ast = await agent.tailorResume(mockJd, mockMatch);

  // Verify headline reflects FinTech
  assert.ok(ast.headline.includes('Senior Product Manager'));

  // Verify employers and dates are strictly preserved
  const bayutExp = ast.experiences.find((e) => e.company.includes('Bayut'));
  assert.ok(bayutExp);
  assert.equal(bayutExp.role, 'Product Manager');

  // Verify top bullet for Bayut is the Split Payments/Adyen bullet (BAYUT_ACHIEVE_01)
  const topBullet = bayutExp.bullets[0];
  assert.ok(topBullet.source_fact_ids.includes('BAYUT_ACHIEVE_01'));
  assert.ok(topBullet.generated_text.includes('split payments') || topBullet.generated_text.includes('Adyen'));
  assert.equal(topBullet.action_type, 'EMPHASIZED');

  // Verify top project is PRJ_MANGOPAY_SPLIT
  assert.equal(ast.projects[0].project_id, 'PRJ_MANGOPAY_SPLIT');
  assert.ok(ast.projects[0].bullets[0].source_fact_ids.includes('PRJ_MANGOPAY_SPLIT'));
});
