import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Phase1Pipeline } from '../src/services/orchestrator/phase1Pipeline.js';

test('Phase1Pipeline executes end-to-end workflow successfully', async () => {
  const pipeline = new Phase1Pipeline();

  const realPmJd = `
Senior Product Manager — Checkout & Payment Systems
Wise (formerly TransferWise) — London, UK / Remote (Europe Timezones)

About Wise:
Wise is a global technology company building the best way to move money around the world.

The Role:
We are looking for an experienced Senior Product Manager to lead our Core Checkout & Multi-Currency Payment Routing squad. You will own the strategic roadmap for payment gateway integrations, checkout funnel conversion, and high-availability payout infrastructure across the UK, Europe, and the Middle East.

Key Responsibilities:
• Own the product strategy and execution roadmap for payment gateway integrations (including Adyen, local APMs, and digital wallets).
• Lead a cross-functional squad of 10+ engineers, designers, and data analysts in fast-paced Agile/Scrum sprint cycles.
• Utilize product analytics (Mixpanel, cohort tracking, and transaction telemetry) to identify drop-offs, optimize checkout conversion rates, and decrease payment failures.
• Partner with compliance, legal, and risk teams to guarantee PCI-DSS compliance, 3D Secure 2.0 authentication, and seamless financial reconciliation.

What We Look For:
• 6+ years of technical Product Management experience in FinTech, SaaS, or high-scale multi-vendor marketplaces.
• Proven track record integrating third-party payment rails, split payments, or escrow workflows.
• Strong analytical mindset with demonstrated experience using Mixpanel, SQL, or BI visualization tools to drive quantifiable conversion uplifts.
• Deep understanding of RESTful API architecture, webhooks, and technical discovery.

Location & Work Arrangement:
• London, UK / Remote within European timezones (CET/GMT).
• Comprehensive visa sponsorship and relocation support provided for qualifying international candidates.
`;

  const testAppsDir = path.resolve(process.cwd(), 'tests/tmp_e2e_apps');

  const result = await pipeline.execute({
    raw_jd_text: realPmJd,
    company_hint: 'Wise',
    title_hint: 'Senior Product Manager — Checkout & Payment Systems',
    location_hint: 'London, UK / Remote EU',
    applications_dir: testAppsDir,
  });

  // 1. Verify Pipeline Metadata
  assert.equal(result.company, 'Wise');
  assert.ok(result.role.includes('Product Manager'));
  assert.ok(result.match.overall_score >= 80, `Overall match score: ${result.match.overall_score}`);
  assert.equal(result.match.tier, 'HIGH_ALIGNMENT');

  // 2. Verify Truth Validation Gate
  assert.equal(result.truth_validation.overall_passed, true);
  assert.equal(result.truth_validation.contradictory_count, 0);
  assert.ok(result.truth_validation.verified_count > 0);

  // 3. Verify Files Exist in the Application Directory
  assert.ok(fs.existsSync(result.files.jd_txt), 'jd.txt must exist');
  assert.ok(fs.existsSync(result.files.job_json), 'job.json must exist');
  assert.ok(fs.existsSync(result.files.match_analysis_json), 'match_analysis.json must exist');
  assert.ok(fs.existsSync(result.files.tailored_resume_tex), 'tailored_resume.tex must exist');
  assert.ok(fs.existsSync(result.files.tailored_resume_pdf), 'tailored_resume.pdf must exist');
  assert.ok(fs.existsSync(result.files.cover_letter_md), 'cover_letter.md must exist');
  assert.ok(fs.existsSync(result.files.cover_letter_pdf), 'cover_letter.pdf must exist');
  assert.ok(fs.existsSync(result.files.application_metadata_json), 'application_metadata.json must exist');

  // 4. Verify Resume PDF integrity
  const pdfBytes = fs.readFileSync(result.files.tailored_resume_pdf);
  assert.ok(pdfBytes.length > 5000, `PDF size was: ${pdfBytes.length} bytes`);
  assert.equal(pdfBytes.subarray(0, 5).toString(), '%PDF-');

  // 5. Verify Cover Letter PDF integrity
  const clBytes = fs.readFileSync(result.files.cover_letter_pdf);
  assert.ok(clBytes.length > 3000, `Cover letter PDF size: ${clBytes.length} bytes`);
  assert.equal(clBytes.subarray(0, 5).toString(), '%PDF-');

  // 6. Verify Content Grounding
  const latexContent = fs.readFileSync(result.files.tailored_resume_tex, 'utf8');
  assert.ok(latexContent.includes('Sana Liaqat'));
  assert.ok(latexContent.includes('Bayut'));
  assert.ok(latexContent.includes('Adyen'));

  // Clean up
  fs.rmSync(testAppsDir, { recursive: true, force: true });
});
