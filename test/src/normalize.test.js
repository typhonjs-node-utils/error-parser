import { normalizeError } from '../../src/index.js';

/**
 * Tests all of the API errors regarding invoking better errors as an external consumer.
 */
describe(`normalizeError`, () =>
{
   it(`toString`, () =>
   {
      const stack = normalizeError(new Error('TEST - ERROR'));
      console.log(stack.toString({ limit: 3 }));
   });

   it(`uniqueFilePaths`, () =>
   {
      const stack = normalizeError(new Error('TEST - ERROR'));
      console.log(JSON.stringify(stack.uniqueFilePaths, null, 3));
   });

   it(`firstFilePath`, () =>
   {
      const stack = normalizeError(new Error('TEST - ERROR'));
      console.log(stack.firstFilePath);
   });
});
