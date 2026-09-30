import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DailyDigestGenerator } from '../src/services/digest/dailyDigestGenerator.js';
import { DashboardService } from '../src/services/dashboard/dashboardService.js';
import { SettingsManager } from '../src/services/settings/settingsManager.js';
import type { DiscoveryBatchReport } from '../src/services/discovery/jobDiscoveryEngine.js';

test('DailyDigestGenerator formats executive report with match counts and Trello links', () => {
  const mockReport: DiscoveryBatchReport = {
    run_id: 'RUN_12345',
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    total_discovered: 12,
    duplicates_skipped: 3,
    hard_filtered: 2,
    jobs_processed: 7,
    packages_generated: 7,
    errors_count: 0,
    results: [
      {
        job_id: 'J1',
        company: 'Wise',
        title: 'Senior Product Manager',
        status: 'PROCESSED',
        match_score: 95,
        trello_card_url: 'https://trello.com/c/wise',
      },
      {
        job_id: 'J2',
        company: 'Revolut',
        title: 'FinTech PM',
        status: 'PROCESSED',
        match_score: 88,
        trello_card_url: 'https://trello.com/c/revolut',
      },
    ],
  };

  const digest = DailyDigestGenerator.generateDigest(mockReport);

  assert.ok(digest.includes("SANA'S JOB AGENT — DAILY REPORT"));
  assert.ok(digest.includes('JOBS DISCOVERED TODAY: 12'));
  assert.ok(digest.includes('Wise'));
  assert.ok(digest.includes('95% Match'));
  assert.ok(digest.includes('https://trello.com/c/wise'));
  assert.ok(digest.includes('APPLICATION PACKAGES CREATED: 7'));
});

test('DashboardService reads application directory and provides multi-tab view', () => {
  const dashboard = new DashboardService();
  const wiseAppDir = path.resolve(process.cwd(), 'applications/Wise/Senior_Product_Manager___Check_JOB_dcfbeeef07');

  if (fs.existsSync(wiseAppDir)) {
    const details = dashboard.getJobDetails(wiseAppDir);

    // Overview Tab
    assert.equal(details.overview.company, 'Wise');
    assert.ok(details.overview.role.includes('Product Manager'));

    // JD Analysis Tab
    assert.ok(details.jd_analysis.must_haves.length > 0);

    // Match Analysis Tab
    assert.ok(details.match_analysis.overall_score >= 80);

    // Resume Diff Explainability Tab
    assert.ok(details.resume.diff_changes.length > 0);
    assert.ok(details.resume.diff_changes.some((c) => c.section.includes('Bayut') || c.section.includes('Projects')));

    // Cover Letter Tab
    assert.ok(details.cover_letter.word_count >= 200);

    // History Tab
    assert.ok(details.history.length >= 5);
  }
});

test('SettingsManager reads defaults and updates preferences', () => {
  const tmpSettingsPath = path.resolve(process.cwd(), 'tests/tmp_settings.json');
  const manager = new SettingsManager(tmpSettingsPath);

  const initial = manager.getSettings();
  assert.equal(initial.minimum_match_score, 65);
  assert.equal(initial.human_approval_mode, true);

  manager.updateSettings({ minimum_match_score: 75, remote_preference: 'Remote Only' });
  const updated = manager.getSettings();

  assert.equal(updated.minimum_match_score, 75);
  assert.equal(updated.remote_preference, 'Remote Only');

  if (fs.existsSync(tmpSettingsPath)) fs.unlinkSync(tmpSettingsPath);
});
