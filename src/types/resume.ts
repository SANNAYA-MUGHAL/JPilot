export type BulletActionType = 'EMPHASIZED' | 'REORDERED' | 'REWRITTEN' | 'CANONICAL' | 'REMOVED';

export interface TailoredBullet {
  generated_text: string;
  source_fact_ids: string[];
  reasoning: string;
  action_type: BulletActionType;
}

export interface TailoredExperienceItem {
  company: string;
  role: string;
  dates: string;
  location: string;
  bullets: TailoredBullet[];
}

export interface TailoredProjectItem {
  project_id: string;
  project_name: string;
  company: string;
  technologies_highlighted: string;
  bullets: TailoredBullet[];
}

export interface TailoredResumeAST {
  headline: string;
  summary: string;
  competencies: {
    product_strategy: string;
    fintech_payments: string;
    technical_integrations: string;
    analytics_tools: string;
  };
  experiences: TailoredExperienceItem[];
  projects: TailoredProjectItem[];
  ats_keywords_targeted: string[];
}

export type TruthValidationStatus = 'VERIFIED' | 'SUPPORTED_REWRITE' | 'UNVERIFIED' | 'CONTRADICTORY';

export interface BulletVerificationReport {
  bullet_text: string;
  status: TruthValidationStatus;
  mapped_fact_ids: string[];
  extracted_claims: string[];
  notes: string;
}

export interface TruthValidationReport {
  overall_passed: boolean;
  total_claims: number;
  verified_count: number;
  supported_rewrites: number;
  unverified_count: number;
  contradictory_count: number;
  bullet_reports: BulletVerificationReport[];
  sanitized_ast: TailoredResumeAST;
}
