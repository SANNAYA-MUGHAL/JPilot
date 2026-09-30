import test from 'node:test';
import assert from 'node:assert/strict';
import { DeduplicationAgent } from '../src/services/discovery/deduplicationAgent.js';
import { EligibilityFilter } from '../src/services/discovery/eligibilityFilter.js';
import type { DiscoveredJob } from '../src/types/discovery.js';

test('DeduplicationAgent detects exact key, URL, and fuzzy duplicate jobs', () => {
  const agent = new DeduplicationAgent();

  const originalJob: DiscoveredJob = {
    job_id: 'JOB_001',
    source: 'test',
    source_job_id: 'SRC_001',
    title: 'Senior Product Manager',
    company: 'Stripe',
    location: 'London, UK',
    country: 'United Kingdom',
    remote_type: 'REMOTE',
    employment_type: 'Full-time',
    posted_date: new Date().toISOString(),
    description: 'Lead payment infrastructure',
    application_url: 'https://stripe.com/jobs/pm-01',
    discovered_at: new Date().toISOString(),
    dedupe_key: 'stripe_seniorproductmanager_src001',
  };

  // Not duplicate initially
  assert.equal(agent.isDuplicate(originalJob).isDuplicate, false);

  // Record it
  agent.recordJob(originalJob, true);

  // Exact duplicate
  const exactDupe = { ...originalJob };
  assert.equal(agent.isDuplicate(exactDupe).isDuplicate, true);

  // URL duplicate with different ID
  const urlDupe: DiscoveredJob = {
    ...originalJob,
    job_id: 'JOB_002',
    dedupe_key: 'stripe_seniorproductmanager_other',
  };
  assert.equal(agent.isDuplicate(urlDupe).isDuplicate, true);

  // Fuzzy duplicate: same company + 90% identical title
  const fuzzyDupe: DiscoveredJob = {
    ...originalJob,
    job_id: 'JOB_003',
    title: 'Senior Product Manager ', // subtle whitespace / punctuation change
    application_url: 'https://stripe.com/jobs/pm-02',
    dedupe_key: 'stripe_pm_different',
  };
  assert.equal(agent.isDuplicate(fuzzyDupe).isDuplicate, true);
});

test('EligibilityFilter filters internships, irrelevant roles, and foreign language requirements', () => {
  const filter = new EligibilityFilter();

  // 1. Internship
  const internJob: DiscoveredJob = {
    job_id: 'JOB_INT',
    source: 'test',
    source_job_id: '1',
    title: 'Product Management Intern',
    company: 'Startup',
    location: 'Remote',
    country: 'Global',
    remote_type: 'REMOTE',
    employment_type: 'Internship',
    posted_date: new Date().toISOString(),
    description: 'Intern role',
    application_url: 'https://example.com',
    discovered_at: new Date().toISOString(),
    dedupe_key: 'startup_intern',
  };
  assert.equal(filter.checkEligibility(internJob).eligible, false);

  // 2. Irrelevant role
  const nursingJob: DiscoveredJob = {
    ...internJob,
    title: 'Registered Nurse',
    description: 'Healthcare nursing duties',
    dedupe_key: 'hospital_nurse',
  };
  assert.equal(filter.checkEligibility(nursingJob).eligible, false);

  // 3. Mandatory German C2 required
  const germanJob: DiscoveredJob = {
    ...internJob,
    title: 'Senior Product Manager',
    description: 'We require fluent German (C2 verhandlungssicher) for interacting with local regulators.',
    dedupe_key: 'german_pm',
  };
  const langRes = filter.checkEligibility(germanJob);
  assert.equal(langRes.eligible, false);
  assert.ok(langRes.flags.includes('LANGUAGE_BARRIER_GERMAN'));

  // 4. Valid PM role
  const validJob: DiscoveredJob = {
    ...internJob,
    title: 'Senior Product Manager',
    description: 'Lead payment integrations with English speaking squad.',
    dedupe_key: 'valid_pm',
  };
  assert.equal(filter.checkEligibility(validJob).eligible, true);
});
