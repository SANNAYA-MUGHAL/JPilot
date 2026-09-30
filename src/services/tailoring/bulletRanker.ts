import type { ParsedJobDescription } from '../../types/job.js';
import type { FactItem, ProjectRecord } from '../../types/candidate.js';

export interface ScoredBullet {
  fact_id: string;
  text: string;
  score: number;
  matched_terms: string[];
}

export interface ScoredProject {
  project: ProjectRecord;
  score: number;
  matched_terms: string[];
}

export class BulletRanker {
  /**
   * Score and sort candidate experience bullets against JD requirements.
   */
  public static rankBullets(bullets: FactItem[], jd: ParsedJobDescription): ScoredBullet[] {
    const jdKeywords = [
      ...jd.must_have_skills,
      ...jd.nice_to_have_skills,
      ...jd.tools,
      ...jd.technologies_and_apis,
      ...jd.domains,
      ...jd.ats_keywords,
    ].map((k) => k.toLowerCase());

    const jdText = jd.raw_text.toLowerCase();

    return bullets
      .map((b) => {
        const textLower = b.text.toLowerCase();
        let score = 0;
        const matchedTerms: string[] = [];

        for (const kw of jdKeywords) {
          if (kw.length > 2 && textLower.includes(kw)) {
            score += 10;
            matchedTerms.push(kw);
          }
        }

        // Bonus for verified metrics
        if (/\d+%|\$\d+/.test(b.text)) {
          score += 5;
        }

        // Bonus if words in bullet appear in JD responsibilities
        for (const resp of jd.responsibilities) {
          const respWords = resp.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
          for (const word of respWords) {
            if (textLower.includes(word) && !matchedTerms.includes(word)) {
              score += 2;
              matchedTerms.push(word);
            }
          }
        }

        return {
          fact_id: b.fact_id,
          text: b.text,
          score,
          matched_terms: Array.from(new Set(matchedTerms)),
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Score and sort candidate projects based on JD relevance.
   */
  public static rankProjects(projects: ProjectRecord[], jd: ParsedJobDescription): ScoredProject[] {
    const targetTerms = [
      ...jd.must_have_skills,
      ...jd.tools,
      ...jd.technologies_and_apis,
      ...jd.domains,
      ...jd.ats_keywords,
    ].map((t) => t.toLowerCase());

    return projects
      .map((prj) => {
        let score = 0;
        const matchedTerms: string[] = [];
        const prjBlob = (
          prj.project_name +
          ' ' +
          prj.problem +
          ' ' +
          prj.technical_context +
          ' ' +
          prj.keywords.join(' ') +
          ' ' +
          prj.tools.join(' ')
        ).toLowerCase();

        for (const term of targetTerms) {
          if (term.length > 2 && prjBlob.includes(term)) {
            score += 15;
            matchedTerms.push(term);
          }
        }

        return {
          project: prj,
          score,
          matched_terms: Array.from(new Set(matchedTerms)),
        };
      })
      .sort((a, b) => b.score - a.score);
  }
}
