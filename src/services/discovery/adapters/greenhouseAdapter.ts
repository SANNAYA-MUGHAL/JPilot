import crypto from 'node:crypto';
import type { JobSourceAdapter } from '../jobSourceAdapter.js';
import type { DiscoveredJob, SearchCriteria } from '../../../types/discovery.js';

export class GreenhouseAdapter implements JobSourceAdapter {
  public sourceName: string = 'greenhouse_ats';

  public async searchJobs(criteria: SearchCriteria): Promise<DiscoveredJob[]> {
    const mockGhJobs = [
      {
        id: 'GH_101',
        title: 'Lead Product Manager - Billing & Subscriptions',
        company: 'GitLab',
        location: 'Remote Worldwide',
        country: 'Global / Remote',
        remote: true,
        updated_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        content: 'Own subscription billing workflows, retention funnels, and enterprise checkout. Experience with SaaS billing, Mixpanel cohort analysis, and cross-functional engineering execution.',
        absolute_url: 'https://boards.greenhouse.io/gitlab/jobs/101',
      },
    ];

    return mockGhJobs.map((raw) => this.normalizeJob(raw));
  }

  public async getJobDetails(sourceJobId: string): Promise<DiscoveredJob | null> {
    const jobs = await this.searchJobs({ role_keywords: [], locations: [], remote_only: false, max_age_days: 7 });
    return jobs.find((j) => j.source_job_id === sourceJobId) || null;
  }

  public normalizeJob(raw: any): DiscoveredJob {
    const normCompany = raw.company.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const normTitle = raw.title.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const dedupeKey = `${normCompany}_${normTitle}_${raw.id}`;
    const hashId = 'JOB_' + crypto.createHash('md5').update(dedupeKey).digest('hex').slice(0, 10);

    return {
      job_id: hashId,
      source: this.sourceName,
      source_job_id: raw.id,
      title: raw.title,
      company: raw.company,
      location: raw.location,
      country: raw.country,
      remote_type: raw.remote ? 'REMOTE' : 'ON_SITE',
      employment_type: 'Full-time',
      posted_date: raw.updated_at,
      description: raw.content,
      application_url: raw.absolute_url,
      company_url: `https://${normCompany}.com`,
      discovered_at: new Date().toISOString(),
      dedupe_key: dedupeKey,
    };
  }

  public getApplicationURL(sourceJobId: string): string {
    return `https://boards.greenhouse.io/jobs/${sourceJobId}`;
  }
}
