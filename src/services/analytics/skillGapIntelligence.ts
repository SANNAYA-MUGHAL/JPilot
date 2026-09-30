import type { ParsedJobDescription } from '../../types/job.js';
import type { MatchResult } from '../../types/match.js';
import type { SkillGapItem, SkillGapReport } from '../../types/analytics.js';
import { CandidateKnowledgeBase } from '../candidate/knowledgeBase.js';

export class SkillGapIntelligence {
  private kb: CandidateKnowledgeBase;

  constructor(kb?: CandidateKnowledgeBase) {
    this.kb = kb || new CandidateKnowledgeBase();
  }

  public analyzeSkillGaps(jobs: { parsedJd: ParsedJobDescription; match: MatchResult }[]): SkillGapReport {
    const totalJobs = jobs.length;
    if (totalJobs === 0) {
      return {
        total_jobs_analyzed: 0,
        underemphasized_skills: [],
        genuinely_lacking_skills: [],
      };
    }

    const skillsCatalog = this.kb.getSkills();
    const candidateSkillsFlat = new Set([
      ...skillsCatalog.product_management,
      ...skillsCatalog.fintech_and_payments,
      ...skillsCatalog.technical_and_apis,
      ...skillsCatalog.analytics_and_tools,
      ...skillsCatalog.methodologies,
      ...skillsCatalog.industries,
    ].map((s) => s.toLowerCase()));

    // Also include tools & skills from experiences
    for (const exp of this.kb.getExperiences()) {
      exp.skills.forEach((s) => candidateSkillsFlat.add(s.toLowerCase()));
      exp.tools.forEach((t) => candidateSkillsFlat.add(t.toLowerCase()));
    }

    const gapFrequencyMap: Map<string, number> = new Map();

    for (const { match } of jobs) {
      const allMissing = [...match.missing_mandatory, ...match.missing_preferred];
      for (const m of allMissing) {
        const key = m.trim();
        gapFrequencyMap.set(key, (gapFrequencyMap.get(key) || 0) + 1);
      }
    }

    const underemphasized: SkillGapItem[] = [];
    const genuinelyLacking: SkillGapItem[] = [];

    for (const [skill, count] of gapFrequencyMap.entries()) {
      const lower = skill.toLowerCase();
      const hasSkill = Array.from(candidateSkillsFlat).some(
        (cs) => cs.includes(lower) || lower.includes(cs)
      );

      const percentage = Math.round((count / totalJobs) * 100);

      if (hasSkill) {
        underemphasized.push({
          skill,
          frequency_requested: count,
          percentage_of_jobs: percentage,
          classification: 'UNDER_EMPHASIZED',
          guidance: `Candidate has background in "${skill}". Consider making this skill more prominent in summary and core competency sections.`,
        });
      } else {
        genuinelyLacking.push({
          skill,
          frequency_requested: count,
          percentage_of_jobs: percentage,
          classification: 'GENUINELY_LACKING',
          guidance: `Candidate profile lacks verified proof for "${skill}". Recommend targeted certification or project focus to capture ${percentage}% of market demand.`,
        });
      }
    }

    // Sort by frequency descending
    underemphasized.sort((a, b) => b.frequency_requested - a.frequency_requested);
    genuinelyLacking.sort((a, b) => b.frequency_requested - a.frequency_requested);

    return {
      total_jobs_analyzed: totalJobs,
      underemphasized_skills: underemphasized,
      genuinely_lacking_skills: genuinelyLacking,
    };
  }
}
