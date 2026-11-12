export const DEFAULTS = Object.freeze({ forYou: 'Alt+Shift+1', following: 'Alt+Shift+2', next: 'Alt+Shift+ArrowRight', previous: 'Alt+Shift+ArrowLeft', top: 'Alt+Shift+ArrowUp' });
export const ACTIONS = Object.freeze({ forYou: 'For you', following: 'Following', next: 'Next feed', previous: 'Previous feed', top: 'Top and new posts' });
const modifiers = ['Ctrl', 'Alt', 'Meta', 'Shift'];
const special = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', 'Enter', 'Escape', 'Tab', 'Space', 'Backspace', 'Delete', 'Plus']);
export function bindingFromEvent(e) {
  if (e.isComposing || e.keyCode === 229 || e.getModifierState?.('AltGraph')) return null;
  let key = e.key === ' ' ? 'Space' : e.key === '+' ? 'Plus' : e.key;
  if (!key || ['Control', 'Alt', 'Meta', 'Shift', 'Dead', 'Process', 'Unidentified'].includes(key)) return null;
  // Digits use their physical code so Shift+1 and keyboard layouts remain usable.
  if (/^Digit[0-9]$/.test(e.code)) key = e.code.slice(5);
  else if (key.length === 1 && /[a-z]/i.test(key)) key = key.toLowerCase();
  if (key.length !== 1 && !special.has(key) && !/^F([1-9]|1[0-2])$/.test(key)) return null;
  return [...modifiers.filter((_, i) => [e.ctrlKey, e.altKey, e.metaKey, e.shiftKey][i]), key].join('+');
}
export function validBinding(value) {
  if (typeof value !== 'string' || value.length > 60) return false;
  const parts = value.split('+');
  const key = parts.pop();
  if (!key || !(key.length === 1 || special.has(key) || /^F([1-9]|1[0-2])$/.test(key))) return false;
  return parts.every((part, i) => modifiers.includes(part) && (i === 0 || modifiers.indexOf(parts[i - 1]) < modifiers.indexOf(part)));
}
export function nativeConflict(binding) {
  const parts = binding.split('+');
  const key = parts.at(-1);
  if (binding === 'Ctrl+Enter' || binding === 'Meta+Enter') return 'X uses this to send a post.';
  if (parts.includes('Ctrl') || parts.includes('Alt') || parts.includes('Meta')) return null;
  if (['g', 'a'].includes(key)) return 'X uses this as a shortcut sequence prefix.';
  if ('jkn/lrtsbuxoim.'.includes(key) || ['Space', 'Enter'].includes(key) || key === '?' || binding === 'Shift+/') return 'X uses this key for a native action or media control.';
  return null;
}
export function bindingWarning(binding) {
  if (nativeConflict(binding)) return nativeConflict(binding);
  const key = binding.split('+').at(-1);
  if (['Tab', 'Escape', 'Space', 'Enter', 'Backspace', 'Delete', 'Home', 'End', 'PageUp', 'PageDown'].includes(key) || /^F\d+$/.test(key) || binding.includes('Ctrl+') || binding.includes('Meta+')) return 'Browser or system shortcuts may take priority. Test this binding on your device.';
  return null;
}
export function effectiveBinding(bindings, action) {
  return Object.hasOwn(bindings, action) ? bindings[action] : (DEFAULTS[action] ?? null);
}
export function duplicateActions(bindings, actions) {
  const groups = new Map();
  for (const id of actions) {
    const key = effectiveBinding(bindings, id);
    if (key) groups.set(key, [...(groups.get(key) ?? []), id]);
  }
  return [...groups.values()].filter(group => group.length > 1).flat();
}
