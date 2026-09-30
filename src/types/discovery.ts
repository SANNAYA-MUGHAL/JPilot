export interface DiscoveredJob {
  job_id: string;
  source: string;
  source_job_id: string;
  title: string;
  company: string;
  location: string;
  country: string;
  city?: string;
  remote_type: 'REMOTE' | 'HYBRID' | 'ON_SITE' | 'UNSPECIFIED';
  employment_type: string;
  salary?: string;
  posted_date: string; // ISO date string
  description: string;
  requirements?: string[];
  preferred_requirements?: string[];
  application_url: string;
  company_url?: string;
  discovered_at: string;
  dedupe_key: string;
}

export interface SearchCriteria {
  role_keywords: string[];
  locations: string[];
  remote_only: boolean;
  max_age_days: number; // 1, 3, or 7 days
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  flags: string[];
}
