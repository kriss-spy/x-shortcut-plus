import { startController } from './controller.js';
startController(window, chrome.storage).catch(error => console.warn('X Shortcut Plus could not start.', error));
