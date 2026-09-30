import test from 'node:test';
import assert from 'node:assert/strict';
import { CandidateKnowledgeBase } from '../src/services/candidate/knowledgeBase.js';

test('CandidateKnowledgeBase loads Sana Liaqat profile correctly', () => {
  const kb = new CandidateKnowledgeBase();
  const profile = kb.getCandidateProfile();

  assert.equal(profile.personal_information.full_name, 'Sana Liaqat');
  assert.equal(profile.positioning.years_of_experience, 7);
  assert.equal(profile.positioning.primary_discipline, 'Product Management');
  assert.ok(profile.target_roles.primary.includes('Product Manager'));
  assert.ok(profile.location_preferences.preferred_geographies.includes('Remote Worldwide'));
});

test('CandidateKnowledgeBase builds fact catalog with unique fact IDs', () => {
  const kb = new CandidateKnowledgeBase();
  const factIds = kb.getAllFactIds();

  assert.ok(factIds.includes('BAYUT_RESP_01'));
  assert.ok(factIds.includes('BAYUT_ACHIEVE_01'));
  assert.ok(factIds.includes('PRJ_MANGOPAY_SPLIT'));

  const splitPaymentAch = kb.getFactById('BAYUT_ACHIEVE_01');
  assert.ok(splitPaymentAch);
  assert.ok(splitPaymentAch.text.includes('18%'));
  assert.ok(splitPaymentAch.text.includes('Adyen'));
  assert.ok(splitPaymentAch.text.includes('MangoPay'));
});

test('CandidateKnowledgeBase loads canonical master LaTeX template without overwriting', () => {
  const kb = new CandidateKnowledgeBase();
  const template = kb.getMasterResumeTemplate();

  assert.ok(template.includes('\\documentclass'));
  assert.ok(template.includes('Sana Liaqat'));
  assert.ok(template.includes('Bayut'));
});
