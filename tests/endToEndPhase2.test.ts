import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Phase1Pipeline } from '../src/services/orchestrator/phase1Pipeline.js';

test('Pipeline creates application package AND Trello card with attachments and checklist', async () => {
  const pipeline = new Phase1Pipeline();

  const sampleJd = `
Senior FinTech Product Manager — Card & Digital Payments
Revolut — London, UK / Remote Worldwide
We are seeking an exceptional Senior Product Manager to lead global payment expansion.
Key Responsibilities:
• Lead payments integration squad with Adyen, MangoPay, and alternative payment rails.
• Enhance checkout conversion rates using Mixpanel analytics and event telemetry.
• Ensure PCI-DSS compliance and 3D Secure 2.0 authentication.
Requirements:
• 6+ years PM experience in FinTech, payments, or SaaS.
• Proven expertise with REST APIs, postman, and Agile delivery.
Location:
• London, UK / Remote Worldwide. Relocation support and visa sponsorship provided.
`;

  const testAppsDir = path.resolve(process.cwd(), 'tests/tmp_phase2_apps');

  const result = await pipeline.execute({
    raw_jd_text: sampleJd,
    company_hint: 'Revolut',
    title_hint: 'Senior FinTech Product Manager',
    location_hint: 'London, UK / Remote Worldwide',
    applications_dir: testAppsDir,
    enable_trello: true,
  });

  // Verify application package generated
  assert.equal(result.company, 'Revolut');
  assert.ok(result.match.overall_score >= 80);
  assert.equal(result.truth_validation.overall_passed, true);
  assert.ok(fs.existsSync(result.files.tailored_resume_pdf));
  assert.ok(fs.existsSync(result.files.cover_letter_pdf));

  // Verify Trello integration
  assert.ok(result.trello, 'Trello result must be defined');
  assert.ok(result.trello.card_id);
  assert.ok(result.trello.card_title.includes('Revolut'));
  assert.ok(result.trello.card_title.includes('Senior FinTech Product Manager'));
  assert.equal(result.trello.list_name, '🔥 High Match');
  assert.ok(result.trello.attachments_count >= 3);

  // Check application_metadata.json contains trello details
  const metadata = JSON.parse(fs.readFileSync(result.files.application_metadata_json, 'utf8'));
  assert.ok(metadata.trello);
  assert.equal(metadata.trello.card_id, result.trello.card_id);
  assert.equal(metadata.trello.list_name, '🔥 High Match');

  // Clean up
  fs.rmSync(testAppsDir, { recursive: true, force: true });
});
