export interface PersonalInformation {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
}

export interface CandidatePositioning {
  years_of_experience: number;
  primary_discipline: string;
  industries: string[];
  core_focus: string[];
}

export interface TargetRoles {
  primary: string[];
  secondary: string[];
}

export interface WorkAuthorizationStatus {
  current_residence: string;
  eu_relocation: string;
  uk_relocation: string;
  b2b_contract_open: boolean;
  eor_payroll_open: boolean;
}

export interface LocationPreferences {
  preferred_geographies: string[];
  remote_preference: string;
  relocation_supported: boolean;
  work_authorization_status: WorkAuthorizationStatus;
}

export interface WorkPreferences {
  contract_types: string[];
  notice_period_days: number;
  preferred_team_structure: string;
}

export interface EducationRecord {
  degree: string;
  institution: string;
  graduation_year: string;
  location: string;
}

export interface CertificationRecord {
  name: string;
  issuer: string;
  year: string;
}

export interface LanguageRecord {
  language: string;
  proficiency: string;
}

export interface CandidateProfile {
  personal_information: PersonalInformation;
  professional_summary: string;
  positioning: CandidatePositioning;
  target_roles: TargetRoles;
  location_preferences: LocationPreferences;
  work_preferences: WorkPreferences;
  education: EducationRecord[];
  certifications: CertificationRecord[];
  languages: LanguageRecord[];
  resume_rules: {
    strict_truth_only: boolean;
    disallow_unverified_metrics: boolean;
    max_pages: number;
    preserve_employment_history: boolean;
  };
}

export interface FactItem {
  fact_id: string;
  text: string;
}

export interface EmploymentRecord {
  company: string;
  role: string;
  start_date: string;
  end_date: string;
  location: string;
  industry: string;
  overview: string;
  responsibilities: FactItem[];
  achievements: FactItem[];
  tools: string[];
  skills: string[];
  integrations: string[];
}

export interface ProjectRecord {
  project_id: string;
  project_name: string;
  candidate_role: string;
  company: string;
  problem: string;
  discovery: string;
  technical_context: string;
  stakeholders: string[];
  tools: string[];
  actions: string[];
  results: string[];
  verified_metrics: string[];
  keywords: string[];
}

export interface SkillsCatalog {
  product_management: string[];
  fintech_and_payments: string[];
  technical_and_apis: string[];
  analytics_and_tools: string[];
  methodologies: string[];
  industries: string[];
}
