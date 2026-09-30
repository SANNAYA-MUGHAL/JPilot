import type { ParsedJobDescription } from '../../types/job.js';
import type { MatchResult, MatchTier, ScoreBreakdown } from '../../types/match.js';
import { CandidateKnowledgeBase } from '../candidate/knowledgeBase.js';

export class SemanticMatcher {
  private kb: CandidateKnowledgeBase;

  constructor(knowledgeBase?: CandidateKnowledgeBase) {
    this.kb = knowledgeBase || new CandidateKnowledgeBase();
  }

  public calculateMatch(jd: ParsedJobDescription): MatchResult {
    const profile = this.kb.getCandidateProfile();
    const skills = this.kb.getSkills();
    const experiences = this.kb.getExperiences();
    const projects = this.kb.getProjects();

    const allSkillsList: string[] = [
      ...skills.product_management,
      ...skills.fintech_and_payments,
      ...skills.technical_and_apis,
      ...skills.analytics_and_tools,
      ...skills.methodologies,
      ...skills.industries,
    ];

    // Also include tools, skills, and integrations from real employment records
    for (const exp of experiences) {
      allSkillsList.push(...exp.skills, ...exp.tools, ...exp.integrations);
    }
    for (const prj of projects) {
      allSkillsList.push(...prj.tools, ...prj.keywords);
    }

    const normalize = (t: string) => t.toLowerCase().replace(/s\b/g, '').replace(/ing\b/g, '').trim();
    const isTermMatch = (candidateTerm: string, requiredTerm: string) => {
      const c = normalize(candidateTerm);
      const r = normalize(requiredTerm);
      return c.includes(r) || r.includes(c);
    };

    const strongMatches: string[] = [];
    const partialMatches: string[] = [];
    const missingMandatory: string[] = [];
    const missingPreferred: string[] = [];
    const applicationRisks: string[] = [];

    // 1. Core Role Alignment (25%)
    let roleScore = 0;
    const lowerTitle = jd.title.toLowerCase();
    const isPrimaryRole = profile.target_roles.primary.some((r) =>
      lowerTitle.includes(r.toLowerCase())
    );
    const isSecondaryRole = profile.target_roles.secondary.some((r) =>
      lowerTitle.includes(r.toLowerCase())
    );

    if (isPrimaryRole) {
      roleScore = 100;
      strongMatches.push(`Target Primary Role Match: "${jd.title}" directly matches target Product Management specializations.`);
    } else if (isSecondaryRole) {
      roleScore = 75;
      partialMatches.push(`Secondary Role Match: "${jd.title}" matches candidate technical leadership background.`);
    } else if (lowerTitle.includes('product') || lowerTitle.includes('program') || lowerTitle.includes('technical')) {
      roleScore = 60;
      partialMatches.push(`Related Role: "${jd.title}" has adjacent product/technical ownership.`);
    } else {
      roleScore = 20;
      applicationRisks.push(`Low Title Alignment: "${jd.title}" is outside candidate primary Product focus.`);
    }

    // 2. Experience Alignment (20%)
    let expScore = 100;
    const candidateYears = profile.positioning.years_of_experience; // 7
    const requiredYears = jd.experience_years_required || 5;

    if (candidateYears >= requiredYears) {
      expScore = 100;
      strongMatches.push(`Years of Experience: Candidate has ${candidateYears}+ years exceeding required ${requiredYears} years.`);
    } else {
      const ratio = candidateYears / requiredYears;
      expScore = Math.max(30, Math.round(ratio * 100));
      applicationRisks.push(`Experience Delta: JD requests ${requiredYears}+ years, candidate profile records ${candidateYears} years.`);
    }

    // 3. Mandatory Skills Alignment (20%)
    let skillsScore = 100;
    if (jd.must_have_skills.length > 0) {
      let matchedCount = 0;
      for (const reqSkill of jd.must_have_skills) {
        const hasSkill = allSkillsList.some((cs) => isTermMatch(cs, reqSkill));

        if (hasSkill) {
          matchedCount++;
          strongMatches.push(`Mandatory Skill Match: ${reqSkill}`);
        } else {
          missingMandatory.push(reqSkill);
        }
      }
      skillsScore = Math.round((matchedCount / jd.must_have_skills.length) * 100);
    }

    // 4. Domain Alignment (15%)
    let domainScore = 60; // neutral default
    const candidateDomains = profile.positioning.industries; // FinTech, PropTech, SaaS, Marketplaces, eCommerce
    if (jd.domains.length > 0) {
      let matchedDomain = 0;
      for (const d of jd.domains) {
        const matches = candidateDomains.some((cd) => isTermMatch(cd, d));
        if (matches) {
          matchedDomain++;
          strongMatches.push(`Domain Alignment: Strong background in ${d}`);
        }
      }
      domainScore = matchedDomain > 0 ? Math.min(100, Math.round((matchedDomain / jd.domains.length) * 100) + 20) : 40;
    } else {
      domainScore = 85;
    }

    // 5. Tools & Technical Alignment (10%)
    let toolsScore = 100;
    const allToolsAndAPIs = [...jd.tools, ...jd.technologies_and_apis];
    if (allToolsAndAPIs.length > 0) {
      let matchedTools = 0;
      for (const tool of allToolsAndAPIs) {
        const hasTool = allSkillsList.some((cs) => isTermMatch(cs, tool));
        if (hasTool) {
          matchedTools++;
        }
      }
      toolsScore = Math.round((matchedTools / allToolsAndAPIs.length) * 100);
    }

    // 6. Location & Work Authorization Compatibility (5%)
    let locationScore = 70;
    const prefGeos = profile.location_preferences.preferred_geographies.map((g) => g.toLowerCase());
    const isPreferredGeo = prefGeos.some((g) => jd.country.toLowerCase().includes(g) || g.includes(jd.country.toLowerCase()));

    if (jd.remote_policy === 'REMOTE_WORLDWIDE') {
      locationScore = 100;
      strongMatches.push('Location Compatibility: 100% Remote Worldwide arrangement.');
    } else if (jd.visa_status === 'VISA_SPONSORED') {
      locationScore = 100;
      strongMatches.push(`Relocation & Visa: Employer provides visa sponsorship in ${jd.country}.`);
    } else if (jd.visa_status === 'REMOTE_CONTRACT_OPEN') {
      locationScore = 95;
      strongMatches.push('Work Arrangement: Open to global B2B contracting or remote employment.');
    } else if (isPreferredGeo && jd.visa_status !== 'LOCAL_AUTH_REQUIRED') {
      locationScore = 80;
      partialMatches.push(`Location Alignment: Located in target geography (${jd.country}).`);
    } else if (jd.visa_status === 'LOCAL_AUTH_REQUIRED' && !jd.location.includes('UAE')) {
      locationScore = 20;
      applicationRisks.push(`Visa Barrier: Job requires local right to work in ${jd.country} with no visa sponsorship.`);
    }

    // 7. Preferred Qualifications (5%)
    let preferredScore = 80;
    if (jd.nice_to_have_skills.length > 0) {
      let matchedPref = 0;
      for (const pref of jd.nice_to_have_skills) {
        const hasPref = allSkillsList.some((cs) => cs.toLowerCase().includes(pref.toLowerCase()));
        if (hasPref) {
          matchedPref++;
        } else {
          missingPreferred.push(pref);
        }
      }
      preferredScore = Math.round((matchedPref / jd.nice_to_have_skills.length) * 100);
    }

    // Weighted Overall Score
    const weightedTotal =
      roleScore * 0.25 +
      expScore * 0.20 +
      skillsScore * 0.20 +
      domainScore * 0.15 +
      toolsScore * 0.10 +
      locationScore * 0.05 +
      preferredScore * 0.05;

    const overallScore = Math.min(100, Math.max(0, Math.round(weightedTotal)));

    let tier: MatchTier = 'LOW_MATCH';
    let recommendation = 'Do not prioritize automatic application package unless manually requested.';
    if (overallScore >= 80) {
      tier = 'HIGH_ALIGNMENT';
      recommendation = 'Strong match across core role, domain, and skills. Immediate package generation recommended.';
    } else if (overallScore >= 65) {
      tier = 'GOOD_ALIGNMENT';
      recommendation = 'Solid match with minor skill or domain variance. Ready to tailor with strategic emphasis.';
    } else if (overallScore >= 50) {
      tier = 'REVIEW';
      recommendation = 'Moderate match. Review missing requirements before applying.';
    }

    const breakdown: ScoreBreakdown = {
      role_score: roleScore,
      experience_score: expScore,
      skills_score: skillsScore,
      domain_score: domainScore,
      tools_score: toolsScore,
      location_score: locationScore,
      preferred_score: preferredScore,
    };

    return {
      overall_score: overallScore,
      tier,
      breakdown,
      strong_matches: strongMatches,
      partial_matches: partialMatches,
      missing_mandatory: missingMandatory,
      missing_preferred: missingPreferred,
      application_risks: applicationRisks,
      recommendation,
    };
  }
}
