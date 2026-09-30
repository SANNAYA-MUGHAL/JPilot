import fs from 'node:fs';
import path from 'node:path';
import type { ParsedJobDescription } from '../../types/job.js';
import type { MatchResult } from '../../types/match.js';
import type { TailoredResumeAST, TruthValidationReport } from '../../types/resume.js';
import type { CompilationResult } from '../pdf/pdfCompiler.js';
import type { CoverLetterResult } from '../coverletter/coverLetterAgent.js';
import type { TrelloApplicationResult } from '../trello/trelloAgent.js';

import { CandidateKnowledgeBase } from '../candidate/knowledgeBase.js';
import { JDIntelligenceAgent } from '../jd/jdIntelligenceAgent.js';
import { SemanticMatcher } from '../matching/semanticMatcher.js';
import { ResumeTailoringAgent } from '../tailoring/resumeTailoringAgent.js';
import { TruthValidationAgent } from '../validation/truthValidationAgent.js';
import { LatexGenerator } from '../pdf/latexGenerator.js';
import { PDFCompiler } from '../pdf/pdfCompiler.js';
import { CoverLetterAgent } from '../coverletter/coverLetterAgent.js';
import { TrelloAgent } from '../trello/trelloAgent.js';
import { ClaudeClient } from '../ai/claudeClient.js';

export interface PipelineOptions {
  raw_jd_text: string;
  source_url?: string;
  title_hint?: string;
  company_hint?: string;
  location_hint?: string;
  applications_dir?: string;
  enable_trello?: boolean;
}

export interface PipelinePackageResult {
  job_id: string;
  company: string;
  role: string;
  match: MatchResult;
  truth_validation: TruthValidationReport;
  package_dir: string;
  files: {
    jd_txt: string;
    job_json: string;
    match_analysis_json: string;
    tailored_resume_tex: string;
    tailored_resume_pdf: string;
    cover_letter_md: string;
    cover_letter_pdf: string;
    application_metadata_json: string;
  };
  compilation: CompilationResult;
  cover_letter: CoverLetterResult;
  trello?: TrelloApplicationResult;
  timing_ms: number;
}

export class Phase1Pipeline {
  private kb: CandidateKnowledgeBase;
  private jdAgent: JDIntelligenceAgent;
  private matcher: SemanticMatcher;
  private tailorAgent: ResumeTailoringAgent;
  private truthValidator: TruthValidationAgent;
  private latexGen: LatexGenerator;
  private pdfCompiler: PDFCompiler;
  private coverLetterAgent: CoverLetterAgent;
  private trelloAgent: TrelloAgent;

  constructor(customCandidateDir?: string) {
    this.kb = new CandidateKnowledgeBase(customCandidateDir);
    const claude = new ClaudeClient();
    this.jdAgent = new JDIntelligenceAgent(claude);
    this.matcher = new SemanticMatcher(this.kb);
    this.tailorAgent = new ResumeTailoringAgent(this.kb, claude);
    this.truthValidator = new TruthValidationAgent(this.kb);
    this.latexGen = new LatexGenerator(this.kb);
    this.pdfCompiler = new PDFCompiler(this.kb);
    this.coverLetterAgent = new CoverLetterAgent(this.kb, claude);
    this.trelloAgent = new TrelloAgent(undefined, this.kb);
  }

  public async execute(options: PipelineOptions): Promise<PipelinePackageResult> {
    const startTime = Date.now();

    // 1. Analyze JD
    const parsedJd = await this.jdAgent.parseJobDescription({
      raw_text: options.raw_jd_text,
      source_url: options.source_url,
      title_hint: options.title_hint,
      company_hint: options.company_hint,
      location_hint: options.location_hint,
    });

    // 2. Semantic Fit Matching
    const match = this.matcher.calculateMatch(parsedJd);

    // 3. Tailor Master Resume
    const rawAst = await this.tailorAgent.tailorResume(parsedJd, match);

    // 4. Strict Truth Validation Gate
    const truthReport = this.truthValidator.validateResumeAST(rawAst);
    if (!truthReport.overall_passed) {
      throw new Error(
        `PIPELINE HALTED BY TRUTH VALIDATION GATE: Contradictory or fabricated claims detected (${truthReport.contradictory_count} contradictions).`
      );
    }

    const approvedAst = truthReport.sanitized_ast;

    // 5. Generate Sanitized LaTeX
    const tailoredLatex = this.latexGen.generateLatex(approvedAst);

    // 6. Define Application Package Directory
    const safeCompany = parsedJd.company.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeRole = parsedJd.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const appsBaseDir = options.applications_dir || path.resolve(process.cwd(), 'applications');
    const packageDir = path.join(appsBaseDir, safeCompany, `${safeRole}_${parsedJd.job_id}`);

    if (!fs.existsSync(packageDir)) {
      fs.mkdirSync(packageDir, { recursive: true });
    }

    // 7. Write Files
    const jdTxtPath = path.join(packageDir, 'jd.txt');
    const jobJsonPath = path.join(packageDir, 'job.json');
    const matchAnalysisJsonPath = path.join(packageDir, 'match_analysis.json');
    const tailoredResumeTexPath = path.join(packageDir, 'tailored_resume.tex');
    const tailoredResumePdfPath = path.join(packageDir, 'tailored_resume.pdf');
    const metadataJsonPath = path.join(packageDir, 'application_metadata.json');

    fs.writeFileSync(jdTxtPath, parsedJd.raw_text, 'utf8');
    fs.writeFileSync(jobJsonPath, JSON.stringify(parsedJd, null, 2), 'utf8');
    fs.writeFileSync(matchAnalysisJsonPath, JSON.stringify(match, null, 2), 'utf8');
    fs.writeFileSync(tailoredResumeTexPath, tailoredLatex, 'utf8');

    // 8. Compile Resume PDF
    const compilation = await this.pdfCompiler.compileResume(
      tailoredLatex,
      tailoredResumePdfPath,
      approvedAst
    );

    if (!compilation.success) {
      throw new Error(`Resume PDF compilation failed: ${compilation.error}`);
    }

    // 9. Generate Tailored Cover Letter (MD + PDF)
    const coverLetter = await this.coverLetterAgent.generateCoverLetter(
      parsedJd,
      match,
      packageDir
    );

    const intermediatePackage: PipelinePackageResult = {
      job_id: parsedJd.job_id,
      company: parsedJd.company,
      role: parsedJd.title,
      match,
      truth_validation: truthReport,
      package_dir: packageDir,
      files: {
        jd_txt: jdTxtPath,
        job_json: jobJsonPath,
        match_analysis_json: matchAnalysisJsonPath,
        tailored_resume_tex: tailoredResumeTexPath,
        tailored_resume_pdf: tailoredResumePdfPath,
        cover_letter_md: path.join(packageDir, 'cover_letter.md'),
        cover_letter_pdf: coverLetter.pdf_path,
        application_metadata_json: metadataJsonPath,
      },
      compilation,
      cover_letter: coverLetter,
      timing_ms: 0,
    };

    // 10. Trello Integration (Phase 2)
    let trelloResult: TrelloApplicationResult | undefined = undefined;
    if (options.enable_trello !== false) {
      try {
        trelloResult = await this.trelloAgent.createApplicationCard(
          parsedJd,
          match,
          intermediatePackage
        );
      } catch (err: any) {
        console.warn(`Trello card creation warning: ${err.message}`);
      }
    }

    const timing = Date.now() - startTime;
    intermediatePackage.timing_ms = timing;
    intermediatePackage.trello = trelloResult;

    // 11. Write Application Metadata with Trello reference
    const metadata = {
      job_id: parsedJd.job_id,
      company: parsedJd.company,
      role: parsedJd.title,
      overall_match: match.overall_score,
      tier: match.tier,
      visa_status: parsedJd.visa_status,
      remote_policy: parsedJd.remote_policy,
      created_at: new Date().toISOString(),
      timing_ms: timing,
      truth_validation: {
        verified_claims: truthReport.verified_count,
        supported_rewrites: truthReport.supported_rewrites,
        unverified_claims: truthReport.unverified_count,
      },
      trello: trelloResult
        ? {
            card_id: trelloResult.card_id,
            card_title: trelloResult.card_title,
            card_url: trelloResult.card_url,
            list_name: trelloResult.list_name,
            attachments_count: trelloResult.attachments_count,
          }
        : null,
      files: {
        resume_pdf: 'tailored_resume.pdf',
        resume_tex: 'tailored_resume.tex',
        cover_letter_pdf: 'cover_letter.pdf',
        cover_letter_md: 'cover_letter.md',
        jd: 'jd.txt',
      },
    };

    fs.writeFileSync(metadataJsonPath, JSON.stringify(metadata, null, 2), 'utf8');

    return intermediatePackage;
  }
}
