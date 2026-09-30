import fs from 'node:fs';
import path from 'node:path';

export interface AppSettings {
  target_job_titles: string[];
  excluded_job_titles: string[];
  preferred_locations: string[];
  remote_preference: 'Remote Preferred' | 'Remote Only' | 'Hybrid' | 'Any';
  minimum_match_score: number;
  seniority_max_years: number;
  auto_create_trello: boolean;
  auto_generate_resume: boolean;
  auto_generate_cover_letter: boolean;
  human_approval_mode: boolean;
  job_run_schedule: '6h' | 'daily' | 'manual';
  trello_board_name: string;
}

export class SettingsManager {
  private settingsPath: string;
  private settings: AppSettings;

  public static readonly DEFAULT_SETTINGS: AppSettings = {
    target_job_titles: [
      'Product Manager',
      'Technical Product Manager',
      'Product Owner',
      'Platform Product Manager',
      'FinTech Product Manager',
      'SaaS Product Manager',
      'Product Operations Manager',
    ],
    excluded_job_titles: ['Intern', 'Working Student', 'Nurse', 'Hardware Engineer', 'Sales Rep'],
    preferred_locations: ['Remote Worldwide', 'Europe', 'UK', 'UAE', 'Germany', 'Netherlands', 'France'],
    remote_preference: 'Remote Preferred',
    minimum_match_score: 65,
    seniority_max_years: 10,
    auto_create_trello: true,
    auto_generate_resume: true,
    auto_generate_cover_letter: true,
    human_approval_mode: true,
    job_run_schedule: '6h',
    trello_board_name: 'AI Job Applications',
  };

  constructor(customConfigPath?: string) {
    this.settingsPath = customConfigPath || path.resolve(process.cwd(), 'config/settings.json');
    this.settings = { ...SettingsManager.DEFAULT_SETTINGS };
    this.loadSettings();
  }

  private loadSettings(): void {
    if (fs.existsSync(this.settingsPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
        this.settings = { ...this.settings, ...raw };
      } catch (err: any) {
        console.warn(`Failed to parse settings at ${this.settingsPath}: ${err.message}`);
      }
    }
  }

  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AppSettings>): AppSettings {
    this.settings = { ...this.settings, ...partial };
    const dir = path.dirname(this.settingsPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf8');
    return { ...this.settings };
  }
}
