import fs from 'node:fs';
import path from 'node:path';
import { DashboardService, type JobSummaryItem } from '../dashboard/dashboardService.js';

export type TrackerStage =
  | 'DISCOVERED'
  | 'REVIEW_QUEUE'
  | 'READY_TO_APPLY'
  | 'APPLIED'
  | 'INTERVIEWING'
  | 'OFFER'
  | 'ARCHIVED';

export interface TrackedApplication {
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
  salary?: string;
  trello_url?: string;
  stage: TrackerStage;
  applied_date?: string;
  interview_date?: string;
  notes?: string;
  updated_at: string;
  hasResumePdf: boolean;
  hasCoverLetterPdf: boolean;
  is_expired?: boolean;
  visa_status?: string;
  expiration_reason?: string;
}

export interface TrackerData {
  summary: {
    total: number;
    discovered: number;
    review_queue: number;
    ready_to_apply: number;
    applied: number;
    interviewing: number;
    offer: number;
    archived: number;
    avg_match: number;
  };
  stages: Record<TrackerStage, TrackedApplication[]>;
  all_jobs: TrackedApplication[];
}

export class ApplicationTracker {
  private trackerFilePath: string;
  private dashboardService: DashboardService;

  constructor(trackerFilePath?: string, dashboardService?: DashboardService) {
    this.trackerFilePath =
      trackerFilePath || path.resolve(process.cwd(), 'applications/tracker.json');
    this.dashboardService = dashboardService || new DashboardService();
  }

  private loadSavedStages(): Record<string, { stage: TrackerStage; applied_date?: string; interview_date?: string; notes?: string }> {
    if (!fs.existsSync(this.trackerFilePath)) {
      return {};
    }
    try {
      return JSON.parse(fs.readFileSync(this.trackerFilePath, 'utf8'));
    } catch {
      return {};
    }
  }

  private saveStages(data: Record<string, { stage: TrackerStage; applied_date?: string; interview_date?: string; notes?: string }>): void {
    const dir = path.dirname(this.trackerFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.trackerFilePath, JSON.stringify(data, null, 2), 'utf8');
  }

  public getTrackerData(): TrackerData {
    const jobs = this.dashboardService.listAllJobs();
    const saved = this.loadSavedStages();

    const stages: Record<TrackerStage, TrackedApplication[]> = {
      DISCOVERED: [],
      REVIEW_QUEUE: [],
      READY_TO_APPLY: [],
      APPLIED: [],
      INTERVIEWING: [],
      OFFER: [],
      ARCHIVED: [],
    };

    const all_jobs: TrackedApplication[] = [];
    let totalScore = 0;

    for (const j of jobs) {
      const savedInfo = saved[j.id];
      // Default stage: if job is expired, automatically archive it
      const defaultStage: TrackerStage = j.is_expired ? 'ARCHIVED' : (j.matchScore >= 80 ? 'REVIEW_QUEUE' : 'DISCOVERED');
      const stage: TrackerStage = savedInfo ? savedInfo.stage : defaultStage;

      const tracked: TrackedApplication = {
        id: j.id,
        company: j.company,
        role: j.role,
        companyDir: j.companyDir,
        roleDir: j.roleDir,
        appDir: j.appDir,
        matchScore: j.matchScore,
        tier: j.tier,
        location: j.location,
        remote_policy: j.remote_policy,
        salary: j.salary,
        trello_url: j.trello_url,
        stage,
        applied_date: savedInfo?.applied_date,
        interview_date: savedInfo?.interview_date,
        notes: savedInfo?.notes || (j.is_expired ? j.expiration_reason : undefined),
        updated_at: j.date || new Date().toISOString(),
        hasResumePdf: j.hasResumePdf,
        hasCoverLetterPdf: j.hasCoverLetterPdf,
        is_expired: j.is_expired,
        visa_status: j.visa_status,
        expiration_reason: j.expiration_reason,
      };

      if (stages[stage]) {
        stages[stage].push(tracked);
      } else {
        stages.DISCOVERED.push(tracked);
      }
      all_jobs.push(tracked);
      totalScore += j.matchScore;
    }

    return {
      summary: {
        total: all_jobs.length,
        discovered: stages.DISCOVERED.length,
        review_queue: stages.REVIEW_QUEUE.length,
        ready_to_apply: stages.READY_TO_APPLY.length,
        applied: stages.APPLIED.length,
        interviewing: stages.INTERVIEWING.length,
        offer: stages.OFFER.length,
        archived: stages.ARCHIVED.length,
        avg_match: all_jobs.length > 0 ? Math.round(totalScore / all_jobs.length) : 0,
      },
      stages,
      all_jobs,
    };
  }

  public updateJobStage(
    jobId: string,
    stage: TrackerStage,
    notes?: string,
    applied_date?: string,
    interview_date?: string
  ): TrackedApplication | null {
    const saved = this.loadSavedStages();
    const current = saved[jobId] || { stage: 'REVIEW_QUEUE' };

    current.stage = stage;
    if (notes !== undefined) current.notes = notes;
    if (applied_date !== undefined) current.applied_date = applied_date;
    if (stage === 'APPLIED' && !current.applied_date) {
      current.applied_date = new Date().toISOString().split('T')[0];
    }
    if (interview_date !== undefined) current.interview_date = interview_date;

    saved[jobId] = current;
    this.saveStages(saved);

    const tracker = this.getTrackerData();
    return tracker.all_jobs.find((j) => j.id === jobId) || null;
  }
}
