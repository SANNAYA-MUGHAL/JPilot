import type { JobSourceAdapter } from './jobSourceAdapter.js';
import type { DiscoveredJob, SearchCriteria } from '../../types/discovery.js';
import type { PipelinePackageResult } from '../orchestrator/phase1Pipeline.js';
import { DeduplicationAgent } from './deduplicationAgent.js';
import { EligibilityFilter } from './eligibilityFilter.js';
import { Phase1Pipeline } from '../orchestrator/phase1Pipeline.js';

export interface DiscoveryBatchReport {
  run_id: string;
  started_at: string;
  completed_at: string;
  total_discovered: number;
  duplicates_skipped: number;
  hard_filtered: number;
  jobs_processed: number;
  packages_generated: number;
  errors_count: number;
  results: {
    job_id: string;
    company: string;
    title: string;
    status: 'PROCESSED' | 'DUPLICATE' | 'FILTERED' | 'ERROR';
    match_score?: number;
    reason?: string;
    trello_card_url?: string;
  }[];
}

export class JobDiscoveryEngine {
  private adapters: JobSourceAdapter[] = [];
  private dedupeAgent: DeduplicationAgent;
  private eligibilityFilter: EligibilityFilter;
  private pipeline: Phase1Pipeline;

  constructor(
    adapters?: JobSourceAdapter[],
    dedupeAgent?: DeduplicationAgent,
    eligibilityFilter?: EligibilityFilter,
    pipeline?: Phase1Pipeline
  ) {
    this.adapters = adapters || [];
    this.dedupeAgent = dedupeAgent || new DeduplicationAgent();
    this.eligibilityFilter = eligibilityFilter || new EligibilityFilter();
    this.pipeline = pipeline || new Phase1Pipeline();
  }

  public registerAdapter(adapter: JobSourceAdapter): void {
    this.adapters.push(adapter);
  }

  public async runDiscovery(criteria: SearchCriteria): Promise<DiscoveryBatchReport> {
    const runId = 'RUN_' + Date.now();
    const startTime = new Date().toISOString();
    const report: DiscoveryBatchReport = {
      run_id: runId,
      started_at: startTime,
      completed_at: '',
      total_discovered: 0,
      duplicates_skipped: 0,
      hard_filtered: 0,
      jobs_processed: 0,
      packages_generated: 0,
      errors_count: 0,
      results: [],
    };

    // 1. Fetch from all registered adapters
    const allDiscovered: DiscoveredJob[] = [];
    for (const adapter of this.adapters) {
      try {
        const jobs = await adapter.searchJobs(criteria);
        allDiscovered.push(...jobs);
      } catch (err: any) {
        console.warn(`Adapter ${adapter.sourceName} discovery error: ${err.message}`);
        report.errors_count++;
      }
    }

    report.total_discovered = allDiscovered.length;

    // 2. Process each job with failure isolation
    for (const job of allDiscovered) {
      // Step A: Deduplication Check
      const dedupe = this.dedupeAgent.isDuplicate(job);
      if (dedupe.isDuplicate) {
        report.duplicates_skipped++;
        report.results.push({
          job_id: job.job_id,
          company: job.company,
          title: job.title,
          status: 'DUPLICATE',
          reason: dedupe.reason,
        });
        continue;
      }

      // Step B: Hard Eligibility Filter
      const elig = this.eligibilityFilter.checkEligibility(job);
      if (!elig.eligible) {
        report.hard_filtered++;
        report.results.push({
          job_id: job.job_id,
          company: job.company,
          title: job.title,
          status: 'FILTERED',
          reason: elig.reason,
        });
        // Record as seen so we don't re-filter on subsequent runs
        this.dedupeAgent.recordJob(job, false);
        continue;
      }

      // Step C: Execute Agent Pipeline
      try {
        report.jobs_processed++;
        const pkg: PipelinePackageResult = await this.pipeline.execute({
          raw_jd_text: `${job.title} at ${job.company}\nLocation: ${job.location}\n${job.description}`,
          source_url: job.application_url,
          title_hint: job.title,
          company_hint: job.company,
          location_hint: job.location,
          enable_trello: true,
        });

        report.packages_generated++;
        this.dedupeAgent.recordJob(job, true);

        report.results.push({
          job_id: job.job_id,
          company: job.company,
          title: job.title,
          status: 'PROCESSED',
          match_score: pkg.match.overall_score,
          trello_card_url: pkg.trello?.card_url,
        });
      } catch (err: any) {
        report.errors_count++;
        report.results.push({
          job_id: job.job_id,
          company: job.company,
          title: job.title,
          status: 'ERROR',
          reason: err.message,
        });
      }
    }

    report.completed_at = new Date().toISOString();
    return report;
  }
}
