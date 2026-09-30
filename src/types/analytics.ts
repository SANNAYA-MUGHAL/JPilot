export interface SkillFrequency {
  skill: string;
  count: number;
  percentage: number;
}

export interface DashboardMetrics {
  jobs_discovered_today: number;
  jobs_processed: number;
  high_match_count: number;
  ready_to_apply_count: number;
  applied_count: number;
  interviews_count: number;
  offers_count: number;
  average_match_score: number;
  top_requested_skills: SkillFrequency[];
  common_industries: { industry: string; count: number }[];
  common_locations: { location: string; count: number }[];
  conversion_rate_percentage: number;
}

export type SkillGapClassification = 'UNDER_EMPHASIZED' | 'GENUINELY_LACKING';

export interface SkillGapItem {
  skill: string;
  frequency_requested: number;
  percentage_of_jobs: number;
  classification: SkillGapClassification;
  guidance: string;
}

export interface SkillGapReport {
  total_jobs_analyzed: number;
  underemphasized_skills: SkillGapItem[];
  genuinely_lacking_skills: SkillGapItem[];
}

export interface ResumeDiffChange {
  section: string;
  type: 'ADDED/EMPHASIZED' | 'REORDERED' | 'REWRITTEN' | 'REMOVED';
  item: string;
  reason: string;
  source_fact_ids?: string[];
}
