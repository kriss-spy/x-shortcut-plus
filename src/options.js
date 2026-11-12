import { ACTIONS, bindingFromEvent, bindingWarning, duplicateActions, effectiveBinding } from './keys.js';
import { ACCOUNT_PREFIX, BINDING_PREFIX, listAction, readBindings } from './storage.js';
let items = {};
let recording = null;
let saving = false;
let composing = false;
let compositionEnded = -Infinity;
let rows = [];
const status = document.querySelector('#status');
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function render() {
  recording = null;
  rows = [];
  const general = document.querySelector('#general');
  const accounts = document.querySelector('#accounts');
  general.replaceChildren(); accounts.replaceChildren();
  for (const [id, label] of Object.entries(ACTIONS)) addRow(general, id, label);
  const known = Object.entries(items).filter(([key, value]) => key.startsWith(ACCOUNT_PREFIX) && Array.isArray(value?.lists));
  if (!known.length) accounts.append(el('p', 'No pinned lists discovered yet. Sign in to X and open Home.'));
  for (const [key, value] of known.sort(([a], [b]) => a.localeCompare(b))) {
    const handle = key.slice(ACCOUNT_PREFIX.length);
    accounts.append(el('h3', `@${handle}`));
    if (!value.lists.length) accounts.append(el('p', 'No pinned lists in the last observed Home tabs.'));
    for (const list of value.lists) if (/^\d+$/.test(list.id) && typeof list.label === 'string') addRow(accounts, listAction(handle, list.id), list.label || 'Untitled list', `List ${list.id}`);
  }
  updateWarnings();
}
function addRow(parent, id, label, detail) {
  const row = el('div', null, 'row');
  const name = el('div', label, 'name');
  if (detail) name.append(el('span', detail, 'detail'));
  const button = el('button', effectiveBinding(readBindings(items), id) ?? 'Not assigned', 'binding');
  button.type = 'button'; button.dataset.action = id;
  button.setAttribute('aria-label', `Set shortcut for ${label}${detail ? ` (${detail})` : ''}`);
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => {
    if (saving) return;
    if (recording) cancelRecording();
    recording = { id, button };
    button.textContent = 'Press keys…'; button.setAttribute('aria-pressed', 'true');
    status.textContent = 'Press a shortcut. Escape cancels. Use Clear to remove a binding.';
  });
  button.addEventListener('blur', () => { if (recording?.button === button) cancelRecording(); });
  const clear = el('button', 'Clear'); clear.type = 'button';
  clear.setAttribute('aria-label', `Clear shortcut for ${label}${detail ? ` (${detail})` : ''}`);
  clear.addEventListener('click', () => save(id, null));
  const warning = el('p', '', 'warning'); warning.hidden = true;
  row.append(name, button, clear, warning); parent.append(row);
  rows.push({ id, warning, button });
}
function updateWarnings() {
  const bindings = readBindings(items);
  const scopes = new Set(rows.filter(row => row.id.startsWith('list:')).map(row => row.id.split(':')[1]));
  const duplicates = new Set();
  for (const scope of [null, ...scopes]) {
    const ids = rows.filter(row => !row.id.startsWith('list:') || row.id.split(':')[1] === scope).map(row => row.id);
    duplicateActions(bindings, ids).forEach(id => duplicates.add(id));
  }
  for (const { id, warning } of rows) {
    const binding = effectiveBinding(bindings, id);
    const messages = [];
    if (duplicates.has(id)) messages.push('Duplicate binding. These actions are disabled until each has a different shortcut.');
    if (binding) { const message = bindingWarning(binding); if (message) messages.push(message); }
    warning.textContent = messages.join(' '); warning.hidden = !messages.length;
  }
}
function cancelRecording() {
  if (!recording) return;
  recording.button.textContent = effectiveBinding(readBindings(items), recording.id) ?? 'Not assigned';
  recording.button.setAttribute('aria-pressed', 'false');
  recording = null;
  status.textContent = 'Recording cancelled.';
}
async function save(id, binding) {
  if (saving) return;
  cancelRecording(); saving = true;
  document.querySelectorAll('button').forEach(button => { button.disabled = true; });
  try {
    await chrome.storage.local.set({ [BINDING_PREFIX + id]: binding });
    items[BINDING_PREFIX + id] = binding;
    status.textContent = binding ? 'Shortcut saved.' : 'Shortcut cleared.';
  } catch { status.textContent = 'Could not save. Your previous binding is unchanged. Try again.'; }
  finally { saving = false; render(); }
}
document.addEventListener('compositionstart', () => { composing = true; });
document.addEventListener('compositionend', () => { composing = false; compositionEnded = Date.now(); });
document.addEventListener('keydown', event => {
  if (!recording || saving || composing || event.isComposing || event.keyCode === 229 || Date.now() - compositionEnded < 100 || event.repeat) return;
  if (event.key === 'Escape' || event.key === 'Tab') {
    cancelRecording(); if (event.key === 'Escape') event.preventDefault(); return;
  }
  const binding = bindingFromEvent(event);
  if (!binding) return;
  event.preventDefault(); event.stopPropagation();
  save(recording.id, binding);
}, true);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  for (const [key, change] of Object.entries(changes)) {
    if (change.newValue === undefined) delete items[key]; else items[key] = change.newValue;
  }
  if (!saving && !recording) render();
});
async function init() {
try {
  items = await chrome.storage.local.get(null);
  render(); status.textContent = 'Settings ready. Defaults are provisional.';
} catch { status.textContent = 'Could not load settings. Reopen this page to try again.'; }

}
init();
