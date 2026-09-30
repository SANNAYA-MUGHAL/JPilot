import test from 'node:test';
import assert from 'node:assert/strict';
import { TruthValidationAgent } from '../src/services/validation/truthValidationAgent.js';
import { CandidateKnowledgeBase } from '../src/services/candidate/knowledgeBase.js';
import type { TailoredResumeAST } from '../src/types/resume.js';

test('TruthValidationAgent passes verified candidate bullets', () => {
  const kb = new CandidateKnowledgeBase();
  const validator = new TruthValidationAgent(kb);

  const validAST: TailoredResumeAST = {
    headline: 'Senior Product Manager',
    summary: kb.getCandidateProfile().professional_summary,
    competencies: {
      product_strategy: 'Roadmapping, Scrum',
      fintech_payments: 'Adyen, Split Payments',
      technical_integrations: 'APIs, Webhooks',
      analytics_tools: 'Mixpanel, Jira',
    },
    experiences: [
      {
        company: 'Bayut & dubizzle (EMPG)',
        role: 'Product Manager — FinTech, Payments & Monetization',
        dates: '2021-08 -- Present',
        location: 'Dubai, UAE',
        bullets: [
          {
            generated_text: 'Engineered split payments architecture and multi-gateway fallback routing (Adyen & MangoPay), reducing transaction drop-offs by 18% and boosting checkout completion by 24%.',
            source_fact_ids: ['BAYUT_ACHIEVE_01'],
            reasoning: 'Verified split payments impact',
            action_type: 'EMPHASIZED',
          },
        ],
      },
    ],
    projects: [],
    ats_keywords_targeted: ['Adyen', 'Split Payments'],
  };

  const report = validator.validateResumeAST(validAST);
  assert.equal(report.overall_passed, true);
  assert.equal(report.contradictory_count, 0);
  assert.equal(report.verified_count, 1);
});

test('TruthValidationAgent flags fabricated metrics as CONTRADICTORY and fails report', () => {
  const kb = new CandidateKnowledgeBase();
  const validator = new TruthValidationAgent(kb);

  const hallucinatedAST: TailoredResumeAST = {
    headline: 'Senior Product Manager',
    summary: 'Summary',
    competencies: {
      product_strategy: '',
      fintech_payments: '',
      technical_integrations: '',
      analytics_tools: '',
    },
    experiences: [
      {
        company: 'Bayut & dubizzle (EMPG)',
        role: 'Product Manager — FinTech, Payments & Monetization',
        dates: '2021-08 -- Present',
        location: 'Dubai, UAE',
        bullets: [
          {
            // Altered metric from 18% to 85%!
            generated_text: 'Engineered split payments architecture, reducing transaction drop-offs by 85% and boosting checkout completion by 99%.',
            source_fact_ids: ['BAYUT_ACHIEVE_01'],
            reasoning: 'Fabricated metrics test',
            action_type: 'REWRITTEN',
          },
        ],
      },
    ],
    projects: [],
    ats_keywords_targeted: [],
  };

  const report = validator.validateResumeAST(hallucinatedAST);
  assert.equal(report.overall_passed, false);
  assert.ok(report.contradictory_count > 0);
  assert.equal(report.bullet_reports[0].status, 'CONTRADICTORY');
  assert.ok(report.bullet_reports[0].notes.includes('Fabricated/altered metric') || report.bullet_reports[0].notes.includes('is not present'));
});
