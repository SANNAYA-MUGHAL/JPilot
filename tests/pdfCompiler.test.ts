import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { LatexSyntaxValidator } from '../src/services/validation/latexSyntaxValidator.js';
import { LatexGenerator } from '../src/services/pdf/latexGenerator.js';
import { PDFCompiler } from '../src/services/pdf/pdfCompiler.js';
import { CandidateKnowledgeBase } from '../src/services/candidate/knowledgeBase.js';
import type { TailoredResumeAST } from '../src/types/resume.js';

test('LatexSyntaxValidator properly escapes special characters', () => {
  const raw = 'FinTech & Payments with 24% uplift and $340K ARR #1';
  const escaped = LatexSyntaxValidator.escapeLatex(raw);

  assert.ok(escaped.includes('\\&'));
  assert.ok(escaped.includes('\\%'));
  assert.ok(escaped.includes('\\$'));
  assert.ok(escaped.includes('\\#'));

  const validation = LatexSyntaxValidator.validate('\\begin{document} Test { balanced } \\end{document}');
  assert.equal(validation.valid, true);

  const invalid = LatexSyntaxValidator.validate('\\begin{document} Test { unclosed \\end{document}');
  assert.equal(invalid.valid, false);
});

test('LatexGenerator and PDFCompiler generate valid PDF', async () => {
  const kb = new CandidateKnowledgeBase();
  const generator = new LatexGenerator(kb);
  const compiler = new PDFCompiler(kb);

  const mockAST: TailoredResumeAST = {
    headline: 'Senior Product Manager — FinTech & Payments',
    summary: 'Experienced Product Manager with 7+ years scaling payment systems.',
    competencies: {
      product_strategy: 'Roadmapping, Scrum',
      fintech_payments: 'Adyen, Split Payments, MangoPay',
      technical_integrations: 'APIs, Webhooks, Postman',
      analytics_tools: 'Mixpanel, New Relic',
    },
    experiences: [
      {
        company: 'Bayut & dubizzle (EMPG)',
        role: 'Product Manager — FinTech & Payments',
        dates: '2021-08 -- Present',
        location: 'Dubai, UAE',
        bullets: [
          {
            generated_text: 'Engineered split payments architecture and multi-gateway fallback routing (Adyen & MangoPay), reducing transaction drop-offs by 18% and boosting checkout completion by 24%.',
            source_fact_ids: ['BAYUT_ACHIEVE_01'],
            reasoning: 'Matches payment gateway integration',
            action_type: 'EMPHASIZED',
          },
        ],
      },
    ],
    projects: [
      {
        project_id: 'PRJ_MANGOPAY_SPLIT',
        project_name: 'Multi-Vendor Marketplace Split Payments & Escrow',
        company: 'Bayut & dubizzle',
        technologies_highlighted: 'Adyen, MangoPay, APIs',
        bullets: [
          {
            generated_text: 'Integrated MangoPay and Adyen APIs to enable multi-party escrow, automated split payments, reducing transaction drop-offs by 18%.',
            source_fact_ids: ['PRJ_MANGOPAY_SPLIT'],
            reasoning: 'Direct FinTech match',
            action_type: 'EMPHASIZED',
          },
        ],
      },
    ],
    ats_keywords_targeted: ['Payments', 'Adyen', 'Split Payments'],
  };

  const latex = generator.generateLatex(mockAST);
  assert.ok(latex.includes('\\begin{document}'));
  assert.ok(latex.includes('Sana Liaqat'));
  assert.ok(latex.includes('split payments'));

  const testPdfPath = path.resolve(process.cwd(), 'tests/output/test_resume.pdf');
  const result = await compiler.compileResume(latex, testPdfPath, mockAST);

  assert.equal(result.success, true);
  assert.ok(fs.existsSync(testPdfPath));
  assert.ok(result.file_size_bytes > 3000);

  // Read header
  const header = fs.readFileSync(testPdfPath).subarray(0, 5).toString();
  assert.equal(header, '%PDF-');

  // Clean up
  fs.rmSync(path.dirname(testPdfPath), { recursive: true, force: true });
});
