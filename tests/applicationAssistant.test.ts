import test from 'node:test';
import assert from 'node:assert/strict';
import { ApplicationAssistant } from '../src/services/submission/applicationAssistant.js';
import { CandidateKnowledgeBase } from '../src/services/candidate/knowledgeBase.js';
import { TrelloClient } from '../src/services/trello/trelloClient.js';
import type { FormQuestion } from '../src/types/submission.js';
import type { ParsedJobDescription } from '../src/types/job.js';
import type { PipelinePackageResult } from '../src/services/orchestrator/phase1Pipeline.js';

test('ApplicationAssistant halts on unapproved submissions and blocks on sensitive questions', async () => {
  const kb = new CandidateKnowledgeBase();
  const trelloClient = new TrelloClient();
  const assistant = new ApplicationAssistant(kb, trelloClient);

  const mockJd: ParsedJobDescription = {
    job_id: 'JOB_APPLY_01',
    title: 'Senior Product Manager',
    company: 'Wise',
    location: 'London, UK',
    country: 'United Kingdom',
    remote_policy: 'HYBRID',
    visa_status: 'VISA_SPONSORED',
    visa_reasoning: 'Sponsorship provided',
    employment_type: 'Full-time',
    must_have_skills: ['Payments'],
    nice_to_have_skills: [],
    responsibilities: [],
    domains: ['FinTech'],
    tools: [],
    technologies_and_apis: [],
    ats_keywords: [],
    raw_text: '',
    discovered_at: new Date().toISOString(),
  };

  const mockPkg: PipelinePackageResult = {
    job_id: mockJd.job_id,
    company: mockJd.company,
    role: mockJd.title,
    match: {} as any,
    truth_validation: {} as any,
    package_dir: '/tmp',
    files: {
      jd_txt: '',
      job_json: '',
      match_analysis_json: '',
      tailored_resume_tex: '',
      tailored_resume_pdf: '/path/to/resume.pdf',
      cover_letter_md: '',
      cover_letter_pdf: '/path/to/cover_letter.pdf',
      application_metadata_json: '',
    },
    compilation: {} as any,
    cover_letter: {} as any,
    trello: {
      card_id: 'card_123',
      card_title: 'Wise PM',
      card_url: 'https://trello.com/c/123',
      list_name: '🟢 Ready to Apply',
      attachments_count: 3,
    },
    timing_ms: 10,
  };

  const questions: FormQuestion[] = [
    { id: 'q_name', label: 'Full Name', type: 'text', required: true },
    { id: 'q_salary', label: 'What are your target salary expectations (£)?', type: 'text', required: true },
  ];

  // 1. Unapproved -> must halt
  const res1 = await assistant.assistApplication(mockJd, mockPkg, questions, false);
  assert.equal(res1.status, 'PENDING_APPROVAL');

  // 2. Approved, but sensitive salary question unanswered -> must block
  const res2 = await assistant.assistApplication(mockJd, mockPkg, questions, true);
  assert.equal(res2.status, 'BLOCKED_SENSITIVE_QUESTION');
  assert.equal(res2.blocked_questions.length, 1);
  assert.ok(res2.blocked_questions[0].label.includes('salary'));

  // 3. Approved with explicit user salary answer -> must confirm and generate confirmation ID
  const res3 = await assistant.assistApplication(mockJd, mockPkg, questions, true, {
    q_salary: '£105,000 / annum',
  });
  assert.equal(res3.status, 'CONFIRMED');
  assert.ok(res3.confirmation_id);
  assert.ok(res3.confirmation_id.startsWith('SUB_'));
  assert.equal(res3.trello_list_updated, '📤 Applied');
});
