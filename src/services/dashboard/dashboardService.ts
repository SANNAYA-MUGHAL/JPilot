import fs from 'node:fs';
import path from 'node:path';
import type { ResumeDiffChange } from '../../types/analytics.js';
import type { TailoredResumeAST } from '../../types/resume.js';
import type { ParsedJobDescription } from '../../types/job.js';
import type { MatchResult } from '../../types/match.js';
import { CandidateKnowledgeBase } from '../candidate/knowledgeBase.js';
export interface JobSummaryItem {
  id: string;
  company: string;
  role: string;
  companyDir: string;
  roleDir: string;
  appDir: string;
  matchScore: number;
  tier: string;
  location: string;
  remote_policy: string;
  date: string;
  salary?: string;
  trello_url?: string;
  hasResumePdf: boolean;
  hasCoverLetterPdf: boolean;
  hasTex: boolean;
}

export interface JobDetailsTabs {
  overview: {
    company: string;
    role: string;
    location: string;
    salary?: string;
    remote_status: string;
    date: string;
    source: string;
    job_url?: string;
    status: string;
  };
  jd_analysis: {
    must_haves: string[];
    nice_to_haves: string[];
    responsibilities: string[];
    skills: string[];
    tools: string[];
    technologies_and_apis: string[];
    ats_keywords: string[];
  };
  match_analysis: {
    overall_score: number;
    tier: string;
    breakdown: any;
    strengths: string[];
    gaps: string[];
    risks: string[];
  };
  resume: {
    diff_changes: ResumeDiffChange[];
    latex_path: string;
    pdf_path: string;
  };
  cover_letter: {
    markdown_content: string;
    word_count: number;
    pdf_path: string;
  };
  trello?: {
    card_id: string;
    card_title: string;
    card_url: string;
    list_name: string;
  };
  history: { event: string; timestamp: string }[];
}

export class DashboardService {
  private kb: CandidateKnowledgeBase;

  constructor(kb?: CandidateKnowledgeBase) {
    this.kb = kb || new CandidateKnowledgeBase();
  }

  public getJobDetails(appDir: string): JobDetailsTabs {
    const jobJson = JSON.parse(fs.readFileSync(path.join(appDir, 'job.json'), 'utf8')) as ParsedJobDescription;
    const matchJson = JSON.parse(fs.readFileSync(path.join(appDir, 'match_analysis.json'), 'utf8')) as MatchResult;
    const metaJson = JSON.parse(fs.readFileSync(path.join(appDir, 'application_metadata.json'), 'utf8'));
    const coverLetterMd = fs.readFileSync(path.join(appDir, 'cover_letter.md'), 'utf8');

    // Generate Resume Diff Explainability
    const diffChanges = this.generateResumeDiffExplainability(jobJson, matchJson);

    return {
      overview: {
        company: jobJson.company,
        role: jobJson.title,
        location: jobJson.location,
        salary: jobJson.salary_range,
        remote_status: jobJson.remote_policy,
        date: metaJson.created_at,
        source: jobJson.source_url || 'Manual Input',
        job_url: jobJson.source_url,
        status: metaJson.tier,
      },
      jd_analysis: {
        must_haves: jobJson.must_have_skills,
        nice_to_haves: jobJson.nice_to_have_skills,
        responsibilities: jobJson.responsibilities,
        skills: jobJson.must_have_skills,
        tools: jobJson.tools,
        technologies_and_apis: jobJson.technologies_and_apis,
        ats_keywords: jobJson.ats_keywords,
      },
      match_analysis: {
        overall_score: matchJson.overall_score,
        tier: matchJson.tier,
        breakdown: matchJson.breakdown,
        strengths: matchJson.strong_matches,
        gaps: [...matchJson.missing_mandatory, ...matchJson.missing_preferred],
        risks: matchJson.application_risks,
      },
      resume: {
        diff_changes: diffChanges,
        latex_path: path.join(appDir, 'tailored_resume.tex'),
        pdf_path: path.join(appDir, 'tailored_resume.pdf'),
      },
      cover_letter: {
        markdown_content: coverLetterMd,
        word_count: coverLetterMd.trim().split(/\s+/).length,
        pdf_path: path.join(appDir, 'cover_letter.pdf'),
      },
      trello: metaJson.trello || undefined,
      history: [
        { event: 'Job Discovered & Extracted', timestamp: jobJson.discovered_at },
        { event: 'Semantic Match Analysis Completed', timestamp: metaJson.created_at },
        { event: 'Master Resume Tailored & Fact-Verified', timestamp: metaJson.created_at },
        { event: 'LaTeX & PDF Resume Compiled', timestamp: metaJson.created_at },
        { event: 'Tailored Cover Letter Generated', timestamp: metaJson.created_at },
        { event: 'Trello Application Card Created', timestamp: metaJson.created_at },
      ],
    };
  }

  public generateResumeDiffExplainability(
    jd: ParsedJobDescription,
    match: MatchResult
  ): ResumeDiffChange[] {
    const changes: ResumeDiffChange[] = [];

    // Headline change
    changes.push({
      section: 'Professional Headline',
      type: 'ADDED/EMPHASIZED',
      item: `Tailored headline for ${jd.title}`,
      reason: `Aligned headline with target domain (${jd.domains.join(' / ') || 'Product Management'})`,
    });

    // Payment/FinTech bullet explainability
    if (jd.domains.includes('FinTech') || jd.raw_text.toLowerCase().includes('payment')) {
      changes.push({
        section: 'Professional Experience (Bayut)',
        type: 'ADDED/EMPHASIZED',
        item: 'Multi-gateway fallback routing (Adyen & MangoPay)',
        reason: 'JD emphasizes payment gateway integrations and checkout conversion.',
        source_fact_ids: ['BAYUT_ACHIEVE_01'],
      });

      changes.push({
        section: 'Key Projects',
        type: 'REORDERED',
        item: 'Multi-Vendor Marketplace Split Payments & Escrow Orchestration',
        reason: 'Prioritized to #1 project position due to direct payment rails and escrow relevance.',
        source_fact_ids: ['PRJ_MANGOPAY_SPLIT'],
      });
    }

    // Analytics explainability
    if (jd.tools.includes('Mixpanel') || jd.raw_text.toLowerCase().includes('analytics')) {
      changes.push({
        section: 'Professional Experience (Bayut)',
        type: 'ADDED/EMPHASIZED',
        item: 'Subscription cancellation flow redesign using Mixpanel & CleverTap',
        reason: 'JD emphasizes product analytics, conversion drop-off analysis, and retention metrics.',
        source_fact_ids: ['BAYUT_ACHIEVE_02'],
      });
    }

    // Core Competency ordering
    changes.push({
      section: 'Core Competencies',
      type: 'REORDERED',
      item: 'Reordered competency category blocks',
      reason: 'Front-loaded high-frequency JD ATS keywords.',
    });

    return changes;
  }

  public listAllJobs(appsBaseDir?: string): JobSummaryItem[] {
    const baseDir = appsBaseDir || path.resolve(process.cwd(), 'applications');
    const jobs: JobSummaryItem[] = [];
    if (!fs.existsSync(baseDir)) return jobs;

    const companies = fs.readdirSync(baseDir);
    for (const comp of companies) {
      const compPath = path.join(baseDir, comp);
      if (!fs.statSync(compPath).isDirectory()) continue;
      const roles = fs.readdirSync(compPath);
      for (const roleDir of roles) {
        const appDir = path.join(compPath, roleDir);
        if (!fs.statSync(appDir).isDirectory()) continue;
        const metaPath = path.join(appDir, 'application_metadata.json');
        const jobPath = path.join(appDir, 'job.json');
        const matchPath = path.join(appDir, 'match_analysis.json');
        if (fs.existsSync(metaPath) && fs.existsSync(jobPath)) {
          try {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            const job = JSON.parse(fs.readFileSync(jobPath, 'utf8')) as ParsedJobDescription;
            const match = fs.existsSync(matchPath) ? JSON.parse(fs.readFileSync(matchPath, 'utf8')) as MatchResult : null;
            jobs.push({
              id: meta.job_id || job.job_id,
              company: job.company,
              role: job.title,
              companyDir: comp,
              roleDir,
              appDir,
              matchScore: meta.overall_match ?? match?.overall_score ?? 0,
              tier: meta.tier ?? match?.tier ?? 'UNKNOWN',
              location: job.location,
              remote_policy: job.remote_policy,
              date: meta.created_at || job.discovered_at,
              salary: job.salary_range,
              trello_url: meta.trello?.card_url,
              hasResumePdf: fs.existsSync(path.join(appDir, 'tailored_resume.pdf')),
              hasCoverLetterPdf: fs.existsSync(path.join(appDir, 'cover_letter.pdf')),
              hasTex: fs.existsSync(path.join(appDir, 'tailored_resume.tex')),
            });
          } catch (e) {
            // ignore malformed
          }
        }
      }
    }

    return jobs.sort((a, b) => b.matchScore - a.matchScore);
  }

  public getCandidateProfile() {
    return {
      profile: this.kb.getProfile(),
      experience: this.kb.getExperiences(),
      projects: this.kb.getProjects(),
      skills: this.kb.getSkills(),
      verified_fact_count: this.kb.getAllFactIds().length,
    };
  }
}

