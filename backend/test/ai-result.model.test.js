import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { AIResult } from '../src/models/ai-result.model.js';

test('uses the exact AIresult collection with one result per donor and request', () => {
  assert.equal(AIResult.collection.name, 'AIresult');

  const uniquePairIndex = AIResult.schema
    .indexes()
    .find(([fields, options]) => fields.requestId === 1 && fields.donorId === 1 && options.unique);
  assert.ok(uniquePairIndex);
});

test('eligibility training JSONL contains valid donor and assistant example pairs', async () => {
  const trainingFileUrl = new URL('../bloodbridge_eligibility_training.jsonl', import.meta.url);
  const contents = await readFile(trainingFileUrl, 'utf8');
  const lines = contents.split(/\r?\n/).filter(Boolean);

  assert.ok(lines.length > 0);
  for (const line of lines) {
    const example = JSON.parse(line);
    assert.ok(example.messages.some((message) => message.role === 'user' && message.content));
    assert.ok(example.messages.some((message) => message.role === 'assistant' && message.content));
  }
});
