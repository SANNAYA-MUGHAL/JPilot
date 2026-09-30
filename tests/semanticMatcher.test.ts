import test from 'node:test';
import assert from 'node:assert/strict';
import { SemanticMatcher } from '../src/services/matching/semanticMatcher.js';
import type { ParsedJobDescription } from '../src/types/job.js';

test('SemanticMatcher calculates high match for Senior FinTech PM role', () => {
  const matcher = new SemanticMatcher();
  const mockJd: ParsedJobDescription = {
    job_id: 'TEST_01',
    title: 'Senior Product Manager - Payments & Checkout',
    company: 'FinTech Global',
    location: 'Amsterdam, Netherlands',
    country: 'Netherlands',
    remote_policy: 'HYBRID',
    visa_status: 'VISA_SPONSORED',
    visa_reasoning: 'Relocation provided',
    employment_type: 'Full-time',
    experience_years_required: 6,
    must_have_skills: ['Product Strategy', 'Roadmapping', 'Agile', 'Payments', 'Adyen'],
    nice_to_have_skills: ['SQL', 'Mixpanel'],
    responsibilities: ['Lead payment integration squad', 'Optimize checkout drop-offs'],
    domains: ['FinTech', 'SaaS', 'eCommerce'],
    tools: ['Jira', 'Mixpanel', 'Postman'],
    technologies_and_apis: ['REST APIs', 'Adyen', 'Webhooks'],
    ats_keywords: ['Payments', 'Product Roadmapping', 'Agile', 'Adyen', 'Mixpanel'],
    raw_text: 'Sample JD',
    discovered_at: new Date().toISOString()
  };

  const match = matcher.calculateMatch(mockJd);

  assert.ok(match.overall_score >= 80, `Expected score >= 80, got ${match.overall_score}`);
  assert.equal(match.tier, 'HIGH_ALIGNMENT');
  assert.equal(match.breakdown.role_score, 100);
  assert.equal(match.breakdown.experience_score, 100);
  assert.ok(match.strong_matches.length > 0);
  assert.equal(match.missing_mandatory.length, 0);
});

test('SemanticMatcher assigns LOW_MATCH for completely irrelevant role', () => {
  const matcher = new SemanticMatcher();
  const mockJd: ParsedJobDescription = {
    job_id: 'TEST_02',
    title: 'Senior Embedded Firmware C++ Engineer',
    company: 'Hardware Corp',
    location: 'Tokyo, Japan',
    country: 'Japan',
    remote_policy: 'ON_SITE',
    visa_status: 'LOCAL_AUTH_REQUIRED',
    visa_reasoning: 'Japanese citizenship required',
    employment_type: 'Full-time',
    experience_years_required: 10,
    must_have_skills: ['Bare-metal C', 'RTOS', 'ARM Cortex', 'Oscilloscopes'],
    nice_to_have_skills: ['Assembly', 'KiCad'],
    responsibilities: ['Write microcontroller firmware'],
    domains: ['Semiconductors', 'Hardware'],
    tools: ['IAR Embedded Workbench', 'Logic Analyzer'],
    technologies_and_apis: ['SPI', 'I2C', 'CAN bus'],
    ats_keywords: ['Firmware', 'RTOS', 'C++'],
    raw_text: 'Firmware Engineer JD',
    discovered_at: new Date().toISOString()
  };

  const match = matcher.calculateMatch(mockJd);

  assert.ok(match.overall_score < 50, `Expected score < 50, got ${match.overall_score}`);
  assert.equal(match.tier, 'LOW_MATCH');
  assert.ok(match.missing_mandatory.includes('Bare-metal C'));
  assert.ok(match.application_risks.some(r => r.includes('Low Title Alignment') || r.includes('Visa Barrier')));
});
