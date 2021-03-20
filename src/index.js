import ErrorParser                     from './plugin/ErrorParser.js';

export { default as defaultNamespace } from './data/defaultNamespace.js';
export { default as normalizeError }   from './util/normalizeError.js';
export { ErrorParser };

export default new ErrorParser();
