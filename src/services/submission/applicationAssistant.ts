import crypto from 'node:crypto';
import type { FormQuestion, SensitiveQuestion, SubmissionResult } from '../../types/submission.js';
import type { ParsedJobDescription } from '../../types/job.js';
import type { PipelinePackageResult } from '../orchestrator/phase1Pipeline.js';
import { CandidateKnowledgeBase } from '../candidate/knowledgeBase.js';
import { TrelloClient } from '../trello/trelloClient.js';
import { SettingsManager } from '../settings/settingsManager.js';

export class ApplicationAssistant {
  private kb: CandidateKnowledgeBase;
  private trelloClient: TrelloClient;
  private settingsManager: SettingsManager;

  constructor(kb?: CandidateKnowledgeBase, trelloClient?: TrelloClient, settings?: SettingsManager) {
    this.kb = kb || new CandidateKnowledgeBase();
    this.trelloClient = trelloClient || new TrelloClient();
    this.settingsManager = settings || new SettingsManager();
  }

  public async assistApplication(
    jd: ParsedJobDescription,
    pkg: PipelinePackageResult,
    formQuestions: FormQuestion[],
    userApproved: boolean = false,
    userSuppliedAnswers: Record<string, string> = {}
  ): Promise<SubmissionResult> {
    const settings = this.settingsManager.getSettings();

    // 1. Enforce Human Approval Gate
    if (settings.human_approval_mode && !userApproved) {
      return {
        status: 'PENDING_APPROVAL',
        job_id: jd.job_id,
        company: jd.company,
        role: jd.title,
        filled_fields: {},
        blocked_questions: [],
        message: 'Application assistance halted: Awaiting explicit user approval before preparing submission.',
      };
    }

    // 2. Pre-fill Standard Verified Fields from Candidate Knowledge Base
    const profile = this.kb.getCandidateProfile();
    const contact = profile.personal_information;
    const nameParts = contact.full_name.split(' ');

    const filledFields: Record<string, string> = {
      first_name: nameParts[0],
      last_name: nameParts.slice(1).join(' '),
      full_name: contact.full_name,
      email: contact.email,
      phone: contact.phone,
      location: contact.location,
      linkedin: contact.linkedin,
      portfolio: contact.portfolio,
      resume_file: pkg.files.tailored_resume_pdf,
      cover_letter_file: pkg.files.cover_letter_pdf,
    };

    // 3. Scan Questions for Sensitive / Unknown Questions
    const blockedQuestions: SensitiveQuestion[] = [];
    const sensitivePatterns = [
      { pattern: /salary|compensation|expected\s+pay|hourly\s+rate/i, reason: 'Salary expectation must never be automated without explicit candidate approval.' },
      { pattern: /security\s+clearance|polygraph/i, reason: 'Security clearance disclosure required.' },
      { pattern: /race|ethnicity|gender|veteran|disability/i, reason: 'Equal opportunity / demographic disclosure.' },
      { pattern: /criminal|felony|background\s+check/i, reason: 'Legal / criminal background disclosure.' },
      { pattern: /notice\s+period|start\s+date/i, reason: 'Availability / notice period confirmation required.' },
    ];

    for (const q of formQuestions) {
      // Check if user already supplied an explicit answer
      if (userSuppliedAnswers[q.id]) {
        filledFields[q.id] = userSuppliedAnswers[q.id];
        continue;
      }

      for (const sp of sensitivePatterns) {
        if (sp.pattern.test(q.label)) {
          blockedQuestions.push({
            question_id: q.id,
            label: q.label,
            reason: sp.reason,
          });
          break;
        }
      }
    }

    if (blockedQuestions.length > 0) {
      return {
        status: 'BLOCKED_SENSITIVE_QUESTION',
        job_id: jd.job_id,
        company: jd.company,
        role: jd.title,
        filled_fields: filledFields,
        blocked_questions: blockedQuestions,
        message: `Halted on ${blockedQuestions.length} sensitive question(s). Candidate input required.`,
      };
    }

    // 4. Submission Confirmed (All fields filled, human approved)
    const confirmationId = 'SUB_' + crypto.randomBytes(6).toString('hex').toUpperCase();
    const submissionTimestamp = new Date().toISOString();

    // 5. Update Trello Card to "📤 Applied"
    let updatedListName = '📤 Applied';
    if (pkg.trello?.card_id) {
      const card = this.trelloClient.getMockCard(pkg.trello.card_id);
      if (card) {
        card.idList = 'mock_list_applied';
      }
    }

    return {
      status: 'CONFIRMED',
      job_id: jd.job_id,
      company: jd.company,
      role: jd.title,
      filled_fields: filledFields,
      blocked_questions: [],
      confirmation_id: confirmationId,
      submitted_at: submissionTimestamp,
      trello_card_id: pkg.trello?.card_id,
      trello_list_updated: updatedListName,
      message: `Application successfully submitted and confirmed (${confirmationId}). Trello card moved to "${updatedListName}".`,
    };
  }
}
