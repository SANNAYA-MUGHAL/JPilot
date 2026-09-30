export type MatchTier = 'HIGH_ALIGNMENT' | 'GOOD_ALIGNMENT' | 'REVIEW' | 'LOW_MATCH';

export interface ScoreBreakdown {
  role_score: number;        // weight 25%
  experience_score: number;  // weight 20%
  skills_score: number;      // weight 20%
  domain_score: number;      // weight 15%
  tools_score: number;       // weight 10%
  location_score: number;    // weight 5%
  preferred_score: number;   // weight 5%
}

export interface MatchResult {
  overall_score: number;     // 0 - 100
  tier: MatchTier;
  breakdown: ScoreBreakdown;
  strong_matches: string[];
  partial_matches: string[];
  missing_mandatory: string[];
  missing_preferred: string[];
  application_risks: string[];
  recommendation: string;
}
