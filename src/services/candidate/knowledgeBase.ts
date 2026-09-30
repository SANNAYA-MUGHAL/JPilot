import fs from 'node:fs';
import path from 'node:path';
import type {
  CandidateProfile,
  EmploymentRecord,
  ProjectRecord,
  SkillsCatalog,
  FactItem,
} from '../../types/candidate.js';

export interface VerifiedFact {
  fact_id: string;
  text: string;
  company?: string;
  source: 'responsibility' | 'achievement' | 'project' | 'metric';
}

export class CandidateKnowledgeBase {
  private baseDir: string;
  private profile!: CandidateProfile;
  private experiences!: EmploymentRecord[];
  private projects!: ProjectRecord[];
  private skills!: SkillsCatalog;
  private factCatalog: Map<string, VerifiedFact> = new Map();
  private masterResumeTemplate: string = '';

  constructor(customCandidateDir?: string) {
    this.baseDir = customCandidateDir || path.resolve(process.cwd(), 'candidate');
    this.loadAll();
  }

  private loadAll(): void {
    const profilePath = path.join(this.baseDir, 'candidate_profile.json');
    const expPath = path.join(this.baseDir, 'experience.json');
    const prjPath = path.join(this.baseDir, 'projects.json');
    const skillsPath = path.join(this.baseDir, 'skills.json');
    const resumeTexPath = path.join(this.baseDir, 'master_resume.tex');

    if (!fs.existsSync(profilePath)) {
      throw new Error(`Candidate profile file not found at: ${profilePath}`);
    }

    const rawProfile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    this.profile = rawProfile.candidate_profile;

    const rawExp = JSON.parse(fs.readFileSync(expPath, 'utf8'));
    this.experiences = rawExp.employment_history;

    const rawPrj = JSON.parse(fs.readFileSync(prjPath, 'utf8'));
    this.projects = rawPrj.projects;

    const rawSkills = JSON.parse(fs.readFileSync(skillsPath, 'utf8'));
    this.skills = rawSkills.skills_catalog;

    if (fs.existsSync(resumeTexPath)) {
      this.masterResumeTemplate = fs.readFileSync(resumeTexPath, 'utf8');
    }

    this.buildFactCatalog();
  }

  private buildFactCatalog(): void {
    this.factCatalog.clear();

    for (const exp of this.experiences) {
      for (const resp of exp.responsibilities) {
        this.factCatalog.set(resp.fact_id, {
          fact_id: resp.fact_id,
          text: resp.text,
          company: exp.company,
          source: 'responsibility',
        });
      }

      for (const ach of exp.achievements) {
        this.factCatalog.set(ach.fact_id, {
          fact_id: ach.fact_id,
          text: ach.text,
          company: exp.company,
          source: 'achievement',
        });
      }
    }

    for (const prj of this.projects) {
      this.factCatalog.set(prj.project_id, {
        fact_id: prj.project_id,
        text: `${prj.project_name}: ${prj.problem} Actions: ${prj.actions.join(' ')} Results: ${prj.results.join(' ')}`,
        company: prj.company,
        source: 'project',
      });

      prj.verified_metrics.forEach((metric, idx) => {
        const metricId = `${prj.project_id}_M${idx + 1}`;
        this.factCatalog.set(metricId, {
          fact_id: metricId,
          text: metric,
          company: prj.company,
          source: 'metric',
        });
      });
    }
  }

  public getCandidateProfile(): CandidateProfile {
    return this.profile;
  }

  public getProfile(): CandidateProfile {
    return this.profile;
  }

  public getExperiences(): EmploymentRecord[] {
    return this.experiences;
  }

  public getProjects(): ProjectRecord[] {
    return this.projects;
  }

  public getSkills(): SkillsCatalog {
    return this.skills;
  }

  public getFactById(factId: string): VerifiedFact | undefined {
    return this.factCatalog.get(factId);
  }

  public getAllFactIds(): string[] {
    return Array.from(this.factCatalog.keys());
  }

  public getMasterResumeTemplate(): string {
    return this.masterResumeTemplate;
  }

  /**
   * Verified ground truth metric check:
   * Returns list of canonical metrics verified for candidate.
   */
  public getCanonicalMetrics(): string[] {
    const metrics: string[] = [];
    for (const exp of this.experiences) {
      for (const ach of exp.achievements) {
        const matches = ach.text.match(/\d+%/g);
        if (matches) metrics.push(...matches);
      }
    }
    for (const prj of this.projects) {
      metrics.push(...prj.verified_metrics);
    }
    return metrics;
  }
}
