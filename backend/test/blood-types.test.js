import assert from 'node:assert/strict';
import test from 'node:test';

import { BLOOD_TYPES, DONOR_BLOOD_TYPES } from '../src/constants/blood-types.js';
import { User } from '../src/models/user.model.js';

test('allows unknown donor blood type without allowing unknown hospital requests', () => {
  assert.equal(BLOOD_TYPES.includes('unknown'), false);
  assert.equal(DONOR_BLOOD_TYPES.includes('unknown'), true);
  assert.equal(User.schema.path('bloodType').enumValues.includes('unknown'), true);
});
