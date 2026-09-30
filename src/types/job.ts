export type WorkAuthorizationType =
  | 'VISA_SPONSORED'
  | 'REMOTE_CONTRACT_OPEN'
  | 'LOCAL_AUTH_REQUIRED'
  | 'UNSPECIFIED_NEEDS_CHECK';

export type RemotePolicy =
  | 'REMOTE_WORLDWIDE'
  | 'REMOTE_REGIONAL'
  | 'HYBRID'
  | 'ON_SITE'
  | 'UNSPECIFIED';

export interface ParsedJobDescription {
  job_id: string;
  title: string;
  company: string;
  location: string;
  country: string;
  city?: string;
  remote_policy: RemotePolicy;
  visa_status: WorkAuthorizationType;
  visa_reasoning: string;
  employment_type: string;
  salary_range?: string;
  experience_years_required?: number;
  seniority_level?: string;
  must_have_skills: string[];
  nice_to_have_skills: string[];
  responsibilities: string[];
  domains: string[];
  tools: string[];
  technologies_and_apis: string[];
  ats_keywords: string[];
  candidate_strengths?: string[];
  candidate_gaps?: string[];
  raw_text: string;
  source_url?: string;
  discovered_at: string;
}
