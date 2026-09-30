import fs from 'node:fs';
import path from 'node:path';
import { AnalyticsService } from '../services/analytics/analyticsService.js';
import { DashboardService } from '../services/dashboard/dashboardService.js';
import { DailyDigestGenerator } from '../services/digest/dailyDigestGenerator.js';
import { SettingsManager } from '../services/settings/settingsManager.js';
import type { DiscoveryBatchReport } from '../services/discovery/jobDiscoveryEngine.js';

async function main() {
  console.log('='.repeat(80));
  console.log('📊 JPILOT — OPERATIONS DASHBOARD & SKILL GAP INTELLIGENCE');
  console.log('   Candidate: Sana Liaqat (Senior Product Manager)');
  console.log('='.repeat(80));

  const analytics = new AnalyticsService();
  const dashboard = new DashboardService();
  const settings = new SettingsManager();

  const { metrics, skill_gaps } = analytics.getDashboardMetrics();

  console.log('\n[1] PIPELINE METRICS & CONVERSION FUNNEL:');
  console.log(`   • Total Applications Generated:  ${metrics.jobs_processed}`);
  console.log(`   • High Match (80%+):             ${metrics.high_match_count}`);
  console.log(`   • Ready to Apply (65–79%):       ${metrics.ready_to_apply_count}`);
  console.log(`   • Average Match Score:           ${metrics.average_match_score}%`);
  console.log(`   • Human Review Queue:            ACTIVE (HUMAN_APPROVAL_MODE=true)`);

  console.log('\n[2] TOP REQUESTED MARKET SKILLS:');
  if (metrics.top_requested_skills.length > 0) {
    for (const item of metrics.top_requested_skills.slice(0, 6)) {
      console.log(`   • ${item.skill.padEnd(25)} Requested in ${item.count} jobs (${item.percentage}%)`);
    }
  } else {
    console.log('   • (No skills indexed yet)');
  }

  console.log('\n[3] SKILL GAP INTELLIGENCE:');
  if (skill_gaps.underemphasized_skills.length > 0) {
    console.log('   💡 UNDER-EMPHASIZED (Candidate possesses, but resume can highlight more prominently):');
    for (const item of skill_gaps.underemphasized_skills) {
      console.log(`      - ${item.skill} (Requested in ${item.percentage_of_jobs}% of target jobs)`);
      console.log(`        ↳ ${item.guidance}`);
    }
  }
  if (skill_gaps.genuinely_lacking_skills.length > 0) {
    console.log('   🎯 GENUINELY LACKING (Strategic opportunities for career development):');
    for (const item of skill_gaps.genuinely_lacking_skills) {
      console.log(`      - ${item.skill} (Requested in ${item.percentage_of_jobs}% of target jobs)`);
      console.log(`        ↳ ${item.guidance}`);
    }
  }

  // Job Details Inspection if Wise app exists
  const wiseAppDir = path.resolve(process.cwd(), 'applications/Wise/Senior_Product_Manager___Check_JOB_dcfbeeef07');
  if (fs.existsSync(wiseAppDir)) {
    console.log('\n[4] MULTI-TAB JOB INSPECTOR (Previewing: Wise Senior Product Manager):');
    const details = dashboard.getJobDetails(wiseAppDir);

    console.log('   📂 TAB 1: OVERVIEW');
    console.log(`      • Company:       ${details.overview.company}`);
    console.log(`      • Role:          ${details.overview.role}`);
    console.log(`      • Location:      ${details.overview.location}`);
    console.log(`      • Status:        ${details.overview.status}`);

    console.log('   📋 TAB 2: JD ANALYSIS');
    console.log(`      • Must-Haves:    ${details.jd_analysis.must_haves.slice(0, 4).join(', ')}`);
    console.log(`      • Key Tools:     ${details.jd_analysis.tools.join(', ')}`);

    console.log('   📊 TAB 3: MATCH ANALYSIS');
    console.log(`      • Score:         ${details.match_analysis.overall_score}% (${details.match_analysis.tier})`);
    console.log(`      • Strengths:     ${details.match_analysis.strengths.slice(0, 2).join('; ')}`);

    console.log('   🔍 TAB 4: RESUME CHANGE EXPLAINABILITY');
    for (const change of details.resume.diff_changes) {
      console.log(`      [${change.type}] ${change.section}: ${change.item}`);
      console.log(`      ↳ Reason: ${change.reason}`);
    }

    console.log('   ✉️ TAB 5: COVER LETTER PREVIEW');
    console.log(`      • Word Count:    ${details.cover_letter.word_count} words`);
    console.log(`      • PDF Path:      ${details.cover_letter.pdf_path}`);

    if (details.trello) {
      console.log('   📌 TAB 6: TRELLO CARD');
      console.log(`      • Board:         AI Job Applications`);
      console.log(`      • List:          ${details.trello.list_name}`);
      console.log(`      • Card URL:      ${details.trello.card_url}`);
    }
  }

  // Daily Digest Preview
  console.log('\n[5] DAILY DIGEST PREVIEW:');
  const mockReport: DiscoveryBatchReport = {
    run_id: 'RUN_' + Date.now(),
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    total_discovered: metrics.jobs_processed,
    duplicates_skipped: 0,
    hard_filtered: 0,
    jobs_processed: metrics.jobs_processed,
    packages_generated: metrics.jobs_processed,
    errors_count: 0,
    results: [
      {
        job_id: 'JOB_dcfbeeef07',
        company: 'Wise',
        title: 'Senior Product Manager — Checkout & Payment Systems',
        status: 'PROCESSED',
        match_score: 98,
        trello_card_url: 'https://trello.com/c/card_wise',
      },
    ],
  };

  const digestOutput = DailyDigestGenerator.generateDigest(mockReport, metrics);
  console.log(digestOutput);
}

main();
