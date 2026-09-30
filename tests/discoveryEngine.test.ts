import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JobDiscoveryEngine } from '../src/services/discovery/jobDiscoveryEngine.js';
import { RemoteJobAdapter } from '../src/services/discovery/adapters/remoteJobAdapter.js';
import { GreenhouseAdapter } from '../src/services/discovery/adapters/greenhouseAdapter.js';
import { DeduplicationAgent } from '../src/services/discovery/deduplicationAgent.js';
import { EligibilityFilter } from '../src/services/discovery/eligibilityFilter.js';
import { Phase1Pipeline } from '../src/services/orchestrator/phase1Pipeline.js';
import { JobScheduler } from '../src/services/scheduler/jobScheduler.js';

test('JobDiscoveryEngine processes batch with deduplication and error isolation', async () => {
  const testAppsDir = path.resolve(process.cwd(), 'tests/tmp_discovery_apps');
  const testRegistryPath = path.resolve(process.cwd(), 'tests/tmp_discovery_registry.json');

  const dedupe = new DeduplicationAgent(testRegistryPath);
  const filter = new EligibilityFilter();
  const pipeline = new Phase1Pipeline();

  const engine = new JobDiscoveryEngine([], dedupe, filter, pipeline);
  engine.registerAdapter(new RemoteJobAdapter());
  engine.registerAdapter(new GreenhouseAdapter());

  // First Run
  const report1 = await engine.runDiscovery({
    role_keywords: ['Product Manager'],
    locations: ['Remote'],
    remote_only: true,
    max_age_days: 7,
  });

  assert.ok(report1.total_discovered >= 4);
  assert.ok(report1.hard_filtered >= 1); // Marketing intern filtered
  assert.ok(report1.packages_generated >= 2);
  assert.equal(report1.duplicates_skipped, 0);

  // Second Run (should detect all previously processed as duplicates!)
  const report2 = await engine.runDiscovery({
    role_keywords: ['Product Manager'],
    locations: ['Remote'],
    remote_only: true,
    max_age_days: 7,
  });

  assert.equal(report2.packages_generated, 0); // zero new packages
  assert.ok(report2.duplicates_skipped >= 3); // previous jobs detected as duplicates

  // Scheduler Test
  const scheduler = new JobScheduler(engine, 'manual');
  assert.equal(scheduler.getHistory().length, 0);

  // Clean up
  fs.rmSync(testAppsDir, { recursive: true, force: true });
  if (fs.existsSync(testRegistryPath)) fs.unlinkSync(testRegistryPath);
});
