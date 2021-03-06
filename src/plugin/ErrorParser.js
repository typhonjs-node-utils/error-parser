import { validate }     from 'uuid';

import defaultNamespace from '../data/defaultNamespace.js';
import normalizeError   from '../util/normalizeError.js';
import ParsedError      from '../data/ParsedError.js';
import { stackParams }  from '../util/normalizeError.js';
import TraceFilter      from './TraceFilter.js';

/**
 * Provides ErrorParserOptions
 *
 * @typedef {object}    ErrorParserOptions
 * @property {boolean}  [autoPluginFilters=false] - If true inclusive trace filters are added / removed automatically in
 *                                                 response to 'typhonjs:plugin:manager:plugin:added' and
 *                                                 'typhonjs:plugin:manager:plugin:removed'.
 * @property {boolean}  [filtersEnabled=true] - If true trace filters are applied in `_getInfo`.
 */

/**
 * Defines a trace filter.
 *
 * @typedef {object}    TraceFilterData
 * @property {boolean}  [enabled=true] - The enabled state of the filter.
 * @property {string}   filterString - The raw filter string used to create the RegExp.
 * @property {string}   name - The filter name.
 * @property {string}   type - The filter type: 'exclusive' or 'inclusive'.
 */

export default class ErrorParser
{
   constructor(options = {})
   {
      /**
       * Stores ErrorParserOptions options.
       *
       * @type {ErrorParserOptions}
       * @private
       */
      this._options = {
         autoPluginFilters: false,
         filtersEnabled: true,
      };

      /**
       * Stores all exclusive trace filters.
       *
       * @type {Map<string, TraceFilter>}
       * @private
       */
      this._exclusiveTraceFilters = new Map();

      /**
       * Stores all inclusive trace filters.
       *
       * @type {Map<string, TraceFilter>}
       * @private
       */
      this._inclusiveTraceFilters = new Map();

      this.addFilter({
         type: 'exclusive',
         name: '@typhonjs-utils/error-parser',
         filterString: '@typhonjs-utils/error-parser'
      });

      this.addFilter({
         type: 'exclusive',
         name: '@typhonjs-plugin/eventbus',
         filterString: '@typhonjs-plugin/eventbus'
      });

      this.addFilter({
         type: 'exclusive',
         name: '@typhonjs-plugin/manager',
         filterString: '@typhonjs-plugin/manager'
      });

      this.setOptions(options);
   }

   /**
    * Adds a new trace filter.
    *
    * @param {TraceFilterData}   config - The filter config to add.
    *
    * @returns {boolean} True if the filter was added.
    */
   addFilter(config)
   {
      if (typeof config !== 'object') { throw new TypeError(`'config' is not an 'object'.`); }
      if (typeof config.name !== 'string') { throw new TypeError(`'config.name' is not a 'string'.`); }
      if (typeof config.filterString !== 'string') { throw new TypeError(`'config.filterString' is not a 'string'.`); }

      if (config.type !== 'exclusive' && config.type !== 'inclusive')
      {
         throw new Error(`'config.type' must be 'exclusive' or 'inclusive'`);
      }

      const filterMap = config.type === 'exclusive' ? this._exclusiveTraceFilters : this._inclusiveTraceFilters;

      if (filterMap.has(config.name))
      {
         if (this._eventbus)
         {
            this._eventbus.trigger('log:warn', `A filter with name: '${config.name} already exists.`);
         }

         return false;
      }

      const filter = new TraceFilter(config.name, config.filterString);

      if (typeof config.enabled === 'boolean') { filter.enabled = config.enabled; }

      filterMap.set(config.name, filter);

      return true;
   }

   /**
    * Initializes multiple trace filters in a single call.
    *
    * @param {Array<TraceFilterData>} filterConfigs - An array of filter config object hash entries.
    *
    * @returns {boolean} If true all filters were added successfully.
    */
   addFilters(filterConfigs = [])
   {
      if (!Array.isArray(filterConfigs)) { throw new TypeError(`'plugins' is not an array.`); }

      let success = true;

      for (const config of filterConfigs)
      {
         if (!this.addFilter(config)) { success = false; }
      }

      return success;
   }

   /**
    * Applies any exclusive then inclusive filters against a given value.
    *
    * @param {string}   value - A value to test against all filters.
    *
    * @returns {boolean} If true then the value matched a filter.
    * @private
    */
   _applyFilters(value)
   {
      // Early out if there are no trace filters.
      if (this._exclusiveTraceFilters.size === 0 && this._inclusiveTraceFilters.size === 0) { return false; }

      // Start filtered as false and if an exclusive filter matches then set it to true..
      let filtered = false;

      for (const filter of this._exclusiveTraceFilters.values())
      {
         if (filter.test(value)) { filtered = true; break; }
      }

      // If an exclusive filter matched then exit early.
      if (filtered) { return filtered; }

      // Invert filtered to being true if there are any inclusive filters. If an inclusive filter matches then set
      // it to false.
      filtered = this._inclusiveTraceFilters.size > 0;

      for (const filter of this._inclusiveTraceFilters.values())
      {
         if (filter.test(value)) { filtered = false; break; }
      }

      return filtered;
   }

   /**
    * Normalizes then filters the error stack and produces a filtered ParsedError.
    *
    * @param {object}   options - An object.
    *
    * @param {Error}    options.error - An optional Error to trace instead of artificially generating one.
    *
    * @param {string}   [options.filterParam='unixPath'] - A parameter from ErrorStack.
    *
    * @param {number}   [options.limit=Number.MAX_SAFE_INTEGER] - An integer zero or above.
    *
    * @param {string}   [options.namespace] - A UUID namespace string. A default namespace is provided.
    *
    * @returns {ParsedError} A filtered ParsedError instance.
    *
    */
   filter({ error, filterParam = 'unixpath', limit = Number.MAX_SAFE_INTEGER, namespace = defaultNamespace } = {})
   {
      if (!(error instanceof Error) && typeof error.stack !== 'string')
      {
         throw new TypeError(`'error' is not an instance of 'Error'.`);
      }

      if (typeof filterParam !== 'string') { throw new TypeError(`'filterParam' is not a 'string'.`); }

      if (!stackParams.includes(filterParam))
      {
         throw new Error(`'filterParam' must be one of the following strings: \n${JSON.stringify(stackParams)}.`);
      }

      if (!Number.isInteger(limit) || limit < 0) { throw new TypeError(`'limit' is not a positive 'integer'.`); }

      if (!validate(namespace))
      {
         throw new TypeError(`'namespace' is not a valid UUID namespace.`);
      }

      const filterEntries = [];

      const parsed = normalizeError({ error, namespace });

      const stackLimit = Math.min(limit, parsed.stack.length);

      for (let cntr = 0; cntr < stackLimit; cntr++)
      {
         const entry = parsed.stack[cntr];

         if (this._options.filtersEnabled && this._applyFilters(entry[filterParam])) { continue; }

         filterEntries.push(entry);
      }

      return new ParsedError(error, filterEntries, namespace);
   }

   /**
    * Gets the filter data for a trace filter by name.
    *
    * @param {boolean|undefined} [enabled] - If enabled is a boolean it will return filters given their enabled state.
    *
    * @returns {Array<TraceFilterData>} Returns an array of all filter data; optionally
    */
   getAllFilterData(enabled = void 0)
   {
      if (typeof enabled !== 'boolean' && typeof enabled !== 'undefined')
      {
         throw new TypeError(`'enabled' is not a 'boolean' or 'undefined'.`);
      }

      const results = [];

      // Return all filter data if enabled is not defined.
      const allFilters = typeof enabled === 'undefined';

      for (const filter of this._exclusiveTraceFilters.values())
      {
         if (allFilters || filter.enabled === enabled)
         {
            results.push({
               enabled: filter.enabled,
               filterString: filter.filterString,
               name: filter.name,
               type: 'exclusive'
            });
         }
      }

      for (const filter of this._inclusiveTraceFilters.values())
      {
         if (allFilters || filter.enabled === enabled)
         {
            results.push({
               enabled: filter.enabled,
               filterString: filter.filterString,
               name: filter.name,
               type: 'inclusive'
            });
         }
      }

      return results;
   }

   /**
    * Gets the filter data for a trace filter by name.
    *
    * @param {string}   type - The type of filter; must be 'exclusive' or 'inclusive'.
    *
    * @param {string}   name - The name of the filter.
    *
    * @returns {TraceFilterData|undefined} Returns a TraceFilterData object for the given `type` and `name`.
    */
   getFilterData(type, name)
   {
      if (type !== 'exclusive' && type !== 'inclusive')
      {
         throw new Error(`'type' must be 'exclusive' or 'inclusive'`);
      }

      const filterMap = type === 'exclusive' ? this._exclusiveTraceFilters : this._inclusiveTraceFilters;

      const filter = filterMap.get(name);

      if (filter instanceof TraceFilter)
      {
         return {
            enabled: filter.enabled,
            filterString: filter.filterString,
            name: filter.name,
            type
         };
      }

      return void 0;
   }

   /**
    * Gets a trace filter enabled state.
    *
    * @param {string}   type - The type of filter; must be 'exclusive' or 'inclusive'.
    *
    * @param {string}   name - The name of the filter.
    *
    * @returns {boolean} True if the filter enabled state was modified.
    */
   getFilterEnabled(type, name)
   {
      if (type !== 'exclusive' && type !== 'inclusive')
      {
         throw new Error(`'type' must be 'exclusive' or 'inclusive'`);
      }

      const filterMap = type === 'exclusive' ? this._exclusiveTraceFilters : this._inclusiveTraceFilters;

      const filter = filterMap.get(name);

      if (filter instanceof TraceFilter)
      {
         return filter.enabled;
      }

      return false;
   }

   /**
    * Returns a copy of the options.
    *
    * @returns {ErrorParserOptions} - NormalizeError options.
    */
   getOptions()
   {
      return JSON.parse(JSON.stringify(this._options));
   }

   /**
    * Normalizes the error.
    *
    * @param {object}   options - An object.
    *
    * @param {Error}    options.error - An optional Error to trace instead of artificially generating one.
    *
    * @param {string}   [options.namespace] - A UUID namespace string. A default namespace is provided.
    *
    * @returns {ParsedError} A parsed ErrorStack instance.
    */
   normalize(options)
   {
      return normalizeError(options);
   }

   /**
    * Removes all trace filters.
    */
   removeAllFilters()
   {
      this._exclusiveTraceFilters.clear();
      this._inclusiveTraceFilters.clear();
   }

   /**
    * Removes a trace filter by name
    *
    * @param {string}   type - The type of filter; must be 'exclusive' or 'inclusive'.
    *
    * @param {string}   name - The name of the filter.
    *
    * @returns {boolean} True if the filter was removed.
    */
   removeFilter(type, name)
   {
      if (type !== 'exclusive' && type !== 'inclusive')
      {
         throw new Error(`'type' must be 'exclusive' or 'inclusive'`);
      }

      const filterMap = type === 'exclusive' ? this._exclusiveTraceFilters : this._inclusiveTraceFilters;

      return filterMap.delete(name);
   }

   /**
    * Sets a trace filters enabled state.
    *
    * @param {string}   type - The type of filter; must be 'exclusive' or 'inclusive'.
    *
    * @param {string}   name - The name of the filter.
    *
    * @param {boolean}  enabled - The new enabled state.
    *
    * @returns {boolean} True if the filter enabled state was modified.
    */
   setFilterEnabled(type, name, enabled)
   {
      if (type !== 'exclusive' && type !== 'inclusive')
      {
         throw new Error(`'type' must be 'exclusive' or 'inclusive'`);
      }

      const filterMap = type === 'exclusive' ? this._exclusiveTraceFilters : this._inclusiveTraceFilters;

      const filter = filterMap.get(name);

      if (filter instanceof TraceFilter)
      {
         filter.enabled = enabled;
         return true;
      }

      return false;
   }

   /**
    * Set optional parameters.
    *
    * @param {ErrorParserOptions} options - Defines optional parameters to set.
    */
   setOptions(options = {})
   {
      if (typeof options !== 'object') { throw new TypeError(`'options' is not an 'object'.`); }

      if (typeof options.autoPluginFilters === 'boolean')
      {
         this._options.autoPluginFilters = options.autoPluginFilters;
      }

      if (typeof options.filtersEnabled === 'boolean') { this._options.filtersEnabled = options.filtersEnabled; }
   }

   /**
    * Wires up ErrorParser on the plugin eventbus.
    *
    * @param {object} ev - PluginInvokeEvent - The plugin event.
    *
    * @see https://www.npmjs.com/package/@typhonjs-plugin/manager
    *
    * @ignore
    */
   onPluginLoad(ev)
   {
      this._eventbus = ev.eventbus;

      const options = ev.pluginOptions;

      let guard = true;

      // Apply any plugin options.
      if (typeof options === 'object')
      {
         this.setOptions(options);

         if (Array.isArray(options.filterConfigs)) { this.addFilters(options.filterConfigs); }
         if (typeof options.guard === 'boolean') { guard = options.guard; }
      }

      this._eventbus.on(`typhonjs:utils:error:parser:filter`, this.filter, this, { guard });
      this._eventbus.on(`typhonjs:utils:error:parser:filter:add`, this.addFilter, this, { guard });
      this._eventbus.on(`typhonjs:utils:error:parser:filter:data:get:all`, this.getAllFilterData, this, { guard });
      this._eventbus.on(`typhonjs:utils:error:parser:filter:data:get`, this.getFilterData, this, { guard });
      this._eventbus.on(`typhonjs:utils:error:parser:filter:enabled:get`, this.getFilterEnabled, this, { guard });
      this._eventbus.on(`typhonjs:utils:error:parser:filter:enabled:set`, this.setFilterEnabled, this, { guard });
      this._eventbus.on(`typhonjs:utils:error:parser:filter:remove`, this.removeFilter, this, { guard });
      this._eventbus.on(`typhonjs:utils:error:parser:filter:remove:all`, this.removeAllFilters, this, { guard });
      this._eventbus.on(`typhonjs:utils:error:parser:normalize`, this.normalize, this, { guard });
      this._eventbus.on(`typhonjs:utils:error:parser:options:get`, this.getOptions, this, { guard });
      this._eventbus.on(`typhonjs:utils:error:parser:options:set`, this.setOptions, this, { guard });
   }

   /**
    * Removes any trace filters when unloading plugin.
    *
    * @see https://www.npmjs.com/package/@typhonjs-plugin/manager
    *
    * @ignore
    */
   onPluginUnload()
   {
      this.removeAllFilters();
   }
}
