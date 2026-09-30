import test from 'node:test';
import assert from 'node:assert/strict';
import { JDIntelligenceAgent } from '../src/services/jd/jdIntelligenceAgent.js';
import { LocationVisaExtractor } from '../src/services/jd/locationVisaExtractor.js';

test('LocationVisaExtractor detects visa sponsorship when offered', () => {
  const jdText = `Senior Product Manager - Amsterdam, Netherlands. Full visa sponsorship provided and comprehensive relocation assistance package for international hires.`;
  const result = LocationVisaExtractor.extract(jdText);

  assert.equal(result.country, 'Netherlands');
  assert.equal(result.city, 'Amsterdam');
  assert.equal(result.visa_status, 'VISA_SPONSORED');
  assert.ok(result.visa_reasoning.includes('visa sponsorship'));
});

test('LocationVisaExtractor detects remote worldwide B2B contract', () => {
  const jdText = `Staff Product Manager. 100% remote worldwide. We hire through Deel and open to B2B contract arrangements anywhere in the world.`;
  const result = LocationVisaExtractor.extract(jdText);

  assert.equal(result.remote_policy, 'REMOTE_WORLDWIDE');
  assert.equal(result.visa_status, 'REMOTE_CONTRACT_OPEN');
});

test('LocationVisaExtractor flags local authorization required', () => {
  const jdText = `Lead PM in London, UK. Must have right to work in the UK without sponsorship. No visa sponsorship available for this role.`;
  const result = LocationVisaExtractor.extract(jdText);

  assert.equal(result.country, 'United Kingdom');
  assert.equal(result.visa_status, 'LOCAL_AUTH_REQUIRED');
});

test('JDIntelligenceAgent parses PM job description with skills and tools', async () => {
  const agent = new JDIntelligenceAgent();
  const sampleJd = `
Senior FinTech Product Manager
Checkout.com - London, UK (Hybrid)
We are seeking an experienced Product Manager with 5+ years experience in FinTech and Payments.
Responsibilities:
• Own the roadmap for multi-currency payment gateway integrations including Adyen and alternative payment methods.
• Drive conversion rate optimization and checkout funnel improvements using Mixpanel and New Relic.
• Collaborate with cross-functional engineering squads in an Agile environment.
• Author clear PRDs, API specifications, and webhook documentation.
Requirements:
• 5+ years Product Management experience in SaaS or FinTech.
• Strong experience with REST APIs, Postman, and Jira.
• Experience in split payments, digital wallets, or payment rails.
`;

  const parsed = await agent.parseJobDescription({
    raw_text: sampleJd,
    company_hint: 'Checkout.com',
    title_hint: 'Senior FinTech Product Manager'
  });

  assert.equal(parsed.title, 'Senior FinTech Product Manager');
  assert.equal(parsed.company, 'Checkout.com');
  assert.equal(parsed.country, 'United Kingdom');
  assert.ok(parsed.ats_keywords.includes('Payments') || parsed.ats_keywords.includes('FinTech'));
  assert.ok(parsed.tools.includes('Mixpanel') || parsed.tools.includes('Jira'));
  assert.ok(parsed.technologies_and_apis.includes('Adyen') || parsed.technologies_and_apis.includes('REST API'));
});
