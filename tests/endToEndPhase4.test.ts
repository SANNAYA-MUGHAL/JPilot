import test from 'node:test';
import assert from 'node:assert/strict';
import { AnalyticsService } from '../src/services/analytics/analyticsService.js';
import { DashboardService } from '../src/services/dashboard/dashboardService.js';
import { DailyDigestGenerator } from '../src/services/digest/dailyDigestGenerator.js';
import { SettingsManager } from '../src/services/settings/settingsManager.js';

test('Phase 4 end-to-end analytics, dashboard tabs, digest and settings', () => {
  const analytics = new AnalyticsService();
  const dashboard = new DashboardService();
  const settings = new SettingsManager();

  // 1. Analytics & Skill gaps
  const { metrics, skill_gaps } = analytics.getDashboardMetrics();
  assert.ok(metrics.jobs_processed >= 1);
  assert.ok(metrics.average_match_score >= 80);

  // 2. Settings check
  const cfg = settings.getSettings();
  assert.equal(cfg.human_approval_mode, true);
  assert.equal(cfg.auto_create_trello, true);

  // 3. Digest generation
  const digest = DailyDigestGenerator.generateDigest({
    run_id: 'TEST_DIGEST',
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    total_discovered: 1,
    duplicates_skipped: 0,
    hard_filtered: 0,
    jobs_processed: 1,
    packages_generated: 1,
    errors_count: 0,
    results: [
      {
        job_id: '1',
        company: 'Wise',
        title: 'Senior Product Manager',
        status: 'PROCESSED',
        match_score: 98,
      },
    ],
  });

  assert.ok(digest.includes("SANA'S JOB AGENT — DAILY REPORT"));
  assert.ok(digest.includes('98% Match'));
});
