import path from 'node:path';
import type { ParsedJobDescription } from '../../types/job.js';
import type { MatchResult } from '../../types/match.js';
import type { PipelinePackageResult } from '../orchestrator/phase1Pipeline.js';
import type { TrelloCard, TrelloChecklist } from '../../types/trello.js';
import { TrelloClient } from './trelloClient.js';
import { CandidateKnowledgeBase } from '../candidate/knowledgeBase.js';

export interface TrelloApplicationResult {
  card_id: string;
  card_title: string;
  card_url: string;
  list_name: string;
  checklist_id?: string;
  attachments_count: number;
}

export class TrelloAgent {
  private client: TrelloClient;
  private kb: CandidateKnowledgeBase;
  private boardName: string = 'AI Job Applications';

  public static readonly CHECKLIST_ITEMS = [
    'Review tailored resume',
    'Review cover letter',
    'Verify job requirements',
    'Check location eligibility',
    'Open application page',
    'Submit application',
    'Record application date',
    'Save confirmation',
    'Follow recruiter/company',
    'Follow up',
    'Prepare interview notes',
  ];

  constructor(client?: TrelloClient, kb?: CandidateKnowledgeBase) {
    this.client = client || new TrelloClient();
    this.kb = kb || new CandidateKnowledgeBase();
  }

  public async createApplicationCard(
    jd: ParsedJobDescription,
    match: MatchResult,
    pkg: PipelinePackageResult
  ): Promise<TrelloApplicationResult> {
    // 1. Get or Create Board & Lists
    const board = await this.client.getOrCreateBoard(this.boardName);
    const lists = await this.client.getLists(board.id);

    // 2. Determine Destination List based on Match Score
    let targetListName = '🟢 Ready to Apply';
    if (match.overall_score >= 80) {
      targetListName = '🔥 High Match';
    } else if (match.overall_score >= 65) {
      targetListName = '🟢 Ready to Apply';
    } else if (match.overall_score >= 50) {
      targetListName = '⏳ Waiting';
    } else {
      targetListName = '🗃️ Archived';
    }

    const targetList = lists.find((l) => l.name === targetListName) || lists[0];

    // 3. Construct Standardized Card Title
    // [Match %] Company | Role | Location
    const cardTitle = `[${match.overall_score}%] ${jd.company} | ${jd.title} | ${jd.location}`;

    // 4. Construct Structured Card Description
    const cardDesc = this.formatCardDescription(jd, match, pkg);

    // 5. Create Card
    const card = await this.client.createCard(targetList.id, {
      name: cardTitle,
      desc: cardDesc,
      idList: targetList.id,
      pos: 'top',
    });

    // 6. Create Application Checklist
    const checklist = await this.client.createChecklist(
      card.id,
      'Application Checklist',
      TrelloAgent.CHECKLIST_ITEMS
    );

    // 7. Upload / Link File Attachments
    let attachmentCount = 0;
    if (pkg.files.tailored_resume_pdf) {
      await this.client.addAttachment(card.id, pkg.files.tailored_resume_pdf, 'tailored_resume.pdf');
      attachmentCount++;
    }
    if (pkg.files.cover_letter_pdf) {
      await this.client.addAttachment(card.id, pkg.files.cover_letter_pdf, 'cover_letter.pdf');
      attachmentCount++;
    }
    if (pkg.files.tailored_resume_tex) {
      await this.client.addAttachment(card.id, pkg.files.tailored_resume_tex, 'tailored_resume.tex');
      attachmentCount++;
    }
    if (jd.source_url) {
      await this.client.addUrlAttachment(card.id, jd.source_url, 'Original Job Posting');
      attachmentCount++;
    }

    return {
      card_id: card.id,
      card_title: card.name,
      card_url: card.url,
      list_name: targetListName,
      checklist_id: checklist.id,
      attachments_count: attachmentCount,
    };
  }

  public formatCardDescription(
    jd: ParsedJobDescription,
    match: MatchResult,
    pkg: PipelinePackageResult
  ): string {
    const strongList = match.strong_matches.map((m) => `• ${m}`).join('\n') || '• Direct domain alignment';
    const topReqs = jd.must_have_skills.map((s) => `• ${s}`).join('\n') || '• Product Management & Delivery';
    const expUsed = pkg.cover_letter.evidence_used.map((e) => `• ${e}`).join('\n') || '• Verified Product Experience';
    const risks = [...match.missing_mandatory, ...match.application_risks].map((r) => `• ${r}`).join('\n') || '• None identified';

    return `ROLE
Company: ${jd.company}
Position: ${jd.title}
Location: ${jd.location} (${jd.country})
Remote: ${jd.remote_policy}
Visa / Authorization: ${jd.visa_status} (${jd.visa_reasoning})
Date Discovered: ${jd.discovered_at.split('T')[0]}
Source: ${jd.source_url || 'Direct Entry'}

MATCH
Overall: ${match.overall_score}% (${match.tier})
Role Fit: ${match.breakdown.role_score}%
Experience Fit: ${match.breakdown.experience_score}%
Skills Fit: ${match.breakdown.skills_score}%
Domain Fit: ${match.breakdown.domain_score}%
Tools & Tech: ${match.breakdown.tools_score}%
Location & Visa: ${match.breakdown.location_score}%

WHY IT MATCHES
${strongList}

TOP JD REQUIREMENTS
${topReqs}

MY RELEVANT EXPERIENCE
${expUsed}

GAPS / RISKS
${risks}

APPLICATION
Job URL: ${jd.source_url || 'Direct Entry'}
Package Directory: ${pkg.package_dir}

FILES ATTACHED
• Resume PDF: ${path.basename(pkg.files.tailored_resume_pdf)}
• Resume LaTeX: ${path.basename(pkg.files.tailored_resume_tex)}
• Cover Letter PDF: ${path.basename(pkg.files.cover_letter_pdf)}
• Original JD: ${path.basename(pkg.files.jd_txt)}

STATUS
Ready to Apply (HUMAN_APPROVAL_MODE: Review before submitting)`;
  }
}
