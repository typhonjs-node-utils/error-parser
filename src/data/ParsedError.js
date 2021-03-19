export default class ParsedError
{
   constructor(error, stack)
   {
      this._error = error;
      this._stack = stack;

      this._name = error.name;
      this._message = error.message;
   }

   get error() { return this._error; }

   get stack() { return this._stack; }

   get firstEntry() { return this._stack.length > 0 ? this._stack[0] : void 0; }

   get firstFilepath() { return this._stack.length > 0 ? this._stack[0].filePath : void 0; }

   get uniqueFilepaths()
   {
      const uniqueFilePaths = new Set();
      const results = [];

      for (const entry of this.stack)
      {
         if (!uniqueFilePaths.has(entry.filePath))
         {
            results.push(entry.filePath);
            uniqueFilePaths.add(entry.filePath);
         }
      }

      return results;
   }

   toString({ limit = Number.MAX_SAFE_INTEGER, noLineCol = false } = {})
   {
      if (!Number.isInteger(limit) || limit < 0) { throw new TypeError(`'limit' is not a positive 'integer'.`); }
      if (typeof noLineCol !== 'boolean') { throw new TypeError(`'noLineCol' is not a 'boolean'.`); }

      let result = this._message ? `${this._name}: ${this._message}\r\n` : `${this._name}\r\n`;

      const max = Math.min(limit, this._stack.length);

      for (let cntr = 0; cntr < max; cntr++)
      {
         const entry = this._stack[cntr];
         result += `  at ${entry.callSource} (${entry.filePath}`;
         result += noLineCol ? ')\r\n' : `:${entry.line}:${entry.col})\r\n`;
      }

      return result;
   }
}
