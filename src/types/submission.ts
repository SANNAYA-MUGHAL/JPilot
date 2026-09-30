export type SubmissionState =
  | 'PENDING_APPROVAL'
  | 'USER_APPROVED'
  | 'IN_PROGRESS'
  | 'BLOCKED_SENSITIVE_QUESTION'
  | 'SUBMITTED'
  | 'CONFIRMED';

export interface FormQuestion {
  id: string;
  label: string;
  type: 'text' | 'select' | 'radio' | 'file';
  required: boolean;
}

export interface SensitiveQuestion {
  question_id: string;
  label: string;
  reason: string;
}

export interface SubmissionResult {
  status: SubmissionState;
  job_id: string;
  company: string;
  role: string;
  filled_fields: Record<string, string>;
  blocked_questions: SensitiveQuestion[];
  confirmation_id?: string;
  submitted_at?: string;
  trello_card_id?: string;
  trello_list_updated?: string;
  message: string;
}
