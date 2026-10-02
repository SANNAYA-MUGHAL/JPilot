import type { DiscoveredJob, EligibilityResult } from '../../types/discovery.js';
import { CandidateKnowledgeBase } from '../candidate/knowledgeBase.js';

export class EligibilityFilter {
  private kb: CandidateKnowledgeBase;
  public allowInternships: boolean = false;
  public maxSeniorityYears: number = 10;

  constructor(knowledgeBase?: CandidateKnowledgeBase) {
    this.kb = knowledgeBase || new CandidateKnowledgeBase();
  }

  public checkEligibility(job: DiscoveredJob): EligibilityResult {
    const flags: string[] = [];
    const lowerTitle = job.title.toLowerCase();
    const lowerDesc = job.description.toLowerCase();

    // 1. Internship Filter
    if (!this.allowInternships) {
      if (lowerTitle.includes('intern') || lowerTitle.includes('internship') || lowerTitle.includes('working student')) {
        return {
          eligible: false,
          reason: 'Hard filter: Internships and working student roles are excluded.',
          flags: ['INTERNSHIP_EXCLUDED'],
        };
      }
    }

    // 2. Irrelevant Professions Filter
    const excludedTitles = [
      'nurse', 'physician', 'attorney', 'legal counsel', 'hardware engineer',
      'firmware', 'civil engineer', 'construction', 'warehouse', 'sales representative',
      'customer support agent', 'graphic designer', 'social media intern'
    ];

    for (const excl of excludedTitles) {
      if (lowerTitle.includes(excl) && !lowerTitle.includes('product')) {
        return {
          eligible: false,
          reason: `Hard filter: Irrelevant profession detected (${excl}).`,
          flags: ['IRRELEVANT_ROLE'],
        };
      }
    }

    // 3. Language Barrier Check
    // Candidate languages: English (Fluent), Urdu (Native)
    const requiredForeignLanguages = [
      { name: 'German', pattern: /(?:fluent|native|mandatory|required)\s+german|deutsch\s+(?:c1|c2|verhandlungssicher)/i },
      { name: 'French', pattern: /(?:fluent|native|mandatory|required)\s+french|fran[çc]ais\s+(?:courant|bilingue)/i },
      { name: 'Spanish', pattern: /(?:fluent|native|mandatory|required)\s+spanish/i },
      { name: 'Japanese', pattern: /(?:fluent|native|mandatory|required)\s+japanese|n1\s+required/i },
    ];

    for (const lang of requiredForeignLanguages) {
      if (lang.pattern.test(job.description)) {
        flags.push(`LANGUAGE_BARRIER_${lang.name.toUpperCase()}`);
        return {
          eligible: false,
          reason: `Hard filter: Mandatory ${lang.name} fluency required which is outside candidate verified languages.`,
          flags,
        };
      }
    }

    // 4. Excessive Seniority Check
    const expMatch = job.description.match(/(\d+)\+?\s*(?:years|yrs)\s*(?:of)?\s*experience/i);
    if (expMatch && expMatch[1]) {
      const years = parseInt(expMatch[1], 10);
      if (years > this.maxSeniorityYears) {
        flags.push('EXCESSIVE_SENIORITY');
        return {
          eligible: false,
          reason: `Hard filter: Job requires ${years}+ years, significantly exceeding candidate profile (7 years).`,
          flags,
        };
      }
    }

    // 5. Visa Sponsorship & In-Country Relocation Hard Filter
    // Candidate is based in Pakistan and does not hold foreign work visas.
    // Roles that require visa sponsorship, require local work authorization,
    // or demand physical relocation are strictly skipped.
    const textAndLoc = `${job.title} ${job.location || ''} ${job.country || ''} ${job.description}`.toLowerCase();

    const isExplicitWorldwide =
      textAndLoc.includes('remote worldwide') ||
      textAndLoc.includes('work from anywhere') ||
      textAndLoc.includes('anywhere in the world') ||
      textAndLoc.includes('global remote') ||
      textAndLoc.includes('b2b contract') ||
      textAndLoc.includes('hire via deel') ||
      textAndLoc.includes('hire via remote.com');

    const visaAndLocExclusions = [
      'visa sponsorship required',
      'visa sponsorship provided',
      'visa sponsorship available',
      'requires visa sponsorship',
      'relocation package',
      'relocation assistance',
      'relocation support',
      'relocation provided',
      'willing to relocate',
      'must have right to work in',
      'must be authorized to work in',
      'legally authorized to work in',
      'without sponsorship',
      'no visa sponsorship',
      'cannot sponsor',
      'unable to sponsor',
      'hybrid',
      'on-site',
      'onsite',
      'in-office'
    ];

    if (!isExplicitWorldwide) {
      for (const exclusion of visaAndLocExclusions) {
        if (textAndLoc.includes(exclusion)) {
          flags.push('VISA_OR_RELOCATION_DISQUALIFIED');
          return {
            eligible: false,
            reason: `Hard filter: Job requires visa sponsorship, local work authorization, or physical relocation (${exclusion}). Candidate requires 100% Remote Worldwide / B2B without visa dependency.`,
            flags,
          };
        }
      }
    } else {
      if (
        textAndLoc.includes('visa sponsorship required') ||
        textAndLoc.includes('must have right to work in the uk') ||
        textAndLoc.includes('must have right to work in the us') ||
        textAndLoc.includes('must have right to work in the eu')
      ) {
        flags.push('VISA_SPONSORSHIP_RESTRICTED');
        return {
          eligible: false,
          reason: 'Hard filter: Role restricts to candidates possessing existing in-country work authorization or requiring local visa.',
          flags,
        };
      }
    }

    return {
      eligible: true,
      flags,
    };
  }
}
