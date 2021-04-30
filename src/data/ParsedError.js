import { v5 as uuidv5 } from 'uuid';

export default class ParsedError
{
   constructor(error, stack, namespace)
   {
      this._error = error;
      this._stack = stack;

      this._name = error.name;
      this._message = error.message;

      this._uuid = uuidv5(this.toString(), namespace);
   }

   get error() { return this._error; }

   get stack() { return this._stack; }

   get firstEntry() { return this._stack.length > 0 ? this._stack[0] : void 0; }

   get firstFilename() { return this._stack.length > 0 ? this._stack[0].filename : void 0; }

   get firstFilepath() { return this._stack.length > 0 ? this._stack[0].filepath : void 0; }

   get uniqueFilepaths()
   {
      const uniqueFilePaths = new Set();
      const results = [];

      for (const entry of this.stack)
      {
         if (!uniqueFilePaths.has(entry.filepath))
         {
            results.push(entry.filepath);
            uniqueFilePaths.add(entry.filepath);
         }
      }

      return results;
   }

   get uuid() { return this._uuid; }

   toString({ limit = Number.MAX_SAFE_INTEGER, noLineCol = false } = {})
   {
      if (!Number.isInteger(limit) || limit < 0) { throw new TypeError(`'limit' is not a positive 'integer'.`); }
      if (typeof noLineCol !== 'boolean') { throw new TypeError(`'noLineCol' is not a 'boolean'.`); }

      let result = this._message ? `${this._name}: ${this._message}\r\n` : `${this._name}\r\n`;

      const max = Math.min(limit, this._stack.length);

      for (let cntr = 0; cntr < max; cntr++)
      {
         const entry = this._stack[cntr];
         result += `  at ${entry.callsource} (${entry.filepath}`;
         result += noLineCol ? ')\r\n' : `:${entry.line}:${entry.col})\r\n`;
      }

      return result;
   }

   toStringTrace({ limit = Number.MAX_SAFE_INTEGER, noLineCol = false } = {})
   {
      if (!Number.isInteger(limit) || limit < 0) { throw new TypeError(`'limit' is not a positive 'integer'.`); }
      if (typeof noLineCol !== 'boolean') { throw new TypeError(`'noLineCol' is not a 'boolean'.`); }

      let result = '';

      const max = Math.min(limit, this._stack.length);

      for (let cntr = 0; cntr < max; cntr++)
      {
         const entry = this._stack[cntr];
         result += `  at ${entry.callsource} (${entry.filepath}`;
         result += noLineCol ? ')\r\n' : `:${entry.line}:${entry.col})\r\n`;
      }

      return result;
   }
}
