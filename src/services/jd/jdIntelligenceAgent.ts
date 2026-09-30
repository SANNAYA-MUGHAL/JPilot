import crypto from 'node:crypto';
import type { ParsedJobDescription } from '../../types/job.js';
import { ClaudeClient } from '../ai/claudeClient.js';
import { LocationVisaExtractor } from './locationVisaExtractor.js';

export interface ParseJdInput {
  raw_text: string;
  source_url?: string;
  title_hint?: string;
  company_hint?: string;
  location_hint?: string;
}

export class JDIntelligenceAgent {
  private claude: ClaudeClient;

  constructor(claudeClient?: ClaudeClient) {
    this.claude = claudeClient || new ClaudeClient();
  }

  public async parseJobDescription(input: ParseJdInput): Promise<ParsedJobDescription> {
    const rawText = input.raw_text.trim();
    if (!rawText || rawText.length < 30) {
      throw new Error('Job description is too short or empty to parse.');
    }

    // 1. Run Location & Visa Extraction
    const locationInfo = LocationVisaExtractor.extract(rawText, input.location_hint);

    // 2. Generate Deterministic ID
    const jobId = 'JOB_' + crypto.createHash('md5').update(rawText.slice(0, 200) + (input.source_url || '')).digest('hex').slice(0, 10);

    // 3. If Claude is available, use LLM for deep semantic extraction
    if (this.claude.isAvailable()) {
      try {
        const systemPrompt = `You are an elite Technical Talent Intelligence & Job Description Analysis Agent.
Analyze the provided Job Description (JD) and extract structured, objective facts into valid JSON.
Do NOT invent requirements not stated or clearly implied by the JD.
Return ONLY valid JSON matching this schema:
{
  "title": string,
  "company": string,
  "industry_domains": string[],
  "seniority_level": string,
  "years_of_experience_required": number,
  "must_have_skills": string[],
  "nice_to_have_skills": string[],
  "responsibilities": string[],
  "tools": string[],
  "technologies_and_apis": string[],
  "ats_keywords": string[],
  "salary_range": string or null
}`;

        const userPrompt = `Job Title Hint: ${input.title_hint || 'Extract from text'}
Company Hint: ${input.company_hint || 'Extract from text'}

Job Description:
${rawText}`;

        const aiResult = await this.claude.completeJson<any>({
          systemPrompt,
          userPrompt,
          temperature: 0.1,
        });

        return {
          job_id: jobId,
          title: input.title_hint || aiResult.title || 'Product Manager',
          company: input.company_hint || aiResult.company || 'Confidential Employer',
          location: locationInfo.location_string,
          country: locationInfo.country,
          city: locationInfo.city,
          remote_policy: locationInfo.remote_policy,
          visa_status: locationInfo.visa_status,
          visa_reasoning: locationInfo.visa_reasoning,
          employment_type: 'Full-time',
          salary_range: aiResult.salary_range || undefined,
          experience_years_required: aiResult.years_of_experience_required || 5,
          seniority_level: aiResult.seniority_level || 'Mid-Senior level',
          must_have_skills: aiResult.must_have_skills || [],
          nice_to_have_skills: aiResult.nice_to_have_skills || [],
          responsibilities: aiResult.responsibilities || [],
          domains: aiResult.industry_domains || [],
          tools: aiResult.tools || [],
          technologies_and_apis: aiResult.technologies_and_apis || [],
          ats_keywords: aiResult.ats_keywords || [],
          raw_text: rawText,
          source_url: input.source_url,
          discovered_at: new Date().toISOString(),
        };
      } catch (err: any) {
        console.warn(`Claude extraction failed, falling back to deterministic parser: ${err.message}`);
      }
    }

    // Fallback: Deterministic Rule-Based Semantic Parser
    return this.fallbackParse(input, locationInfo, jobId);
  }

  private fallbackParse(input: ParseJdInput, locationInfo: any, jobId: string): ParsedJobDescription {
    const raw = input.raw_text;
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

    // Extract title & company
    let title = input.title_hint || lines[0] || 'Product Manager';
    if (title.length > 80) title = 'Senior Product Manager';
    const company = input.company_hint || (lines[1] && lines[1].length < 60 ? lines[1] : 'Tech Enterprise');

    // Experience detection
    let yearsReq = 5;
    const expMatch = raw.match(/(\d+)\+?\s*(?:years|yrs)\s*(?:of)?\s*experience/i);
    if (expMatch && expMatch[1]) {
      yearsReq = parseInt(expMatch[1], 10);
    }

    // Common PM & Tech Skills Catalog for Keyword Matching
    const skillKeywords = [
      'Product Strategy', 'Roadmapping', 'Agile', 'Scrum', 'PRD', 'User Stories',
      'A/B Testing', 'Mixpanel', 'CleverTap', 'New Relic', 'Jira', 'Confluence',
      'Figma', 'Postman', 'REST API', 'Webhooks', 'SQL', 'FinTech', 'Payments',
      'Adyen', 'MangoPay', 'Checkout', 'SaaS', 'PropTech', 'Marketplace', 'eCommerce',
      'Stakeholder Management', 'Analytics', 'Conversion Rate Optimization'
    ];

    const detectedMustHaves: string[] = [];
    const detectedTools: string[] = [];
    const detectedAPIs: string[] = [];
    const detectedDomains: string[] = [];
    const detectedKeywords: string[] = [];

    const lowerRaw = raw.toLowerCase();

    for (const kw of skillKeywords) {
      if (lowerRaw.includes(kw.toLowerCase())) {
        detectedKeywords.push(kw);
        if (['Mixpanel', 'CleverTap', 'New Relic', 'Jira', 'Confluence', 'Figma', 'Postman'].includes(kw)) {
          detectedTools.push(kw);
        } else if (['REST API', 'Webhooks', 'Adyen', 'MangoPay'].includes(kw)) {
          detectedAPIs.push(kw);
        } else if (['FinTech', 'Payments', 'SaaS', 'PropTech', 'Marketplace', 'eCommerce'].includes(kw)) {
          detectedDomains.push(kw);
        } else {
          detectedMustHaves.push(kw);
        }
      }
    }

    // Extract responsibility bullet candidates
    const bullets = lines.filter(l => l.startsWith('•') || l.startsWith('-') || l.startsWith('*') || l.match(/^\d+\./))
      .map(b => b.replace(/^[\s•\-*\d.]+\s*/, ''))
      .filter(b => b.length > 20);

    return {
      job_id: jobId,
      title,
      company,
      location: locationInfo.location_string,
      country: locationInfo.country,
      city: locationInfo.city,
      remote_policy: locationInfo.remote_policy,
      visa_status: locationInfo.visa_status,
      visa_reasoning: locationInfo.visa_reasoning,
      employment_type: 'Full-time',
      experience_years_required: yearsReq,
      seniority_level: yearsReq >= 7 ? 'Senior / Lead level' : 'Mid level',
      must_have_skills: detectedMustHaves.length ? detectedMustHaves : ['Product Strategy', 'Agile/Scrum', 'Roadmap Planning'],
      nice_to_have_skills: ['SQL', 'Microservices', 'Growth Experimentation'],
      responsibilities: bullets.slice(0, 8),
      domains: detectedDomains.length ? detectedDomains : ['SaaS', 'Digital Platform'],
      tools: detectedTools.length ? detectedTools : ['Jira', 'Mixpanel', 'Figma'],
      technologies_and_apis: detectedAPIs.length ? detectedAPIs : ['REST APIs', 'Webhooks'],
      ats_keywords: detectedKeywords.length ? detectedKeywords : ['Product Management', 'Roadmap', 'Agile'],
      raw_text: raw,
      source_url: input.source_url,
      discovered_at: new Date().toISOString(),
    };
  }
}
