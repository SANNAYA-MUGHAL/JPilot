import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { TrelloClient } from '../src/services/trello/trelloClient.js';

test('TrelloClient provisions board, lists, cards, checklists and attachments', async () => {
  const client = new TrelloClient();

  // 1. Board
  const board = await client.getOrCreateBoard('AI Job Applications');
  assert.equal(board.name, 'AI Job Applications');
  assert.ok(board.id);

  // 2. Lists
  const lists = await client.getLists(board.id);
  assert.ok(lists.length >= 9);
  assert.equal(lists[0].name, '🔥 High Match');
  assert.equal(lists[1].name, '🟢 Ready to Apply');

  // 3. Card Creation
  const card = await client.createCard(lists[0].id, {
    name: '[92%] Wise | Senior Product Manager | London, UK',
    desc: 'Sample Description',
    idList: lists[0].id,
  });

  assert.ok(card.id);
  assert.ok(card.name.includes('[92%]'));
  assert.ok(card.url.includes('trello.com'));

  // 4. Checklist Creation
  const checklist = await client.createChecklist(card.id, 'Application Checklist', [
    'Review tailored resume',
    'Review cover letter',
    'Submit application',
  ]);

  assert.equal(checklist.name, 'Application Checklist');
  assert.equal(checklist.checkItems.length, 3);
  assert.equal(checklist.checkItems[0].state, 'incomplete');

  // 5. File Attachment
  const tmpFile = path.resolve(process.cwd(), 'tests/tmp_trello_test.txt');
  fs.writeFileSync(tmpFile, 'Test attachment content', 'utf8');

  const attachment = await client.addAttachment(card.id, tmpFile, 'resume.pdf');
  assert.equal(attachment.name, 'resume.pdf');
  assert.ok(attachment.bytes && attachment.bytes > 0);

  fs.unlinkSync(tmpFile);
});
