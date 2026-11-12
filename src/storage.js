import { validBinding } from './keys.js';
export const BINDING_PREFIX = 'binding:';
export const ACCOUNT_PREFIX = 'account:';
export function readBindings(items) {
  return Object.fromEntries(Object.entries(items).filter(([key, value]) => key.startsWith(BINDING_PREFIX) && (value === null || validBinding(value))).map(([key, value]) => [key.slice(BINDING_PREFIX.length), value]));
}
export function accountKey(handle) { return `${ACCOUNT_PREFIX}${handle.toLowerCase()}`; }
export function listAction(handle, id) { return `list:${handle.toLowerCase()}:${id}`; }
