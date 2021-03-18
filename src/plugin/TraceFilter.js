/**
 * Defines a trace filter to apply against stack traces allowing inclusive / exclusive filtering.
 */
export default class TraceFilter
{
   /**
    * Instantiates the filter.
    *
    * @param {string}   name - The name of the filter.
    *
    * @param {string}   filterString - The raw filter string.
    */
   constructor(name, filterString)
   {
      /**
       * The filter enabled state.
       *
       * @type {boolean}
       * @private
       */
      this._enabled = true;

      /**
       * The RegExp filter.
       *
       * @type {RegExp}
       * @private
       */
      this._filter = new RegExp(filterString);

      /**
       * The raw filter string.
       *
       * @type {string}
       * @private
       */
      this._filterString = filterString;

      /**
       * The name of the filter
       *
       * @type {string}
       * @private
       */
      this._name = name;
   }

   /**
    * Get enabled.
    *
    * @returns {boolean} Whether the filter is enabled.
    */
   get enabled() { return this._enabled; }

   /**
    * Set enabled.
    *
    * @param {boolean} enabled - New enabled state.
    */
   set enabled(enabled)
   {
      this._enabled = enabled;
   }

   /**
    * Get original filter string
    *
    * @returns {*} The filter RegExp
    */
   get filter() { return this._filter; }

   /**
    * Get original filter string
    *
    * @returns {*} Original filter string.
    */
   get filterString() { return this._filterString; }

   /**
    * Get name.
    *
    * @returns {string} Name of the filter
    */
   get name() { return this._name; }

   /**
    * Tests a value against the RegExp filter.
    *
    * @param {string}   value - A value to test against the filter.
    *
    * @returns {boolean} Result of the test.
    */
   test(value)
   {
      return this._enabled && this._filter.test(value);
   }
}
