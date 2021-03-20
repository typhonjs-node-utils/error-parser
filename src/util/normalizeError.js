import path             from 'path';
import url              from 'url';

import upath            from 'upath';
import { validate }     from 'uuid';
import defaultNamespace from '../data/defaultNamespace.js';

import ParsedError      from '../data/ParsedError.js';

const s_REGEX_STACK_LINE = /\s*at\s(.*)\s+\((.*)\)/;
const s_REGEX_PATH_LINE_COL = /(.*):(\d+):(\d+)/;

export const stackParams = ['callsource', 'dirpath', 'fileext', 'filename', 'filepath', 'filepathLineCol', 'fileURL',
 'unixpath', 'line', 'col'];

/**
 * Normalizes the error.
 *
 * @param {object}   options - An object.
 *
 * @param {Error}    options.error - A V8 Error.
 *
 * @param {string}   [options.namespace] - A UUID namespace string. A default namespace is provided.
 *
 * @returns {ParsedError} A ParsedError instance.
 */
export default function normalizeError({ error, namespace = defaultNamespace } = {})
{
   if (!(error instanceof Error) && typeof error.stack !== 'string')
   {
      throw new TypeError(`'error' is not an instance of 'Error'.`);
   }

   if (!validate(namespace))
   {
      throw new TypeError(`'namespace' is not a valid UUID namespace.`);
   }

   const results = [];

   // split stack.
   const splitStack = error.stack.split('\n');

   splitStack.shift();

   for (const stackLine of splitStack)
   {
      const match = s_REGEX_STACK_LINE.exec(stackLine);

      // Only process stack lines with a call source.
      if (match === null) { continue; }

      const callsource = match.length >= 1 ? match[1] : '';
      const rawPath = match.length >= 2 ? match[2] : '';

      const fileURL = rawPath.startsWith('file:/') ? rawPath : url.pathToFileURL(rawPath);

      const unparsedFilepath = rawPath.startsWith('file:/') ? url.fileURLToPath(rawPath) : rawPath;

      const matchpath = s_REGEX_PATH_LINE_COL.exec(unparsedFilepath);

      if (matchpath === null) { continue; }

      const filepath = matchpath.length >= 1 ? matchpath[1] : '';
      const line = matchpath.length >= 2 ? matchpath[2] : '';
      const col = matchpath.length >= 3 ? matchpath[3] : '';

      // Skip any internal Node stack.
      if (filepath.startsWith('internal')) { continue; }

      const dirpath = path.dirname(filepath);

      const filepathLineCol = `${filepath}:${line}:${col}`;
      const filename = path.basename(filepath);
      const fileext = path.extname(filepath);

      const unixpath = upath.normalizeSafe(filepath);

      results.push({
         callsource,
         dirpath,
         fileext,
         filename,
         filepath,
         filepathLineCol,
         fileURL,
         unixpath,
         line,
         col
      });
   }

   return new ParsedError(error, results, namespace);
}
