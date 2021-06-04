import ErrorParser   from '../../src/index.js';

/**
 * Tests all of the API errors regarding invoking better errors as an external consumer.
 */
describe(`ErrorParser`, () =>
{
   it(`filter - toString`, () =>
   {
      const errorParser = new ErrorParser();

      errorParser.addFilter({
         type: 'exclusive',
         name: 'mocha',
         filterString: 'mocha/lib'
      });

      const result = errorParser.filter({ error: new Error('TEST - ERROR') });

      console.log(result.toString());
   });

   it(`filter - stack`, () =>
   {
      const errorParser = new ErrorParser();

      errorParser.addFilter({
         type: 'exclusive',
         name: 'mocha',
         filterString: 'mocha/lib'
      });

      const result = errorParser.filter({ error: new Error('TEST - ERROR') });

      console.log(JSON.stringify(result.stack, null, 3));
   });
});
