import path          from 'path';
import url           from 'url';

import upath         from 'upath';

import ParsedError   from '../data/ParsedError.js';

const s_REGEX_STACK_LINE = /\s*at\s(.*)\s+\((.*)\)/;
const s_REGEX_PATH_LINE_COL = /(.*):(\d+):(\d+)/;

/**
 * Normalizes the error.
 *
 * @param {Error} error - A V8 Error.
 *
 * @returns {ParsedError} A ParsedError instance.
 */
export default function normalizeError(error)
{
   if (!(error instanceof Error) && typeof error.stack !== 'string')
   {
      throw new TypeError(`'error' is not an instance of 'Error'.`);
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

      const callSource = match.length >= 1 ? match[1] : '';
      const rawPath = match.length >= 2 ? match[2] : '';

      const fileURL = rawPath.startsWith('file:/') ? rawPath : url.pathToFileURL(rawPath);

      const unparsedFilePath = rawPath.startsWith('file:/') ? url.fileURLToPath(rawPath) : rawPath;

      const matchPath = s_REGEX_PATH_LINE_COL.exec(unparsedFilePath);

      if (matchPath === null) { continue; }

      const filePath = matchPath.length >= 1 ? matchPath[1] : '';
      const line = matchPath.length >= 2 ? matchPath[2] : '';
      const col = matchPath.length >= 3 ? matchPath[3] : '';

      // Skip any internal Node stack.
      if (filePath.startsWith('internal')) { continue; }

      const dirPath = path.dirname(filePath);

      const filePathNum = `${filePath}:${line}:${col}`;
      const fileName = path.basename(filePath);
      const fileExt = path.extname(filePath);

      const unixPath = upath.normalizeSafe(filePath);

      results.push({
         callSource,
         dirPath,
         fileExt,
         fileName,
         filePath,
         filePathNum,
         fileURL,
         unixPath,
         line,
         col
      });
   }

   return new ParsedError(error, results);
}
