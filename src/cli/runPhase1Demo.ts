import fs from 'node:fs';
import path from 'node:path';
import { Phase1Pipeline } from '../services/orchestrator/phase1Pipeline.js';

// Real-world Senior Product Manager Job Description (FinTech & Platform)
const sampleRealJd = `
Senior Product Manager — Checkout & Payment Systems
Wise (formerly TransferWise) — London, UK / Remote (Europe Timezones)

About Wise:
Wise is a global technology company building the best way to move money around the world. Over 16 million people and businesses use Wise to process billions each month.

The Role:
We are looking for an experienced Senior Product Manager to lead our Core Checkout & Multi-Currency Payment Routing squad. You will own the strategic roadmap for payment gateway integrations, checkout funnel conversion, and high-availability payout infrastructure across the UK, Europe, and the Middle East.

Key Responsibilities:
• Own the product strategy and execution roadmap for payment gateway integrations (including Adyen, local APMs, and digital wallets).
• Lead a cross-functional squad of 10+ engineers, designers, and data analysts in fast-paced Agile/Scrum sprint cycles.
• Utilize product analytics (Mixpanel, cohort tracking, and transaction telemetry) to identify drop-offs, optimize checkout conversion rates, and decrease payment failures.
• Partner with compliance, legal, and risk teams to guarantee PCI-DSS compliance, 3D Secure 2.0 authentication, and seamless financial reconciliation.
• Champion continuous experimentation, A/B testing, and user feedback to enhance customer satisfaction.

What We Look For:
• 6+ years of technical Product Management experience in FinTech, SaaS, or high-scale multi-vendor marketplaces.
• Proven track record integrating third-party payment rails, split payments, or escrow workflows.
• Strong analytical mindset with demonstrated experience using Mixpanel, SQL, or BI visualization tools to drive quantifiable conversion uplifts.
• Deep understanding of RESTful API architecture, webhooks, and technical discovery.
• Excellent stakeholder communication skills across finance, risk, and distributed engineering squads.

Location & Work Arrangement:
• London, UK / Remote within European timezones (CET/GMT).
• Comprehensive visa sponsorship and relocation support provided for qualifying international candidates.
`;

async function main() {
  console.log('='.repeat(80));
  console.log('🚀 JPILOT — AI JOB APPLICATION & RESUME TAILORING AGENT');
  console.log('   Candidate: Sana Liaqat (Product Manager, 7+ Years Tech Experience)');
  console.log('='.repeat(80));
  console.log('\n[Stage 1] Initializing Pipeline & Loading Candidate Knowledge Base...');

  const pipeline = new Phase1Pipeline();

  // Allow passing custom JD file from command line arguments
  let jdText = sampleRealJd;
  const args = process.argv.slice(2);
  if (args[0] && fs.existsSync(args[0])) {
    jdText = fs.readFileSync(args[0], 'utf8');
    console.log(`Loaded custom JD from: ${args[0]}`);
  } else {
    console.log('Using real-world target JD: Senior Product Manager — Wise (London / Remote EU)');
  }

  console.log('\n[Stage 2] Executing Full Phase 1 Agent Pipeline:');
  console.log('  → Extracting JD facts & Work Authorization classification...');
  console.log('  → Calculating 7-factor weighted semantic match...');
  console.log('  → Reordering & prioritizing candidate experience & projects...');
  console.log('  → Running Strict Truth Validation Gate (Zero Fabrication Check)...');
  console.log('  → Compiling Tailored LaTeX Resume & Validating PDF...');
  console.log('  → Generating Customized Cover Letter (Markdown & PDF)...');

  try {
    const result = await pipeline.execute({
      raw_jd_text: jdText,
      company_hint: 'Wise',
      title_hint: 'Senior Product Manager — Checkout & Payment Systems',
      location_hint: 'London, UK / Remote EU',
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ APPLICATION PACKAGE SUCCESSFULLY GENERATED');
    console.log('='.repeat(80));

    console.log(`\n🏢 Company:          ${result.company}`);
    console.log(`💼 Target Role:       ${result.role}`);
    console.log(`🌍 Location / Country:${result.match.breakdown.location_score >= 80 ? 'Target Alignment' : 'Review'} (${result.files.job_json ? JSON.parse(fs.readFileSync(result.files.job_json, 'utf8')).country : ''})`);
    console.log(`🛂 Visa / Remote:     ${JSON.parse(fs.readFileSync(result.files.job_json, 'utf8')).visa_status} (${JSON.parse(fs.readFileSync(result.files.job_json, 'utf8')).visa_reasoning})`);

    console.log(`\n📊 MATCH ANALYSIS:    ${result.match.overall_score}% (${result.match.tier})`);
    console.log(`   • Core Role Fit (25%):        ${result.match.breakdown.role_score}%`);
    console.log(`   • Relevant Experience (20%):   ${result.match.breakdown.experience_score}%`);
    console.log(`   • Mandatory Skills (20%):      ${result.match.breakdown.skills_score}%`);
    console.log(`   • Domain Alignment (15%):      ${result.match.breakdown.domain_score}%`);
    console.log(`   • Tools & Tech (10%):          ${result.match.breakdown.tools_score}%`);
    console.log(`   • Location & Visa (5%):        ${result.match.breakdown.location_score}%`);
    console.log(`   • Preferred Skills (5%):       ${result.match.breakdown.preferred_score}%`);

    console.log('\n🛡️ TRUTH VALIDATION AUDIT (Zero Hallucination Guarantee):');
    console.log(`   • Total Factual Claims Tested: ${result.truth_validation.total_claims}`);
    console.log(`   • Verified Canonical Facts:    ${result.truth_validation.verified_count}`);
    console.log(`   • Supported Rewrites:          ${result.truth_validation.supported_rewrites}`);
    console.log(`   • Unverified Claims Pruned:    ${result.truth_validation.unverified_count}`);
    console.log(`   • Contradictions / Halts:      ${result.truth_validation.contradictory_count} (Passed Gate: ${result.truth_validation.overall_passed})`);

    console.log(`\n📁 PERSISTED AUDITABLE PACKAGE: ${result.package_dir}`);
    console.log(`   📄 Resume PDF:        ${path.basename(result.files.tailored_resume_pdf)} (${Math.round(result.compilation.file_size_bytes / 1024)} KB)`);
    console.log(`   📜 Resume LaTeX:      ${path.basename(result.files.tailored_resume_tex)}`);
    console.log(`   ✉️ Cover Letter PDF:   ${path.basename(result.files.cover_letter_pdf)} (${result.cover_letter.word_count} words)`);
    console.log(`   📝 Cover Letter MD:    ${path.basename(result.files.cover_letter_md)}`);
    console.log(`   📊 Match Analysis:    ${path.basename(result.files.match_analysis_json)}`);
    console.log(`   📋 Original JD:       ${path.basename(result.files.jd_txt)}`);
    console.log(`   ⏱️ Pipeline Timing:    ${(result.timing_ms / 1000).toFixed(2)} seconds`);

    console.log('\n' + '='.repeat(80));
    console.log('🎉 PHASE 1 VERIFICATION COMPLETE');
    console.log('='.repeat(80));
  } catch (err: any) {
    console.error(`\n❌ Pipeline execution failed: ${err.message}`);
    process.exit(1);
  }
}

main();
