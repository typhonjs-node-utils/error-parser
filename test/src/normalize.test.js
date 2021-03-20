import { normalizeError } from '../../src/index.js';

/**
 * Tests all of the API errors regarding invoking better errors as an external consumer.
 */
describe(`normalizeError`, () =>
{
   it(`toString`, () =>
   {
      const parsedError = normalizeError({ error: new Error('TEST - ERROR') });
      console.log(parsedError.toString({ limit: 3 }));
      console.log(`UUID: ${parsedError.uuid}`);
   });

   it(`uniqueFilePaths`, () =>
   {
      const parsedError = normalizeError({ error: new Error('TEST - ERROR') });
      console.log(JSON.stringify(parsedError.uniqueFilepaths, null, 3));
      console.log(`UUID: ${parsedError.uuid}`);
   });

   it(`firstFilePath`, () =>
   {
      const parsedError = normalizeError({ error: new Error('TEST - ERROR') });
      console.log(parsedError.firstFilepath);
      console.log(`UUID: ${parsedError.uuid}`);
   });
});
