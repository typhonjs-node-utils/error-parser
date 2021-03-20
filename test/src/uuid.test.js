import { v5 as uuidv5 }       from 'uuid';

import { assert }             from 'chai';

import { normalizeError }     from '../../src/index.js';

import { defaultNamespace }   from '../../src/index.js';

/**
 * Tests all of the API errors regarding invoking better errors as an external consumer.
 */
describe(`normalizeError`, () =>
{
   it(`toString`, () =>
   {
      const parsedError = normalizeError({ error: new Error('TEST - ERROR') });
      console.log(parsedError.toString());
      console.log(`UUID: ${parsedError.uuid}`);

      // verify UUID
      const uuid = uuidv5(parsedError.toString(), defaultNamespace);
      console.log(`uuid: ${uuid}`);
      assert.strictEqual(parsedError.uuid, uuid);
   });
});
