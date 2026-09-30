import fs from 'node:fs';
import path from 'node:path';
import type { DashboardMetrics, SkillGapReport } from '../../types/analytics.js';
import type { ParsedJobDescription } from '../../types/job.js';
import type { MatchResult } from '../../types/match.js';
import { SkillGapIntelligence } from './skillGapIntelligence.js';
import { CandidateKnowledgeBase } from '../candidate/knowledgeBase.js';

export class AnalyticsService {
  private applicationsDir: string;
  private skillGapIntel: SkillGapIntelligence;

  constructor(appsDir?: string, kb?: CandidateKnowledgeBase) {
    this.applicationsDir = appsDir || path.resolve(process.cwd(), 'applications');
    this.skillGapIntel = new SkillGapIntelligence(kb);
  }

  public getDashboardMetrics(): { metrics: DashboardMetrics; skill_gaps: SkillGapReport } {
    const jobsList: { parsedJd: ParsedJobDescription; match: MatchResult }[] = [];

    if (fs.existsSync(this.applicationsDir)) {
      const companyFolders = fs.readdirSync(this.applicationsDir);

      for (const comp of companyFolders) {
        const compPath = path.join(this.applicationsDir, comp);
        if (!fs.statSync(compPath).isDirectory()) continue;

        const roleFolders = fs.readdirSync(compPath);
        for (const roleDir of roleFolders) {
          const appPath = path.join(compPath, roleDir);
          if (!fs.statSync(appPath).isDirectory()) continue;

          const jobJsonPath = path.join(appPath, 'job.json');
          const matchJsonPath = path.join(appPath, 'match_analysis.json');

          if (fs.existsSync(jobJsonPath) && fs.existsSync(matchJsonPath)) {
            try {
              const parsedJd = JSON.parse(fs.readFileSync(jobJsonPath, 'utf8')) as ParsedJobDescription;
              const match = JSON.parse(fs.readFileSync(matchJsonPath, 'utf8')) as MatchResult;
              jobsList.push({ parsedJd, match });
            } catch (err: any) {
              console.warn(`Failed to read application data at ${appPath}: ${err.message}`);
            }
          }
        }
      }
    }

    const totalProcessed = jobsList.length;
    let highMatchCount = 0;
    let readyToApplyCount = 0;
    let totalScore = 0;

    const skillCounts: Map<string, number> = new Map();
    const industryCounts: Map<string, number> = new Map();
    const locationCounts: Map<string, number> = new Map();

    for (const { parsedJd, match } of jobsList) {
      totalScore += match.overall_score;
      if (match.overall_score >= 80) highMatchCount++;
      else if (match.overall_score >= 65) readyToApplyCount++;

      // Count skills
      const allSkills = [...parsedJd.must_have_skills, ...parsedJd.tools, ...parsedJd.technologies_and_apis];
      for (const s of allSkills) {
        const clean = s.trim();
        skillCounts.set(clean, (skillCounts.get(clean) || 0) + 1);
      }

      // Count industries
      for (const d of parsedJd.domains) {
        const clean = d.trim();
        industryCounts.set(clean, (industryCounts.get(clean) || 0) + 1);
      }

      // Count locations
      const loc = parsedJd.country || 'Global / Remote';
      locationCounts.set(loc, (locationCounts.get(loc) || 0) + 1);
    }

    const avgScore = totalProcessed > 0 ? Math.round(totalScore / totalProcessed) : 0;

    // Top requested skills
    const topSkills = Array.from(skillCounts.entries())
      .map(([skill, count]) => ({
        skill,
        count,
        percentage: totalProcessed > 0 ? Math.round((count / totalProcessed) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Common industries
    const commonIndustries = Array.from(industryCounts.entries())
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Common locations
    const commonLocations = Array.from(locationCounts.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const metrics: DashboardMetrics = {
      jobs_discovered_today: totalProcessed,
      jobs_processed: totalProcessed,
      high_match_count: highMatchCount,
      ready_to_apply_count: readyToApplyCount,
      applied_count: 0,
      interviews_count: 0,
      offers_count: 0,
      average_match_score: avgScore,
      top_requested_skills: topSkills,
      common_industries: commonIndustries,
      common_locations: commonLocations,
      conversion_rate_percentage: 0,
    };

    const skillGaps = this.skillGapIntel.analyzeSkillGaps(jobsList);

    return {
      metrics,
      skill_gaps: skillGaps,
    };
  }
}
