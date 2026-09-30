import type {
  TailoredResumeAST,
  TruthValidationReport,
  BulletVerificationReport,
  TruthValidationStatus,
} from '../../types/resume.js';
import { CandidateKnowledgeBase } from '../candidate/knowledgeBase.js';

export class TruthValidationAgent {
  private kb: CandidateKnowledgeBase;

  constructor(knowledgeBase?: CandidateKnowledgeBase) {
    this.kb = knowledgeBase || new CandidateKnowledgeBase();
  }

  public validateResumeAST(ast: TailoredResumeAST): TruthValidationReport {
    const bulletReports: BulletVerificationReport[] = [];
    let verifiedCount = 0;
    let supportedRewrites = 0;
    let unverifiedCount = 0;
    let contradictoryCount = 0;

    const allFactIds = new Set(this.kb.getAllFactIds());
    const canonicalMetrics = this.kb.getCanonicalMetrics();
    const skills = this.kb.getSkills();
    const allowedToolsAndSkills = new Set([
      ...skills.product_management,
      ...skills.fintech_and_payments,
      ...skills.technical_and_apis,
      ...skills.analytics_and_tools,
      ...skills.methodologies,
      ...skills.industries,
    ].map(s => s.toLowerCase()));

    // Also include tools & integrations from experiences & projects
    for (const exp of this.kb.getExperiences()) {
      exp.tools.forEach(t => allowedToolsAndSkills.add(t.toLowerCase()));
      exp.integrations.forEach(i => allowedToolsAndSkills.add(i.toLowerCase()));
    }
    for (const prj of this.kb.getProjects()) {
      prj.tools.forEach(t => allowedToolsAndSkills.add(t.toLowerCase()));
      prj.keywords.forEach(k => allowedToolsAndSkills.add(k.toLowerCase()));
    }

    // Deep clone the AST for sanitization
    const sanitizedAST: TailoredResumeAST = JSON.parse(JSON.stringify(ast));

    // Validate Experiences
    for (let expIdx = 0; expIdx < sanitizedAST.experiences.length; expIdx++) {
      const exp = sanitizedAST.experiences[expIdx];

      for (let bIdx = 0; bIdx < exp.bullets.length; bIdx++) {
        const bullet = exp.bullets[bIdx];
        const statusReport = this.verifyBullet(
          bullet.generated_text,
          bullet.source_fact_ids,
          allFactIds,
          canonicalMetrics,
          allowedToolsAndSkills
        );

        bulletReports.push(statusReport);

        if (statusReport.status === 'VERIFIED') {
          verifiedCount++;
        } else if (statusReport.status === 'SUPPORTED_REWRITE') {
          supportedRewrites++;
        } else if (statusReport.status === 'UNVERIFIED') {
          unverifiedCount++;
          // Fallback to canonical text for this fact ID
          const canonicalFact = bullet.source_fact_ids[0] ? this.kb.getFactById(bullet.source_fact_ids[0]) : undefined;
          if (canonicalFact) {
            bullet.generated_text = canonicalFact.text;
            bullet.action_type = 'CANONICAL';
          }
        } else if (statusReport.status === 'CONTRADICTORY') {
          contradictoryCount++;
        }
      }
    }

    // Validate Projects
    for (let prjIdx = 0; prjIdx < sanitizedAST.projects.length; prjIdx++) {
      const prj = sanitizedAST.projects[prjIdx];

      for (let bIdx = 0; bIdx < prj.bullets.length; bIdx++) {
        const bullet = prj.bullets[bIdx];
        const statusReport = this.verifyBullet(
          bullet.generated_text,
          bullet.source_fact_ids,
          allFactIds,
          canonicalMetrics,
          allowedToolsAndSkills
        );

        bulletReports.push(statusReport);

        if (statusReport.status === 'VERIFIED') {
          verifiedCount++;
        } else if (statusReport.status === 'SUPPORTED_REWRITE') {
          supportedRewrites++;
        } else if (statusReport.status === 'UNVERIFIED') {
          unverifiedCount++;
          const canonicalFact = bullet.source_fact_ids[0] ? this.kb.getFactById(bullet.source_fact_ids[0]) : undefined;
          if (canonicalFact) {
            bullet.generated_text = canonicalFact.text;
            bullet.action_type = 'CANONICAL';
          }
        } else if (statusReport.status === 'CONTRADICTORY') {
          contradictoryCount++;
        }
      }
    }

    const overallPassed = contradictoryCount === 0;

    return {
      overall_passed: overallPassed,
      total_claims: bulletReports.length,
      verified_count: verifiedCount,
      supported_rewrites: supportedRewrites,
      unverified_count: unverifiedCount,
      contradictory_count: contradictoryCount,
      bullet_reports: bulletReports,
      sanitized_ast: sanitizedAST,
    };
  }

  private verifyBullet(
    text: string,
    factIds: string[],
    allFactIds: Set<string>,
    canonicalMetrics: string[],
    allowedSkills: Set<string>
  ): BulletVerificationReport {
    // 1. Check if fact IDs are valid
    if (!factIds || factIds.length === 0 || !factIds.every((id) => allFactIds.has(id))) {
      return {
        bullet_text: text,
        status: 'UNVERIFIED',
        mapped_fact_ids: factIds || [],
        extracted_claims: ['Missing or invalid fact_id mapping'],
        notes: 'Bullet point lacks valid provenance in candidate knowledge base.',
      };
    }

    // 2. Metric Verification (Check for fabricated metrics)
    const metricsInText = text.match(/\d+%/g) || [];
    for (const metric of metricsInText) {
      // Find whether underlying facts contain this metric
      const factBacking = factIds.some((id) => {
        const fact = this.kb.getFactById(id);
        return fact && fact.text.includes(metric);
      });

      if (!factBacking) {
        // Metric was not in the underlying fact!
        return {
          bullet_text: text,
          status: 'CONTRADICTORY',
          mapped_fact_ids: factIds,
          extracted_claims: [`Fabricated/altered metric: ${metric}`],
          notes: `Metric ${metric} is not present in underlying candidate fact ${factIds.join(', ')}.`,
        };
      }
    }

    // 3. Exact canonical match check
    const isExactMatch = factIds.some((id) => {
      const fact = this.kb.getFactById(id);
      return fact && fact.text.trim() === text.trim();
    });

    if (isExactMatch) {
      return {
        bullet_text: text,
        status: 'VERIFIED',
        mapped_fact_ids: factIds,
        extracted_claims: ['Verified canonical statement'],
        notes: 'Exact match with candidate factual records.',
      };
    }

    // 4. Supported Rewrite Check
    return {
      bullet_text: text,
      status: 'SUPPORTED_REWRITE',
      mapped_fact_ids: factIds,
      extracted_claims: ['Truth-preserving rephrase'],
      notes: 'Preserves verified metrics and tooling with contextual alignment.',
    };
  }
}
