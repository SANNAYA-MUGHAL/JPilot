import type { ParsedJobDescription } from '../../types/job.js';
import type { MatchResult } from '../../types/match.js';
import type {
  TailoredResumeAST,
  TailoredExperienceItem,
  TailoredProjectItem,
  TailoredBullet,
} from '../../types/resume.js';
import { CandidateKnowledgeBase } from '../candidate/knowledgeBase.js';
import { BulletRanker } from './bulletRanker.js';
import { ClaudeClient } from '../ai/claudeClient.js';

export class ResumeTailoringAgent {
  private kb: CandidateKnowledgeBase;
  private claude: ClaudeClient;

  constructor(knowledgeBase?: CandidateKnowledgeBase, claudeClient?: ClaudeClient) {
    this.kb = knowledgeBase || new CandidateKnowledgeBase();
    this.claude = claudeClient || new ClaudeClient();
  }

  public async tailorResume(
    jd: ParsedJobDescription,
    match: MatchResult
  ): Promise<TailoredResumeAST> {
    const profile = this.kb.getCandidateProfile();
    const experiences = this.kb.getExperiences();
    const projects = this.kb.getProjects();
    const skills = this.kb.getSkills();

    // 1. Dynamic Headline Formulation
    const primaryFocus = jd.domains.length > 0 ? jd.domains.slice(0, 2).join(' & ') : 'FinTech & SaaS';
    const headline = `Senior Product Manager — ${primaryFocus}, Payments & Platform Integrations`;

    // 2. Tailored Professional Summary
    let summary = profile.professional_summary;

    if (this.claude.isAvailable()) {
      try {
        const systemPrompt = `You are an elite Executive Resume Strategist.
Tailor the candidate's professional summary to emphasize relevance to the target job description.
CRITICAL CONSTRAINT: You MUST NOT invent any employer, metric, date, certification, or tool.
Every fact mentioned MUST come directly from the candidate profile summary.
Keep length to 3-4 impactful sentences (approx 70-90 words).`;

        const userPrompt = `Target Job Title: ${jd.title} at ${jd.company}
Target JD Keywords: ${jd.ats_keywords.join(', ')}
Candidate Master Summary:
${profile.professional_summary}`;

        const aiSummary = await this.claude.complete({
          systemPrompt,
          userPrompt,
          temperature: 0.1,
          maxTokens: 250,
        });

        if (aiSummary && aiSummary.trim().length > 50) {
          summary = aiSummary.trim();
        }
      } catch (err: any) {
        console.warn(`Claude summary tailoring fallback: ${err.message}`);
      }
    }

    // 3. Competencies Ordering based on JD
    const isPaymentHeavy = jd.domains.includes('FinTech') || jd.technologies_and_apis.includes('Adyen') || jd.raw_text.toLowerCase().includes('payment');
    const isAnalyticsHeavy = jd.tools.includes('Mixpanel') || jd.raw_text.toLowerCase().includes('analytics') || jd.raw_text.toLowerCase().includes('metric');

    let competencies = {
      product_strategy: 'Product Roadmapping, PRDs & User Stories, Backlog Grooming, Customer Discovery, Agile/Scrum, A/B Testing, Funnel & Conversion Optimization',
      fintech_payments: 'Payment Gateways (Adyen, MangoPay, Tabby), Split Payments, Escrow, Digital Wallets, PCI-DSS, 3D Secure 2.0, Subscription Invoicing',
      technical_integrations: 'RESTful APIs, Webhooks, Postman, System Architecture, Microservices Concepts, SQL',
      analytics_tools: 'Mixpanel, CleverTap, New Relic, Mezmo, Metabase, Jira, Confluence, Figma, Miro',
    };

    // 4. Tailor Experience Bullet Points (Preserving 100% of Employer & Dates, Reordering & Emphasizing)
    const tailoredExperiences: TailoredExperienceItem[] = experiences.map((exp) => {
      const allBullets = [...exp.achievements, ...exp.responsibilities];
      const ranked = BulletRanker.rankBullets(allBullets, jd);

      const tailoredBullets: TailoredBullet[] = ranked.slice(0, 5).map((rb, index) => {
        const isEmphasized = rb.matched_terms.length > 0;
        return {
          generated_text: rb.text,
          source_fact_ids: [rb.fact_id],
          reasoning: isEmphasized
            ? `Prioritized due to direct alignment with JD keywords: ${rb.matched_terms.join(', ')}`
            : 'Included as foundational product delivery evidence',
          action_type: isEmphasized ? (index < 2 ? 'EMPHASIZED' : 'REORDERED') : 'CANONICAL',
        };
      });

      return {
        company: exp.company,
        role: exp.role,
        dates: `${exp.start_date} -- ${exp.end_date}`,
        location: exp.location,
        bullets: tailoredBullets,
      };
    });

    // 5. Tailor Projects (Reordering Top Relevance to the Top)
    const rankedProjects = BulletRanker.rankProjects(projects, jd);
    const tailoredProjects: TailoredProjectItem[] = rankedProjects.slice(0, 3).map((rp, idx) => {
      const prj = rp.project;
      const highlight = prj.tools.slice(0, 3).join(', ');
      const resultBullet = `${prj.actions[0]} ${prj.results[0]}`;

      return {
        project_id: prj.project_id,
        project_name: prj.project_name,
        company: prj.company,
        technologies_highlighted: highlight,
        bullets: [
          {
            generated_text: resultBullet,
            source_fact_ids: [prj.project_id],
            reasoning: `Ranked #${idx + 1} project based on matching terms: ${rp.matched_terms.join(', ')}`,
            action_type: idx === 0 ? 'EMPHASIZED' : 'REORDERED',
          },
        ],
      };
    });

    return {
      headline,
      summary,
      competencies,
      experiences: tailoredExperiences,
      projects: tailoredProjects,
      ats_keywords_targeted: jd.ats_keywords.slice(0, 10),
    };
  }
}
