import fs from 'node:fs';
import path from 'node:path';
import { JobDiscoveryEngine } from '../services/discovery/jobDiscoveryEngine.js';
import { RemoteJobAdapter } from '../services/discovery/adapters/remoteJobAdapter.js';
import { GreenhouseAdapter } from '../services/discovery/adapters/greenhouseAdapter.js';
import { DeduplicationAgent } from '../services/discovery/deduplicationAgent.js';
import { EligibilityFilter } from '../services/discovery/eligibilityFilter.js';
import { Phase1Pipeline } from '../services/orchestrator/phase1Pipeline.js';
import { DailyDigestGenerator } from '../services/digest/dailyDigestGenerator.js';
import { AnalyticsService } from '../services/analytics/analyticsService.js';

export async function runDailyDiscoveryBatch() {
  console.log('='.repeat(80));
  console.log('🌅 JPILOT — 8:00 AM LIVE MORNING DISCOVERY BATCH');
  console.log('   Candidate: Sana Liaqat (Senior Product Manager)');
  console.log(`   Time: ${new Date().toLocaleTimeString()} PKT`);
  console.log('='.repeat(80));

  const appsDir = path.resolve(process.cwd(), 'applications');
  const registryPath = path.resolve(process.cwd(), 'data/discovery_registry.json');
  const registryDir = path.dirname(registryPath);
  if (!fs.existsSync(registryDir)) fs.mkdirSync(registryDir, { recursive: true });

  const dedupe = new DeduplicationAgent(registryPath);
  const filter = new EligibilityFilter();
  const pipeline = new Phase1Pipeline();

  const engine = new JobDiscoveryEngine([], dedupe, filter, pipeline, appsDir);
  engine.registerAdapter(new RemoteJobAdapter());
  engine.registerAdapter(new GreenhouseAdapter());

  console.log('\n[1] Scanning remote sources & feeds for new PM vacancies...');
  const report = await engine.runDiscovery({
    role_keywords: ['Product Manager', 'FinTech', 'Payments', 'SaaS'],
    locations: ['Remote', 'Worldwide', 'Global'],
    remote_only: true,
    max_age_days: 7,
  });

  console.log(`\n[2] Discovery Results:`);
  console.log(`   • Total Discovered:      ${report.total_discovered}`);
  console.log(`   • Duplicates Skipped:    ${report.duplicates_skipped}`);
  console.log(`   • Hard-Filtered Out:     ${report.hard_filtered}`);
  console.log(`   • High-Match Packages:   ${report.packages_generated}`);
  console.log(`   • Errors:                ${report.errors_count}`);

  const analytics = new AnalyticsService();
  const { metrics } = analytics.getDashboardMetrics();
  const digest = DailyDigestGenerator.generateDigest(report, metrics);

  console.log('\n[3] Daily Morning Digest:');
  console.log(digest);

  return { report, digest };
}

if (process.argv[1]?.endsWith('runDailyDiscovery.ts')) {
  runDailyDiscoveryBatch().catch(console.error);
}
