import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import type { ParsedJobDescription } from '../../types/job.js';
import type { MatchResult } from '../../types/match.js';
import { CandidateKnowledgeBase } from '../candidate/knowledgeBase.js';
import { ClaudeClient } from '../ai/claudeClient.js';
import { BulletRanker } from '../tailoring/bulletRanker.js';

export interface CoverLetterResult {
  markdown_text: string;
  word_count: number;
  pdf_path: string;
  evidence_used: string[];
}

export class CoverLetterAgent {
  private kb: CandidateKnowledgeBase;
  private claude: ClaudeClient;

  constructor(knowledgeBase?: CandidateKnowledgeBase, claudeClient?: ClaudeClient) {
    this.kb = knowledgeBase || new CandidateKnowledgeBase();
    this.claude = claudeClient || new ClaudeClient();
  }

  public async generateCoverLetter(
    jd: ParsedJobDescription,
    match: MatchResult,
    outputDir: string
  ): Promise<CoverLetterResult> {
    const profile = this.kb.getCandidateProfile();
    const contact = profile.personal_information;
    const experiences = this.kb.getExperiences();
    const projects = this.kb.getProjects();

    // Collect top 2-3 evidence points from candidate records
    const allAchievements = experiences.flatMap((e) => e.achievements);
    const rankedBullets = BulletRanker.rankBullets(allAchievements, jd);
    const topEvidence = rankedBullets.slice(0, 3);
    const topEvidenceTexts = topEvidence.map((e) => e.text);

    let letterMarkdown = '';

    if (this.claude.isAvailable()) {
      try {
        const systemPrompt = `You are an elite Executive Career Strategist crafting an authentic, high-impact Cover Letter for Sana Liaqat.
CRITICAL MANDATORY RULES:
1. Target length: 250 - 380 words.
2. Structure strictly in 4 clear sections:
   - Opening: Why this role (${jd.title} at ${jd.company}) and candidate background.
   - Proven Evidence: Weave in ONLY the provided verified candidate achievements and metrics. Do NOT invent or alter any metrics.
   - Strategic Alignment: Connect past execution to target JD challenges.
   - Closing: Direct, professional call to action.
3. No fluffy generic praise. Ground every statement in verified facts.
4. Output markdown format starting directly with the salutation.`;

        const userPrompt = `Candidate Name: ${contact.full_name}
Role: ${jd.title}
Company: ${jd.company}
Location: ${jd.location}
Verified Evidence to Incorporate:
${topEvidenceTexts.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Job Summary / Keywords:
${jd.ats_keywords.join(', ')}
Key Responsibilities:
${jd.responsibilities.slice(0, 3).join('\n')}`;

        const aiLetter = await this.claude.complete({
          systemPrompt,
          userPrompt,
          temperature: 0.1,
          maxTokens: 600,
        });

        if (aiLetter && aiLetter.trim().length > 100) {
          letterMarkdown = aiLetter.trim();
        }
      } catch (err: any) {
        console.warn(`Claude cover letter fallback: ${err.message}`);
      }
    }

    if (!letterMarkdown) {
      letterMarkdown = this.generateDeterministicCoverLetter(jd, contact, topEvidenceTexts);
    }

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const mdPath = path.join(outputDir, 'cover_letter.md');
    const pdfPath = path.join(outputDir, 'cover_letter.pdf');

    fs.writeFileSync(mdPath, letterMarkdown, 'utf8');

    // Compile to PDF
    await this.compileCoverLetterPdf(letterMarkdown, contact, jd, pdfPath);

    const words = letterMarkdown.trim().split(/\s+/).length;

    return {
      markdown_text: letterMarkdown,
      word_count: words,
      pdf_path: pdfPath,
      evidence_used: topEvidenceTexts,
    };
  }

  private generateDeterministicCoverLetter(
    jd: ParsedJobDescription,
    contact: any,
    evidence: string[]
  ): string {
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const location = contact.location || 'Pakistan (Open to Relocation & Remote)';
    const linksRow: string[] = [];
    if (contact.linkedin) linksRow.push(contact.linkedin);
    if (contact.portfolio || contact.website) linksRow.push(contact.portfolio || contact.website);
    const linksLine = linksRow.length > 0 ? `\n${linksRow.join(' | ')}  ` : '';

    return `**${contact.full_name}**  
${location} | ${contact.email} | ${contact.phone}${linksLine}

${today}  

Hiring Team  
${jd.company}  
${jd.location}  

**Re: Application for ${jd.title}**  

Dear Hiring Team at ${jd.company},  

I am writing to express my enthusiastic interest in the ${jd.title} position at ${jd.company}. With 7+ years of hands-on technology experience leading product strategy, payment ecosystems, and cross-functional Agile engineering teams across high-scale digital platforms, I have built a career translating complex operational and technical challenges into measurable customer value and business growth.  

My background directly aligns with the priorities outlined for this role:  

• **Demonstrated Payment & Platform Impact:** ${evidence[0] || 'Led payment gateway integrations and multi-provider fallback routing that dramatically boosted checkout conversion and decreased transaction drop-offs.'}  

• **Data-Driven Optimization & Retention:** ${evidence[1] || 'Spearheaded user churn reduction and cancellation flow redesigns using cohort analysis, consistently slashing subscription churn.'}  

• **Operational Rigor & Execution:** ${evidence[2] || 'Led cross-functional squads operating in Agile sprints, ensuring seamless delivery of core product features and API integrations.'}  

At ${jd.company}, I am excited by the opportunity to apply this operational discipline to drive product innovation, scale platform capabilities, and champion customer-centric outcomes. Whether orchestrating partner API integrations, analyzing funnel conversion, or rallying engineering squads around a focused roadmap, I bring a collaborative, metrics-driven approach.  

I welcome the opportunity to discuss how my verified background and technical product leadership can contribute to ${jd.company}’s continued growth. Thank you for your time and consideration.  

Sincerely,  

**${contact.full_name}**  
Senior Product Manager`;
  }

  private compileCoverLetterPdf(
    markdownText: string,
    contact: any,
    jd: ParsedJobDescription,
    outputPdfPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 48, bottom: 48, left: 54, right: 54 },
      });

      const writeStream = fs.createWriteStream(outputPdfPath);
      doc.pipe(writeStream);

      // Header Letterhead
      doc.font('Helvetica-Bold').fontSize(18).fillColor('#0f172a').text(contact.full_name);
      doc.moveDown(0.15);
      const locText = contact.location || 'Pakistan (Open to Relocation & Remote)';
      doc.font('Helvetica').fontSize(9).fillColor('#475569').text(
        `${locText}   •   ${contact.phone}   •   ${contact.email}`
      );
      if (contact.linkedin || contact.portfolio || contact.website) {
        doc.moveDown(0.1);
        const cleanLinkedIn = contact.linkedin ? contact.linkedin.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : '';
        const pUrl = contact.portfolio || contact.website;
        const cleanPortfolio = pUrl ? pUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : '';
        const links = [cleanLinkedIn, cleanPortfolio].filter(Boolean).join('   •   ');
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e40af').text(links);
      }
      doc.moveDown(0.25);
      doc.strokeColor('#cbd5e1').lineWidth(0.8).moveTo(54, doc.y).lineTo(558, doc.y).stroke();
      doc.moveDown(0.8);

      // Format Body Paragraphs
      const paragraphs = markdownText
        .split('\n\n')
        .map((p) => p.trim())
        .filter((p) => !p.startsWith('**' + contact.full_name) && !p.includes(contact.email));

      for (const para of paragraphs) {
        if (para.startsWith('**Re:')) {
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#1a202c').text(para.replace(/\*\*/g, ''));
          doc.moveDown(0.6);
        } else if (para.startsWith('•')) {
          const cleanText = para.replace(/\*\*/g, '');
          doc.font('Helvetica').fontSize(9.5).fillColor('#2d3748').text(cleanText, {
            indent: 14,
            lineGap: 2.5,
          });
          doc.moveDown(0.4);
        } else if (para.startsWith('Dear') || para.startsWith('Sincerely')) {
          doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#1a202c').text(para.replace(/\*\*/g, ''));
          doc.moveDown(0.6);
        } else {
          doc.font('Helvetica').fontSize(9.5).fillColor('#2d3748').text(para.replace(/\*\*/g, ''), {
            align: 'justify',
            lineGap: 2.5,
          });
          doc.moveDown(0.8);
        }
      }

      doc.end();

      writeStream.on('finish', () => resolve());
      writeStream.on('error', (err) => reject(err));
    });
  }
}
