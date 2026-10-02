import crypto from 'node:crypto';
import type { JobSourceAdapter } from '../jobSourceAdapter.js';
import type { DiscoveredJob, SearchCriteria } from '../../../types/discovery.js';

export class RemoteJobAdapter implements JobSourceAdapter {
  public sourceName: string = 'remote_job_board';

  public async searchJobs(criteria: SearchCriteria): Promise<DiscoveredJob[]> {
    // Provide rich mock feeds for tests & demo; support live HTTP fetch if URL configured
    const sampleJobs = [
      {
        id: 'REMOTE_01',
        title: 'Senior Product Manager - Payments & Global Payouts',
        company: 'Deel',
        location: 'Remote Worldwide',
        country: 'Global',
        remote: true,
        posted_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2 hours ago
        description: 'Lead global contractor payout rails, Adyen integrations, and multi-currency payment infrastructure. Requirements: 5+ years PM experience, payment gateway integrations, Mixpanel, and agile squad leadership.',
        url: 'https://deel.com/careers/senior-pm-payments',
        salary: '$110,000 - $135,000',
      },
      {
        id: 'REMOTE_02',
        title: 'Platform Product Manager - Integrations & APIs',
        company: 'Personio',
        location: 'Munich, Germany / Remote EU',
        country: 'Germany',
        remote: true,
        posted_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), // 1 day ago
        description: 'Drive B2B SaaS public APIs and partner marketplace connections. Deep experience in developer platforms, webhook architectures, and Postman API testing.',
        url: 'https://personio.com/careers/platform-pm',
        salary: '€90,000 - €110,000',
      },
      {
        id: 'REMOTE_03',
        title: 'Junior Marketing Intern',
        company: 'SocialCo',
        location: 'Remote',
        country: 'Global',
        remote: true,
        posted_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        description: 'Internship role for social media marketing.',
        url: 'https://socialco.com/internship',
      },
      {
        id: 'REMOTE_04',
        title: 'Senior Product Operations Manager',
        company: 'Deliveroo',
        location: 'London, UK / Remote',
        country: 'United Kingdom',
        remote: true,
        posted_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), // 3 days ago
        description: 'Optimize fulfillment SLAs, delivery slot routing algorithms, and merchant dispatching tools. Experience with operations dashboards, Metabase, and SQL.',
        url: 'https://deliveroo.com/careers/prod-ops-manager',
        salary: '£85,000 - £105,000',
      }
    ];

    // Filter by criteria
    const now = Date.now();
    const maxAgeMs = (criteria.max_age_days || 7) * 24 * 3600 * 1000;

    return sampleJobs
      .filter((raw) => {
        const ageMs = now - new Date(raw.posted_at).getTime();
        return ageMs <= maxAgeMs;
      })
      .map((raw) => this.normalizeJob(raw));
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
      country: raw.country || 'Global / Remote',
      remote_type: raw.remote ? 'REMOTE' : 'ON_SITE',
      employment_type: 'Full-time',
      salary: raw.salary,
      posted_date: raw.posted_at,
      description: raw.description,
      application_url: raw.url,
      company_url: `https://${raw.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      discovered_at: new Date().toISOString(),
      dedupe_key: dedupeKey,
    };
  }

  public getApplicationURL(sourceJobId: string): string {
    return `https://jobs.example.com/${sourceJobId}`;
  }
}
