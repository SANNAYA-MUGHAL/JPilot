import test from 'node:test';
import assert from 'node:assert/strict';
import { RemoteJobAdapter } from '../src/services/discovery/adapters/remoteJobAdapter.js';
import { GreenhouseAdapter } from '../src/services/discovery/adapters/greenhouseAdapter.js';

test('RemoteJobAdapter searches and normalizes jobs with dedupe keys', async () => {
  const adapter = new RemoteJobAdapter();
  const jobs = await adapter.searchJobs({
    role_keywords: ['Product Manager'],
    locations: ['Remote'],
    remote_only: true,
    max_age_days: 7,
  });

  assert.ok(jobs.length >= 3);
  const deelJob = jobs.find((j) => j.company === 'Deel');
  assert.ok(deelJob);
  assert.equal(deelJob.title, 'Senior Product Manager - Payments & Global Payouts');
  assert.equal(deelJob.remote_type, 'REMOTE');
  assert.ok(deelJob.dedupe_key.includes('deel'));
  assert.ok(deelJob.job_id.startsWith('JOB_'));
});

test('GreenhouseAdapter normalizes ATS jobs', async () => {
  const adapter = new GreenhouseAdapter();
  const jobs = await adapter.searchJobs({
    role_keywords: ['Product Manager'],
    locations: ['Remote Worldwide'],
    remote_only: true,
    max_age_days: 7,
  });

  assert.ok(jobs.length >= 1);
  assert.equal(jobs[0].company, 'GitLab');
  assert.ok(jobs[0].application_url.includes('greenhouse.io'));
});
