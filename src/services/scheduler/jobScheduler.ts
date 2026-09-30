import { JobDiscoveryEngine, DiscoveryBatchReport } from '../discovery/jobDiscoveryEngine.js';
import type { SearchCriteria } from '../../types/discovery.js';

export type ScheduleCadence = '6h' | 'daily' | 'manual';

export class JobScheduler {
  private engine: JobDiscoveryEngine;
  private cadence: ScheduleCadence = '6h';
  private timer: NodeJS.Timeout | null = null;
  private runHistory: DiscoveryBatchReport[] = [];
  private isRunning: boolean = false;

  constructor(engine: JobDiscoveryEngine, cadence: ScheduleCadence = '6h') {
    this.engine = engine;
    this.cadence = cadence;
  }

  public setCadence(cadence: ScheduleCadence): void {
    this.cadence = cadence;
    if (this.timer) {
      this.stop();
      this.start();
    }
  }

  public async triggerNow(criteria?: SearchCriteria): Promise<DiscoveryBatchReport> {
    if (this.isRunning) {
      throw new Error('A discovery run is already actively in progress.');
    }

    this.isRunning = true;
    try {
      const defaultCriteria: SearchCriteria = criteria || {
        role_keywords: ['Product Manager', 'FinTech', 'SaaS', 'Payments'],
        locations: ['Remote Worldwide', 'Europe', 'UK', 'UAE'],
        remote_only: false,
        max_age_days: 7,
      };

      const report = await this.engine.runDiscovery(defaultCriteria);
      this.runHistory.push(report);
      return report;
    } finally {
      this.isRunning = false;
    }
  }

  public start(): void {
    if (this.cadence === 'manual') return;

    const intervalMs = this.cadence === '6h' ? 6 * 3600 * 1000 : 24 * 3600 * 1000;
    this.timer = setInterval(() => {
      this.triggerNow().catch((err) => console.error(`Scheduled run error: ${err.message}`));
    }, intervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public getHistory(): DiscoveryBatchReport[] {
    return this.runHistory;
  }
}
