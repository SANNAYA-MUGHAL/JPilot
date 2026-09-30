import type { DiscoveryBatchReport } from '../discovery/jobDiscoveryEngine.js';
import type { DashboardMetrics } from '../../types/analytics.js';

export class DailyDigestGenerator {
  public static generateDigest(
    report: DiscoveryBatchReport,
    metrics?: DashboardMetrics
  ): string {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const highMatches = report.results.filter((r) => r.status === 'PROCESSED' && (r.match_score || 0) >= 80);
    const goodMatches = report.results.filter((r) => r.status === 'PROCESSED' && (r.match_score || 0) >= 65 && (r.match_score || 0) < 80);
    const reviewMatches = report.results.filter((r) => r.status === 'PROCESSED' && (r.match_score || 0) < 65);
    const skippedCount = report.duplicates_skipped + report.hard_filtered;

    // Top opportunities sorted by match score descending
    const topOpportunities = [...report.results]
      .filter((r) => r.status === 'PROCESSED' && r.match_score !== undefined)
      .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
      .slice(0, 5);

    let opportunitiesText = 'No new packages created in this run.';
    if (topOpportunities.length > 0) {
      opportunitiesText = topOpportunities
        .map(
          (o, idx) =>
            `${idx + 1}. **${o.company}** — ${o.title} — **${o.match_score}% Match**\n   🔗 Trello Review Card: ${o.trello_card_url || 'Queued in Ready to Apply'}`
        )
        .join('\n\n');
    }

    return `================================================================================
SANA'S JOB AGENT — DAILY REPORT
Date: ${today}
Run ID: ${report.run_id}
================================================================================

JOBS DISCOVERED TODAY: ${report.total_discovered}

• High Match (80%+):     ${highMatches.length}
• Good Match (65–79%):    ${goodMatches.length}
• Review (<65%):          ${reviewMatches.length}
• Skipped / Filtered:     ${skippedCount} (${report.duplicates_skipped} duplicates, ${report.hard_filtered} hard-filtered)

--------------------------------------------------------------------------------
🔥 TOP OPPORTUNITIES
--------------------------------------------------------------------------------
${opportunitiesText}

--------------------------------------------------------------------------------
APPLICATION PACKAGES CREATED: ${report.packages_generated}
HUMAN APPROVAL GATE: Active (Applications queued in Trello for human review)
--------------------------------------------------------------------------------
`;
  }
}
