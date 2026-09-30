import fs from 'node:fs';
import path from 'node:path';
import type { DiscoveredJob } from '../../types/discovery.js';

export interface DeduplicationRecord {
  dedupe_key: string;
  job_id: string;
  company: string;
  title: string;
  application_url: string;
  processed: boolean;
  discovered_at: string;
}

export class DeduplicationAgent {
  private registry: Map<string, DeduplicationRecord> = new Map();
  private registryFilePath?: string;

  constructor(customRegistryPath?: string) {
    if (customRegistryPath) {
      this.registryFilePath = customRegistryPath;
      this.loadRegistry();
    }
  }

  private loadRegistry(): void {
    if (this.registryFilePath && fs.existsSync(this.registryFilePath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(this.registryFilePath, 'utf8'));
        for (const item of raw) {
          this.registry.set(item.dedupe_key, item);
        }
      } catch (err: any) {
        console.warn(`Failed to load deduplication registry: ${err.message}`);
      }
    }
  }

  private saveRegistry(): void {
    if (this.registryFilePath) {
      try {
        const dir = path.dirname(this.registryFilePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const data = Array.from(this.registry.values());
        fs.writeFileSync(this.registryFilePath, JSON.stringify(data, null, 2), 'utf8');
      } catch (err: any) {
        console.warn(`Failed to save deduplication registry: ${err.message}`);
      }
    }
  }

  public isDuplicate(job: DiscoveredJob): { isDuplicate: boolean; reason?: string; existingJobId?: string } {
    // 1. Exact Dedupe Key Check
    if (this.registry.has(job.dedupe_key)) {
      const match = this.registry.get(job.dedupe_key)!;
      return {
        isDuplicate: true,
        reason: `Exact match found for key: ${job.dedupe_key}`,
        existingJobId: match.job_id,
      };
    }

    // 2. URL Match Check
    for (const record of this.registry.values()) {
      if (
        job.application_url &&
        record.application_url &&
        job.application_url.toLowerCase().trim() === record.application_url.toLowerCase().trim()
      ) {
        return {
          isDuplicate: true,
          reason: `Matching application URL: ${job.application_url}`,
          existingJobId: record.job_id,
        };
      }

      // 3. Fuzzy Match: Same company + Similar Title
      const normCompA = job.company.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normCompB = record.company.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (normCompA === normCompB) {
        const titleSim = this.calculateStringSimilarity(job.title, record.title);
        if (titleSim >= 0.85) {
          return {
            isDuplicate: true,
            reason: `Fuzzy duplicate at same company (${job.company}) with ${Math.round(titleSim * 100)}% title similarity: "${job.title}" vs "${record.title}"`,
            existingJobId: record.job_id,
          };
        }
      }
    }

    return { isDuplicate: false };
  }

  public recordJob(job: DiscoveredJob, processed: boolean = false): void {
    this.registry.set(job.dedupe_key, {
      dedupe_key: job.dedupe_key,
      job_id: job.job_id,
      company: job.company,
      title: job.title,
      application_url: job.application_url,
      processed,
      discovered_at: job.discovered_at,
    });
    this.saveRegistry();
  }

  private calculateStringSimilarity(strA: string, strB: string): number {
    const a = strA.toLowerCase().replace(/[^a-z0-9]/g, '');
    const b = strB.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (a === b) return 1.0;
    if (a.length === 0 || b.length === 0) return 0;

    let matches = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      if (a[i] === b[i]) matches++;
    }
    return matches / Math.max(a.length, b.length);
  }
}
