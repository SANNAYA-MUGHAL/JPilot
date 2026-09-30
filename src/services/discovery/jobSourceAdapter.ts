import type { DiscoveredJob, SearchCriteria } from '../../types/discovery.js';

export interface JobSourceAdapter {
  sourceName: string;
  searchJobs(criteria: SearchCriteria): Promise<DiscoveredJob[]>;
  getJobDetails(sourceJobId: string): Promise<DiscoveredJob | null>;
  normalizeJob(rawPayload: any): DiscoveredJob;
  getApplicationURL(sourceJobId: string): string;
}
